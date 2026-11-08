"use client";

import { useState } from "react";
import type { CheckResult } from "@/lib/types";
import { checkLease } from "@/lib/checkLease";
import UploadForm from "./UploadForm";
import LoadingState from "./LoadingState";
import ResultsView from "./ResultsView";
import Disclaimer from "./Disclaimer";
import ContrastToggle from "./ContrastToggle";
import VoicePicker from "./VoicePicker";
import HistoryList from "./HistoryList";

type State =
  | { step: "upload"; error?: string }
  | { step: "loading"; fileName: string }
  | { step: "results"; fileName: string; result: CheckResult; savedAt?: number };

/**
 * The whole signed-in experience: upload → loading → results.
 * Arya: render this only for signed-in users (Auth0 session check in app/page.tsx).
 * Put the sign-out link / user name in the `account` slot.
 */
export default function LeaseCheckApp({ account }: { account?: React.ReactNode }) {
  const [state, setState] = useState<State>({ step: "upload" });

  async function handleSubmit(file: File) {
    setState({ step: "loading", fileName: file.name });
    try {
      const result = await checkLease(file);
      setState({ step: "results", fileName: file.name, result });
    } catch (err) {
      setState({
        step: "upload",
        error: err instanceof Error ? err.message : "Something went wrong. Try again.",
      });
    }
  }

  return (
    <>
      <a href="#main" className="lc-skip">Skip to main content</a>
      <header className="lc-topbar">
        <div className="lc-wrap lc-topbar-inner">
          <p className="lc-logo">
            <span aria-hidden="true">✓</span> LeaseCheck
          </p>
          <div className="lc-topbar-actions">
            <VoicePicker />
            <ContrastToggle />
            {account}
          </div>
        </div>
      </header>

      <main id="main" className="lc-wrap">
        {state.step === "upload" && (
          <section className="lc-hero" aria-labelledby="hero-title">
            <h1 id="hero-title">Know what you&apos;re signing before you sign it.</h1>
            <p className="lc-lede">Upload your lease. We&apos;ll flag anything that may break Ontario rules.</p>
            <UploadForm onSubmit={handleSubmit} error={state.error} />
            <Disclaimer />
            <HistoryList
              onOpen={(result, fileName, savedAt) =>
                setState({ step: "results", fileName, result, savedAt })
              }
            />
          </section>
        )}

        {state.step === "loading" && <LoadingState fileName={state.fileName} />}

        {state.step === "results" && (
          <ResultsView
            result={state.result}
            fileName={state.fileName}
            savedAt={state.savedAt}
            onReset={() => setState({ step: "upload" })}
          />
        )}
      </main>
    </>
  );
}
