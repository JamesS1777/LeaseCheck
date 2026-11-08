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

export interface CheckResult {
  leaseText: string;
  matches: Match[];
  droppedCount: number;
}
