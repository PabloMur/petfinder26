import { z } from "zod";
import { db } from "@/lib/server/db";
import { badRequest, readJson, uuid } from "@/lib/server/validation";

export const runtime = "nodejs";

const ReadBody = z.object({
  alertIds: z.array(uuid).max(200),
  claimTokens: z.array(uuid).max(200),
});

export async function POST(request: Request) {
  const body = await readJson(request, ReadBody);
  if (!body) return badRequest();

  await db.query(
    `update alerts set read_at = now()
      where id = any($1::uuid[])
        and read_at is null
        and claim_token = any($2::uuid[])`,
    [body.alertIds, body.claimTokens],
  );
  return Response.json({ ok: true });
}
