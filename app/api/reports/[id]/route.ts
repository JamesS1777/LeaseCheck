// GET /api/reports/:id — one saved report (only if it's yours).
// DELETE /api/reports/:id — remove it.
import { auth0 } from "@/lib/auth0";
import { deleteReport, getReport } from "@/lib/reports";

const notFound = () => Response.json({ error: "That report wasn't found." }, { status: 404 });

export async function GET(_req: Request, ctx: RouteContext<"/api/reports/[id]">) {
  const session = await auth0.getSession();
  if (!session) return Response.json({ error: "Please sign in first." }, { status: 401 });
  const { id } = await ctx.params;
  const report = getReport(session.user.sub, id);
  return report ? Response.json(report) : notFound();
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/reports/[id]">) {
  const session = await auth0.getSession();
  if (!session) return Response.json({ error: "Please sign in first." }, { status: 401 });
  const { id } = await ctx.params;
  return deleteReport(session.user.sub, id) ? new Response(null, { status: 204 }) : notFound();
}
