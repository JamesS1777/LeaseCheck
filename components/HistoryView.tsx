"use client";
// Owner: Arya — the History tab: every lease this user has checked, newest first.
// Open shows the saved results in James's ResultsView; Delete removes it for good.
import { useEffect, useRef, useState } from "react";
import type { CheckResult } from "@/lib/types";
import {
  deleteHistoryReport,
  listHistory,
  openHistoryReport,
  type ReportSummary,
} from "@/lib/history";
import styles from "./history.module.css";

interface Props {
  onOpen: (fileName: string, result: CheckResult) => void;
}

const dateFormat = new Intl.DateTimeFormat("en-CA", { dateStyle: "medium", timeStyle: "short" });

function flagText(n: number) {
  return n === 0 ? "No clauses flagged" : `${n} ${n === 1 ? "clause" : "clauses"} worth asking about`;
}

export default function HistoryView({ onOpen }: Props) {
  const [reports, setReports] = useState<ReportSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
    listHistory()
      .then(setReports)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Couldn't load your history."));
  }, []);

  async function open(r: ReportSummary) {
    setBusyId(r.id);
    setError(null);
    try {
      const saved = await openHistoryReport(r.id);
      onOpen(saved.fileName, saved.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't open that report.");
      setBusyId(null);
    }
  }

  async function remove(r: ReportSummary) {
    if (!window.confirm(`Delete the saved check for "${r.fileName}"? This can't be undone.`)) return;
    setBusyId(r.id);
    setError(null);
    try {
      await deleteHistoryReport(r.id);
      setReports((prev) => prev?.filter((x) => x.id !== r.id) ?? null);
      setStatus(`Deleted ${r.fileName}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete that report.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className={styles.wrap} aria-labelledby="history-title">
      <div>
        <h1 id="history-title" ref={headingRef} tabIndex={-1}>
          Your saved checks
        </h1>
        <p className={styles.sub}>
          Every lease you check is saved here, visible only to your account. Delete any of them at
          any time.
        </p>
      </div>

      <p className="lc-sr" role="status">
        {status}
      </p>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {reports === null && !error && <p className={styles.sub}>Loading your history…</p>}

      {reports?.length === 0 && (
        <div className={styles.empty}>
          <p>No saved checks yet. Check a lease and it will show up here.</p>
        </div>
      )}

      {reports && reports.length > 0 && (
        <ul className={styles.list}>
          {reports.map((r) => (
            <li key={r.id} className={styles.item}>
              <div className={styles.info}>
                <span className={styles.name}>{r.fileName}</span>
                <span className={styles.meta}>Checked {dateFormat.format(new Date(r.createdAt))}</span>
                <span className={`${styles.flags} ${r.flagCount > 0 ? styles.hasFlags : ""}`}>
                  {flagText(r.flagCount)}
                </span>
              </div>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.primary}`}
                  disabled={busyId !== null}
                  aria-label={`Open results for ${r.fileName}`}
                  onClick={() => open(r)}
                >
                  {busyId === r.id ? "Opening…" : "Open"}
                </button>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.danger}`}
                  disabled={busyId !== null}
                  aria-label={`Delete saved check for ${r.fileName}`}
                  onClick={() => remove(r)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
