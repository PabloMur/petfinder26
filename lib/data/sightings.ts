import { api } from "@/lib/data/http";

export type Sighting = {
  id: string;
  report_id: string;
  note: string | null;
  photo: string | null;
  lat: number;
  lng: number;
  created_at: string;
};

export async function fetchSightings(reportId: string): Promise<Sighting[]> {
  return api<Sighting[]>(`/api/reports/${encodeURIComponent(reportId)}/sightings`);
}

export async function createSighting(input: {
  reportId: string;
  note: string;
  location: { lat: number; lng: number };
}): Promise<void> {
  await api(`/api/reports/${encodeURIComponent(input.reportId)}/sightings`, {
    note: input.note,
    location: input.location,
  });
}
