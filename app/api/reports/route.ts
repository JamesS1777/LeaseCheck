// Owner: Arya — GET /api/reports: the signed-in user's saved checks, newest first.
import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { listReports } from "@/lib/reports";

export async function GET() {
  const session = await auth0.getSession();
  if (!session) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }
  try {
    return NextResponse.json({ reports: listReports(session.user.sub) });
  } catch (err) {
    console.error("[/api/reports]", err);
    return NextResponse.json({ error: "Couldn't load your history." }, { status: 500 });
  }
}
