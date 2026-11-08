"use client";

import { useEffect, useState } from "react";

const STEPS = [
  "Reading your lease…",
  "Comparing each clause to Ontario rules…",
  "Double-checking every quote against your lease…",
  "Writing up what to ask your landlord…",
];

export default function LoadingState({ fileName }: { fileName: string }) {
  const [seconds, setSeconds] = useState(0);
  const step = Math.min(STEPS.length - 1, Math.floor(seconds / 7));

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="lc-loading" aria-busy="true" aria-labelledby="loading-title">
      <div className="lc-spinner" aria-hidden="true" />
      <h2 id="loading-title">Checking {fileName}</h2>
      {/* Screen readers hear each new step once. */}
      <p className="lc-loading-step" aria-live="polite">
        {STEPS[step]}
      </p>
      <p className="lc-fineprint">This usually takes about 30 seconds. ({seconds}s)</p>
    </section>
  );
}
