import { createClient } from "@/lib/supabase/client";
import { generateClaimToken, saveClaimToken } from "@/lib/supabase/claim-token";
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

export async function publishReport(input: PublishInput): Promise<{ id: string }> {
  const supabase = createClient();
  const claimToken = generateClaimToken();

  const photoUrls = await Promise.all(
    input.photos.map(async ({ file }) => {
      const path = `${claimToken}/${crypto.randomUUID()}-${file.name}`;
      const { error } = await supabase.storage.from("report-photos").upload(path, file);
      if (error) throw error;
      return supabase.storage.from("report-photos").getPublicUrl(path).data.publicUrl;
    }),
  );

  // Explicit column list on `.select()`: the anon role has no SELECT grant on
  // claim_token (migration 0004), so `.select()`'s default `*` would 401.
  const { data, error } = await supabase
    .from("reports")
    .insert({
      type: input.type,
      species: input.species,
      size: input.size,
      sex: input.sex,
      name: input.name || null,
      tags: input.tags,
      description: input.description || null,
      photos: photoUrls,
      location: `SRID=4326;POINT(${input.location.lng} ${input.location.lat})`,
      address_label: input.addressLabel || null,
      seen_at: input.seenAt,
      contact_whatsapp: input.contactWhatsapp,
      contact_phone: input.contactPhone || null,
      claim_token: claimToken,
    })
    .select("id")
    .single();

  if (error) throw error;

  saveClaimToken(data.id, claimToken);
  return data;
}
