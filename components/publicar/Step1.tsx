"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import { Icon } from "@/components/Icon";
import { usePublishStore } from "@/lib/store/publish-store";
import { PrimaryButton, StepShell } from "./StepShell";

export function Step1() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const { type, photos, set, addPhotos, removePhoto } = usePublishStore();

  return (
    <StepShell
      step={1}
      title="¿Qué querés reportar?"
      subtitle="Tarda menos de un minuto. Podés publicar sin crear cuenta."
      footer={
        <PrimaryButton disabled={!type} onClick={() => router.push("/publicar/2")}>
          Continuar
        </PrimaryButton>
      }
    >
      <div className="flex gap-3">
        <TypeCard
          selected={type === "lost"}
          onClick={() => set({ type: "lost" })}
          icon="pets"
          color="text-lost"
          border="border-lost"
          bg="bg-lost/[0.06]"
          title="Perdí a mi mascota"
          subtitle="Aviso a todos los que estén cerca"
        />
        <TypeCard
          selected={type === "found"}
          onClick={() => set({ type: "found" })}
          icon="volunteer_activism"
          color="text-found"
          border="border-found"
          bg="bg-found/[0.06]"
          title="Encontré una"
          subtitle="Buscamos a su familia"
        />
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between">
          <span className="text-[15px] font-semibold">Fotos</span>
          <span className="text-[13px] text-ink-soft">{photos.length} de 6</span>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {photos.map((p, i) => (
            <div key={p.previewUrl} className="relative aspect-square overflow-hidden rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.previewUrl} alt="" className="h-full w-full object-cover" />
              <button
                onClick={() => removePhoto(i)}
                aria-label="Quitar foto"
                className="absolute right-1.5 top-1.5 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-ink/60"
              >
                <Icon name="close" size={14} className="text-white" />
              </button>
            </div>
          ))}
          {photos.length < 6 && (
            <button
              onClick={() => fileInput.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border-[1.5px] border-dashed border-ink/25"
            >
              <Icon name="add_a_photo" size={24} className="text-primary" />
              <span className="text-[11.5px] font-medium text-ink-soft">Agregar</span>
            </button>
          )}
        </div>
        <p className="text-[12.5px] leading-relaxed text-ink-faint">
          Una foto de cuerpo entero y una de la cara ayudan a que el sistema encuentre coincidencias.
        </p>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) addPhotos(Array.from(e.target.files));
            e.target.value = "";
          }}
        />
      </div>
    </StepShell>
  );
}

function TypeCard({
  selected,
  onClick,
  icon,
  color,
  border,
  bg,
  title,
  subtitle,
}: {
  selected: boolean;
  onClick: () => void;
  icon: string;
  color: string;
  border: string;
  bg: string;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex min-w-0 flex-1 flex-col gap-2 rounded-[20px] border-2 p-4 text-left ${
        selected ? `${border} ${bg}` : "border-ink/[0.13] bg-transparent"
      }`}
    >
      <Icon name={icon} size={28} className={color} />
      <span className="text-[16px] font-semibold leading-tight">{title}</span>
      <span className="text-[12.5px] leading-snug text-ink-soft">{subtitle}</span>
    </button>
  );
}
