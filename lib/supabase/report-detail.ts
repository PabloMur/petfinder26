import { createClient } from "@/lib/supabase/client";
import type { ReportType, Species } from "@/lib/supabase/reports";

export type ReportDetail = {
  id: string;
  type: ReportType;
  species: Species;
  size: "small" | "medium" | "large" | null;
  sex: "male" | "female" | "unknown" | null;
  name: string | null;
  tags: string[];
  description: string | null;
  photos: string[];
  address_label: string | null;
  radius_m: number;
  seen_at: string;
  contact_whatsapp: string | null;
  contact_phone: string | null;
  status: "active" | "closed";
  closed_reason: "reunion" | "other" | null;
  created_at: string;
};

const COLUMNS =
  "id, type, species, size, sex, name, tags, description, photos, address_label, radius_m, seen_at, contact_whatsapp, contact_phone, status, closed_reason, created_at";

export async function fetchReportDetail(id: string): Promise<ReportDetail | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from("reports").select(COLUMNS).eq("id", id).single();
  if (error) return null;
  return data;
}

export async function closeReport(id: string, claimToken: string, reason: "reunion" | "other") {
  const supabase = createClient();
  const { error } = await supabase.rpc("close_report", {
    p_report_id: id,
    p_claim_token: claimToken,
    p_reason: reason,
  });
  if (error) throw error;
}
