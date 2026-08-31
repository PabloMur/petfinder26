"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Icon } from "@/components/Icon";
import { formatRelativeTime } from "@/lib/geo";
import { getMyReportIds } from "@/lib/supabase/claim-token";
import { fetchMyReports, type MyReport } from "@/lib/supabase/my-reports";

const SPECIES_LABEL: Record<string, string> = { dog: "Perro", cat: "Gato", other: "Mascota" };

type Tab = "mine" | "saved";

export default function PerfilPage() {
  const [reports, setReports] = useState<MyReport[] | null>(null);
  const [tab, setTab] = useState<Tab>("mine");

  useEffect(() => {
    fetchMyReports(getMyReportIds()).then(setReports);
  }, []);

  const active = reports?.filter((r) => r.status === "active").length ?? 0;
  const reunions = reports?.filter((r) => r.closed_reason === "reunion").length ?? 0;

  return (
    <div className="flex min-h-dvh flex-col pb-[78px]">
      <div className="flex flex-col gap-5 px-5 pt-6">
        <div className="flex items-center gap-3.5">
          <div className="flex h-[62px] w-[62px] items-center justify-center rounded-full bg-surface-muted">
            <Icon name="pets" size={28} className="text-ink-soft" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xl font-semibold tracking-tight">Reportes de este dispositivo</span>
            <span className="text-[13.5px] text-ink-soft">
              Sin cuenta: guardamos tus reportes en este navegador
            </span>
          </div>
        </div>

        <div className="flex gap-2.5">
          <StatCard value={active} label="Activos" />
          <StatCard value={reunions} label="Reencuentros" />
        </div>

        <div className="flex gap-5.5 border-b border-ink/[0.09]">
          <TabButton active={tab === "mine"} onClick={() => setTab("mine")}>
            Mis reportes
          </TabButton>
          <TabButton active={tab === "saved"} onClick={() => setTab("saved")}>
            Guardados
          </TabButton>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-5 py-4">
        {tab === "saved" ? (
          <EmptyState
            icon="favorite"
            title="Todavía no guardaste reportes"
            subtitle="Vas a poder guardar reportes que quieras seguir desde su detalle."
          />
        ) : reports === null ? (
          <p className="py-8 text-center text-ink-soft">Cargando…</p>
        ) : reports.length === 0 ? (
          <EmptyState
            icon="pets"
            title="Todavía no publicaste ningún reporte"
            subtitle="Publicá una mascota perdida o encontrada en menos de un minuto."
            action={
              <Link
                href="/publicar/1"
                className="mt-2 flex h-12 items-center justify-center rounded-[15px] bg-primary px-6 text-[14.5px] font-semibold text-white"
              >
                Publicar un reporte
              </Link>
            }
          />
        ) : (
          reports.map((r) => <MyReportCard key={r.id} report={r} />)
        )}
      </div>

      <BottomNav />
    </div>
  );
}

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-1 flex-col gap-0.5 rounded-2xl bg-surface-muted p-3.5">
      <span className="text-xl font-bold">{value}</span>
      <span className="text-[12.5px] text-ink-soft">{label}</span>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`pb-2.5 text-[15px] ${
        active ? "border-b-2 border-ink font-semibold text-ink" : "text-ink-faint"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: string;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2.5 py-10 text-center">
      <Icon name={icon} size={32} className="text-ink-faint" />
      <span className="text-[15px] font-semibold">{title}</span>
      <p className="max-w-[260px] text-[13.5px] leading-relaxed text-ink-soft">{subtitle}</p>
      {action}
    </div>
  );
}

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  "lost:active": { label: "PERDIDA · ACTIVO", className: "text-lost" },
  "found:active": { label: "ENCONTRADA · ACTIVO", className: "text-found" },
  "lost:closed": { label: "CERRADO · REENCUENTRO", className: "text-ink-muted" },
  "found:closed": { label: "CERRADO · REENCUENTRO", className: "text-ink-muted" },
};

function MyReportCard({ report }: { report: MyReport }) {
  const status = STATUS_STYLE[`${report.type}:${report.status}`];
  const title = report.name ?? SPECIES_LABEL[report.species];

  return (
    <Link
      href={`/reportes/${report.id}`}
      className={`flex items-center gap-3 rounded-[20px] border border-ink/[0.11] p-3.5 ${
        report.status === "closed" ? "opacity-60" : ""
      }`}
    >
      <div className="h-[70px] w-[70px] flex-none rounded-[14px] bg-[repeating-linear-gradient(135deg,#F2ECE3_0_8px,#E7DED2_8px_16px)]" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className={`text-[11.5px] font-semibold tracking-wide ${status.className}`}>
          {status.label}
        </span>
        <span className="truncate text-base font-semibold">{title}</span>
        <span className="truncate text-[12.5px] text-ink-soft">{formatRelativeTime(report.created_at)}</span>
        {report.matchCount > 0 && (
          <span className="text-[12px] font-semibold text-primary">
            {report.matchCount} coincidencia{report.matchCount > 1 ? "s" : ""}
          </span>
        )}
      </div>
      <Icon name="chevron_right" size={22} className="text-ink-soft" />
    </Link>
  );
}
