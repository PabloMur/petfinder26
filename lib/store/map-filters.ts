import { create } from "zustand";
import type { Species } from "@/lib/supabase/reports";

export type StatusFilter = "all" | "lost" | "found";
export type DateFilter = "today" | "7d" | "30d";

type MapFilters = {
  status: StatusFilter;
  species: Species | null;
  radiusKm: number;
  date: DateFilter;
  photoOnly: boolean;
  set: (patch: Partial<Omit<MapFilters, "set" | "reset">>) => void;
  reset: () => void;
};

const initial = {
  status: "all" as StatusFilter,
  species: null as Species | null,
  radiusKm: 5,
  date: "30d" as DateFilter,
  photoOnly: false,
};

export const useMapFilters = create<MapFilters>((set) => ({
  ...initial,
  set: (patch) => set(patch),
  reset: () => set(initial),
}));

export function isDefaultFilters(f: Pick<MapFilters, "status" | "species" | "radiusKm" | "date" | "photoOnly">) {
  return (
    f.status === initial.status &&
    f.species === initial.species &&
    f.radiusKm === initial.radiusKm &&
    f.date === initial.date &&
    f.photoOnly === initial.photoOnly
  );
}
