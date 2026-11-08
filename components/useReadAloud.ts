"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

// Best-sounding voices first. Edge's "Natural" voices are the best on Windows;
// Chrome's "Google" voices are next; the default Microsoft David/Zira are robotic.
const PREFERRED = [
  /Natural/i, // Edge: Microsoft Aria/Jenny/Guy Online (Natural)
  /Google US English/i,
  /Google UK English Female/i,
  /Samantha|Ava|Siri/i, // Mac / iPhone
  /Google/i,
];

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith("en"));
  if (voices.length === 0) return null;
  for (const re of PREFERRED) {
    const v =
      voices.find((v) => re.test(v.name) && /en-(CA|US)/i.test(v.lang)) ??
      voices.find((v) => re.test(v.name));
    if (v) return v;
  }
  return voices.find((v) => /en-(CA|US)/i.test(v.lang)) ?? voices[0];
}

/** One card speaks at a time. Returns which card is speaking and a toggle. */
export function useReadAloud() {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const supported = useSyncExternalStore(
    noopSubscribe,
    () => "speechSynthesis" in window,
    () => false,
  );

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    // Chrome loads voices late; asking once makes them available by first click.
    synth.getVoices();
    const onVoices = () => synth.getVoices();
    synth.addEventListener?.("voiceschanged", onVoices);
    return () => {
      synth.removeEventListener?.("voiceschanged", onVoices);
      synth.cancel(); // stop talking if the results go away
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
      const voice = pickVoice();
      if (voice) {
        u.voice = voice;
        u.lang = voice.lang;
      } else {
        u.lang = "en-CA";
      }
      u.rate = 1;
      u.pitch = 1;
      u.onend = () => setSpeakingId((cur) => (cur === id ? null : cur));
      u.onerror = () => setSpeakingId((cur) => (cur === id ? null : cur));
      setSpeakingId(id);
      synth.speak(u);
    },
    [speakingId],
  );

  return { speakingId, supported, toggle };
}
