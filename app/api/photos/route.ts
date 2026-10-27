import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { db } from "@/lib/server/db";

export const runtime = "nodejs";

const PHOTO_PATH =
  /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/i;

// Issues the short-lived token the browser needs to upload one photo straight
// to Vercel Blob. Photos don't pass through this function, so a 5 MB photo
// isn't held back by the serverless request-body limit; the type and size
// limits are baked into the token instead.
export async function POST(request: Request) {
  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return Response.json({ error: "La foto no es válida." }, { status: 400 });
  }

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const match = PHOTO_PATH.exec(pathname);
        if (!match) throw new Error("Las fotos tienen que ser JPG, PNG o WebP.");

        // Locking the pass row serializes concurrent uploads, so the six-photo
        // cap holds even when every photo is requested at once.
        const { rowCount } = await db.query(
          `update publish_verifications
              set photo_paths = array_append(photo_paths, $2)
            where id = $1
              and consumed_at is null
              and expires_at > now()
              and cardinality(photo_paths) < 6`,
          [match[1], pathname],
        );
        if (!rowCount) throw new Error("La verificación venció o ya se subieron seis fotos.");

        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
          maximumSizeInBytes: 5 * 1024 * 1024,
          addRandomSuffix: false,
        };
      },
    });
    return Response.json(result);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "No se pudo subir la foto." },
      { status: 400 },
    );
  }
}
