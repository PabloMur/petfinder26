import { z } from "zod";
import { db } from "@/lib/server/db";
import { badRequest, location, readJson, uuid } from "@/lib/server/validation";

export const runtime = "nodejs";

export async function GET() {
  const { rows } = await db.query("select * from reports_map order by created_at desc");
  return Response.json(rows, { headers: { "Cache-Control": "no-store" } });
}

const PublishBody = z.object({
  type: z.enum(["lost", "found"]),
  species: z.enum(["dog", "cat", "other"]),
  size: z.enum(["small", "medium", "large"]).nullable(),
  sex: z.enum(["male", "female", "unknown"]).nullable(),
  name: z.string().max(80),
  tags: z.array(z.string().min(1).max(40)).max(20),
  description: z.string().max(2000),
  photos: z.array(z.url()).max(6),
  location,
  addressLabel: z.string().max(300),
  seenAt: z.iso.datetime(),
  contactWhatsapp: z.string().trim().min(1).max(40),
  contactPhone: z.string().trim().max(40),
  claimToken: uuid,
  verificationId: uuid,
});

// Photos are uploaded straight to Vercel Blob (see /api/photos), which records
// each pathname on the pass. A report may only reference photos from its own
// pass, so the insert can't be pointed at arbitrary URLs.
function photoPath(url: string): string | null {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".public.blob.vercel-storage.com")) {
    return null;
  }
  return decodeURIComponent(parsed.pathname.slice(1));
}

export async function POST(request: Request) {
  const body = await readJson(request, PublishBody);
  if (!body) return badRequest("Revisá los datos del reporte.");

  const { rows: passes } = await db.query<{ photo_paths: string[] }>(
    "select photo_paths from publish_verifications where id = $1 and consumed_at is null and expires_at > now()",
    [body.verificationId],
  );
  if (passes.length === 0) {
    return badRequest("La verificación venció o no es válida. Probá otra vez.");
  }

  const allowed = new Set(passes[0].photo_paths);
  if (!body.photos.every((url) => allowed.has(photoPath(url) ?? ""))) {
    return badRequest("Alguna foto no se subió correctamente. Probá otra vez.");
  }

  try {
    // The insert trigger spends the pass, so two concurrent requests with the
    // same verificationId can't both publish.
    const { rows } = await db.query<{ id: string }>(
      `insert into reports (
         type, species, size, sex, name, tags, description, photos, location,
         address_label, seen_at, contact_whatsapp, contact_phone, claim_token, publish_verification_id
       ) values (
         $1, $2, $3, $4, $5, $6, $7, $8, ST_SetSRID(ST_MakePoint($9, $10), 4326)::geography,
         $11, $12, $13, $14, $15, $16
       ) returning id`,
      [
        body.type,
        body.species,
        body.size,
        body.sex,
        body.name || null,
        body.tags,
        body.description || null,
        body.photos,
        body.location.lng,
        body.location.lat,
        body.addressLabel || null,
        body.seenAt,
        body.contactWhatsapp,
        body.contactPhone || null,
        body.claimToken,
        body.verificationId,
      ],
    );
    return Response.json({ id: rows[0].id }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return badRequest("La verificación venció o no es válida. Probá otra vez.");
  }
}
