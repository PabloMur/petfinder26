import { z } from "zod";
import { db } from "@/lib/server/db";
import { badRequest, notFound, readJson, uuid, UUID } from "@/lib/server/validation";

export const runtime = "nodejs";

const StatusBody = z.object({
  claimToken: uuid,
  status: z.enum(["confirmed", "dismissed"]),
});

export async function POST(request: Request, ctx: RouteContext<"/api/matches/[id]/status">) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return notFound("No encontramos esa coincidencia.");

  const body = await readJson(request, StatusBody);
  if (!body) return badRequest();

  // Either side's publisher may confirm or dismiss the match.
  const { rowCount } = await db.query(
    `update matches m set status = $3
      where m.id = $1
        and exists (
          select 1 from reports r
           where r.id in (m.lost_report_id, m.found_report_id)
             and r.claim_token = $2
        )`,
    [id, body.claimToken, body.status],
  );
  if (!rowCount) return notFound("No encontramos esa coincidencia.");
  return Response.json({ ok: true });
}
