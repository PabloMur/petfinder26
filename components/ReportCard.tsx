import { Icon } from "@/components/Icon";
import { formatDistance, formatRelativeTime } from "@/lib/geo";
import type { ReportMapPoint } from "@/lib/data/reports";

const TYPE_LABEL: Record<ReportMapPoint["type"], string> = {
  lost: "PERDIDA",
  found: "ENCONTRADA",
};

const TYPE_COLOR: Record<ReportMapPoint["type"], string> = {
  lost: "text-lost",
  found: "text-found",
};

export function ReportCard({
  report,
  distanceM,
  onClick,
  className = "",
}: {
  report: ReportMapPoint;
  distanceM: number | null;
  onClick?: () => void;
  className?: string;
}) {
  const title = report.name ?? (report.species === "dog" ? "Perro" : report.species === "cat" ? "Gato" : "Mascota");

  return (
    <button
      onClick={onClick}
      className={`flex w-[250px] flex-none items-start gap-[11px] rounded-[18px] border border-ink/10 bg-surface p-[11px] text-left ${className}`}
    >
      {report.photos[0] ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={report.photos[0]}
          alt=""
          className="h-[66px] w-[66px] flex-none rounded-[13px] object-cover"
        />
      ) : (
        <div className="h-[66px] w-[66px] flex-none rounded-[13px] bg-[repeating-linear-gradient(135deg,#F2ECE3_0_7px,#E7DED2_7px_14px)]" />
      )}
      <div className="flex min-w-0 flex-col gap-1">
        <span className={`text-xs font-semibold ${TYPE_COLOR[report.type]}`}>
          {TYPE_LABEL[report.type]} · {formatRelativeTime(report.seen_at)}
        </span>
        <span className="truncate text-base font-semibold leading-tight">{title}</span>
        <span className="truncate text-[13px] text-ink-soft">
          {report.tags[0] ?? report.address_label}
        </span>
        {distanceM !== null && (
          <span className="text-[12.5px] font-medium text-ink-muted">
            {formatDistance(distanceM)}
          </span>
        )}
      </div>
    </button>
  );
}

export function ReportPin({ type }: { type: ReportMapPoint["type"] }) {
  const color = type === "lost" ? "bg-lost" : "bg-found";
  const icon = type === "lost" ? "pets" : "volunteer_activism";

  return (
    <div className="-translate-y-1/2 rotate-45">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-[50%_50%_50%_8px] shadow-[0_6px_14px_rgba(43,33,28,0.28)] ${color}`}
      >
        <Icon name={icon} size={22} className="-rotate-45 text-white" />
      </div>
    </div>
  );
}
