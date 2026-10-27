import { db } from "@/lib/server/db";
import { verifyTurnstileToken } from "@/lib/server/turnstile";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { token?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "La verificación no es válida." }, { status: 400 });
  }

  if (typeof body.token !== "string" || body.token.length === 0 || body.token.length > 2048) {
    return Response.json({ error: "Completá la verificación antispam." }, { status: 400 });
  }

  const verified = await verifyTurnstileToken(body.token, "publish");
  if (!verified.ok) {
    return Response.json({ error: verified.error }, { status: verified.status });
  }

  const verificationId = crypto.randomUUID();
  try {
    await db.query("delete from publish_verifications where expires_at < now()");
    await db.query("insert into publish_verifications (id) values ($1)", [verificationId]);
  } catch {
    return Response.json({ error: "No se pudo preparar la publicación." }, { status: 503 });
  }

  return Response.json({ verificationId }, { headers: { "Cache-Control": "no-store" } });
}
