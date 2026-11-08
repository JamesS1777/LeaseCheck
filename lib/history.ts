// Owner: Arya — browser helpers for the History tab (talks to /api/reports).
import type { CheckResult } from "./types";

export interface ReportSummary {
  id: string;
  fileName: string;
  createdAt: number;
  flagCount: number;
}

async function readError(res: Response, fallback: string): Promise<never> {
  if (res.status === 401) throw new Error("Your session expired. Sign in again.");
  const data = await res.json().catch(() => null);
  throw new Error(typeof data?.error === "string" ? data.error : fallback);
}

export async function listHistory(): Promise<ReportSummary[]> {
  const res = await fetch("/api/reports", { cache: "no-store" });
  if (!res.ok) return readError(res, "Couldn't load your history.");
  return ((await res.json()) as { reports: ReportSummary[] }).reports;
}

export async function openHistoryReport(
  id: string,
): Promise<ReportSummary & { result: CheckResult }> {
  const res = await fetch(`/api/reports/${encodeURIComponent(id)}`, { cache: "no-store" });
  if (!res.ok) return readError(res, "Couldn't open that report.");
  return res.json();
}

export async function deleteHistoryReport(id: string): Promise<void> {
  const res = await fetch(`/api/reports/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) return readError(res, "Couldn't delete that report.");
}
