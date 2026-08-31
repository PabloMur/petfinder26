import { createClient } from "@/lib/supabase/client";

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
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_my_alerts", { p_claim_tokens: claimTokens });
  if (error) throw error;
  return data;
}

export async function markAlertsRead(alertIds: string[], claimTokens: string[]): Promise<void> {
  if (alertIds.length === 0 || claimTokens.length === 0) return;
  const supabase = createClient();
  const { error } = await supabase.rpc("mark_alerts_read", {
    p_alert_ids: alertIds,
    p_claim_tokens: claimTokens,
  });
  if (error) throw error;
}
