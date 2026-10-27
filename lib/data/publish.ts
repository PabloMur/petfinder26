import { upload } from "@vercel/blob/client";
import { generateClaimToken, saveClaimToken } from "@/lib/claim-token";
import { api } from "@/lib/data/http";
import type { PublishPhoto } from "@/lib/store/publish-store";

export type PublishInput = {
  type: "lost" | "found";
  species: "dog" | "cat" | "other";
  size: "small" | "medium" | "large" | null;
  sex: "male" | "female" | "unknown" | null;
  name: string;
  tags: string[];
  description: string;
  photos: PublishPhoto[];
  location: { lat: number; lng: number };
  addressLabel: string;
  seenAt: string;
  contactWhatsapp: string;
  contactPhone: string;
};

const PHOTO_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function publishReport(
  input: PublishInput,
  publishVerificationId: string,
): Promise<{ id: string }> {
  const claimToken = generateClaimToken();

  // Each photo goes straight from the browser to Vercel Blob, namespaced by
  // the verified pass; /api/photos only issues the upload token.
  const photoUrls = await Promise.all(
    input.photos.map(async ({ file }) => {
      const extension = PHOTO_EXTENSIONS[file.type];
      if (!extension) throw new Error("Las fotos tienen que ser JPG, PNG o WebP.");
      const blob = await upload(`${publishVerificationId}/${crypto.randomUUID()}.${extension}`, file, {
        access: "public",
        handleUploadUrl: "/api/photos",
        contentType: file.type,
      });
      return blob.url;
    }),
  );

  const { id } = await api<{ id: string }>("/api/reports", {
    type: input.type,
    species: input.species,
    size: input.size,
    sex: input.sex,
    name: input.name,
    tags: input.tags,
    description: input.description,
    photos: photoUrls,
    location: input.location,
    addressLabel: input.addressLabel,
    seenAt: input.seenAt,
    contactWhatsapp: input.contactWhatsapp,
    contactPhone: input.contactPhone,
    claimToken,
    verificationId: publishVerificationId,
  });

  saveClaimToken(id, claimToken);
  return { id };
}
