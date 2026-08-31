import { createClient } from "@/lib/supabase/client";

export type ReportType = "lost" | "found";
export type Species = "dog" | "cat" | "other";

export type ReportMapPoint = {
  id: string;
  type: ReportType;
  species: Species;
  size: "small" | "medium" | "large" | null;
  sex: "male" | "female" | "unknown" | null;
  name: string | null;
  tags: string[];
  photos: string[];
  address_label: string | null;
  radius_m: number;
  seen_at: string;
  created_at: string;
  lat: number;
  lng: number;
};

export async function fetchActiveReports(): Promise<ReportMapPoint[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("reports_map")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}
