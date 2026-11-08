"use client";

// Shared read-aloud settings: which voice and how fast. Saved per browser.
// Voices depend on the browser: Edge has the best ("Natural") ones,
// Chrome has "Google UK English Male" etc., others fall back to system voices.

export interface VoicePreset {
  id: string;
  label: string;
  lang: RegExp;
  names: RegExp[]; // best match first
}

export const PRESETS: VoicePreset[] = [
  {
    id: "uk-man",
    label: "British man",
    lang: /en-GB/i,
    names: [/Ryan.*Natural/i, /Thomas.*Natural/i, /Google UK English Male/i, /Daniel|George|Arthur/i, /male/i],
  },
  {
    id: "uk-woman",
    label: "British woman",
    lang: /en-GB/i,
    names: [/Sonia.*Natural/i, /Libby.*Natural/i, /Maisie.*Natural/i, /Google UK English Female/i, /Hazel|Kate|Serena|Stephanie/i],
  },
  {
    id: "ca-woman",
    label: "Canadian woman",
    lang: /en-CA/i,
    names: [/Clara.*Natural/i, /Natural/i],
  },
  {
    id: "ca-man",
    label: "Canadian man",
    lang: /en-CA/i,
    names: [/Liam.*Natural/i],
  },
  {
    id: "us-woman",
    label: "American woman",
    lang: /en-US/i,
    names: [/(Ava|Aria|Jenny|Emma|Michelle).*Natural/i, /Google US English/i, /Samantha|Ava|Zira/i],
  },
  {
    id: "us-man",
    label: "American man",
    lang: /en-US/i,
    names: [/(Andrew|Guy|Brian|Christopher|Eric|Roger).*Natural/i, /Aaron|Alex|Tom|David|Mark/i],
  },
];

export const RATES = [
  { value: 0.85, label: "Slower" },
  { value: 1, label: "Normal" },
  { value: 1.15, label: "Faster" },
];

export interface VoiceSettings {
  preset: string; // "auto" or a preset id
  rate: number;
}

const KEY = "lc-voice";
const DEFAULT: VoiceSettings = { preset: "auto", rate: 1 };
const listeners = new Set<() => void>();
let settings: VoiceSettings | null = null;
let voicesKey = "";
let voicesCache: SpeechSynthesisVoice[] = [];

function load(): VoiceSettings {
  if (settings) return settings;
  try {
    const raw = localStorage.getItem(KEY);
    settings = raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT;
  } catch {
    settings = DEFAULT;
  }
  return settings!;
}

export function getSettings(): VoiceSettings {
  return load();
}

export function getServerSettings(): VoiceSettings {
  return DEFAULT;
}

export function setSettings(next: Partial<VoiceSettings>) {
  settings = { ...load(), ...next };
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {}
  listeners.forEach((l) => l());
}

export function subscribe(cb: () => void) {
  listeners.add(cb);
  const synth = typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
  const onVoices = () => listeners.forEach((l) => l());
  synth?.addEventListener?.("voiceschanged", onVoices);
  synth?.getVoices(); // Chrome loads voices lazily
  return () => {
    listeners.delete(cb);
    synth?.removeEventListener?.("voiceschanged", onVoices);
  };
}

/** English voices, cached so React sees a stable array. */
export function getVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return voicesCache;
  const all = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en"));
  const key = all.map((v) => v.name).join("|");
  if (key !== voicesKey) {
    voicesKey = key;
    voicesCache = all;
  }
  return voicesCache;
}

export function getServerVoices(): SpeechSynthesisVoice[] {
  return voicesCache;
}

function findForPreset(p: VoicePreset, voices: SpeechSynthesisVoice[]) {
  const inLang = voices.filter((v) => p.lang.test(v.lang.replace("_", "-")));
  for (const re of p.names) {
    const v = inLang.find((v) => re.test(v.name));
    if (v) return v;
  }
  return null;
}

/** Presets this browser can actually play, with the voice each one uses. */
export function availablePresets(voices: SpeechSynthesisVoice[]) {
  return PRESETS.flatMap((p) => {
    const voice = findForPreset(p, voices);
    return voice ? [{ preset: p, voice }] : [];
  });
}

// Auto: the best-sounding voice on this device.
const AUTO_ORDER = [/Natural/i, /Google US English/i, /Google UK English/i, /Samantha|Ava|Daniel/i, /Google/i];

export function resolveVoice(s: VoiceSettings): SpeechSynthesisVoice | null {
  const voices = getVoices();
  if (voices.length === 0) return null;
  if (s.preset !== "auto") {
    const p = PRESETS.find((p) => p.id === s.preset);
    const v = p && findForPreset(p, voices);
    if (v) return v;
  }
  for (const re of AUTO_ORDER) {
    const v =
      voices.find((v) => re.test(v.name) && /en-(CA|US)/i.test(v.lang)) ?? voices.find((v) => re.test(v.name));
    if (v) return v;
  }
  return voices.find((v) => /en-(CA|US)/i.test(v.lang)) ?? voices[0];
}

/** Speak text with the current settings. Returns the utterance so callers can listen for end. */
export function speak(text: string): SpeechSynthesisUtterance | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const s = load();
  const u = new SpeechSynthesisUtterance(text);
  const voice = resolveVoice(s);
  u.lang = voice?.lang ?? "en-CA";
  try {
    if (voice) u.voice = voice;
  } catch {
    // Fall back to the browser's default voice for that language.
  }
  u.rate = s.rate;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
  return u;
}
