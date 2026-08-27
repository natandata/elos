/** Foto de perfil com as iniciais como alternativa quando não há imagem. */
export function Avatar({
  url,
  name,
  size = 32,
  className = "",
}: {
  url?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}) {
  const initials = (name ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--accent-soft)] font-bold text-[var(--accent-strong)] ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.36) }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        initials || "?"
      )}
    </span>
  );
}
