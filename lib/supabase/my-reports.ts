import { createClient } from "@/lib/supabase/client";
import type { ReportType, Species } from "@/lib/supabase/reports";

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

const COLUMNS = "id, type, species, name, address_label, status, closed_reason, created_at";

export async function fetchMyReports(ids: string[]): Promise<MyReport[]> {
  if (ids.length === 0) return [];
  const supabase = createClient();

  const [{ data: reports, error: reportsError }, { data: matches, error: matchesError }] =
    await Promise.all([
      supabase.from("reports_public").select(COLUMNS).in("id", ids),
      supabase
        .from("matches")
        .select("lost_report_id, found_report_id")
        .or(`lost_report_id.in.(${ids.join(",")}),found_report_id.in.(${ids.join(",")})`),
    ]);

  if (reportsError) throw reportsError;
  if (matchesError) throw matchesError;

  const matchCounts = new Map<string, number>();
  for (const m of matches ?? []) {
    matchCounts.set(m.lost_report_id, (matchCounts.get(m.lost_report_id) ?? 0) + 1);
    matchCounts.set(m.found_report_id, (matchCounts.get(m.found_report_id) ?? 0) + 1);
  }

  return (reports ?? [])
    .map((r) => ({ ...r, matchCount: matchCounts.get(r.id) ?? 0 }))
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}
