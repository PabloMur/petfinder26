import { Icon } from "@/components/Icon";

export function EmptyState({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: string;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2.5 py-10 text-center">
      <Icon name={icon} size={32} className="text-ink-faint" />
      <span className="text-[15px] font-semibold">{title}</span>
      <p className="max-w-[260px] text-[13.5px] leading-relaxed text-ink-soft">{subtitle}</p>
      {action}
    </div>
  );
}
