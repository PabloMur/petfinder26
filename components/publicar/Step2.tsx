"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { usePublishStore } from "@/lib/store/publish-store";
import { PrimaryButton, StepShell } from "./StepShell";

const SPECIES = [
  { value: "dog", label: "Perro" },
  { value: "cat", label: "Gato" },
  { value: "other", label: "Otro" },
] as const;

const SIZES = [
  { value: "small", label: "Chico" },
  { value: "medium", label: "Mediano" },
  { value: "large", label: "Grande" },
] as const;

const SEXES = [
  { value: "female", label: "Hembra" },
  { value: "male", label: "Macho" },
  { value: "unknown", label: "No sé" },
] as const;

const SUGGESTED_TAGS = ["Collar rojo", "Con chip", "Castrada/o", "Asustadiza/o"];

export function Step2() {
  const router = useRouter();
  const { species, size, sex, name, tags, description, set, toggleTag } = usePublishStore();
  const [customTag, setCustomTag] = useState("");
  const [addingTag, setAddingTag] = useState(false);

  return (
    <StepShell
      step={2}
      onBack="/publicar/1"
      title="Contame de ella"
      footer={
        <PrimaryButton disabled={!species} onClick={() => router.push("/publicar/3")}>
          Continuar
        </PrimaryButton>
      }
    >
      <Field label="Nombre" optional>
        <input
          value={name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="Nina"
          className="h-[52px] rounded-[15px] border border-ink/[0.14] px-4 text-[15px] outline-none placeholder:text-ink-faint"
        />
      </Field>

      <Field label="Especie">
        <ToggleRow
          options={SPECIES}
          value={species}
          onChange={(v) => set({ species: v })}
        />
      </Field>

      <div className="flex gap-3">
        <Field label="Tamaño" className="flex-1">
          <select
            value={size ?? ""}
            onChange={(e) => set({ size: (e.target.value || null) as typeof size })}
            className="h-[52px] rounded-[15px] border border-ink/[0.14] px-3.5 text-[15px] text-ink outline-none"
          >
            <option value="">Elegir</option>
            {SIZES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Sexo" className="flex-1">
          <select
            value={sex ?? ""}
            onChange={(e) => set({ sex: (e.target.value || null) as typeof sex })}
            className="h-[52px] rounded-[15px] border border-ink/[0.14] px-3.5 text-[15px] text-ink outline-none"
          >
            <option value="">Elegir</option>
            {SEXES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Señas particulares">
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_TAGS.map((tag) => (
            <Chip key={tag} active={tags.includes(tag)} onClick={() => toggleTag(tag)}>
              {tag}
            </Chip>
          ))}
          {tags
            .filter((t) => !SUGGESTED_TAGS.includes(t))
            .map((tag) => (
              <Chip key={tag} active onClick={() => toggleTag(tag)}>
                {tag}
              </Chip>
            ))}
          {addingTag ? (
            <input
              autoFocus
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && customTag.trim()) {
                  toggleTag(customTag.trim());
                  setCustomTag("");
                  setAddingTag(false);
                }
                if (e.key === "Escape") setAddingTag(false);
              }}
              onBlur={() => setAddingTag(false)}
              placeholder="Escribí y Enter"
              className="w-32 rounded-[20px] bg-surface-muted px-3.5 py-2.5 text-[13px] outline-none"
            />
          ) : (
            <Chip onClick={() => setAddingTag(true)}>+ agregar</Chip>
          )}
        </div>
      </Field>

      <Field label="Algo más que ayude" optional>
        <textarea
          value={description}
          onChange={(e) => set({ description: e.target.value })}
          placeholder="Se asusta con los ruidos, no se acerca a desconocidos."
          rows={3}
          className="rounded-[15px] border border-ink/[0.14] px-4 py-3 text-[14.5px] leading-relaxed outline-none placeholder:text-ink-faint"
        />
      </Field>
    </StepShell>
  );
}

function Field({
  label,
  optional,
  className = "",
  children,
}: {
  label: string;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <span className="text-[13.5px] font-semibold text-ink-muted">
        {label} {optional && <span className="font-normal text-ink-faint">(opcional)</span>}
      </span>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

function ToggleRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`min-w-0 flex-1 rounded-[14px] py-3.5 text-[14px] font-semibold ${
            value === opt.value ? "bg-ink text-white" : "bg-surface-muted text-ink-muted"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-[20px] px-3.5 py-2.5 text-[13px] font-semibold ${
        active ? "bg-primary/10 text-primary" : "bg-surface-muted text-ink-muted"
      }`}
    >
      {children}
    </button>
  );
}
