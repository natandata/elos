import type { DollBase } from "@/lib/games/dress/characters";
import type { Look, Slot } from "@/lib/games/dress/items";
import { ITEM_ART } from "./ItemArt";

/** Área do boneco que cada espaço ocupa (pra mostrar só a peça em miniatura). */
export const SLOT_VIEWBOX: Record<Slot, string> = {
  head: "50 8 100 100",
  tunic: "30 88 140 180",
  mantle: "30 88 140 180",
  shoes: "50 270 100 80",
  hand: "120 110 80 200",
};

const FULL = "0 0 200 360";

function Hair({ base }: { base: DollBase }) {
  const c = base.hairColor;
  return (
    <g>
      {base.hair === "long" || base.hair === "braids" ? (
        <path d="M70 62 Q66 30 100 28 Q134 30 130 62 L136 112 Q126 118 124 100 L76 100 Q74 118 64 112 Z" fill={c} />
      ) : null}
      {base.hair === "braids" ? (
        <g stroke={c} strokeWidth="6" strokeLinecap="round">
          <path d="M70 100 L66 150 M80 102 L78 156 M120 102 L122 156 M130 100 L134 150" />
          <path d="M66 150 l-4 6 M78 156 l-3 6 M122 156 l3 6 M134 150 l4 6" stroke="#caa56a" strokeWidth="3" />
        </g>
      ) : null}
      {base.hair === "short" ? <path d="M72 58 Q70 32 100 32 Q130 32 128 58 Q124 44 100 42 Q76 44 72 58 Z" fill={c} /> : null}
      {base.hair === "bald" ? <path d="M72 52 Q74 44 80 46" fill="none" stroke={c} strokeWidth="3" /> : null}
    </g>
  );
}

function Beard({ base }: { base: DollBase }) {
  if (base.beard === "none") return null;
  const c = base.hairColor;
  return base.beard === "long" ? (
    <path d="M76 66 Q78 100 100 124 Q122 100 124 66 Q112 84 100 84 Q88 84 76 66 Z" fill={c} />
  ) : (
    <path d="M76 66 Q80 90 100 94 Q120 90 124 66 Q112 80 100 80 Q88 80 76 66 Z" fill={c} />
  );
}

/**
 * Boneco do "Vista o Herói". `look` diz a peça de cada espaço; sem `look`, só o corpo.
 * `only` mostra só uma peça (miniatura da opção) com o zoom do espaço.
 */
export function PaperDoll({
  base,
  look = {},
  bg,
  only,
  className = "",
  title,
}: {
  base: DollBase;
  look?: Look;
  bg?: [string, string];
  only?: Slot;
  className?: string;
  title?: string;
}) {
  const art = (slot: Slot) => {
    const id = look[slot];
    const Art = id ? ITEM_ART[id] : undefined;
    return Art ? <Art /> : null;
  };
  const gid = `bg-${base.skin.slice(1)}-${bg ? bg[0].slice(1) : "x"}`;
  return (
    <svg viewBox={only ? SLOT_VIEWBOX[only] : FULL} className={className} role="img" aria-label={title ?? "Personagem"} xmlns="http://www.w3.org/2000/svg">
      {bg && !only ? (
        <>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={bg[0]} />
              <stop offset="0.72" stopColor={bg[0]} />
              <stop offset="0.72" stopColor={bg[1]} />
              <stop offset="1" stopColor={bg[1]} />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="200" height="360" rx="18" fill={`url(#${gid})`} />
        </>
      ) : null}

      {/* corpo */}
      <g stroke="rgba(0,0,0,0.22)" strokeWidth="1.5">
        <rect x="80" y="206" width="16" height="122" rx="7" fill={base.skin} />
        <rect x="104" y="206" width="16" height="122" rx="7" fill={base.skin} />
        <ellipse cx="88" cy="332" rx="12" ry="5" fill={base.skin} />
        <ellipse cx="112" cy="332" rx="12" ry="5" fill={base.skin} />
        <rect x="46" y="104" width="16" height="84" rx="8" fill={base.skin} />
        <rect x="138" y="104" width="16" height="84" rx="8" fill={base.skin} />
        <path d="M70 98 Q100 90 130 98 L134 210 L66 210 Z" fill={base.skin} />
        <rect x="92" y="84" width="16" height="18" fill={base.skin} />
      </g>

      {/* cabeça */}
      <Hair base={base} />
      <circle cx="100" cy="64" r="27" fill={base.skin} stroke="rgba(0,0,0,0.22)" strokeWidth="1.5" />
      <path d={base.hair === "bald" ? "M74 56 Q100 40 126 56" : "M76 50 Q100 38 124 50 Q124 42 100 36 Q76 42 76 50 Z"} fill={base.hair === "bald" ? "none" : base.hairColor} />
      <g fill="#2b1b10">
        <circle cx="90" cy="64" r="2.6" />
        <circle cx="110" cy="64" r="2.6" />
      </g>
      <path d="M92 76 Q100 82 108 76" fill="none" stroke={base.female ? "#c4565a" : "#7a3b2a"} strokeWidth="2.4" strokeLinecap="round" />
      <Beard base={base} />

      {/* peças, de baixo pra cima */}
      {only ? art(only) : (
        <>
          {art("tunic")}
          {art("mantle")}
          {art("shoes")}
          {art("head")}
          {art("hand")}
        </>
      )}
    </svg>
  );
}
