import { z } from "zod";

// Route params arrive as raw strings; Postgres would reject a malformed uuid
// with a 500, so check the shape first and answer 404 like any unknown id.
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const uuid = z.string().regex(UUID);

export const location = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export async function readJson<T>(request: Request, schema: z.ZodType<T>): Promise<T | null> {
  try {
    const parsed = schema.safeParse(await request.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function notFound(message = "No encontramos ese reporte.") {
  return Response.json({ error: message }, { status: 404 });
}

export function badRequest(message = "Los datos enviados no son válidos.") {
  return Response.json({ error: message }, { status: 400 });
}
