import { db } from "@/lib/server/db";
import { notFound, UUID } from "@/lib/server/validation";

export const runtime = "nodejs";

// Each side of a match comes back with only the fields the review screen
// shows — never contact details or the claim_token.
export async function GET(_request: Request, ctx: RouteContext<"/api/reports/[id]/matches">) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return notFound();

  const { rows } = await db.query(
    `select m.id, m.score, m.matched_attrs, m.status, m.created_at, m.lost_report_id, m.found_report_id,
            json_build_object('id', l.id, 'name', l.name, 'species', l.species,
                              'photos', l.photos, 'seen_at', l.seen_at, 'tags', l.tags) as lost,
            json_build_object('id', f.id, 'name', f.name, 'species', f.species,
                              'photos', f.photos, 'seen_at', f.seen_at, 'tags', f.tags) as found
       from matches m
       join reports l on l.id = m.lost_report_id
       join reports f on f.id = m.found_report_id
      where $1 in (m.lost_report_id, m.found_report_id)
      order by m.score desc`,
    [id],
  );
  return Response.json(rows, { headers: { "Cache-Control": "no-store" } });
}
