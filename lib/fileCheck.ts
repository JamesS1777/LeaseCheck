// Owner: Arya — server-side upload checks used by /api/check.
// (James's lib/checkLease.ts does a quick check in the browser too; this is the
// one that can't be bypassed.)
import type { AllowedMimeType } from "./types";

// Vercel rejects request bodies over 4.5 MB, so stay under it when deployed.
// Running locally (the demo), allow up to 10 MB, matching the upload form.
export const MAX_BYTES = process.env.VERCEL ? 4 * 1024 * 1024 : 10 * 1024 * 1024;

const ascii = (b: Uint8Array, start: number, end: number) =>
  String.fromCharCode(...b.subarray(start, end));

/**
 * Work out the real file type from its first bytes instead of trusting the
 * browser's label or the file extension. Returns null for anything we don't accept.
 */
export function sniffMimeType(bytes: Uint8Array): AllowedMimeType | null {
  if (bytes.length < 12) return null;
  if (ascii(bytes, 0, 5) === "%PDF-") return "application/pdf";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && ascii(bytes, 1, 4) === "PNG" && bytes[4] === 0x0d && bytes[5] === 0x0a)
    return "image/png";
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") return "image/webp";
  if (ascii(bytes, 4, 8) === "ftyp") {
    // iPhone photos (HEIC/HEIF). Gemini takes both as image/heic.
    const brand = ascii(bytes, 8, 12);
    if (["heic", "heix", "hevc", "heim", "heis", "mif1", "msf1"].includes(brand))
      return "image/heic";
  }
  return null;
}
