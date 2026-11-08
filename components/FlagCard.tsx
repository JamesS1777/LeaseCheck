"use client";

import { forwardRef } from "react";
import type { Match } from "@/lib/types";

interface Props {
  match: Match;
  number: number;
  active: boolean;
  speaking: boolean;
  canSpeak: boolean;
  hasHighlight: boolean;
  onSpeak: () => void;
  onShowInLease: () => void;
}

export function cardSpeechText(m: Match) {
  return `${m.name}. The lease says: ${m.quote}. What it means: ${m.explanation} Question to ask your landlord: ${m.question}`;
}

function sourceLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Official source";
  }
}

const FlagCard = forwardRef<HTMLElement, Props>(function FlagCard(
  { match, number, active, speaking, canSpeak, hasHighlight, onSpeak, onShowInLease },
  ref,
) {
  const titleId = `flag-${number}-title`;
  return (
    <article
      ref={ref}
      id={`flag-${number}`}
      tabIndex={-1}
      className={`lc-card ${active ? "is-active" : ""}`}
      aria-labelledby={titleId}
    >
      <header className="lc-card-head">
        <span className="lc-badge" aria-hidden="true">{number}</span>
        <h3 id={titleId}>
          <span className="lc-sr">Flag {number}: </span>
          {match.name}
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
      </header>

      <div className="lc-card-section">
        <h4>Your lease says</h4>
        <blockquote className="lc-quote">“{match.quote}”</blockquote>
      </div>

      <div className="lc-card-section">
        <h4>What it means</h4>
        <p>{match.explanation}</p>
      </div>

      <div className="lc-card-section lc-ask">
        <h4>Ask your landlord</h4>
        <p>{match.question}</p>
      </div>

      <footer className="lc-card-foot">
        <a href={match.source_url} target="_blank" rel="noopener noreferrer">
          Why it&apos;s flagged: {sourceLabel(match.source_url)}
          <span className="lc-sr"> (opens in a new tab)</span>
          <span aria-hidden="true"> ↗</span>
        </a>
        {hasHighlight && (
          <button type="button" className="lc-link-btn" onClick={onShowInLease}>
            Show in lease
          </button>
        )}
      </footer>
    </article>
  );
});

export default FlagCard;
