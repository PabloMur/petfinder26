import { api } from "@/lib/data/http";
import type { ReportType, Species } from "@/lib/data/reports";

export type MatchCandidate = {
  id: string;
  name: string | null;
  species: Species;
  photos: string[];
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

export async function fetchMatchesForReport(reportId: string): Promise<Match[]> {
  return api<Match[]>(`/api/reports/${encodeURIComponent(reportId)}/matches`);
}

export async function updateMatchStatus(
  matchId: string,
  claimToken: string,
  status: "confirmed" | "dismissed",
): Promise<void> {
  await api(`/api/matches/${encodeURIComponent(matchId)}/status`, { claimToken, status });
}

export function otherSide(match: Match, myReportId: string): { report: MatchCandidate; type: ReportType } {
  return match.lost_report_id === myReportId
    ? { report: match.found, type: "found" }
    : { report: match.lost, type: "lost" };
}
