import { api } from "@/lib/data/http";
import type { ReportType, Species } from "@/lib/data/reports";

export type MyReport = {
  id: string;
  type: ReportType;
  species: Species;
  name: string | null;
  address_label: string | null;
  status: "active" | "closed";
  closed_reason: "reunion" | "other" | null;
  created_at: string;
  matchCount: number;
};

export async function fetchMyReports(ids: string[]): Promise<MyReport[]> {
  if (ids.length === 0) return [];
  return api<MyReport[]>("/api/my-reports", { ids });
}
