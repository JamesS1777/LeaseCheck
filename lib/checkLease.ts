import type { CheckResult } from "./types";
import mock from "@/mock-result.json";
import mockClean from "@/mock-clean-result.json";

// Flip to false once Samuel's /api/check returns real JSON (sync point 3).
// Or set NEXT_PUBLIC_USE_MOCK=false in .env.local.
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

export const ACCEPTED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];
export const MAX_BYTES = 15 * 1024 * 1024; // 15 MB, same as /api/check

/** Returns a user-facing error message, or null if the file looks OK. */
export function validateFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return "That file type isn't supported. Upload a PDF or a photo (JPG, PNG, WebP or HEIC).";
  }
  if (file.size > MAX_BYTES) {
    return "That file is over 15 MB. Try a smaller PDF or a lower-resolution photo.";
  }
  return null;
}

export async function checkLease(file: File): Promise<CheckResult> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 2500)); // pretend to think
    // For demo practice: a file with "clean" or "standard" in its name gets the no-flags result.
    return (/clean|standard/i.test(file.name) ? mockClean : mock) as CheckResult;
  }

  const body = new FormData();
  body.append("file", file);

  const res = await fetch("/api/check", { method: "POST", body });
  if (res.status === 401) {
    throw new Error("Your session expired. Sign in again, then re-upload your lease.");
  }
  if (!res.ok) {
    // /api/check sends a readable reason, e.g. for the Adobe-only Ontario form (422).
    let message = "We couldn't check that lease. Try again in a minute.";
    try {
      const data = await res.json();
      if (typeof data?.error === "string" && data.error.trim()) message = data.error;
    } catch {}
    throw new Error(message);
  }
  return (await res.json()) as CheckResult;
}
