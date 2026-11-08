// Shared data shape returned by /api/check (agreed in the project plan).
// Do not rename fields without telling Samuel and Arya.

export type RuleId =
  | "illegal_deposit"
  | "no_pets"
  | "tenant_repairs"
  | "not_standard_lease"
  | "post_dated_cheques"
  | "end_anytime"
  | "rent_increase"
  | "forced_cleaning";

export interface Match {
  rule_id: RuleId | string;
  quote: string;
  name: string;
  explanation: string;
  question: string;
  source_url: string;
}

export type { Summary } from "./summary";
import type { Summary } from "./summary";

export interface CheckResult {
  leaseText: string;
  matches: Match[];
  droppedCount: number;
  // Final verdict, questions and next steps (Samuel, lib/summary.ts).
  // Optional: older saved reports and the mock files don't have it.
  summary?: Summary;
}

// Server-side only (Arya → Samuel): what /api/check hands to analyzeLease().
export type AllowedMimeType =
  | "application/pdf"
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/heic";

export interface LeaseFile {
  data: Buffer;
  mimeType: AllowedMimeType;
  fileName: string;
}
