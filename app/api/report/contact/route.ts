import { createClient } from "@supabase/supabase-js";
import { verifyTurnstileToken } from "@/lib/server/turnstile";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseSecret) {
    return Response.json({ error: "El contacto no está disponible." }, { status: 503 });
  }

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

  const supabase = createClient(supabaseUrl, supabaseSecret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  let query = supabase
    .from("reports")
    .select("status, claim_token, contact_whatsapp, contact_phone")
    .eq("id", body.reportId);

  if (isOwner) {
    query = query.eq("claim_token", body.claimToken as string);
  } else {
    query = query.eq("status", "active");
  }

  const { data, error } = await query.maybeSingle();
  if (error || !data) {
    return Response.json({ error: "No encontramos ese reporte." }, { status: 404 });
  }

  return Response.json(
    { contactWhatsapp: data.contact_whatsapp, contactPhone: data.contact_phone },
    { headers: { "Cache-Control": "no-store" } },
  );
}
