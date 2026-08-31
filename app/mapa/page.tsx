"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Map as MapboxMap, Marker, Popup, type MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { Icon } from "@/components/Icon";
import { BottomNav } from "@/components/BottomNav";
import { ReportCard, ReportPin } from "@/components/ReportCard";
import { distanceMeters } from "@/lib/geo";
import { fetchActiveReports, type ReportMapPoint } from "@/lib/supabase/reports";

const VICENTE_LOPEZ = { longitude: -58.49, latitude: -34.527 };
const MAP_STYLES = ["mapbox://styles/mapbox/light-v11", "mapbox://styles/mapbox/streets-v12"];

type StatusFilter = "all" | "lost" | "found";

export default function MapaPage() {
  const mapRef = useRef<MapRef>(null);
  const [reports, setReports] = useState<ReportMapPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selected, setSelected] = useState<ReportMapPoint | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [styleIndex, setStyleIndex] = useState(0);

  useEffect(() => {
    fetchActiveReports()
      .then(setReports)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reports.filter((r) => {
      if (statusFilter !== "all" && r.type !== statusFilter) return false;
      if (!q) return true;
      return (
        r.name?.toLowerCase().includes(q) ||
        r.address_label?.toLowerCase().includes(q) ||
        r.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [reports, query, statusFilter]);

  const withDistance = useMemo(() => {
    return filtered
      .map((r) => ({
        report: r,
        distanceM: userLocation ? distanceMeters(userLocation, { lat: r.lat, lng: r.lng }) : null,
      }))
      .sort((a, b) => (a.distanceM ?? 0) - (b.distanceM ?? 0));
  }, [filtered, userLocation]);

  function locateMe() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        mapRef.current?.flyTo({ center: [loc.lng, loc.lat], zoom: 14, duration: 800 });
      },
      () => {
        /* permission denied or unavailable — silently keep last known state */
      },
    );
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <MapboxMap
        ref={mapRef}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        initialViewState={{ ...VICENTE_LOPEZ, zoom: 13 }}
        mapStyle={MAP_STYLES[styleIndex]}
        style={{ width: "100%", height: "100%" }}
      >
        {userLocation && (
          <Marker longitude={userLocation.lng} latitude={userLocation.lat}>
            <div className="h-4 w-4 rounded-full border-[3px] border-white bg-locate shadow-[0_2px_8px_rgba(43,33,28,0.35)]" />
          </Marker>
        )}

        {filtered.map((r) => (
          <Marker
            key={r.id}
            longitude={r.lng}
            latitude={r.lat}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setSelected(r);
            }}
          >
            <ReportPin type={r.type} />
          </Marker>
        ))}

        {selected && (
          <Popup
            longitude={selected.lng}
            latitude={selected.lat}
            anchor="bottom"
            offset={28}
            closeOnClick={false}
            onClose={() => setSelected(null)}
          >
            <div className="min-w-[180px] p-1">
              <p className="text-xs font-semibold text-ink-muted">
                {selected.type === "lost" ? "PERDIDA" : "ENCONTRADA"}
              </p>
              <p className="text-sm font-semibold">
                {selected.name ?? (selected.species === "dog" ? "Perro" : "Gato")}
              </p>
              <p className="text-xs text-ink-soft">{selected.address_label}</p>
            </div>
          </Popup>
        )}
      </MapboxMap>

      <div className="absolute inset-x-5 top-4 flex flex-col gap-2.5">
        <div className="flex h-[52px] items-center gap-[11px] rounded-[18px] bg-surface px-4 shadow-[0_6px_20px_rgba(43,33,28,0.14)]">
          <Icon name="search" size={21} className="text-ink-soft" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar zona, raza o color"
            className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-faint"
          />
        </div>

        <div className="flex gap-2">
          {(
            [
              { key: "all", label: "Todo" },
              { key: "lost", label: "Perdidas" },
              { key: "found", label: "Encontradas" },
            ] as const
          ).map((chip) => (
            <button
              key={chip.key}
              onClick={() => setStatusFilter(chip.key)}
              className={`rounded-[20px] px-3.5 py-2 text-[13px] font-semibold shadow-[0_4px_12px_rgba(43,33,28,0.1)] ${
                statusFilter === chip.key ? "bg-ink text-white" : "bg-surface text-ink"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      <div className="absolute right-5 top-[130px] flex flex-col gap-2.5">
        <button
          onClick={locateMe}
          aria-label="Mi ubicación"
          className="flex h-[46px] w-[46px] items-center justify-center rounded-[15px] bg-surface shadow-[0_5px_16px_rgba(43,33,28,0.16)]"
        >
          <Icon name="my_location" size={22} />
        </button>
        <button
          onClick={() => setStyleIndex((i) => (i + 1) % MAP_STYLES.length)}
          aria-label="Cambiar capa de mapa"
          className="flex h-[46px] w-[46px] items-center justify-center rounded-[15px] bg-surface shadow-[0_5px_16px_rgba(43,33,28,0.16)]"
        >
          <Icon name="layers" size={22} />
        </button>
      </div>

      <div className="absolute inset-x-0 bottom-[78px] flex flex-col gap-3 rounded-t-[26px] bg-surface px-5 pt-2.5 pb-3 shadow-[0_-8px_30px_rgba(43,33,28,0.14)]">
        <div className="mx-auto h-1 w-10 rounded-full bg-ink/[0.18]" />
        <div className="flex items-baseline justify-between">
          <span className="text-[17px] font-semibold">
            {loading ? "Cargando..." : `${withDistance.length} reportes cerca`}
          </span>
        </div>
        {error && <p className="text-sm text-lost">No se pudieron cargar los reportes: {error}</p>}
        {!loading && withDistance.length === 0 && !error && (
          <p className="text-sm text-ink-soft">Todavía no hay reportes activos en esta zona.</p>
        )}
        <div className="flex gap-3 overflow-x-auto pb-1">
          {withDistance.map(({ report, distanceM }) => (
            <ReportCard
              key={report.id}
              report={report}
              distanceM={distanceM}
              onClick={() => {
                setSelected(report);
                mapRef.current?.flyTo({ center: [report.lng, report.lat], zoom: 15, duration: 800 });
              }}
            />
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
