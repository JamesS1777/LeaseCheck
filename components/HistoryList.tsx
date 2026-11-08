"use client";

import { useEffect, useState } from "react";
import type { CheckResult } from "@/lib/types";

interface Summary {
  id: string;
  fileName: string;
  createdAt: number;
  flagCount: number;
}

interface Props {
  onOpen: (result: CheckResult, fileName: string, createdAt: number) => void;
}

function formatDate(ms: number) {
  return new Date(ms).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" });
}

export default function HistoryList({ onOpen }: Props) {
  const [reports, setReports] = useState<Summary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/reports")
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { reports: Summary[] };
        if (!cancelled) setReports(data.reports);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load your past checks.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function open(r: Summary) {
    setBusyId(r.id);
    try {
      const res = await fetch(`/api/reports/${encodeURIComponent(r.id)}`);
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { result: CheckResult; fileName: string; createdAt: number };
      onOpen(data.result, data.fileName, data.createdAt);
    } catch {
      setStatus(`Couldn't open ${r.fileName}. Try again.`);
      setBusyId(null);
    }
  }

  async function remove(r: Summary) {
    if (!window.confirm(`Delete "${r.fileName}" from your history? This can't be undone.`)) return;
    setBusyId(r.id);
    try {
      const res = await fetch(`/api/reports/${encodeURIComponent(r.id)}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) throw new Error();
      setReports((list) => list?.filter((x) => x.id !== r.id) ?? null);
      setStatus(`Deleted ${r.fileName}.`);
    } catch {
      setStatus(`Couldn't delete ${r.fileName}. Try again.`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="lc-history" aria-labelledby="history-title">
      <h2 id="history-title">Your past checks</h2>
      <p className="lc-sr" aria-live="polite">{status}</p>

      {error && <p className="lc-fineprint">{error}</p>}
      {!error && reports === null && <p className="lc-fineprint">Loading…</p>}
      {reports?.length === 0 && (
        <p className="lc-fineprint">Leases you check will show up here. Only you can see them.</p>
      )}

      {reports && reports.length > 0 && (
        <ul className="lc-history-list">
          {reports.map((r) => (
            <li key={r.id} className="lc-history-item">
              <button
                type="button"
                className="lc-history-open"
                onClick={() => open(r)}
                disabled={busyId !== null}
              >
                <span className="lc-history-name">{r.fileName}</span>
                <span className="lc-history-meta">
                  {formatDate(r.createdAt)} ·{" "}
                  {r.flagCount === 0 ? "no flags" : `${r.flagCount} ${r.flagCount === 1 ? "flag" : "flags"}`}
                </span>
              </button>
              <button
                type="button"
                className="lc-link-btn lc-history-delete"
                aria-label={`Delete ${r.fileName}`}
                onClick={() => remove(r)}
                disabled={busyId !== null}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
