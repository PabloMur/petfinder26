"use client";

import { useEffect, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { SidebarNav } from "@/components/SidebarNav";
import { EmptyState } from "@/components/EmptyState";
import { ReportListCard } from "@/components/ReportListCard";
import { getSavedReportIds } from "@/lib/saved-reports";
import { fetchMyReports, type MyReport } from "@/lib/supabase/my-reports";

export default function GuardadosPage() {
  const [reports, setReports] = useState<MyReport[] | null>(null);

  useEffect(() => {
    fetchMyReports(getSavedReportIds()).then(setReports);
  }, []);

  return (
    <div className="flex min-h-dvh flex-col pb-[78px] lg:pb-10 lg:pl-64">
      <SidebarNav />

      <div className="flex flex-col lg:mx-auto lg:w-full lg:max-w-3xl">
        <div className="px-5 pb-3.5 pt-6 lg:px-10 lg:pt-10">
          <span className="text-2xl font-semibold tracking-tight lg:text-3xl">Guardados</span>
        </div>

        <div className="flex flex-col gap-3 px-5 py-2 lg:grid lg:grid-cols-2 lg:px-10">
          {reports === null ? (
            <p className="py-8 text-center text-ink-soft lg:col-span-2">Cargando…</p>
          ) : reports.length === 0 ? (
            <div className="lg:col-span-2">
              <EmptyState
                icon="favorite"
                title="Todavía no guardaste reportes"
                subtitle="Tocá el corazón en el detalle de un reporte para seguirlo desde acá."
              />
            </div>
          ) : (
            reports.map((r) => <ReportListCard key={r.id} report={r} />)
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
