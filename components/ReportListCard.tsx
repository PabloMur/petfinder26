import Link from "next/link";
import { Icon } from "@/components/Icon";
import { formatRelativeTime } from "@/lib/geo";
import type { MyReport } from "@/lib/data/my-reports";

const SPECIES_LABEL: Record<string, string> = { dog: "Perro", cat: "Gato", other: "Mascota" };

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  "lost:active": { label: "PERDIDA · ACTIVO", className: "text-lost" },
  "found:active": { label: "ENCONTRADA · ACTIVO", className: "text-found" },
  "lost:closed": { label: "CERRADO · REENCUENTRO", className: "text-ink-muted" },
  "found:closed": { label: "CERRADO · REENCUENTRO", className: "text-ink-muted" },
};

export function ReportListCard({ report }: { report: MyReport }) {
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
        <span className={`text-[11.5px] font-semibold tracking-wide ${status.className}`}>{status.label}</span>
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
