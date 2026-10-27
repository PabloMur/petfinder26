"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import { formatRelativeTime } from "@/lib/geo";
import { isReportSaved, toggleSavedReport } from "@/lib/saved-reports";
import { getClaimToken } from "@/lib/supabase/claim-token";
import { closeReport, fetchReportDetail, type ReportDetail } from "@/lib/supabase/report-detail";

const SPECIES_LABEL: Record<string, string> = { dog: "Perro", cat: "Gato", other: "Mascota" };
type ContactInfo = { contactWhatsapp: string | null; contactPhone: string | null };

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <ReportDetailContent key={id} id={id} />;
}

function ReportDetailContent({ id }: { id: string }) {
  const [report, setReport] = useState<ReportDetail | null | undefined>(undefined);
  const [contactRevealed, setContactRevealed] = useState(false);
  const [contactChallengeOpen, setContactChallengeOpen] = useState(false);
  const [contactChallengeVersion, setContactChallengeVersion] = useState(0);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);
  const [closing, setClosing] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [downloadingPoster, setDownloadingPoster] = useState(false);
  const [saved, setSaved] = useState(() => isReportSaved(id));

  useEffect(() => {
    let cancelled = false;
    fetchReportDetail(id).then((data) => {
      if (!cancelled) setReport(data);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    const ownerClaimToken = getClaimToken(id);
    if (!ownerClaimToken) return;
    const controller = new AbortController();
    fetch("/api/report/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId: id, claimToken: ownerClaimToken }),
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: ContactInfo | null) => {
        if (data) setContactInfo(data);
      })
      .catch(() => {});
    return () => controller.abort();
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
  const whatsappHref = contactInfo?.contactWhatsapp
    ? `https://wa.me/${contactInfo.contactWhatsapp.replace(/[^\d]/g, "")}?text=${encodeURIComponent(
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
      let ownerContacts = contactInfo;
      if (!ownerContacts && claimToken) {
        const response = await fetch("/api/report/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reportId: id, claimToken }),
        });
        if (!response.ok) throw new Error("No se pudieron cargar los datos de contacto.");
        ownerContacts = (await response.json()) as ContactInfo;
        setContactInfo(ownerContacts);
      }
      const { downloadPoster } = await import("@/lib/pdf/poster");
      await downloadPoster({
        ...report,
        contact_whatsapp: ownerContacts?.contactWhatsapp ?? null,
        contact_phone: ownerContacts?.contactPhone ?? null,
      }, window.location.href);
    } finally {
      setDownloadingPoster(false);
    }
  }

  async function revealVisitorContact(token: string | null) {
    if (!token) return;
    setContactLoading(true);
    setContactError(null);
    try {
      const response = await fetch("/api/report/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: id, token }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo cargar el contacto.");
      setContactInfo(data as ContactInfo);
      setContactRevealed(true);
      setContactChallengeOpen(false);
    } catch (e) {
      setContactError(e instanceof Error ? e.message : "No se pudo cargar el contacto.");
      setContactChallengeVersion((version) => version + 1);
    } finally {
      setContactLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-5 pb-10 pt-4 lg:max-w-2xl lg:justify-center lg:py-12">
      <div className="flex items-center justify-between">
        <Link href="/mapa" aria-label="Volver al mapa">
          <Icon name="arrow_back" size={24} />
        </Link>
        <button
          onClick={() => setSaved(toggleSavedReport(id))}
          aria-label={saved ? "Quitar de guardados" : "Guardar reporte"}
          aria-pressed={saved}
        >
          <Icon name="favorite" size={24} filled={saved} className={saved ? "text-primary" : "text-ink-faint"} />
        </button>
      </div>

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
          challengeOpen={contactChallengeOpen}
          challengeVersion={contactChallengeVersion}
          contactLoading={contactLoading}
          contactError={contactError}
          contactPhone={contactInfo?.contactPhone ?? null}
          onReveal={() => setContactChallengeOpen(true)}
          onCancelChallenge={() => setContactChallengeOpen(false)}
          onContactToken={revealVisitorContact}
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

      <Link
        href={`/reportes/${report.id}/matches`}
        className="flex items-center gap-3.5 rounded-2xl border-2 border-primary/30 bg-primary/[0.04] p-4"
      >
        <Icon name="join_inner" size={22} className="text-primary" />
        <span className="flex-1 text-[14px] font-semibold">Ver posibles coincidencias</span>
        <Icon name="chevron_right" size={20} className="text-ink-soft" />
      </Link>

      {report.type === "lost" && (
        <Link
          href={`/reportes/${report.id}/avistajes`}
          className="flex items-center gap-3.5 rounded-2xl border border-ink/[0.11] p-4"
        >
          <Icon name="local_fire_department" size={22} className="text-lost" />
          <span className="flex-1 text-[14px] font-semibold">Ver mapa de avistajes</span>
          <Icon name="chevron_right" size={20} className="text-ink-soft" />
        </Link>
      )}

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
  contactPhone,
  revealed,
  challengeOpen,
  challengeVersion,
  contactLoading,
  contactError,
  onReveal,
  onCancelChallenge,
  onContactToken,
}: {
  report: ReportDetail;
  title: string;
  whatsappHref: string | null;
  contactPhone: string | null;
  revealed: boolean;
  challengeOpen: boolean;
  challengeVersion: number;
  contactLoading: boolean;
  contactError: string | null;
  onReveal: () => void;
  onCancelChallenge: () => void;
  onContactToken: (token: string | null) => void;
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
        <div className="flex flex-col gap-2.5">
          {challengeOpen ? (
            <div className="flex flex-col items-center gap-2.5 rounded-2xl bg-surface-muted p-4">
              {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? (
                <TurnstileWidget
                  key={challengeVersion}
                  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                  action="contact"
                  onToken={onContactToken}
                />
              ) : (
                <p className="text-center text-[13px] text-lost">La verificación antispam todavía no está configurada.</p>
              )}
              {contactLoading && <span className="text-[13px] text-ink-soft">Cargando contacto…</span>}
              {contactError && <p role="alert" className="text-center text-[13px] text-lost">{contactError}</p>}
              <button onClick={onCancelChallenge} className="text-[13px] font-medium text-ink-muted">Cancelar</button>
            </div>
          ) : (
            <button onClick={onReveal} className="h-14 w-full rounded-[18px] bg-primary text-[16px] font-semibold text-white">
              Contactar
            </button>
          )}
          {report.type === "lost" && (
            <Link
              href={`/reportes/${report.id}/avistajes`}
              className="flex h-14 items-center justify-center gap-2.5 rounded-[18px] border border-ink/[0.14] text-[15px] font-semibold"
            >
              <Icon name="visibility" size={20} />
              Reportar que la vi
            </Link>
          )}
        </div>
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
          {contactPhone && (
            <a
              href={`tel:${contactPhone}`}
              className="flex h-14 items-center justify-center gap-2.5 rounded-[18px] border border-ink/[0.14] text-[15px] font-semibold"
            >
              <Icon name="call" size={20} />
              Llamar
            </a>
          )}
          {!whatsappHref && !contactPhone && (
            <p className="rounded-2xl bg-surface-muted p-4 text-center text-[14px] text-ink-muted">
              El tutor no agregó datos de contacto para este reporte.
            </p>
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
