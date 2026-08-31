"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { useMapFilters, type DateFilter, type StatusFilter } from "@/lib/store/map-filters";
import type { Species } from "@/lib/supabase/reports";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Todo" },
  { value: "lost", label: "Perdidas" },
  { value: "found", label: "Encontradas" },
];

const SPECIES_OPTIONS: { value: Species; label: string }[] = [
  { value: "dog", label: "Perro" },
  { value: "cat", label: "Gato" },
  { value: "other", label: "Otro" },
];

const DATE_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: "today", label: "Hoy" },
  { value: "7d", label: "7 días" },
  { value: "30d", label: "30 días" },
];

export default function FiltrosPage() {
  const router = useRouter();
  const { status, species, radiusKm, date, photoOnly, set, reset } = useMapFilters();

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex items-center gap-3 px-5 pt-5">
        <button onClick={() => router.back()} aria-label="Volver">
          <Icon name="arrow_back" size={24} />
        </button>
        <span className="text-[19px] font-semibold">Filtros</span>
        <button onClick={reset} className="ml-auto text-[14px] font-medium text-primary">
          Limpiar
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-6 px-5 py-5">
        <Section label="Estado">
          <ToggleRow options={STATUS_OPTIONS} value={status} onChange={(v) => set({ status: v })} />
        </Section>

        <Section label="Especie">
          <div className="flex flex-wrap gap-2">
            {SPECIES_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => set({ species: species === opt.value ? null : opt.value })}
                className={`rounded-[20px] px-4 py-2.5 text-[13.5px] font-semibold ${
                  species === opt.value ? "bg-ink text-white" : "bg-surface-muted text-ink-muted"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Section>

        <Section label="Distancia" trailing={<span className="text-[14px] font-semibold text-primary">{radiusKm} km</span>}>
          <input
            type="range"
            min={1}
            max={20}
            value={radiusKm}
            onChange={(e) => set({ radiusKm: Number(e.target.value) })}
            className="w-full accent-[#7B2CBF]"
          />
        </Section>

        <Section label="Cuándo">
          <ToggleRow options={DATE_OPTIONS} value={date} onChange={(v) => set({ date: v })} />
        </Section>

        <div className="flex items-center justify-between rounded-2xl bg-surface-muted px-4 py-4">
          <span className="max-w-[220px] text-[14px] font-medium">Solo reportes con foto</span>
          <button
            onClick={() => set({ photoOnly: !photoOnly })}
            aria-pressed={photoOnly}
            className={`relative h-7 w-12 rounded-full transition-colors ${photoOnly ? "bg-primary" : "bg-ink/20"}`}
          >
            <div
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-transform ${
                photoOnly ? "translate-x-[22px]" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      </div>

      <div className="px-5 pb-8">
        <button
          onClick={() => router.push("/mapa")}
          className="h-14 w-full rounded-[18px] bg-primary text-[16px] font-semibold text-white"
        >
          Ver resultados
        </button>
      </div>
    </div>
  );
}

function Section({
  label,
  trailing,
  children,
}: {
  label: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[14px] font-semibold">{label}</span>
        {trailing}
      </div>
      {children}
    </div>
  );
}

function ToggleRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`min-w-0 flex-1 rounded-[14px] py-3 text-[13.5px] font-semibold ${
            value === opt.value ? "bg-ink text-white" : "bg-surface-muted text-ink-muted"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
