const STORAGE_KEY = "pet-finder:my-reports";

// Anonymous publishers own their report via a random token minted client-side
// and never sent back by the server (see migration 0004) — this is the only
// place it lives, mapped by report id so a later visit can tell "is this
// mine?" and, if so, pass the token to close_report() to edit/close it.
function getMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

// A fresh token has to exist before the insert (claim_token is required on
// the row); once the insert returns an id, pair them with saveClaimToken.
export function generateClaimToken(): string {
  return crypto.randomUUID();
}

export function saveClaimToken(reportId: string, token: string): void {
  const map = getMap();
  map[reportId] = token;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function getClaimToken(reportId: string): string | null {
  return getMap()[reportId] ?? null;
}

export function ownsReport(reportId: string): boolean {
  return getClaimToken(reportId) !== null;
}
