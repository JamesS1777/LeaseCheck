// The quote check: a flag only reaches the user if its quote really appears
// in the lease text. Matching ignores differences in spacing, line breaks,
// letter case, curly vs straight quotes and dash styles, nothing else.
// A paraphrased or invented quote fails and is dropped.

export type QuoteSpan = {
  start: number; // index into the original lease text
  end: number; // exclusive
  text: string; // the exact substring of the lease text
};

type Normalized = { norm: string; map: number[] };

const SINGLE_QUOTES = /[‘’‚‛′`´]/;
const DOUBLE_QUOTES = /[“”„‟″«»]/;
const DASHES = /[‐‑‒–—―−]/;

/**
 * Normalize text for comparison and keep a map from each normalized
 * character back to its position in the original string, so a match can be
 * turned into an exact span of the original lease text (for highlighting).
 */
export function normalizeWithMap(input: string): Normalized {
  let norm = "";
  const map: number[] = [];
  let i = 0;
  for (const ch of input) {
    const pos = i;
    i += ch.length;

    if (/\s/.test(ch)) {
      // Collapse any run of whitespace into one space; drop leading space.
      if (norm.length > 0 && norm[norm.length - 1] !== " ") {
        norm += " ";
        map.push(pos);
      }
      continue;
    }

    let out: string;
    if (SINGLE_QUOTES.test(ch)) out = "'";
    else if (DOUBLE_QUOTES.test(ch)) out = '"';
    else if (DASHES.test(ch)) out = "-";
    else if (ch === "­" || ch === "​" || ch === "﻿") continue; // soft hyphen, zero-width
    else out = ch.normalize("NFKC").toLowerCase(); // "ﬁ" -> "fi", "Ａ" -> "a"

    for (const o of out) {
      norm += o;
      map.push(pos);
    }
  }
  // Drop a trailing space.
  if (norm.endsWith(" ")) {
    norm = norm.slice(0, -1);
    map.pop();
  }
  return { norm, map };
}

/** Strip whitespace and any quotation marks Gemini wrapped around the quote. */
export function cleanQuote(quote: string): string {
  return quote.trim().replace(/^["'‘’“”]+|["'‘’“”]+$/g, "").trim();
}

/**
 * Find a quote in the lease text. Returns the exact original span, or null
 * if the quote isn't in the lease. Quotes shorter than 12 normalized
 * characters are rejected: too short to prove anything.
 */
export function findQuote(leaseText: string, quote: string, lease?: Normalized): QuoteSpan | null {
  const q = normalizeWithMap(cleanQuote(quote)).norm;
  if (q.length < 12) return null;
  const l = lease ?? normalizeWithMap(leaseText);
  const idx = l.norm.indexOf(q);
  if (idx === -1) return null;

  const start = l.map[idx];
  const lastPos = l.map[idx + q.length - 1];
  const lastChar = String.fromCodePoint(leaseText.codePointAt(lastPos)!);
  const end = lastPos + lastChar.length;
  return { start, end, text: leaseText.slice(start, end) };
}
