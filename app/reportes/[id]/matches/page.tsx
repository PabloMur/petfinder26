"use client";

import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { formatRelativeTime } from "@/lib/geo";
import { getClaimToken } from "@/lib/supabase/claim-token";
import { fetchMatchesForReport, otherSide, updateMatchStatus, type Match } from "@/lib/supabase/matches";

const SPECIES_LABEL: Record<string, string> = { dog: "Perro", cat: "Gato", other: "Mascota" };
const ATTR_LABEL: Record<string, string> = {
  species: "especie",
  size: "tamaño",
  sex: "sexo",
  zona: "zona",
};

function scoreLabel(score: number): { label: string; color: string } {
  if (score >= 70) return { label: "COINCIDENCIA ALTA", color: "text-primary" };
  if (score >= 55) return { label: "COINCIDENCIA MEDIA", color: "text-[#E4572E]" };
  return { label: "COINCIDENCIA POSIBLE", color: "text-ink-soft" };
}

export default function MatchesPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const claimToken = getClaimToken(id);

  useEffect(() => {
    fetchMatchesForReport(id).then((all) => setMatches(all.filter((m) => m.status === "pending")));
  }, [id]);

  async function handleConfirm(match: Match) {
    if (!claimToken) return;
    setBusyId(match.id);
    try {
      await updateMatchStatus(match.id, claimToken, "confirmed");
      const other = otherSide(match, id);
      router.push(`/reportes/${other.report.id}`);
    } catch {
      setBusyId(null);
    }
  }

  async function handleDismiss(match: Match) {
    if (!claimToken) return;
    setBusyId(match.id);
    try {
      await updateMatchStatus(match.id, claimToken, "dismissed");
      setMatches((prev) => prev?.filter((m) => m.id !== match.id) ?? null);
    } finally {
      setBusyId(null);
    }
  }

  if (!claimToken) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-8 text-center text-ink-soft">
        Solo quien publicó este reporte puede ver sus coincidencias.
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-5 pb-10 pt-4">
      <div className="flex items-center gap-3">
        <Link href={`/reportes/${id}`} aria-label="Volver">
          <Icon name="arrow_back" size={22} />
        </Link>
        <span className="text-[19px] font-semibold">Posibles coincidencias</span>
      </div>

      <p className="text-[14px] leading-relaxed text-ink-soft">
        Comparamos especie, tamaño, color y zona con los reportes opuestos activos.
      </p>

      {matches === null ? (
        <p className="py-8 text-center text-ink-soft">Cargando…</p>
      ) : matches.length === 0 ? (
        <div className="flex flex-col items-center gap-2.5 py-16 text-center">
          <Icon name="join_inner" size={32} className="text-ink-faint" />
          <span className="text-[15px] font-semibold">Sin coincidencias por ahora</span>
          <p className="max-w-[260px] text-[13.5px] leading-relaxed text-ink-soft">
            Te avisamos apenas aparezca un reporte compatible cerca tuyo.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {matches.map((match) => {
            const other = otherSide(match, id);
            const title = other.report.name ?? SPECIES_LABEL[other.report.species];
            const meta = scoreLabel(match.score);
            const busy = busyId === match.id;

            return (
              <div
                key={match.id}
                className="flex flex-col gap-3.5 rounded-[22px] border-2 border-primary bg-primary/[0.04] p-4"
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold tracking-wide ${meta.color}`}>{meta.label}</span>
                  <span className="text-[15px] font-bold text-primary">{Math.round(match.score)}%</span>
                </div>

                <div className="flex gap-3">
                  {other.report.photos[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={other.report.photos[0]}
                      alt=""
                      className="h-24 w-24 flex-none rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="h-24 w-24 flex-none rounded-2xl bg-[repeating-linear-gradient(135deg,#F2ECE3_0_8px,#E7DED2_8px_16px)]" />
                  )}
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className={`text-xs font-semibold ${other.type === "lost" ? "text-lost" : "text-found"}`}>
                      {other.type === "lost" ? "PERDIDA" : "ENCONTRADA"} · {formatRelativeTime(other.report.seen_at)}
                    </span>
                    <span className="truncate text-[17px] font-semibold leading-tight">{title}</span>
                    {other.report.tags[0] && (
                      <span className="truncate text-[13.5px] text-ink-soft">{other.report.tags.join(" · ")}</span>
                    )}
                    {other.report.address_label && (
                      <span className="truncate text-[13px] font-medium text-ink-muted">
                        {other.report.address_label}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {match.matched_attrs.map((attr) => (
                    <span
                      key={attr}
                      className="rounded-[20px] bg-found/[0.12] px-2.5 py-1.5 text-xs font-medium text-found"
                    >
                      ✓ {ATTR_LABEL[attr] ?? attr}
                    </span>
                  ))}
                </div>

                <div className="flex gap-2.5">
                  <button
                    onClick={() => handleConfirm(match)}
                    disabled={busy}
                    className="h-[50px] flex-1 rounded-[15px] bg-primary text-[15px] font-semibold text-white disabled:opacity-50"
                  >
                    {busy ? "…" : `Es ${title}, contactar`}
                  </button>
                  <button
                    onClick={() => handleDismiss(match)}
                    disabled={busy}
                    aria-label="Descartar coincidencia"
                    className="flex h-[50px] w-[50px] flex-none items-center justify-center rounded-[15px] border border-ink/[0.14] disabled:opacity-50"
                  >
                    <Icon name="close" size={21} className="text-ink-soft" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
