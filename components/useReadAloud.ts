"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/** One card speaks at a time. Returns which card is speaking and a toggle. */
export function useReadAloud() {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const supported = useSyncExternalStore(
    noopSubscribe,
    () => "speechSynthesis" in window,
    () => false,
  );

  // Stop talking if the results go away.
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const toggle = useCallback(
    (id: string, text: string) => {
      if (!("speechSynthesis" in window)) return;
      const synth = window.speechSynthesis;
      synth.cancel();
      if (speakingId === id) {
        setSpeakingId(null);
        return;
      }
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-CA";
      u.rate = 0.95;
      u.onend = () => setSpeakingId((cur) => (cur === id ? null : cur));
      u.onerror = () => setSpeakingId((cur) => (cur === id ? null : cur));
      setSpeakingId(id);
      synth.speak(u);
    },
    [speakingId],
  );

  return { speakingId, supported, toggle };
}
