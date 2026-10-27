import { api } from "@/lib/data/http";
import type { ReportType, Species } from "@/lib/data/reports";

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
  contact_whatsapp?: string | null;
  contact_phone?: string | null;
  status: "active" | "closed";
  closed_reason: "reunion" | "other" | null;
  created_at: string;
};

export async function fetchReportDetail(id: string): Promise<ReportDetail | null> {
  try {
    return await api<ReportDetail>(`/api/reports/${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
}

export async function closeReport(id: string, claimToken: string, reason: "reunion" | "other") {
  await api(`/api/reports/${encodeURIComponent(id)}/close`, { claimToken, reason });
}
