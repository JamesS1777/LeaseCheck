"use client";

import { forwardRef } from "react";
import type { Match } from "@/lib/types";

interface Props {
  match: Match;
  number: number;
  open: boolean;
  speaking: boolean;
  canSpeak: boolean;
  hasHighlight: boolean;
  onToggle: () => void;
  onSpeak: () => void;
  onShowInLease: () => void;
}

export function cardSpeechText(m: Match) {
  return `${m.name}. Your lease says: ${m.quote} ${m.explanation} Ask your landlord: ${m.question}`;
}

const FlagCard = forwardRef<HTMLElement, Props>(function FlagCard(
  { match, number, open, speaking, canSpeak, hasHighlight, onToggle, onSpeak, onShowInLease },
  ref,
) {
  const bodyId = `flag-${number}-body`;
  return (
    <article
      ref={ref}
      id={`flag-${number}`}
      tabIndex={-1}
      className={`lc-card ${open ? "is-open" : ""}`}
    >
      <div className="lc-card-head">
        <h3>
          <button
            type="button"
            className="lc-card-toggle"
            aria-expanded={open}
            aria-controls={bodyId}
            onClick={onToggle}
          >
            <span className="lc-badge" aria-hidden="true">{number}</span>
            <span className="lc-sr">Flag {number}: </span>
            <span className="lc-card-name">{match.name}</span>
            <span className="lc-chevron" aria-hidden="true">›</span>
          </button>
        </h3>
        {canSpeak && (
          <button
            type="button"
            className={`lc-icon-btn ${speaking ? "is-on" : ""}`}
            aria-label={speaking ? `Stop reading flag ${number}` : `Read flag ${number} aloud`}
            aria-pressed={speaking}
            onClick={onSpeak}
          >
            <span aria-hidden="true">{speaking ? "■" : "🔊"}</span>
          </button>
        )}
      </div>

      <div id={bodyId} className="lc-card-body" hidden={!open}>
        <blockquote className="lc-quote">“{match.quote}”</blockquote>
        <p>{match.explanation}</p>
        <div className="lc-ask">
          <span className="lc-ask-label">Ask your landlord</span>
          <p>{match.question}</p>
        </div>
        <div className="lc-card-foot">
          <a href={match.source_url} target="_blank" rel="noopener noreferrer">
            {(match as Match & { source_name?: string }).source_name || "Source"}<span className="lc-sr"> (opens in a new tab)</span>
            <span aria-hidden="true"> ↗</span>
          </a>
          {hasHighlight && (
            <button type="button" className="lc-link-btn" onClick={onShowInLease}>
              Show in lease
            </button>
          )}
        </div>
      </div>
    </article>
  );
});

export default FlagCard;
