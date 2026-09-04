"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icon";

const NAV_ITEMS = [
  { href: "/mapa", label: "Mapa", icon: "map" },
  { href: "/alertas", label: "Alertas", icon: "notifications" },
  { href: "/guardados", label: "Guardados", icon: "favorite" },
  { href: "/perfil", label: "Perfil", icon: "person" },
] as const;

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-ink/[0.08] bg-surface px-4 py-6 lg:flex">
      <Link href="/mapa" className="flex items-center gap-2.5 px-2 pb-7">
        <div className="h-[26px] w-[26px] rotate-45 rounded-[50%_50%_50%_6px] bg-primary" />
        <span className="text-[18px] font-bold tracking-tight">Pet Finder</span>
      </Link>

      <Link
        href="/publicar/1"
        className="mb-5 flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary text-[14.5px] font-semibold text-white shadow-[0_8px_20px_rgba(123,44,191,0.3)] transition-colors hover:bg-primary-hover"
      >
        <Icon name="add" size={20} />
        Publicar reporte
      </Link>

      <div className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14.5px] ${
                active ? "bg-primary/[0.1] font-semibold text-primary" : "font-medium text-ink-muted hover:bg-surface-muted"
              }`}
            >
              <Icon name={item.icon} size={22} filled={active} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
