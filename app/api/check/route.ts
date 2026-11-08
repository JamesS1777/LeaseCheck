// Owner: Arya — auth + upload handling. Samuel's AI logic is in lib/analyzeLease.ts.
//
// POST /api/check   (multipart/form-data, field name "file" — matches James's UI)
//   401  not signed in
//   400  no file / empty file / not a PDF or image
//   413  file too big
//   502  the AI check failed
//   200  CheckResult (see lib/types.ts)
// Error bodies are { error: "plain-English message" }, safe to show users.
import { auth0 } from "@/lib/auth0";
import { analyzeLease } from "@/lib/analyzeLease";
import { MAX_BYTES, sniffMimeType } from "@/lib/fileCheck";

export const maxDuration = 60; // Gemini can take ~30s on a long lease

const json = (body: unknown, status = 200) => Response.json(body, { status });
const tooBig = () =>
  json(
    { error: `That file is too big. The limit is ${Math.round(MAX_BYTES / 1024 / 1024)} MB.` },
    413,
  );

export async function POST(request: Request) {
  // 1. Signed in? Leases have names, addresses and signatures — never anonymous.
  const session = await auth0.getSession();
  if (!session) return json({ error: "Please sign in first." }, 401);

  // 2. Reject oversized uploads before reading them (+1 MB for form overhead).
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES + 1024 * 1024) return tooBig();

  // 3. Read the upload.
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "Upload your lease as a PDF or photo." }, 400);
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return json({ error: "No file received. Choose a PDF or photo of your lease." }, 400);
  }
  if (file.size === 0) return json({ error: "That file is empty." }, 400);
  if (file.size > MAX_BYTES) return tooBig();

  // 4. Check the real type from the file's bytes, not its name or label.
  const data = Buffer.from(await file.arrayBuffer());
  const mimeType = sniffMimeType(data);
  if (!mimeType) {
    return json(
      { error: "That doesn't look like a PDF or photo. Try a PDF, JPG, PNG, WebP or HEIC." },
      400,
    );
  }

  // 5. Hand off to Samuel's checker.
  try {
    const result = await analyzeLease({ data, mimeType, fileName: file.name });
    return json(result);
  } catch (err) {
    // Log details for us; give the user a plain message. Never log lease text.
    console.error(
      `[api/check] analyzeLease failed for user ${session.user.sub}:`,
      err instanceof Error ? err.message : err,
    );
    return json(
      { error: "We couldn't check this lease right now. Please try again in a minute." },
      502,
    );
  }
}
