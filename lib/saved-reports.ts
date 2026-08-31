const STORAGE_KEY = "pet-finder:saved-reports";

function getIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function getSavedReportIds(): string[] {
  return getIds();
}

export function isReportSaved(reportId: string): boolean {
  return getIds().includes(reportId);
}

export function toggleSavedReport(reportId: string): boolean {
  const ids = getIds();
  const next = ids.includes(reportId) ? ids.filter((id) => id !== reportId) : [...ids, reportId];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next.includes(reportId);
}
