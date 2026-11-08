// Owner: James — saved reports (history), one list per signed-in user.
// Server only. Uses Node's built-in SQLite (no extra package to install).
// The database file lives in .data/ next to package.json and never goes to GitHub.
//
// Note: on Vercel the file system resets, so history only lasts while the
// server is running. Fine for a local demo; for real use, swap in Postgres.
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { CheckResult } from "./types";

export interface ReportSummary {
  id: string;
  fileName: string;
  createdAt: number; // ms since epoch
  flagCount: number;
}

const MAX_PER_USER = 50;

// Just the bits of Node's built-in SQLite we use (the project's Node types predate it).
interface Statement {
  run(...params: unknown[]): { changes: number | bigint };
  all(...params: unknown[]): unknown[];
  get(...params: unknown[]): unknown;
}
interface DatabaseSync {
  exec(sql: string): void;
  prepare(sql: string): Statement;
}

// Loaded lazily, so an older Node (no built-in SQLite) only turns history off
// instead of breaking the lease check.
function loadSqlite(): { DatabaseSync: new (path: string) => DatabaseSync } {
  const getBuiltin = (process as unknown as { getBuiltinModule?: (id: string) => unknown })
    .getBuiltinModule;
  const mod = getBuiltin?.call(process, "node:sqlite") as { DatabaseSync: new (path: string) => DatabaseSync } | undefined;
  if (!mod) throw new Error("History needs Node.js 22.5 or newer (built-in SQLite).");
  return mod;
}

let db: DatabaseSync | null = null;

function open(): DatabaseSync {
  if (db) return db;
  const dir = join(process.cwd(), ".data");
  mkdirSync(dir, { recursive: true });
  // Keep the database (real lease text!) out of git without touching .gitignore.
  const ignore = join(dir, ".gitignore");
  if (!existsSync(ignore)) writeFileSync(ignore, "*\n");

  const { DatabaseSync } = loadSqlite();
  db = new DatabaseSync(join(dir, "leasecheck.db"));
  db.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL,
      file_name   TEXT NOT NULL,
      created_at  INTEGER NOT NULL,
      flag_count  INTEGER NOT NULL,
      result_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS reports_by_user ON reports (user_id, created_at DESC);
  `);
  return db;
}

export function saveReport(userId: string, fileName: string, result: CheckResult): string {
  const d = open();
  const id = randomUUID();
  d.prepare(
    "INSERT INTO reports (id, user_id, file_name, created_at, flag_count, result_json) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(id, userId, fileName.slice(0, 200), Date.now(), result.matches.length, JSON.stringify(result));

  // Keep each user's history to a sensible size.
  d.prepare(
    `DELETE FROM reports WHERE user_id = ? AND id NOT IN (
       SELECT id FROM reports WHERE user_id = ? ORDER BY created_at DESC LIMIT ?
     )`,
  ).run(userId, userId, MAX_PER_USER);
  return id;
}

export function listReports(userId: string): ReportSummary[] {
  const rows = open()
    .prepare(
      "SELECT id, file_name, created_at, flag_count FROM reports WHERE user_id = ? ORDER BY created_at DESC",
    )
    .all(userId) as { id: string; file_name: string; created_at: number; flag_count: number }[];
  return rows.map((r) => ({
    id: r.id,
    fileName: r.file_name,
    createdAt: r.created_at,
    flagCount: r.flag_count,
  }));
}

/** Returns null if the report doesn't exist or belongs to someone else. */
export function getReport(userId: string, id: string): (ReportSummary & { result: CheckResult }) | null {
  const r = open()
    .prepare(
      "SELECT id, file_name, created_at, flag_count, result_json FROM reports WHERE user_id = ? AND id = ?",
    )
    .get(userId, id) as
    | { id: string; file_name: string; created_at: number; flag_count: number; result_json: string }
    | undefined;
  if (!r) return null;
  return {
    id: r.id,
    fileName: r.file_name,
    createdAt: r.created_at,
    flagCount: r.flag_count,
    result: JSON.parse(r.result_json) as CheckResult,
  };
}

export function deleteReport(userId: string, id: string): boolean {
  const res = open().prepare("DELETE FROM reports WHERE user_id = ? AND id = ?").run(userId, id);
  return Number(res.changes) > 0;
}
