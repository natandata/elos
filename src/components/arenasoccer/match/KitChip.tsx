import type { Team } from "@/lib/arenasoccer/teams";

/** Bolinha com o uniforme do time. */
export function KitChip({ t, size = 22 }: { t: Pick<Team, "p" | "s" | "k">; size?: number }) {
  const bg =
    t.k === "stripes"
      ? `repeating-linear-gradient(90deg, ${t.p} 0 ${size / 5}px, ${t.s} ${size / 5}px ${(size / 5) * 2}px)`
      : t.k === "hoops"
        ? `repeating-linear-gradient(0deg, ${t.p} 0 ${size / 5}px, ${t.s} ${size / 5}px ${(size / 5) * 2}px)`
        : t.k === "halves"
          ? `linear-gradient(90deg, ${t.p} 50%, ${t.s} 50%)`
          : t.k === "sash"
            ? `linear-gradient(135deg, ${t.p} 35%, ${t.s} 35% 65%, ${t.p} 65%)`
            : t.k === "checker"
              ? `conic-gradient(${t.p} 25%, ${t.s} 0 50%, ${t.p} 0 75%, ${t.s} 0)`
              : t.p;
  return <i className="inline-block shrink-0 rounded-full border-2 border-black/30" style={{ width: size, height: size, background: bg, backgroundSize: t.k === "checker" ? `${size / 2}px ${size / 2}px` : undefined }} aria-hidden />;
}
