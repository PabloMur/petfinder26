import { api } from "@/lib/data/http";

export type Alert = {
  id: string;
  type: "match" | "sighting" | "reunion";
  report_id: string;
  message: string;
  read_at: string | null;
  created_at: string;
};

export async function fetchMyAlerts(claimTokens: string[]): Promise<Alert[]> {
  if (claimTokens.length === 0) return [];
  return api<Alert[]>("/api/alerts", { claimTokens });
}

export async function markAlertsRead(alertIds: string[], claimTokens: string[]): Promise<void> {
  if (alertIds.length === 0 || claimTokens.length === 0) return;
  await api("/api/alerts/read", { alertIds, claimTokens });
}
