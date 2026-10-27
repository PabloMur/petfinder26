"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { SidebarNav } from "@/components/SidebarNav";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { ReportListCard } from "@/components/ReportListCard";
import { getSavedReportIds } from "@/lib/saved-reports";
import { getMyReportIds } from "@/lib/claim-token";
import { fetchMyReports, type MyReport } from "@/lib/data/my-reports";

type Tab = "mine" | "saved";

export default function PerfilPage() {
  const [reports, setReports] = useState<MyReport[] | null>(null);
  const [saved, setSaved] = useState<MyReport[] | null>(null);
  const [tab, setTab] = useState<Tab>("mine");

  useEffect(() => {
    fetchMyReports(getMyReportIds()).then(setReports);
    fetchMyReports(getSavedReportIds()).then(setSaved);
  }, []);

  const active = reports?.filter((r) => r.status === "active").length ?? 0;
  const reunions = reports?.filter((r) => r.closed_reason === "reunion").length ?? 0;
  const list = tab === "mine" ? reports : saved;

  return (
    <div className="flex min-h-dvh flex-col pb-[78px] lg:pb-10 lg:pl-64">
      <SidebarNav />

      <div className="flex flex-col lg:mx-auto lg:w-full lg:max-w-3xl">
        <div className="flex flex-col gap-5 px-5 pt-6 lg:px-10 lg:pt-10">
          <div className="flex items-center gap-3.5">
            <div className="flex h-[62px] w-[62px] items-center justify-center rounded-full bg-surface-muted">
              <Icon name="pets" size={28} className="text-ink-soft" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xl font-semibold tracking-tight lg:text-2xl">Reportes de este dispositivo</span>
              <span className="text-[13.5px] text-ink-soft">
                Sin cuenta: guardamos tus reportes en este navegador
              </span>
            </div>
          </div>

          <div className="flex gap-2.5 lg:max-w-sm">
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

        <div className="flex flex-col gap-3 px-5 py-4 lg:grid lg:grid-cols-2 lg:px-10">
          {list === null ? (
            <p className="py-8 text-center text-ink-soft lg:col-span-2">Cargando…</p>
          ) : list.length === 0 && tab === "saved" ? (
            <div className="lg:col-span-2">
              <EmptyState
                icon="favorite"
                title="Todavía no guardaste reportes"
                subtitle="Tocá el corazón en el detalle de un reporte para seguirlo desde acá."
              />
            </div>
          ) : list.length === 0 ? (
            <div className="lg:col-span-2">
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
            </div>
          ) : (
            list.map((r) => <ReportListCard key={r.id} report={r} />)
          )}
        </div>
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
