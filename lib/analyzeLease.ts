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
  constructor(message: string, public status: number = 502) {
    super(message);
  }
}

export const DEFAULT_MODEL = "gemini-3.8-flash";

type GeminiOutput = { leaseText: string; matches: { rule_id: string; quote: string }[] };

/**
 * Check a lease file (PDF or image bytes) and return verified flags.
 * The route handles login, file type and size; this does the rest.
 */
export async function analyzeLease(file: Buffer | Uint8Array, mimeType: string): Promise<CheckResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new LeaseCheckError("GEMINI_API_KEY is not set on the server", 500);
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const bytes = file instanceof Uint8Array ? file : new Uint8Array(file);

  // Run Gemini and local PDF text extraction at the same time.
  const [gemini, pdfText] = await Promise.all([
    askGemini(apiKey, model, bytes, mimeType),
    mimeType === "application/pdf" ? extractPdfText(bytes) : Promise.resolve(null),
  ]);

  // Verify quotes against text the AI didn't write whenever we can: the
  // PDF's own text layer. Photos and scanned PDFs have no text layer, so
  // fall back to Gemini's transcript of the page.
  const usePdfText = pdfText !== null && pdfText.replace(/\s/g, "").length >= 200;
  const leaseText = usePdfText ? pdfText : gemini.leaseText ?? "";
  const verifiedAgainst = usePdfText ? "pdf_text" : "gemini_transcript";

  const { matches, droppedCount } = verifyMatches(leaseText, gemini.matches ?? []);
  return { leaseText, matches, droppedCount, verifiedAgainst, model };
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

async function askGemini(apiKey: string, model: string, bytes: Uint8Array, mimeType: string): Promise<GeminiOutput> {
  const ai = new GoogleGenAI({ apiKey });
  const request = {
    model,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType, data: Buffer.from(bytes).toString("base64") } },
          { text: buildPrompt() },
        ],
      },
    ],
    config: {
      temperature: 0,
      responseMimeType: "application/json",
      responseJsonSchema: responseSchema(),
    },
  };

  // One retry covers the occasional 429/503 or malformed JSON.
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await ai.models.generateContent(request);
      const parsed = JSON.parse(response.text ?? "") as GeminiOutput;
      if (typeof parsed.leaseText !== "string" || !Array.isArray(parsed.matches)) {
        throw new Error("Gemini returned JSON in the wrong shape");
      }
      return parsed;
    } catch (err) {
      lastError = err;
      if (attempt === 0) await new Promise((r) => setTimeout(r, 1500));
    }
  }
  const detail = lastError instanceof Error ? lastError.message : String(lastError);
  throw new LeaseCheckError(`Gemini check failed: ${detail}`);
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
