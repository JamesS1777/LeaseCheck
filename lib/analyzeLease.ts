// Owner: SAMUEL — the AI check lives here. Runs on the server only.
//
// /api/check (Arya) has already confirmed the user is signed in and that the
// file is a real PDF/image under the size limit. It calls analyzeLease() and
// returns whatever this resolves to, so this must return the shared CheckResult
// shape from lib/types.ts.
//
// (Not to be confused with lib/checkLease.ts — that's James's browser code that
// POSTs to /api/check.)
//
// TODO (Samuel): replace the placeholder below with:
//   1. Gemini call (@google/genai, inline base64 + file.mimeType, JSON output)
//   2. quote check (normalize whitespace, drop quotes not in leaseText)
//   3. attach name/explanation/question/source_url from rules.json
// Throw an Error if Gemini fails — the route turns it into a 502 for the UI.
import type { CheckResult, LeaseFile } from "./types";
import mock from "@/mock-result.json";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function analyzeLease(file: LeaseFile): Promise<CheckResult> {
  // Placeholder: returns James's mock so login → upload → results can be
  // tested end to end through the real route before the AI is in.
  return mock as CheckResult;
}
