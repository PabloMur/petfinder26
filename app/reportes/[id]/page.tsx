"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { formatRelativeTime } from "@/lib/geo";
import { getClaimToken } from "@/lib/supabase/claim-token";
import { closeReport, fetchReportDetail, type ReportDetail } from "@/lib/supabase/report-detail";

const SPECIES_LABEL: Record<string, string> = { dog: "Perro", cat: "Gato", other: "Mascota" };

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<ReportDetail | null | undefined>(undefined);
  const [contactRevealed, setContactRevealed] = useState(false);
  const [closing, setClosing] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [downloadingPoster, setDownloadingPoster] = useState(false);

  useEffect(() => {
    fetchReportDetail(id).then(setReport);
  }, [id]);

  if (report === undefined) {
    return <Centered>Cargando…</Centered>;
  }
  if (report === null) {
    return <Centered>No encontramos ese reporte.</Centered>;
  }

  // Only reached once `report` has loaded, well after mount — safe to read
  // localStorage directly here instead of threading it through more state.
  const claimToken = getClaimToken(id);
  const isOwner = claimToken !== null;
  const title = report.name ?? SPECIES_LABEL[report.species];
  const whatsappHref = report.contact_whatsapp
    ? `https://wa.me/${report.contact_whatsapp.replace(/[^\d]/g, "")}?text=${encodeURIComponent(
        `Hola! Vi tu reporte de ${title} en Pet Finder.`,
      )}`
    : null;

  async function handleReunion() {
    if (!claimToken || !report) return;
    setClosing(true);
    try {
      await closeReport(report.id, claimToken, "reunion");
      setReport({ ...report, status: "closed", closed_reason: "reunion" });
    } finally {
      setClosing(false);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  async function handleDownloadPoster() {
    if (!report) return;
    setDownloadingPoster(true);
    try {
      const { downloadPoster } = await import("@/lib/pdf/poster");
      await downloadPoster(report, window.location.href);
    } finally {
      setDownloadingPoster(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-5 pb-10 pt-4">
      <Link href="/mapa" aria-label="Volver al mapa">
        <Icon name="arrow_back" size={24} />
      </Link>

      {report.status === "closed" && report.closed_reason === "reunion" ? (
        <ReunionView title={title} />
      ) : isOwner ? (
        <OwnerView
          report={report}
          title={title}
          whatsappHref={whatsappHref}
          onReunion={handleReunion}
          closing={closing}
          onCopyLink={copyLink}
          linkCopied={linkCopied}
          onDownloadPoster={handleDownloadPoster}
          downloadingPoster={downloadingPoster}
        />
      ) : (
        <VisitorView
          report={report}
          title={title}
          whatsappHref={whatsappHref}
          revealed={contactRevealed}
          onReveal={() => setContactRevealed(true)}
        />
      )}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-dvh items-center justify-center text-ink-soft">{children}</div>;
}

function PhotoGallery({ photos }: { photos: string[] }) {
  if (photos.length === 0) {
    return (
      <div className="h-56 rounded-[20px] bg-[repeating-linear-gradient(135deg,#F2ECE3_0_9px,#EBE2D6_9px_18px)]" />
    );
  }
  return (
    <div className="flex gap-2.5 overflow-x-auto">
      {photos.map((src) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={src} src={src} alt="" className="h-56 w-56 flex-none rounded-[20px] object-cover" />
      ))}
    </div>
  );
}

function Tags({ report }: { report: ReportDetail }) {
  return (
    <div className="flex flex-wrap gap-2">
      {report.tags.map((tag) => (
        <span key={tag} className="rounded-[20px] bg-surface-muted px-3 py-2 text-[13px] font-medium text-ink-muted">
          {tag}
        </span>
      ))}
    </div>
  );
}

function OwnerView({
  report,
  title,
  whatsappHref,
  onReunion,
  closing,
  onCopyLink,
  linkCopied,
  onDownloadPoster,
  downloadingPoster,
}: {
  report: ReportDetail;
  title: string;
  whatsappHref: string | null;
  onReunion: () => void;
  closing: boolean;
  onCopyLink: () => void;
  linkCopied: boolean;
  onDownloadPoster: () => void;
  downloadingPoster: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3.5 pt-2 text-center">
        <div className="flex h-[78px] w-[78px] items-center justify-center rounded-full bg-found/[0.12]">
          <Icon name="campaign" size={40} className="text-found" />
        </div>
        <h1 className="text-[27px] font-semibold tracking-tight">Tu reporte está activo</h1>
        <p className="max-w-[290px] text-[14.5px] leading-relaxed text-ink-soft">
          Avisamos en un radio de {report.radius_m >= 1000 ? `${report.radius_m / 1000} km` : `${report.radius_m} m`}{" "}
          alrededor de {report.address_label ?? "la zona reportada"}. Te avisamos cuando alguien la vea.
        </p>
      </div>

      <PhotoGallery photos={report.photos} />

      <div className="flex flex-col gap-1">
        <span className="text-xl font-semibold">{title}</span>
        {report.description && <p className="text-[14px] text-ink-soft">{report.description}</p>}
      </div>
      <Tags report={report} />

      <div className="flex items-center gap-3.5 rounded-2xl bg-surface-muted p-4">
        <div className="flex h-[54px] w-[54px] flex-none items-center justify-center rounded-2xl bg-surface">
          <Icon name="qr_code_2" size={26} className="text-primary" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[14.5px] font-semibold">Cartel listo para imprimir</span>
          <span className="text-[12.5px] text-ink-soft">A4 con foto, zona y QR al reporte</span>
        </div>
        <button
          onClick={onDownloadPoster}
          disabled={downloadingPoster}
          className="flex-none rounded-xl bg-ink px-3.5 py-2.5 text-[12.5px] font-semibold text-white disabled:opacity-50"
        >
          {downloadingPoster ? "Generando…" : "Descargar PDF"}
        </button>
      </div>

      <div className="flex flex-col gap-2.5">
        <span className="text-[15px] font-semibold">Compartir</span>
        <div className="flex gap-2.5">
          {whatsappHref && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-2xl border border-ink/[0.12] py-4"
            >
              <Icon name="chat" size={22} className="text-[#1DA851]" />
              <span className="text-xs font-medium">WhatsApp</span>
            </a>
          )}
          <button
            onClick={onCopyLink}
            className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-2xl border border-ink/[0.12] py-4"
          >
            <Icon name="link" size={22} className="text-ink-muted" />
            <span className="text-xs font-medium">{linkCopied ? "¡Copiado!" : "Copiar link"}</span>
          </button>
        </div>
      </div>

      <button
        onClick={onReunion}
        disabled={closing}
        className="h-14 w-full rounded-[18px] bg-found text-[16px] font-semibold text-white disabled:opacity-50"
      >
        {closing ? "Marcando…" : "Ya volvió a casa · marcar reencuentro"}
      </button>
    </div>
  );
}

function VisitorView({
  report,
  title,
  whatsappHref,
  revealed,
  onReveal,
}: {
  report: ReportDetail;
  title: string;
  whatsappHref: string | null;
  revealed: boolean;
  onReveal: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <PhotoGallery photos={report.photos} />

      <div className="flex flex-col gap-1.5">
        <span
          className={`text-xs font-semibold tracking-wide ${report.type === "lost" ? "text-lost" : "text-found"}`}
        >
          {report.type === "lost" ? "PERDIDA" : "ENCONTRADA"} · {formatRelativeTime(report.seen_at)}
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {report.address_label && <p className="text-[14px] text-ink-soft">{report.address_label}</p>}
      </div>

      <Tags report={report} />

      {report.description && <p className="text-[14.5px] leading-relaxed text-ink-soft">{report.description}</p>}

      {report.status === "closed" ? (
        <p className="rounded-2xl bg-surface-muted p-4 text-center text-[14px] text-ink-muted">
          Este reporte ya no está activo.
        </p>
      ) : !revealed ? (
        <button onClick={onReveal} className="h-14 w-full rounded-[18px] bg-primary text-[16px] font-semibold text-white">
          Contactar
        </button>
      ) : (
        <div className="flex flex-col gap-2.5">
          {whatsappHref && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-14 items-center justify-center gap-2.5 rounded-[18px] bg-[#25D366] text-[15px] font-semibold text-white"
            >
              <Icon name="chat" size={20} />
              Escribir por WhatsApp
            </a>
          )}
          {report.contact_phone && (
            <a
              href={`tel:${report.contact_phone}`}
              className="flex h-14 items-center justify-center gap-2.5 rounded-[18px] border border-ink/[0.14] text-[15px] font-semibold"
            >
              <Icon name="call" size={20} />
              Llamar
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function ReunionView({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center gap-4 pt-16 text-center">
      <div className="flex h-[78px] w-[78px] items-center justify-center rounded-full bg-found/[0.12]">
        <Icon name="celebration" size={40} className="text-found" />
      </div>
      <h1 className="text-[27px] font-semibold tracking-tight">{title} volvió a casa</h1>
      <p className="max-w-[280px] text-[14.5px] leading-relaxed text-ink-soft">
        Este caso se cerró con reencuentro. Gracias por avisar a la comunidad.
      </p>
      <Link
        href="/mapa"
        className="mt-2 flex h-14 w-full items-center justify-center rounded-[18px] bg-primary text-[16px] font-semibold text-white"
      >
        Volver al mapa
      </Link>
    </div>
  );
}
