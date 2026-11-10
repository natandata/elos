/* eslint-disable @next/next/no-img-element */
/** Busto de quem fez a jogada, ao lado da narração (maior nos gols). */
export function LogAvatar({ photo, big }: { photo?: string; big?: boolean }) {
  const size = big ? "h-12 w-9" : "h-9 w-7";
  if (!photo) return <span className={`${size} shrink-0`} aria-hidden />;
  return <img src={photo} alt="" loading="lazy" draggable={false} className={`${size} shrink-0 rounded-md bg-black/30 object-cover object-top ring-1 ring-white/15`} />;
}
