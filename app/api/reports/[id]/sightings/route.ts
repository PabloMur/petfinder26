import { z } from "zod";
import { db } from "@/lib/server/db";
import { badRequest, location, notFound, readJson, UUID } from "@/lib/server/validation";

export const runtime = "nodejs";

export async function GET(_request: Request, ctx: RouteContext<"/api/reports/[id]/sightings">) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return notFound();

  const { rows } = await db.query(
    "select * from sightings_geo where report_id = $1 order by created_at desc",
    [id],
  );
  return Response.json(rows, { headers: { "Cache-Control": "no-store" } });
}

const SightingBody = z.object({
  note: z.string().max(500),
  location,
});

export async function POST(request: Request, ctx: RouteContext<"/api/reports/[id]/sightings">) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return notFound();

  const body = await readJson(request, SightingBody);
  if (!body) return badRequest();

  const { rowCount } = await db.query(
    `insert into sightings (report_id, note, location)
     select id, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography
       from reports
      where id = $1 and status = 'active'`,
    [id, body.note || null, body.location.lng, body.location.lat],
  );
  if (!rowCount) return notFound();
  return Response.json({ ok: true });
}
