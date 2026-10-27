import { z } from "zod";
import { db } from "@/lib/server/db";
import { badRequest, readJson, uuid } from "@/lib/server/validation";

export const runtime = "nodejs";

// POST rather than GET only to carry the id list in a body; the ids come from
// the browser's own localStorage (published or saved reports).
const MyReportsBody = z.object({ ids: z.array(uuid).max(200) });

export async function POST(request: Request) {
  const body = await readJson(request, MyReportsBody);
  if (!body) return badRequest();
  if (body.ids.length === 0) return Response.json([]);

  const { rows } = await db.query(
    `select r.id, r.type, r.species, r.name, r.address_label, r.status, r.closed_reason, r.created_at,
            (select count(*)::int from matches m
              where r.id in (m.lost_report_id, m.found_report_id)) as "matchCount"
       from reports_public r
      where r.id = any($1::uuid[])
      order by r.created_at desc`,
    [body.ids],
  );
  return Response.json(rows, { headers: { "Cache-Control": "no-store" } });
}
