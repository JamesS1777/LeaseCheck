"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CheckResult } from "@/lib/types";
import { buildSegments } from "@/lib/highlight";
import FlagCard, { cardSpeechText } from "./FlagCard";
import Disclaimer from "./Disclaimer";
import { useReadAloud } from "./useReadAloud";

interface Props {
  result: CheckResult;
  fileName?: string;
  onReset: () => void;
}

function normalizeSpace(s: string) {
  return s.replace(/\s+/g, " ");
}

export default function ResultsView({ result, fileName, onReset }: Props) {
  // Order cards by where they appear in the lease, so card 1 = first highlight.
  const matches = useMemo(() => {
    const flat = normalizeSpace(result.leaseText);
    return [...result.matches].sort((a, b) => {
      const ia = flat.indexOf(normalizeSpace(a.quote.trim()));
      const ib = flat.indexOf(normalizeSpace(b.quote.trim()));
      return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib);
    });
  }, [result]);

  const segments = useMemo(() => buildSegments(result.leaseText, matches), [result, matches]);
  const highlighted = useMemo(
    () => new Set(segments.flatMap((s) => (s.kind === "mark" ? [s.matchIndex] : []))),
    [segments],
  );

  const [active, setActive] = useState<number | null>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const markRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { speakingId, supported, toggle } = useReadAloud();

  // Move focus to the summary when results load (screen readers announce it).
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  function goToCard(i: number) {
    setActive(i);
    const el = cardRefs.current[i];
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.focus({ preventScroll: true });
  }

  function goToMark(i: number) {
    setActive(i);
    const el = markRefs.current[i];
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.focus({ preventScroll: true });
  }

  const n = matches.length;
  const summary =
    n === 0
      ? "No clauses matched our rules list"
      : `${n} ${n === 1 ? "clause" : "clauses"} worth asking about`;

  return (
    <div className="lc-results">
      <section className="lc-summary" aria-labelledby="summary-title">
        <div>
          <p className="lc-eyebrow">{fileName ? `Results for ${fileName}` : "Results"}</p>
          <h2 id="summary-title" ref={headingRef} tabIndex={-1}>
            {summary}
          </h2>
          <p className="lc-summary-sub">
            {n === 0
              ? "That's a good sign, but it isn't a guarantee. LeaseCheck only checks the rules on its list."
              : "Tap a highlighted clause to see what it means and what to ask before you sign."}
          </p>
          {result.droppedCount > 0 && (
            <p className="lc-fineprint">
              {result.droppedCount} possible {result.droppedCount === 1 ? "match was" : "matches were"}{" "}
              left out because {result.droppedCount === 1 ? "it" : "they"} didn&apos;t appear word for
              word in your lease.
            </p>
          )}
        </div>
        <button type="button" className="lc-btn" onClick={onReset}>
          Check another lease
        </button>
      </section>

      <Disclaimer />

      <div className={`lc-grid ${n === 0 ? "is-empty" : ""}`}>
        <section className="lc-lease" aria-labelledby="lease-title">
          <h2 id="lease-title" className="lc-panel-title">Your lease</h2>
          <div className="lc-lease-text">
            {segments.map((s, k) =>
              s.kind === "text" ? (
                <span key={k}>{s.text}</span>
              ) : (
                <mark key={k} className={active === s.matchIndex ? "is-active" : ""}>
                  <a
                    ref={(el) => {
                      markRefs.current[s.matchIndex] = el;
                    }}
                    href={`#flag-${s.matchIndex + 1}`}
                    onClick={(e) => {
                      e.preventDefault();
                      goToCard(s.matchIndex);
                    }}
                  >
                    <span className="lc-mark-num" aria-hidden="true">
                      {s.matchIndex + 1}
                    </span>
                    <span className="lc-sr">Flagged clause {s.matchIndex + 1}: </span>
                    {s.text}
                  </a>
                </mark>
              ),
            )}
          </div>
        </section>

        {n > 0 && (
          <section className="lc-cards" aria-labelledby="cards-title">
            <h2 id="cards-title" className="lc-panel-title">What to ask about</h2>
            {matches.map((m, i) => (
              <FlagCard
                key={`${m.rule_id}-${i}`}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                match={m}
                number={i + 1}
                active={active === i}
                speaking={speakingId === `card-${i}`}
                canSpeak={supported}
                hasHighlight={highlighted.has(i)}
                onSpeak={() => toggle(`card-${i}`, cardSpeechText(m))}
                onShowInLease={() => goToMark(i)}
              />
            ))}
          </section>
        )}
      </div>

      <Disclaimer />
    </div>
  );
}
