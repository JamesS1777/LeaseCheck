"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { speak } from "@/lib/voiceStore";

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
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  const toggle = useCallback(
    (id: string, text: string) => {
      if (!("speechSynthesis" in window)) return;
      if (speakingId === id) {
        window.speechSynthesis.cancel();
        setSpeakingId(null);
        return;
      }
      const u = speak(text);
      if (!u) return;
      const done = () => setSpeakingId((cur) => (cur === id ? null : cur));
      u.onend = done;
      u.onerror = done;
      setSpeakingId(id);
    },
    [speakingId],
  );

  return { speakingId, supported, toggle };
}
