"use client";

// The final summary at the top of the results: verdict, what it means,
// every question to ask the landlord, and next steps. The text comes from
// the API (built by code from the verified flags, never written by Gemini).

import { useState } from "react";
import type { Summary } from "@/lib/types";

interface Props {
  summary: Summary;
  speaking: boolean;
  canSpeak: boolean;
  onSpeak: () => void;
}

const VERDICT_LABEL: Record<Summary["verdict"], string> = {
  talk_before_signing: "Before you sign",
  ask_first: "Worth asking",
  no_issues: "Looks okay",
};

export function summarySpeechText(s: Summary) {
  const questions = s.questions.length
    ? ` Questions to ask your landlord: ${s.questions.map((q, i) => `${i + 1}. ${q.question}`).join(" ")}`
    : "";
  return `${s.headline}. ${s.detail}${questions}`;
}

function questionsAsText(s: Summary) {
  return `Questions about the lease:\n${s.questions.map((q, i) => `${i + 1}. ${q.question}`).join("\n")}`;
}

export default function SummaryPanel({ summary, speaking, canSpeak, onSpeak }: Props) {
  const [copyStatus, setCopyStatus] = useState("");

  async function copyQuestions() {
    try {
      await navigator.clipboard.writeText(questionsAsText(summary));
      setCopyStatus("Questions copied. Paste them into an email or text to your landlord.");
    } catch {
      setCopyStatus("Couldn't copy automatically. Select the questions and copy them instead.");
    }
    setTimeout(() => setCopyStatus(""), 6000);
  }

  return (
    <section
      className={`lc-verdict lc-verdict--${summary.verdict}`}
      aria-labelledby="verdict-title"
    >
      <div className="lc-verdict-head">
        <div className="lc-verdict-intro">
          <p className="lc-verdict-pill">{VERDICT_LABEL[summary.verdict]}</p>
          <h2 id="verdict-title">{summary.headline}</h2>
          <p className="lc-verdict-detail">{summary.detail}</p>
        </div>
        {canSpeak && (
          <button
            type="button"
            className={`lc-icon-btn ${speaking ? "is-on" : ""}`}
            aria-label={speaking ? "Stop reading the summary" : "Read the summary aloud"}
            aria-pressed={speaking}
            onClick={onSpeak}
          >
            <span aria-hidden="true">{speaking ? "■" : "🔊"}</span>
          </button>
        )}
      </div>

      {summary.questions.length > 0 && (
        <div className="lc-verdict-block">
          <div className="lc-verdict-block-head">
            <h3>Questions to ask your landlord</h3>
            <button type="button" className="lc-btn lc-btn-quiet" onClick={copyQuestions}>
              Copy questions
            </button>
          </div>
          <ol className="lc-questions">
            {summary.questions.map((q) => (
              <li key={q.rule_id}>
                {q.level === "important" && <span className="lc-tag">Important</span>}{" "}
                <span className="lc-sr">About {q.name}: </span>
                {q.question}
              </li>
            ))}
          </ol>
          <p className="lc-fineprint" role="status" aria-live="polite">
            {copyStatus}
          </p>
        </div>
      )}

      {summary.nextSteps.length > 0 && (
        <div className="lc-verdict-block">
          <h3>Next steps</h3>
          <ul className="lc-steps">
            {summary.nextSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
