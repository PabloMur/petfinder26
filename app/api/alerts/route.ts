import { z } from "zod";
import { db } from "@/lib/server/db";
import { badRequest, readJson, uuid } from "@/lib/server/validation";

export const runtime = "nodejs";

// The caller proves which alerts are theirs by presenting the claim tokens of
// the reports they published. Tokens filter the query but are never returned.
const AlertsBody = z.object({ claimTokens: z.array(uuid).max(200) });

export async function POST(request: Request) {
  const body = await readJson(request, AlertsBody);
  if (!body) return badRequest();
  if (body.claimTokens.length === 0) return Response.json([]);

  const { rows } = await db.query(
    `select id, type, report_id, message, read_at, created_at
       from alerts
      where claim_token = any($1::uuid[])
      order by created_at desc`,
    [body.claimTokens],
  );
  return Response.json(rows, { headers: { "Cache-Control": "no-store" } });
}
