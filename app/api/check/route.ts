// POST /api/check — upload a lease (multipart form field "file"), get back
// the verified flags in the shared JSON shape.
// Login check uses Arya's Auth0 client in lib/auth0.ts (SDK v4).
import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { analyzeLease, LeaseCheckError } from "@/lib/analyzeLease";

export const runtime = "nodejs"; // needs Buffer and the PDF reader
export const maxDuration = 60; // Gemini can take ~30 s

const MAX_BYTES = 15 * 1024 * 1024; // inline Gemini requests cap out near 20 MB
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export async function POST(req: Request) {
  const session = await auth0.getSession();
  if (!session) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Send the lease as multipart form data." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No file uploaded. Use the form field \"file\"." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Upload a PDF or a photo (JPG, PNG, WEBP or HEIC)." }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "That file is too big. The limit is 15 MB." }, { status: 413 });
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const result = await analyzeLease(bytes, file.type);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/check]", err);
    const status = err instanceof LeaseCheckError ? err.status : 500;
    const message =
      err instanceof LeaseCheckError && err.userFacing
        ? err.message
        : "We couldn't check this lease right now. Please try again in a minute.";
    return NextResponse.json({ error: message }, { status });
  }
}
