import { createClient } from "@supabase/supabase-js";
import { verifyTurnstileToken } from "@/lib/server/turnstile";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseSecret) {
    return Response.json({ error: "La verificación antispam no está configurada." }, { status: 503 });
  }

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

  const supabase = createClient(supabaseUrl, supabaseSecret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  await supabase
    .from("publish_verifications")
    .delete()
    .lt("expires_at", new Date().toISOString());

  const verificationId = crypto.randomUUID();
  const { error } = await supabase.from("publish_verifications").insert({ id: verificationId });

  if (error) {
    return Response.json({ error: "No se pudo preparar la publicación." }, { status: 503 });
  }

  return Response.json({ verificationId }, { headers: { "Cache-Control": "no-store" } });
}
