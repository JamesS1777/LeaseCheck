import type { Match } from "./types";

export type Segment =
  | { kind: "text"; text: string }
  | { kind: "mark"; text: string; matchIndex: number };

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Finds where each quote sits in the lease text. Whitespace is flexible
 * (same idea as Samuel's quote check: line breaks and double spaces don't matter).
 * Overlapping or unfound quotes are skipped for highlighting; their cards still show.
 */
export function buildSegments(leaseText: string, matches: Match[]): Segment[] {
  const ranges: { start: number; end: number; matchIndex: number }[] = [];

  matches.forEach((m, matchIndex) => {
    // Samuel's API sends the quote's exact position; use it when it checks out.
    const { start, end } = m as Match & { start?: number; end?: number };
    if (typeof start === "number" && typeof end === "number" && start >= 0 && end > start && end <= leaseText.length) {
      ranges.push({ start, end, matchIndex });
      return;
    }
    const words = m.quote.trim().split(/\s+/).filter(Boolean).map(escapeRegExp);
    if (words.length === 0) return;
    const re = new RegExp(words.join("\\s+"));
    const found = re.exec(leaseText);
    if (found) {
      ranges.push({ start: found.index, end: found.index + found[0].length, matchIndex });
    }
  });

  ranges.sort((a, b) => a.start - b.start);

  const segments: Segment[] = [];
  let cursor = 0;
  for (const r of ranges) {
    if (r.start < cursor) continue; // overlap: skip
    if (r.start > cursor) segments.push({ kind: "text", text: leaseText.slice(cursor, r.start) });
    segments.push({ kind: "mark", text: leaseText.slice(r.start, r.end), matchIndex: r.matchIndex });
    cursor = r.end;
  }
  if (cursor < leaseText.length) segments.push({ kind: "text", text: leaseText.slice(cursor) });
  return segments;
}
