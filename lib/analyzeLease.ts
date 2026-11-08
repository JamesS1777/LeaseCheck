// Core lease check: Gemini finds and quotes matches, the code decides what
// the user sees. Server-only (uses GEMINI_API_KEY).
import { GoogleGenAI } from "@google/genai";
import { extractText, getDocumentProxy } from "unpdf";
import { buildPrompt, responseSchema } from "./prompt";
import { getRule } from "./rules";
import { findQuote, normalizeWithMap } from "./quoteCheck";

/** One flag, in the shared JSON shape agreed with the frontend. */
export type Match = {
  rule_id: string;
  quote: string; // exact text from leaseText, safe to highlight with indexOf
  name: string;
  explanation: string;
  question: string;
  source_url: string;
  // Extra fields (safe to ignore):
  source_name: string;
  start: number; // position of the quote in leaseText
  end: number;
};

export type CheckResult = {
  leaseText: string;
  matches: Match[];
  droppedCount: number; // Gemini quotes that failed the quote check
  // Extra fields (safe to ignore):
  verifiedAgainst: "pdf_text" | "gemini_transcript";
  model: string;
};

export class LeaseCheckError extends Error {
  /** userFacing: the message is written for the person uploading and safe to show them. */
  constructor(message: string, public status: number = 502, public userFacing: boolean = false) {
    super(message);
  }
}

/**
 * Adobe "dynamic" (XFA) forms, like the official Ontario lease download,
 * show only a "Please wait..." placeholder to anything but Acrobat.
 */
export function isInteractiveFormPlaceholder(text: string): boolean {
  return /please wait/i.test(text) && /adobe reader/i.test(text) && text.length < 3000;
}

export const DEFAULT_MODEL = "gemini-3.8-flash";
// Tried in order if the main model is overloaded, rate-limited or unavailable.
export const DEFAULT_FALLBACKS = ["gemini-3.6-flash", "gemini-3.1-flash-lite"];

type GeminiOutput = { leaseText?: string; matches: { rule_id: string; quote: string }[] };

/**
 * Check a lease file (PDF or image bytes) and return verified flags.
 * The route handles login, file type and size; this does the rest.
 */
export async function analyzeLease(file: Buffer | Uint8Array, mimeType: string): Promise<CheckResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new LeaseCheckError("GEMINI_API_KEY is not set on the server", 500);
  const models = modelList();
  const bytes = file instanceof Uint8Array ? file : new Uint8Array(file);

  // Read the PDF's own text layer first (takes well under a second).
  // Quotes are verified against text the AI didn't write whenever we can.
  // Photos and scanned PDFs have no text layer, so for those Gemini also
  // transcribes the page and quotes are checked against that transcript.
  const pdfText = mimeType === "application/pdf" ? await extractPdfText(bytes) : null;
  if (pdfText !== null && isInteractiveFormPlaceholder(pdfText)) {
    throw new LeaseCheckError(
      "This PDF is an interactive form that only opens in Adobe Acrobat, so we can't read it. " +
        "Upload a filled-in copy, a scan or a photo of the lease instead.",
      422,
      true,
    );
  }
  const usePdfText = pdfText !== null && pdfText.replace(/\s/g, "").length >= 200;

  // Skipping the transcript when we already have the text is the big speed
  // win: Gemini only has to write the short list of matches.
  const { output, model } = await askGemini(apiKey, models, bytes, mimeType, !usePdfText);

  const leaseText = usePdfText ? pdfText! : output.leaseText ?? "";
  const verifiedAgainst = usePdfText ? "pdf_text" : "gemini_transcript";

  const { matches, droppedCount } = verifyMatches(leaseText, output.matches ?? []);
  return { leaseText, matches, droppedCount, verifiedAgainst, model };
}

/** Main model first, then fallbacks, without duplicates. */
function modelList(): string[] {
  const main = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const fallbacks = process.env.GEMINI_FALLBACK_MODELS
    ? process.env.GEMINI_FALLBACK_MODELS.split(",").map((m) => m.trim()).filter(Boolean)
    : DEFAULT_FALLBACKS;
  return [...new Set([main, ...fallbacks])];
}

/**
 * The quote check. Keeps only matches whose rule exists in rules.json and
 * whose quote appears in the lease text, then attaches the rule's
 * explanation, question and source. Gemini never writes what the user reads.
 */
export function verifyMatches(
  leaseText: string,
  geminiMatches: { rule_id: string; quote: string }[],
): { matches: Match[]; droppedCount: number } {
  const normalizedLease = normalizeWithMap(leaseText);
  const seen = new Set<string>();
  const matches: Match[] = [];
  let droppedCount = 0;

  for (const m of geminiMatches) {
    const rule = getRule(m.rule_id);
    const span = rule && typeof m.quote === "string" ? findQuote(leaseText, m.quote, normalizedLease) : null;
    if (!rule || !span) {
      droppedCount++;
      continue;
    }
    const key = `${rule.id}:${span.start}`;
    if (seen.has(key)) continue; // same rule, same spot: keep one card
    seen.add(key);
    matches.push({
      rule_id: rule.id,
      quote: span.text,
      name: rule.name,
      explanation: rule.explanation,
      question: rule.question,
      source_url: rule.source_url,
      source_name: rule.source_name,
      start: span.start,
      end: span.end,
    });
  }

  matches.sort((a, b) => a.start - b.start); // lease order
  return { matches, droppedCount };
}

async function askGemini(
  apiKey: string,
  models: string[],
  bytes: Uint8Array,
  mimeType: string,
  transcribe: boolean,
): Promise<{ output: GeminiOutput; model: string }> {
  const ai = new GoogleGenAI({ apiKey });
  const contents = [
    {
      role: "user",
      parts: [
        { inlineData: { mimeType, data: Buffer.from(bytes).toString("base64") } },
        { text: buildPrompt({ transcribe }) },
      ],
    },
  ];
  const config = {
    temperature: 0,
    responseMimeType: "application/json",
    responseJsonSchema: responseSchema({ transcribe }),
  };

  // Each model gets one try. A busy, rate-limited or unavailable model, or
  // a malformed answer, moves on to the next model in the list.
  const failures: string[] = [];
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({ model, contents, config });
      const parsed = JSON.parse(response.text ?? "") as GeminiOutput;
      if (!Array.isArray(parsed.matches) || (transcribe && typeof parsed.leaseText !== "string")) {
        throw new Error("Gemini returned JSON in the wrong shape");
      }
      return { output: parsed, model };
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      failures.push(`${model}: ${detail.slice(0, 200)}`);
      console.warn(`[analyzeLease] ${model} failed, trying the next model. ${detail.slice(0, 200)}`);
    }
  }
  throw new LeaseCheckError(`Gemini check failed on every model. ${failures.join(" | ")}`);
}

/** The PDF's own text layer, or null if it can't be read (e.g. a scan). */
export async function extractPdfText(bytes: Uint8Array): Promise<string | null> {
  try {
    // unpdf may detach the buffer it's given, so pass a copy.
    const pdf = await getDocumentProxy(new Uint8Array(bytes));
    const { text } = await extractText(pdf, { mergePages: true });
    return text;
  } catch {
    return null;
  }
}
