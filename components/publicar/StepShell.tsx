import Link from "next/link";
import { Icon } from "@/components/Icon";

export function StepShell({
  step,
  onBack,
  title,
  subtitle,
  children,
  footer,
}: {
  step: 1 | 2 | 3;
  onBack?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <div className="flex items-center gap-3.5 px-5 pt-4">
        <Link href={onBack ?? "/mapa"} aria-label={onBack ? "Volver" : "Cerrar"}>
          <Icon name={onBack ? "arrow_back" : "close"} size={24} />
        </Link>
        <div className="flex flex-1 gap-1.5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`h-[5px] flex-1 rounded-full ${n <= step ? "bg-primary" : "bg-[#EEE7DE]"}`}
            />
          ))}
        </div>
        <span className="text-[13px] font-semibold text-ink-soft">{step}/3</span>
      </div>

      <div className="flex flex-1 flex-col gap-5 px-5 py-6">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-[26px] font-semibold leading-tight tracking-tight">{title}</h2>
          {subtitle && <p className="text-[14.5px] leading-relaxed text-ink-soft">{subtitle}</p>}
        </div>
        {children}
      </div>

      <div className="px-5 pb-8">{footer}</div>
    </div>
  );
}

export function PrimaryButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="h-14 w-full rounded-[18px] bg-primary text-[16px] font-semibold text-white transition-opacity disabled:opacity-40"
    >
      {children}
    </button>
  );
}
