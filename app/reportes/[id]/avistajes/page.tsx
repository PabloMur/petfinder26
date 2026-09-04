"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Map as MapboxMap, Layer, Source } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { Icon } from "@/components/Icon";
import { formatRelativeTime } from "@/lib/geo";
import { fetchReportDetail, type ReportDetail } from "@/lib/supabase/report-detail";
import { createSighting, fetchSightings, type Sighting } from "@/lib/supabase/sightings";

const SPECIES_LABEL: Record<string, string> = { dog: "Perro", cat: "Gato", other: "Mascota" };

export default function AvistajesPage() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<ReportDetail | null | undefined>(undefined);
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchReportDetail(id).then(setReport);
    fetchSightings(id).then(setSightings);
  }, [id]);

  const heatmapGeoJson = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: sightings.map((s) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [s.lng, s.lat] },
        properties: {},
      })),
    }),
    [sightings],
  );

  if (report === undefined) {
    return <div className="flex min-h-dvh items-center justify-center text-ink-soft">Cargando…</div>;
  }
  if (report === null) {
    return <div className="flex min-h-dvh items-center justify-center text-ink-soft">No encontramos ese reporte.</div>;
  }

  const title = report.name ?? SPECIES_LABEL[report.species];
  const center = sightings[0]
    ? { longitude: sightings[0].lng, latitude: sightings[0].lat }
    : { longitude: -58.49, latitude: -34.527 };

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <MapboxMap
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        initialViewState={{ ...center, zoom: 13 }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        style={{ width: "100%", height: "100%" }}
      >
        <Source id="sightings" type="geojson" data={heatmapGeoJson}>
          <Layer
            id="sightings-heat"
            type="heatmap"
            paint={{
              "heatmap-weight": 1,
              "heatmap-intensity": 1.1,
              "heatmap-radius": 45,
              "heatmap-opacity": 0.75,
              "heatmap-color": [
                "interpolate",
                ["linear"],
                ["heatmap-density"],
                0,
                "rgba(228,168,46,0)",
                0.4,
                "rgba(228,168,46,0.45)",
                0.7,
                "rgba(228,87,46,0.7)",
                1,
                "#C1121F",
              ],
            }}
          />
        </Source>
      </MapboxMap>

      <div className="absolute inset-x-5 top-4 flex items-center gap-2.5 rounded-[18px] bg-surface px-3.5 py-3 shadow-[0_6px_20px_rgba(43,33,28,0.14)]">
        <Link href={`/reportes/${id}`} aria-label="Volver">
          <Icon name="arrow_back" size={22} />
        </Link>
        <div className="flex flex-col">
          <span className="text-[15px] font-semibold leading-tight">{title} · rastro de avistajes</span>
          <span className="text-xs text-ink-soft">
            {sightings.length} {sightings.length === 1 ? "reporte" : "reportes"}
          </span>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex max-h-[55%] flex-col gap-3.5 rounded-t-[26px] bg-surface px-5 pb-8 pt-3.5 shadow-[0_-8px_30px_rgba(43,33,28,0.14)] lg:inset-x-auto lg:bottom-5 lg:left-5 lg:w-[380px] lg:rounded-[26px] lg:pb-5">
        <div className="mx-auto h-1 w-10 flex-none rounded-full bg-ink/[0.18] lg:hidden" />
        <span className="flex-none text-[17px] font-semibold">Dónde la vieron</span>

        <div className="flex-1 overflow-y-auto">
          {sightings.length === 0 ? (
            <p className="py-4 text-[13.5px] text-ink-soft">Todavía no hay avistajes reportados.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {sightings.map((s) => (
                <div key={s.id} className="flex gap-3">
                  <div className="mt-1.5 h-2 w-2 flex-none rounded-full bg-lost" />
                  <div className="flex flex-col">
                    <span className="text-[13.5px] font-medium leading-snug">
                      {s.note || "Avistaje reportado sin comentario"}
                    </span>
                    <span className="text-xs text-ink-soft">{formatRelativeTime(s.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showForm ? (
          <SightingForm
            reportId={id}
            onDone={(s) => {
              setSightings((prev) => [s, ...prev]);
              setShowForm(false);
            }}
            onCancel={() => setShowForm(false)}
          />
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="h-[54px] flex-none rounded-[18px] bg-surface-muted text-[15px] font-semibold text-ink"
          >
            Reportar que la vi
          </button>
        )}
      </div>
    </div>
  );
}

function SightingForm({
  reportId,
  onDone,
  onCancel,
}: {
  reportId: string;
  onDone: (s: Sighting) => void;
  onCancel: () => void;
}) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    setSubmitting(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        try {
          await createSighting({ reportId, note, location });
          onDone({
            id: crypto.randomUUID(),
            report_id: reportId,
            note: note || null,
            photo: null,
            lat: location.lat,
            lng: location.lng,
            created_at: new Date().toISOString(),
          });
        } catch (e) {
          setError(e instanceof Error ? e.message : "No se pudo enviar el avistaje.");
        } finally {
          setSubmitting(false);
        }
      },
      () => {
        setError("Necesitamos tu ubicación para registrar dónde la viste.");
        setSubmitting(false);
      },
    );
  }

  return (
    <div className="flex flex-none flex-col gap-2.5">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="¿Dónde y cómo la viste? (opcional)"
        rows={2}
        className="rounded-[15px] border border-ink/[0.14] px-3.5 py-2.5 text-[14px] outline-none placeholder:text-ink-faint"
      />
      {error && <p className="text-[12.5px] text-lost">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 rounded-[15px] bg-surface-muted py-3 text-[14px] font-semibold text-ink-muted"
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-1 rounded-[15px] bg-primary py-3 text-[14px] font-semibold text-white disabled:opacity-50"
        >
          {submitting ? "Enviando…" : "Enviar avistaje"}
        </button>
      </div>
    </div>
  );
}
