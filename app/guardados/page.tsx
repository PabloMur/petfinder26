"use client";

import { useEffect, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
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
    <div className="flex min-h-dvh flex-col pb-[78px]">
      <div className="px-5 pb-3.5 pt-6">
        <span className="text-2xl font-semibold tracking-tight">Guardados</span>
      </div>

      <div className="flex flex-col gap-3 px-5 py-2">
        {reports === null ? (
          <p className="py-8 text-center text-ink-soft">Cargando…</p>
        ) : reports.length === 0 ? (
          <EmptyState
            icon="favorite"
            title="Todavía no guardaste reportes"
            subtitle="Tocá el corazón en el detalle de un reporte para seguirlo desde acá."
          />
        ) : (
          reports.map((r) => <ReportListCard key={r.id} report={r} />)
        )}
      </div>

      <BottomNav />
    </div>
  );
}
