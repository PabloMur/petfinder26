import { createClient } from "@/lib/supabase/client";
import type { ReportType, Species } from "@/lib/supabase/reports";

export type MatchCandidate = {
  id: string;
  name: string | null;
  species: Species;
  photos: string[];
  address_label: string | null;
  seen_at: string;
  tags: string[];
};

export type Match = {
  id: string;
  score: number;
  matched_attrs: string[];
  status: "pending" | "confirmed" | "dismissed";
  created_at: string;
  lost_report_id: string;
  found_report_id: string;
  lost: MatchCandidate;
  found: MatchCandidate;
};

const CANDIDATE_COLS = "id, name, species, photos, address_label, seen_at, tags";

export async function fetchMatchesForReport(reportId: string): Promise<Match[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("matches")
    .select(
      `id, score, matched_attrs, status, created_at, lost_report_id, found_report_id,
       lost:reports!matches_lost_report_id_fkey(${CANDIDATE_COLS}),
       found:reports!matches_found_report_id_fkey(${CANDIDATE_COLS})`,
    )
    .or(`lost_report_id.eq.${reportId},found_report_id.eq.${reportId}`)
    .order("score", { ascending: false });
  if (error) throw error;
  return data as unknown as Match[];
}

export async function updateMatchStatus(
  matchId: string,
  claimToken: string,
  status: "confirmed" | "dismissed",
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("update_match_status", {
    p_match_id: matchId,
    p_claim_token: claimToken,
    p_status: status,
  });
  if (error) throw error;
}

export function otherSide(match: Match, myReportId: string): { report: MatchCandidate; type: ReportType } {
  return match.lost_report_id === myReportId
    ? { report: match.found, type: "found" }
    : { report: match.lost, type: "lost" };
}
