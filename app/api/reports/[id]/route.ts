import { db } from "@/lib/server/db";
import { notFound, UUID } from "@/lib/server/validation";

export const runtime = "nodejs";

export async function GET(_request: Request, ctx: RouteContext<"/api/reports/[id]">) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return notFound();

  const { rows } = await db.query("select * from reports_public where id = $1", [id]);
  if (rows.length === 0) return notFound();
  return Response.json(rows[0], { headers: { "Cache-Control": "no-store" } });
}
