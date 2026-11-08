// GET /api/reports — the signed-in user's past checks, newest first.
import { auth0 } from "@/lib/auth0";
import { listReports } from "@/lib/reports";

export async function GET() {
  const session = await auth0.getSession();
  if (!session) return Response.json({ error: "Please sign in first." }, { status: 401 });
  try {
    return Response.json({ reports: listReports(session.user.sub) });
  } catch (err) {
    console.error("[/api/reports]", err instanceof Error ? err.message : err);
    return Response.json({ error: "Couldn't load your past checks." }, { status: 500 });
  }
}
