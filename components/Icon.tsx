export function Icon({
  name,
  className = "",
  size = 22,
}: {
  name: string;
  className?: string;
  size?: number;
}) {
  return (
    <span
      className={`material-symbols-rounded ${className}`}
      style={{ fontSize: size }}
    >
      {name}
    </span>
  );
}
