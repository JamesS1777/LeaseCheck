// Owner: Arya — one saved check.
//   GET    /api/reports/:id  → { id, fileName, createdAt, flagCount, result }
//   DELETE /api/reports/:id  → { ok: true }
// Both return 404 for anything that isn't the signed-in user's own report,
// so nobody can tell whether someone else's report exists.
import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { deleteReport, getReport } from "@/lib/reports";

type Ctx = { params: Promise<{ id: string }> };

const notFound = () => NextResponse.json({ error: "Report not found." }, { status: 404 });

export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth0.getSession();
  if (!session) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

  const { id } = await params;
  try {
    const report = getReport(session.user.sub, id);
    return report ? NextResponse.json(report) : notFound();
  } catch (err) {
    console.error("[/api/reports/:id GET]", err);
    return NextResponse.json({ error: "Couldn't open that report." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth0.getSession();
  if (!session) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

  const { id } = await params;
  try {
    return deleteReport(session.user.sub, id) ? NextResponse.json({ ok: true }) : notFound();
  } catch (err) {
    console.error("[/api/reports/:id DELETE]", err);
    return NextResponse.json({ error: "Couldn't delete that report." }, { status: 500 });
  }
}
