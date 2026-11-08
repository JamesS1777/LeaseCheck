// Owner: Arya — saved reports ("History"), stored in a local SQLite file.
// Server only. Every function takes the Auth0 user id (session.user.sub) and
// only ever touches that user's rows, so nobody can see anyone else's leases.
//
// Storage: .data/leasecheck.db in the project folder (git-ignored). Uses Node's
// built-in SQLite (Node 22.13+), so there's nothing extra to install. On an older
// Node, history just reports an error; lease checks keep working.
// Note: on Vercel the disk isn't kept between requests, so history only
// really works when the app runs on a laptop (the demo setup).
import type { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import type { CheckResult } from "./types";

export interface ReportSummary {
  id: string;
  fileName: string;
  createdAt: number; // ms since epoch
  flagCount: number;
}

export interface SavedReport extends ReportSummary {
  result: CheckResult;
}

const DB_PATH = path.join(process.cwd(), ".data", "leasecheck.db");

// Reuse one connection, even across dev hot-reloads.
const globalForDb = globalThis as unknown as { leasecheckDb?: DatabaseSync };

function db(): DatabaseSync {
  if (!globalForDb.leasecheckDb) {
    // Loaded at runtime so an older Node can't break the rest of the app.
    const sqlite = process.getBuiltinModule?.("node:sqlite") as
      | typeof import("node:sqlite")
      | undefined;
    if (!sqlite) throw new Error("History needs Node.js 22.13 or newer (run: node -v).");
    mkdirSync(path.dirname(DB_PATH), { recursive: true });
    const conn = new sqlite.DatabaseSync(DB_PATH);
    conn.exec(`
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
    globalForDb.leasecheckDb = conn;
  }
  return globalForDb.leasecheckDb;
}

export function saveReport(userId: string, fileName: string, result: CheckResult): string {
  const id = randomUUID();
  db()
    .prepare(
      `INSERT INTO reports (id, user_id, file_name, created_at, flag_count, result_json)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(id, userId, fileName.slice(0, 200), Date.now(), result.matches.length, JSON.stringify(result));
  return id;
}

export function listReports(userId: string): ReportSummary[] {
  const rows = db()
    .prepare(
      `SELECT id, file_name, created_at, flag_count FROM reports
       WHERE user_id = ? ORDER BY created_at DESC LIMIT 100`,
    )
    .all(userId) as { id: string; file_name: string; created_at: number; flag_count: number }[];
  return rows.map((r) => ({
    id: r.id,
    fileName: r.file_name,
    createdAt: Number(r.created_at),
    flagCount: Number(r.flag_count),
  }));
}

export function getReport(userId: string, id: string): SavedReport | null {
  const r = db()
    .prepare(
      `SELECT id, file_name, created_at, flag_count, result_json FROM reports
       WHERE id = ? AND user_id = ?`,
    )
    .get(id, userId) as
    | { id: string; file_name: string; created_at: number; flag_count: number; result_json: string }
    | undefined;
  if (!r) return null;
  return {
    id: r.id,
    fileName: r.file_name,
    createdAt: Number(r.created_at),
    flagCount: Number(r.flag_count),
    result: JSON.parse(r.result_json) as CheckResult,
  };
}

export function deleteReport(userId: string, id: string): boolean {
  const info = db().prepare(`DELETE FROM reports WHERE id = ? AND user_id = ?`).run(id, userId);
  return Number(info.changes) > 0;
}
