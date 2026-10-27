"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Map as MapboxMap, type MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { Icon } from "@/components/Icon";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import { usePublishStore } from "@/lib/store/publish-store";
import { publishReport } from "@/lib/supabase/publish";
import { PrimaryButton, StepShell } from "./StepShell";

const DEFAULT_CENTER = { longitude: -58.49, latitude: -34.527 };

export function Step3() {
  const router = useRouter();
  const mapRef = useRef<MapRef>(null);
  const store = usePublishStore();
  const { location, addressLabel, seenDate, seenTime, contactWhatsapp, contactPhone, set, type, species, name, size, sex, tags, description, photos } = store;
  const [showPhone, setShowPhone] = useState(!!contactPhone);
  const [contactPublicConsent, setContactPublicConsent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileVersion, setTurnstileVersion] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reverseGeocode(lat: number, lng: number) {
    try {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&language=es&types=place,locality,neighborhood,district`,
      );
      const json = await res.json();
      const label = json.features?.[0]?.place_name as string | undefined;
      if (label) set({ addressLabel: label });
    } catch {
      // best-effort — the pin's coordinates are already saved either way
    }
  }

  function onMoveEnd() {
    const center = mapRef.current?.getCenter();
    if (!center) return;
    set({ location: { lat: center.lat, lng: center.lng } });
    reverseGeocode(center.lat, center.lng);
  }

  function locateMe() {
    navigator.geolocation?.getCurrentPosition((pos) => {
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      set({ location: loc });
      mapRef.current?.flyTo({ center: [loc.lng, loc.lat], zoom: 15, duration: 800 });
      reverseGeocode(loc.lat, loc.lng);
    });
  }

  async function handleSubmit() {
    if (!type || !species || !location || !contactWhatsapp.trim() || !contactPublicConsent || !turnstileToken) return;
    setSubmitting(true);
    setError(null);
    try {
      const verificationResponse = await fetch("/api/publish/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: turnstileToken }),
      });
      const verificationResult = await verificationResponse.json();
      if (!verificationResponse.ok) {
        throw new Error(verificationResult.error ?? "No se pudo validar la publicación.");
      }
      if (typeof verificationResult.verificationId !== "string") {
        throw new Error("No se pudo validar la publicación. Probá otra vez.");
      }

      const { id } = await publishReport({
        type,
        species,
        size,
        sex,
        name,
        tags,
        description,
        photos,
        location,
        addressLabel,
        seenAt: new Date(`${seenDate}T${seenTime}`).toISOString(),
        contactWhatsapp: contactWhatsapp.trim(),
        contactPhone: contactPhone.trim(),
      }, verificationResult.verificationId);
      store.reset();
      router.push(`/reportes/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo publicar el reporte.");
      setTurnstileToken(null);
      setTurnstileVersion((version) => version + 1);
      setSubmitting(false);
    }
  }

  const canSubmit = !!type && !!species && !!location && contactWhatsapp.trim().length > 0 && contactPublicConsent && !!turnstileToken && !submitting;

  return (
    <StepShell
      step={3}
      onBack="/publicar/2"
      title="¿Dónde la viste por última vez?"
      footer={
        <div className="flex flex-col gap-2">
          <PrimaryButton disabled={!canSubmit} onClick={handleSubmit}>
            {submitting ? "Publicando…" : "Publicar reporte"}
          </PrimaryButton>
          {error && <p className="text-center text-[13px] text-lost">{error}</p>}
          <span className="text-center text-[12px] text-ink-faint">
            Al publicar aceptás las normas de la comunidad
          </span>
        </div>
      }
    >
      <div className="relative h-[210px] overflow-hidden rounded-[20px]">
        <MapboxMap
          ref={mapRef}
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
          initialViewState={{ ...(location ?? DEFAULT_CENTER), zoom: 15 } as never}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          style={{ width: "100%", height: "100%" }}
          onLoad={onMoveEnd}
          onMoveEnd={onMoveEnd}
        />
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
          <div className="flex h-11 w-11 -rotate-45 items-center justify-center rounded-[50%_50%_50%_8px] bg-lost shadow-[0_6px_14px_rgba(43,33,28,0.3)]">
            <Icon name="pets" size={22} className="rotate-45 text-white" />
          </div>
        </div>
        <button
          onClick={locateMe}
          className="absolute bottom-3.5 left-3.5 right-3.5 flex h-11 items-center gap-2.5 rounded-[14px] bg-surface px-3.5 shadow-[0_4px_14px_rgba(43,33,28,0.14)]"
        >
          <Icon name="place" size={19} className="text-primary" />
          <span className="truncate text-[13.5px] font-medium">
            {addressLabel || "Mové el mapa o tocá para usar tu ubicación"}
          </span>
        </button>
      </div>

      <div className="flex gap-3">
        <Field label="Fecha">
          <input
            type="date"
            value={seenDate}
            onChange={(e) => set({ seenDate: e.target.value })}
            className="h-[50px] rounded-[15px] border border-ink/[0.14] px-3.5 text-[14.5px] outline-none"
          />
        </Field>
        <Field label="Hora aprox.">
          <input
            type="time"
            value={seenTime}
            onChange={(e) => set({ seenTime: e.target.value })}
            className="h-[50px] rounded-[15px] border border-ink/[0.14] px-3.5 text-[14.5px] outline-none"
          />
        </Field>
      </div>

      <div className="h-px bg-ink/[0.09]" />

      <div className="flex flex-col gap-2.5">
        <span className="text-[15px] font-semibold">¿Cómo te contactan?</span>
        <div className="flex h-[54px] items-center gap-3 rounded-[15px] border-[1.5px] border-[#25D366] bg-[#25D366]/[0.06] px-3.5">
          <Icon name="chat" size={21} className="text-[#1DA851]" />
          <input
            value={contactWhatsapp}
            onChange={(e) => set({ contactWhatsapp: e.target.value })}
            placeholder="+54 9 11 5555 1234"
            className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-faint"
          />
          <span className="text-xs font-semibold text-[#1DA851]">WHATSAPP</span>
        </div>

        {showPhone ? (
          <div className="flex h-[54px] items-center gap-3 rounded-[15px] border border-ink/[0.14] px-3.5">
            <Icon name="call" size={21} className="text-ink-soft" />
            <input
              value={contactPhone}
              onChange={(e) => set({ contactPhone: e.target.value })}
              placeholder="Teléfono para llamadas"
              className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-faint"
            />
          </div>
        ) : (
          <button
            onClick={() => setShowPhone(true)}
            className="flex h-[54px] items-center gap-3 rounded-[15px] border border-ink/[0.14] px-3.5 text-left"
          >
            <Icon name="call" size={21} className="text-ink-soft" />
            <span className="flex-1 text-[15px] text-ink-faint">Agregar teléfono para llamadas</span>
          </button>
        )}

        <label className="flex items-start gap-2.5 text-[12.5px] leading-relaxed text-ink-soft">
          <input
            type="checkbox"
            checked={contactPublicConsent}
            onChange={(event) => setContactPublicConsent(event.target.checked)}
            className="mt-0.5 size-4 flex-none accent-primary"
          />
          <span>Entiendo que mi WhatsApp quedará visible en la ficha pública para que puedan ayudar a reencontrar a la mascota.</span>
        </label>
        {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? (
          <TurnstileWidget
            key={turnstileVersion}
            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
            onToken={setTurnstileToken}
          />
        ) : (
          <p role="alert" className="text-[12.5px] text-lost">
            La verificación antispam todavía no está configurada.
          </p>
        )}
      </div>
    </StepShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <span className="text-[13.5px] font-semibold text-ink-muted">{label}</span>
      {children}
    </div>
  );
}
