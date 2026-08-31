import { createClient } from "@/lib/supabase/client";

export type Sighting = {
  id: string;
  report_id: string;
  note: string | null;
  photo: string | null;
  lat: number;
  lng: number;
  created_at: string;
};

export async function fetchSightings(reportId: string): Promise<Sighting[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sightings_geo")
    .select("*")
    .eq("report_id", reportId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createSighting(input: {
  reportId: string;
  note: string;
  location: { lat: number; lng: number };
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("sightings").insert({
    report_id: input.reportId,
    note: input.note || null,
    location: `SRID=4326;POINT(${input.location.lng} ${input.location.lat})`,
  });
  if (error) throw error;
}
