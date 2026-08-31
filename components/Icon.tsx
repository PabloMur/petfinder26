export function Icon({
  name,
  className = "",
  size = 22,
  filled = false,
}: {
  name: string;
  className?: string;
  size?: number;
  filled?: boolean;
}) {
  return (
    <span
      className={`material-symbols-rounded ${className}`}
      style={{ fontSize: size, fontVariationSettings: filled ? "'FILL' 1" : undefined }}
    >
      {name}
    </span>
  );
}
