"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Icon } from "@/components/Icon";
import { formatRelativeTime } from "@/lib/geo";
import { fetchMyAlerts, markAlertsRead, type Alert } from "@/lib/supabase/alerts";
import { getMyClaimTokens } from "@/lib/supabase/claim-token";

const TYPE_META: Record<Alert["type"], { icon: string; bg: string; color: string; title: string }> = {
  match: { icon: "join_inner", bg: "bg-primary/[0.12]", color: "text-primary", title: "Coincidencia encontrada" },
  sighting: { icon: "visibility", bg: "bg-found/[0.1]", color: "text-found", title: "Nuevo avistaje" },
  reunion: { icon: "celebration", bg: "bg-found/[0.1]", color: "text-found", title: "Reencuentro" },
};

function dayGroup(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(date, today)) return "HOY";
  if (sameDay(date, yesterday)) return "AYER";
  return date.toLocaleDateString("es-AR", { day: "numeric", month: "long" }).toUpperCase();
}

export default function AlertasPage() {
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [unreadIds, setUnreadIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const tokens = getMyClaimTokens();
    fetchMyAlerts(tokens).then((data) => {
      setAlerts(data);
      const unread = data.filter((a) => a.read_at === null).map((a) => a.id);
      setUnreadIds(new Set(unread));
      if (unread.length) markAlertsRead(unread, tokens).catch(() => {});
    });
  }, []);

  const groups = new Map<string, Alert[]>();
  for (const a of alerts ?? []) {
    const g = dayGroup(a.created_at);
    groups.set(g, [...(groups.get(g) ?? []), a]);
  }

  return (
    <div className="flex min-h-dvh flex-col pb-[78px]">
      <div className="flex items-center justify-between px-5 pb-3.5 pt-6">
        <span className="text-2xl font-semibold tracking-tight">Alertas</span>
      </div>

      {alerts === null ? (
        <p className="py-10 text-center text-ink-soft">Cargando…</p>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center gap-2.5 px-5 py-16 text-center">
          <Icon name="notifications" size={32} className="text-ink-faint" />
          <span className="text-[15px] font-semibold">Sin novedades todavía</span>
          <p className="max-w-[260px] text-[13.5px] leading-relaxed text-ink-soft">
            Te vamos a avisar acá cuando haya una coincidencia con alguno de tus reportes.
          </p>
        </div>
      ) : (
        [...groups.entries()].map(([label, items]) => (
          <div key={label} className="flex flex-col">
            <div className="px-5 pb-2.5 pt-1.5 text-xs font-semibold tracking-wide text-ink-faint">{label}</div>
            {items.map((a) => (
              <AlertRow key={a.id} alert={a} unread={unreadIds.has(a.id)} />
            ))}
          </div>
        ))
      )}

      <BottomNav />
    </div>
  );
}

function AlertRow({ alert, unread }: { alert: Alert; unread: boolean }) {
  const meta = TYPE_META[alert.type];
  return (
    <Link href={`/reportes/${alert.report_id}`} className="flex gap-3.5 px-5 py-3.5">
      <div className={`flex h-[46px] w-[46px] flex-none items-center justify-center rounded-2xl ${meta.bg}`}>
        <Icon name={meta.icon} size={23} className={meta.color} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[14.5px] font-semibold leading-snug">{meta.title}</span>
        <span className="text-[13px] leading-snug text-ink-soft">{alert.message}</span>
        <span className="mt-0.5 text-xs font-medium text-ink-faint">{formatRelativeTime(alert.created_at)}</span>
      </div>
      {unread && <div className="mt-1.5 h-2 w-2 flex-none rounded-full bg-primary" />}
    </Link>
  );
}
