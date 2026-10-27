// Thin wrapper around the app's route handlers: JSON in, JSON out, and the
// handler's own error message (already in Spanish) surfaced as the Error.
export async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error ?? "No se pudo completar la operación. Probá otra vez.");
  }
  return data as T;
}
