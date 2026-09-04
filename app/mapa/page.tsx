"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Map as MapboxMap, Marker, Popup, type MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { BottomNav } from "@/components/BottomNav";
import { SidebarNav } from "@/components/SidebarNav";
import { ReportCard, ReportPin } from "@/components/ReportCard";
import { distanceMeters, formatRelativeTime } from "@/lib/geo";
import { fetchActiveReports, type ReportMapPoint } from "@/lib/supabase/reports";
import { isDefaultFilters, useMapFilters, type StatusFilter } from "@/lib/store/map-filters";

const VICENTE_LOPEZ = { longitude: -58.49, latitude: -34.527 };
const MAP_STYLES = ["mapbox://styles/mapbox/streets-v12", "mapbox://styles/mapbox/light-v11"];
const DATE_WINDOW_MS: Record<string, number> = { today: 86400e3, "7d": 7 * 86400e3, "30d": 30 * 86400e3 };

export default function MapaPage() {
  const mapRef = useRef<MapRef>(null);
  const [reports, setReports] = useState<ReportMapPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const filters = useMapFilters();
  const [selected, setSelected] = useState<ReportMapPoint | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [styleIndex, setStyleIndex] = useState(0);

  useEffect(() => {
    fetchActiveReports()
      .then(setReports)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // A stable "now" resolved once at mount — the date filter is day-grained,
  // so re-deriving it from a fresh Date.now() on every filter change would
  // buy imperceptible precision at the cost of an impure read during render.
  const [now] = useState(() => Date.now());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const cutoff = now - DATE_WINDOW_MS[filters.date];
    return reports.filter((r) => {
      if (filters.status !== "all" && r.type !== filters.status) return false;
      if (filters.species && r.species !== filters.species) return false;
      if (filters.photoOnly && r.photos.length === 0) return false;
      if (new Date(r.seen_at).getTime() < cutoff) return false;
      if (!q) return true;
      return (
        r.name?.toLowerCase().includes(q) ||
        r.address_label?.toLowerCase().includes(q) ||
        r.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [reports, query, filters.status, filters.species, filters.photoOnly, filters.date, now]);

  const withDistance = useMemo(() => {
    return filtered
      .map((r) => ({
        report: r,
        distanceM: userLocation ? distanceMeters(userLocation, { lat: r.lat, lng: r.lng }) : null,
      }))
      .filter((x) => x.distanceM === null || x.distanceM <= filters.radiusKm * 1000)
      .sort((a, b) => (a.distanceM ?? 0) - (b.distanceM ?? 0));
  }, [filtered, userLocation, filters.radiusKm]);

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
    <div className="relative h-dvh w-full overflow-hidden lg:flex lg:pl-64">
      <SidebarNav />

      <div className="contents lg:static lg:flex lg:h-dvh lg:w-[380px] lg:flex-none lg:flex-col lg:border-r lg:border-ink/[0.08] lg:bg-surface">
        <div className="absolute inset-x-5 top-4 flex flex-col gap-2.5 lg:static lg:flex-none lg:gap-2.5 lg:px-4 lg:pb-3 lg:pt-5">
          <div className="flex h-[52px] items-center gap-[11px] rounded-[18px] bg-surface px-4 shadow-[0_6px_20px_rgba(43,33,28,0.14)] lg:rounded-2xl lg:border lg:border-ink/10 lg:shadow-none">
            <Icon name="search" size={21} className="text-ink-soft" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar zona, raza o color"
              className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-faint"
            />
            <Link href="/mapa/filtros" aria-label="Filtros" className="relative flex-none">
              <Icon name="tune" size={21} className="text-primary" />
              {!isDefaultFilters(filters) && (
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary" />
              )}
            </Link>
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
                onClick={() => filters.set({ status: chip.key as StatusFilter })}
                className={`rounded-[20px] px-3.5 py-2 text-[13px] font-semibold shadow-[0_4px_12px_rgba(43,33,28,0.1)] lg:shadow-none ${
                  filters.status === chip.key ? "bg-ink text-white" : "bg-surface text-ink"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-[78px] flex flex-col gap-3 rounded-t-[26px] bg-surface px-5 pt-2.5 pb-3 shadow-[0_-8px_30px_rgba(43,33,28,0.14)] lg:static lg:min-h-0 lg:flex-1 lg:rounded-none lg:px-4 lg:pb-4 lg:pt-1 lg:shadow-none">
          <div className="mx-auto h-1 w-10 rounded-full bg-ink/[0.18] lg:hidden" />
          <div className="flex items-baseline justify-between">
            <span className="text-[17px] font-semibold">
              {loading ? "Cargando..." : `${withDistance.length} reportes cerca`}
            </span>
          </div>
          {error && <p className="text-sm text-lost">No se pudieron cargar los reportes: {error}</p>}
          {!loading && withDistance.length === 0 && !error && (
            <p className="text-sm text-ink-soft">Todavía no hay reportes activos en esta zona.</p>
          )}
          <div className="flex gap-3 overflow-x-auto pb-1 lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-x-visible lg:overflow-y-auto lg:pb-0">
            {withDistance.map(({ report, distanceM }) => (
              <ReportCard
                key={report.id}
                report={report}
                distanceM={distanceM}
                className="lg:w-full"
                onClick={() => {
                  setSelected(report);
                  mapRef.current?.flyTo({ center: [report.lng, report.lat], zoom: 15, duration: 800 });
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="relative h-dvh flex-1 overflow-hidden">
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

        {withDistance.map(({ report: r }) => (
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
            maxWidth="280px"
            closeButton={false}
            closeOnClick={false}
            onClose={() => setSelected(null)}
          >
            <div className="relative w-[260px]">
              <button
                onClick={() => setSelected(null)}
                aria-label="Cerrar"
                className="absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-ink/50"
              >
                <Icon name="close" size={14} className="text-white" />
              </button>
              <Link href={`/reportes/${selected.id}`} className="flex gap-3 p-3">
                {selected.photos[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selected.photos[0]}
                    alt=""
                    className="h-16 w-16 flex-none rounded-2xl object-cover"
                  />
                ) : (
                  <div className="h-16 w-16 flex-none rounded-2xl bg-[repeating-linear-gradient(135deg,#F2ECE3_0_7px,#E7DED2_7px_14px)]" />
                )}
                <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
                  <span className={`text-xs font-semibold ${selected.type === "lost" ? "text-lost" : "text-found"}`}>
                    {selected.type === "lost" ? "PERDIDA" : "ENCONTRADA"} · {formatRelativeTime(selected.seen_at)}
                  </span>
                  <span className="truncate text-[15px] font-semibold leading-tight">
                    {selected.name ?? (selected.species === "dog" ? "Perro" : selected.species === "cat" ? "Gato" : "Mascota")}
                  </span>
                  {selected.address_label && (
                    <span className="truncate text-xs text-ink-soft">{selected.address_label}</span>
                  )}
                </div>
                <Icon name="chevron_right" size={20} className="mt-1 flex-none text-ink-soft" />
              </Link>
            </div>
          </Popup>
        )}
      </MapboxMap>

      <div className="absolute right-5 top-[130px] flex flex-col gap-2.5 lg:top-5">
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
      </div>

      <BottomNav />
    </div>
  );
}
