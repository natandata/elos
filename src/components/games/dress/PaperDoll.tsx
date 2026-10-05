import type { DollBase } from "@/lib/games/dress/characters";
import type { Look, Slot } from "@/lib/games/dress/items";
import { F, Grads, INK, dark, light, line, thin } from "./ArtKit";
import { ITEM_ART } from "./ItemArt";

/** Área do boneco que cada espaço ocupa (pra mostrar só a peça em miniatura). */
export const SLOT_VIEWBOX: Record<Slot, string> = {
  head: "34 22 132 128",
  tunic: "28 118 144 190",
  mantle: "28 118 144 190",
  shoes: "50 280 100 72",
  hand: "118 96 92 170",
};

const FULL = "0 0 200 360";

function BackHair({ base }: { base: DollBase }) {
  if (base.hair !== "long" && base.hair !== "braids") return null;
  return (
    <path
      d="M54 96 Q48 44 100 42 Q152 44 146 96 L152 162 Q140 176 132 150 L68 150 Q60 176 48 162 Z"
      fill={F(base.hairColor)}
      {...line}
    />
  );
}

function FrontHair({ base }: { base: DollBase }) {
  const c = base.hairColor;
  return (
    <g>
      {base.hair === "short" || base.hair === "long" || base.hair === "braids" ? (
        <path d="M56 92 Q52 48 100 48 Q148 48 144 92 Q136 70 118 66 Q100 76 82 66 Q64 70 56 92 Z" fill={F(c)} {...line} />
      ) : null}
      {base.hair === "braids" ? (
        <g>
          {[58, 74, 126, 142].map((x) => (
            <g key={x}>
              <path d={`M${x} 140 L${x < 100 ? x - 4 : x + 4} 184`} stroke={INK} strokeWidth="13" strokeLinecap="round" />
              <path d={`M${x} 140 L${x < 100 ? x - 4 : x + 4} 184`} stroke={c} strokeWidth="8" strokeLinecap="round" />
              <path d={`M${x < 100 ? x - 4 : x + 4} 180 l0 8`} stroke="#caa56a" strokeWidth="5" strokeLinecap="round" />
            </g>
          ))}
        </g>
      ) : null}
    </g>
  );
}

function Beard({ base }: { base: DollBase }) {
  if (base.beard === "none") return null;
  const c = base.hairColor;
  return base.beard === "long" ? (
    <path d="M58 100 Q56 150 100 184 Q144 150 142 100 Q132 126 100 124 Q68 126 58 100 Z" fill={F(c)} {...line} />
  ) : (
    <path d="M60 104 Q62 138 100 142 Q138 138 140 104 Q130 124 100 122 Q70 124 60 104 Z" fill={F(c)} {...line} />
  );
}

/**
 * Boneco do "Vista o Herói" (estilo fofo da Arena: cabeça grande, contorno escuro, degradê e brilho).
 * `look` diz a peça de cada espaço; sem `look`, só o corpo.
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
  const skin = base.skin;
  const gid = `bg-${skin.slice(1)}-${bg ? bg[0].slice(1) + bg[1].slice(1) : "x"}`;
  const limb = (d: string, w: number) => (
    <g fill="none" strokeLinecap="round">
      <path d={d} stroke={INK} strokeWidth={w + 6} />
      <path d={d} stroke={skin} strokeWidth={w} />
      <path d={d} stroke={light(skin, 0.45)} strokeWidth={w * 0.28} opacity="0.7" transform="translate(-3 0)" />
    </g>
  );

  return (
    <svg viewBox={only ? SLOT_VIEWBOX[only] : FULL} className={className} role="img" aria-label={title ?? "Personagem"} xmlns="http://www.w3.org/2000/svg">
      <Grads colors={[skin, base.hairColor]} />
      {bg && !only ? (
        <>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={light(bg[0], 0.25)} />
              <stop offset="0.74" stopColor={bg[0]} />
              <stop offset="0.74" stopColor={bg[1]} />
              <stop offset="1" stopColor={dark(bg[1], 0.25)} />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="200" height="360" rx="18" fill={`url(#${gid})`} />
        </>
      ) : null}
      {!only ? <ellipse cx="100" cy="342" rx="62" ry="9" fill="#000" opacity="0.2" /> : null}

      <BackHair base={base} />

      {/* pernas e pés */}
      {limb("M88 258 L88 320", 20)}
      {limb("M112 258 L112 320", 20)}
      <ellipse cx="88" cy="332" rx="17" ry="8" fill={F(skin)} {...line} />
      <ellipse cx="112" cy="332" rx="17" ry="8" fill={F(skin)} {...line} />

      {/* tronco e braços */}
      <path d="M62 142 Q100 128 138 142 L142 252 Q100 266 58 252 Z" fill={F(skin)} {...line} />
      {limb("M56 152 Q38 192 40 230", 20)}
      {limb("M144 152 Q162 192 160 230", 20)}

      {only ? (
        <>
          {only !== "head" ? art(only) : null}
          {only === "hand" ? <circle cx="160" cy="232" r="12" fill={F(skin)} {...line} /> : null}
        </>
      ) : (
        <>
          {art("shoes")}
          {art("tunic")}
          {art("mantle")}
          {art("hand")}
          <circle cx="40" cy="232" r="12" fill={F(skin)} {...line} />
          <circle cx="160" cy="232" r="12" fill={F(skin)} {...line} />
        </>
      )}

      {/* cabeça */}
      <circle cx="57" cy="104" r="8" fill={F(skin)} {...thin} />
      <circle cx="143" cy="104" r="8" fill={F(skin)} {...thin} />
      <ellipse cx="100" cy="98" rx="43" ry="41" fill={F(skin)} {...line} />
      <FrontHair base={base} />
      {/* rosto */}
      <ellipse cx="76" cy="112" rx="9" ry="6" fill="#e86a6a" opacity="0.32" />
      <ellipse cx="124" cy="112" rx="9" ry="6" fill="#e86a6a" opacity="0.32" />
      {[84, 116].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy="99" rx="8.5" ry="10" fill="#fff" stroke={INK} strokeWidth="1.8" />
          <circle cx={x + 0.5} cy="101" r="6" fill="#4a2c14" />
          <circle cx={x + 0.5} cy="101" r="3.2" fill={INK} />
          <circle cx={x + 3} cy="97" r="2.4" fill="#fff" />
          {base.female ? <path d={`M${x - 9} 94 Q${x} 86 ${x + 9} 94`} fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" /> : null}
        </g>
      ))}
      <path d="M72 84 Q84 78 94 84 M106 84 Q116 78 128 84" fill="none" stroke={base.hair === "bald" ? dark(skin, 0.4) : dark(base.hairColor, 0.1)} strokeWidth="3.4" strokeLinecap="round" />
      <path d="M97 108 Q100 112 103 108" fill="none" stroke={dark(skin, 0.4)} strokeWidth="2" strokeLinecap="round" />
      <Beard base={base} />
      <path d="M88 118 Q100 130 112 118 Q100 122 88 118 Z" fill={base.female ? "#d8505a" : "#8a3b30"} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />

      {/* cabeça: peça por cima de tudo */}
      {!only || only === "head" ? art("head") : null}
    </svg>
  );
}
