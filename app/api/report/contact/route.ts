import { db } from "@/lib/server/db";
import { verifyTurnstileToken } from "@/lib/server/turnstile";
import { UUID } from "@/lib/server/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { reportId?: unknown; claimToken?: unknown; token?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "No encontramos ese reporte." }, { status: 400 });
  }

  if (typeof body.reportId !== "string" || !UUID.test(body.reportId)) {
    return Response.json({ error: "No encontramos ese reporte." }, { status: 400 });
  }

  const isOwner = typeof body.claimToken === "string" && UUID.test(body.claimToken);
  if (!isOwner) {
    if (typeof body.token !== "string" || body.token.length === 0 || body.token.length > 2048) {
      return Response.json({ error: "Completá la verificación para ver el contacto." }, { status: 400 });
    }
    const verified = await verifyTurnstileToken(body.token, "contact");
    if (!verified.ok) {
      return Response.json({ error: verified.error }, { status: verified.status });
    }
  }

  // Owners see their own contact details on any of their reports; everyone
  // else only on active ones, after passing the Turnstile challenge above.
  const { rows } = isOwner
    ? await db.query(
        "select contact_whatsapp, contact_phone from reports where id = $1 and claim_token = $2",
        [body.reportId, body.claimToken],
      )
    : await db.query(
        "select contact_whatsapp, contact_phone from reports where id = $1 and status = 'active'",
        [body.reportId],
      );
  if (rows.length === 0) {
    return Response.json({ error: "No encontramos ese reporte." }, { status: 404 });
  }

  return Response.json(
    { contactWhatsapp: rows[0].contact_whatsapp, contactPhone: rows[0].contact_phone },
    { headers: { "Cache-Control": "no-store" } },
  );
}
