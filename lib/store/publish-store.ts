import { create } from "zustand";

export type PublishPhoto = { file: File; previewUrl: string };

type PublishData = {
  type: "lost" | "found" | null;
  photos: PublishPhoto[];
  name: string;
  species: "dog" | "cat" | "other" | null;
  size: "small" | "medium" | "large" | null;
  sex: "male" | "female" | "unknown" | null;
  tags: string[];
  description: string;
  location: { lat: number; lng: number } | null;
  addressLabel: string;
  seenDate: string;
  seenTime: string;
  contactWhatsapp: string;
  contactPhone: string;
};

type PublishStore = PublishData & {
  set: (patch: Partial<PublishData>) => void;
  addPhotos: (files: File[]) => number;
  removePhoto: (index: number) => void;
  toggleTag: (tag: string) => void;
  reset: () => void;
};

const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toTimeString().slice(0, 5);

const initial: PublishData = {
  type: null,
  photos: [],
  name: "",
  species: null,
  size: null,
  sex: null,
  tags: [],
  description: "",
  location: null,
  addressLabel: "",
  seenDate: today(),
  seenTime: now(),
  contactWhatsapp: "",
  contactPhone: "",
};

export const usePublishStore = create<PublishStore>((set, get) => ({
  ...initial,
  set: (patch) => set(patch),
  addPhotos: (files) => {
    const room = 6 - get().photos.length;
    const accepted = files
      .filter((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size <= 5 * 1024 * 1024)
      .slice(0, room);
    const next = accepted.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    set({ photos: [...get().photos, ...next] });
    return files.length - accepted.length;
  },
  removePhoto: (index) => {
    const photos = [...get().photos];
    URL.revokeObjectURL(photos[index].previewUrl);
    photos.splice(index, 1);
    set({ photos });
  },
  toggleTag: (tag) => {
    const tags = get().tags;
    set({
      tags: tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag],
    });
  },
  reset: () => {
    get().photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    set({ ...initial, seenDate: today(), seenTime: now() });
  },
}));
