import { z } from "zod";
import { db } from "@/lib/server/db";
import { badRequest, notFound, readJson, uuid, UUID } from "@/lib/server/validation";

export const runtime = "nodejs";

const CloseBody = z.object({
  claimToken: uuid,
  reason: z.enum(["reunion", "other"]),
});

export async function POST(request: Request, ctx: RouteContext<"/api/reports/[id]/close">) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return notFound();

  const body = await readJson(request, CloseBody);
  if (!body) return badRequest();

  // Only the browser that published the report holds its claim_token.
  const { rowCount } = await db.query(
    `update reports set status = 'closed', closed_reason = $3
      where id = $1 and claim_token = $2 and status = 'active'`,
    [id, body.claimToken, body.reason],
  );
  if (!rowCount) return notFound();
  return Response.json({ ok: true });
}
