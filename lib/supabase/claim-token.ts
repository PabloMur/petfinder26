const STORAGE_KEY = "pet-finder:claim-tokens";

// Anonymous publishers own their report via a random token kept in
// localStorage instead of an account — lets them edit/close a case
// without ever signing up.
export function getClaimTokens(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function createClaimToken(): string {
  const token = crypto.randomUUID();
  const tokens = getClaimTokens();
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...tokens, token]));
  return token;
}

export function ownsReport(claimToken: string | null): boolean {
  if (!claimToken) return false;
  return getClaimTokens().includes(claimToken);
}
