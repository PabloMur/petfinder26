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

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex h-[78px] items-center justify-between border-t border-ink/[0.07] bg-surface px-2 pb-[env(safe-area-inset-bottom)]">
      {NAV_ITEMS.slice(0, 2).map((item) => (
        <NavLink key={item.href} item={item} active={pathname.startsWith(item.href)} />
      ))}

      <Link
        href="/publicar/1"
        aria-label="Publicar reporte"
        className="-mt-6 flex h-[52px] w-[52px] items-center justify-center rounded-[19px] bg-primary shadow-[0_8px_20px_rgba(123,44,191,0.4)] transition-transform hover:scale-105"
      >
        <Icon name="add" size={27} className="text-white" />
      </Link>

      {NAV_ITEMS.slice(2).map((item) => (
        <NavLink key={item.href} item={item} active={pathname.startsWith(item.href)} />
      ))}
    </nav>
  );
}

function NavLink({
  item,
  active,
}: {
  item: (typeof NAV_ITEMS)[number];
  active: boolean;
}) {
  return (
    <Link
      href={item.href}
      className={`flex w-[60px] flex-col items-center gap-[3px] ${
        active ? "text-primary" : "text-ink-faint"
      }`}
    >
      <Icon name={item.icon} size={24} />
      <span className={`text-[11px] leading-none ${active ? "font-semibold" : "font-medium"}`}>
        {item.label}
      </span>
    </Link>
  );
}
