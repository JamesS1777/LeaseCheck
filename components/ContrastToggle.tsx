"use client";

import { useSyncExternalStore } from "react";

const KEY = "lc-high-contrast";
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function apply(on: boolean) {
  document.documentElement.dataset.contrast = on ? "high" : "normal";
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  apply(read()); // restore the saved choice on first load
  return () => listeners.delete(cb);
}

function set(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {}
  apply(on);
  listeners.forEach((l) => l());
}

export default function ContrastToggle() {
  const on = useSyncExternalStore(subscribe, read, () => false);

  return (
    <button
      type="button"
      className="lc-btn lc-btn-quiet"
      aria-pressed={on}
      onClick={() => set(!on)}
    >
      <span aria-hidden="true">◐</span> High contrast: {on ? "on" : "off"}
    </button>
  );
}
