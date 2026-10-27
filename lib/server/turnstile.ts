type SiteverifyResponse = {
  success: boolean;
  action?: string;
  hostname?: string;
};

type TurnstileResult = { ok: true } | { ok: false; status: number; error: string };

function hostnameAllowed(hostname: string | undefined): boolean {
  if (!hostname) return false;
  const configured = process.env.TURNSTILE_ALLOWED_HOSTNAMES;
  if (!configured) return false;

  return configured.split(",").some((entry) => {
    const allowed = entry.trim().toLowerCase();
    const actual = hostname.toLowerCase();
    return allowed.startsWith("*.")
      ? actual.endsWith(allowed.slice(1)) && actual !== allowed.slice(2)
      : actual === allowed;
  });
}

export async function verifyTurnstileToken(token: string, expectedAction: string): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret || !process.env.TURNSTILE_ALLOWED_HOSTNAMES) {
    return { ok: false, status: 503, error: "La verificación antispam no está configurada." };
  }

  const form = new URLSearchParams({ secret, response: token });
  let verification: SiteverifyResponse;
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Siteverify request failed");
    verification = (await response.json()) as SiteverifyResponse;
  } catch {
    return { ok: false, status: 502, error: "No se pudo validar el desafío. Probá otra vez." };
  }

  if (
    !verification.success ||
    verification.action !== expectedAction ||
    !hostnameAllowed(verification.hostname)
  ) {
    return { ok: false, status: 400, error: "La verificación venció o no es válida. Probá otra vez." };
  }

  return { ok: true };
}
