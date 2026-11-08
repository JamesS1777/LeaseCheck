"use client";

import { useSyncExternalStore } from "react";
import {
  RATES,
  availablePresets,
  getServerSettings,
  getServerVoices,
  getSettings,
  getVoices,
  setSettings,
  speak,
  subscribe,
} from "@/lib/voiceStore";

const SAMPLE = "Hi, I'm LeaseCheck. I'll read your flags out loud.";

export default function VoicePicker() {
  const settings = useSyncExternalStore(subscribe, getSettings, getServerSettings);
  const voices = useSyncExternalStore(subscribe, getVoices, getServerVoices);
  const options = availablePresets(voices);

  if (voices.length === 0) return null; // no speech support, or voices not loaded yet

  return (
    <div className="lc-voice" role="group" aria-label="Read-aloud voice">
      <label className="lc-select">
        <span>Voice</span>
        <select
          value={options.some((o) => o.preset.id === settings.preset) ? settings.preset : "auto"}
          onChange={(e) => {
            setSettings({ preset: e.target.value });
            speak(SAMPLE);
          }}
        >
          <option value="auto">Best available</option>
          {options.map(({ preset }) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
        </select>
      </label>
      <label className="lc-select">
        <span>Speed</span>
        <select
          value={settings.rate}
          onChange={(e) => {
            setSettings({ rate: Number(e.target.value) });
            speak(SAMPLE);
          }}
        >
          {RATES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="lc-icon-btn lc-icon-btn-sm"
        aria-label="Preview voice"
        onClick={() => speak(SAMPLE)}
      >
        <span aria-hidden="true">▶</span>
      </button>
    </div>
  );
}
