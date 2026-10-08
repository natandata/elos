import type { DollBase } from "@/lib/games/dress/characters";
import { ITEM_BY_ID, type Look, type Slot } from "@/lib/games/dress/items";
import { DRESS, F, Grads, SLEEVE_L, SLEEVE_R, TORSO, dark, edge, light } from "./ArtKit";
import { ITEM_ART, ITEM_BACK } from "./ItemArt";

/** Área do boneco que cada espaço ocupa (pra mostrar só a peça em miniatura). */
export const SLOT_VIEWBOX: Record<Slot, string> = {
  head: "38 10 124 118",
  tunic: "36 96 128 236",
  mantle: "22 96 156 236",
  shoes: "56 296 88 56",
  hand: "88 80 112 200",
};

const FULL = "0 0 200 360";

// As peças de cabeça e de mão foram desenhadas numa escala maior: aqui elas encaixam na boneca esguia.
const HEAD_T = "translate(100 60) scale(0.6) translate(-100 -98)";
const HAND_T = "translate(-12 -24)";

/** Defs compartilhadas: borrão suave (sombreado tipo aerógrafo) e luz sobre o vestido. */
function SoftDefs({ uid }: { uid: string }) {
  return (
    <defs>
      <filter id={`bl2-${uid}`} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="2.4" />
      </filter>
      <filter id={`bl1-${uid}`} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="1" />
      </filter>
      <linearGradient id={`lit-${uid}`} x1="0.05" y1="0" x2="0.95" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity="0.34" />
        <stop offset="0.42" stopColor="#fff" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity="0.34" />
      </linearGradient>
      <clipPath id={`dclip-${uid}`}>
        <path d={DRESS} />
        <path d={SLEEVE_L} />
        <path d={SLEEVE_R} />
      </clipPath>
    </defs>
  );
}

/** Sobrancelhas (lado esquerdo; o direito é o espelho). */
const BROW_PATH = {
  afiladas: "M80 53.4 Q87 46.4 98 49 L97.4 50.8 Q88 49.2 81.2 55 Z",
  grossas: "M79.4 54.8 Q86.6 44.6 98.4 48.2 L97.8 52.2 Q88 49.6 80.8 56.6 Z",
  arqueadas: "M80 52.6 Q85 44.2 91.4 45.6 Q96.6 46.6 98.4 49.8 L97.4 51.2 Q93 49.4 90 49.4 Q84.6 50 81.2 54.6 Z",
  retas: "M79.6 52 Q88 48.4 98.2 49.4 L98.2 52 Q88 51 80.4 55.2 Z",
  finas: "M80.4 53.4 Q87 47.6 98 49.6 L97.8 50.6 Q88 49.4 81.2 54.6 Z",
} as const;

/** Cílios: naturais (como era), longos ou dramáticos; `s` = lado de fora (-1 esquerdo, +1 direito). */
function Lashes({ x, s, style }: { x: number; s: number; style: "none" | "natural" | "longos" | "dramaticos" }) {
  if (style === "none") return null;
  const n = style === "natural" ? 2 : style === "longos" ? 3 : 4;
  const len = style === "natural" ? 1 : style === "longos" ? 1.5 : 1.9;
  const w = style === "dramaticos" ? 1.4 : 1.1;
  const starts = [8.8, 6.6, 4.2, 1.6];
  const ys = [61.4, 58.8, 56.8, 55.6];
  return (
    <path
      d={Array.from({ length: n }, (_, i) => `M${x + s * starts[i]} ${ys[i]} q${s * 2.6 * len} ${-0.6 * len} ${s * 3.4 * len} ${-3 * len}`).join(" ")}
      fill="none"
      stroke="#150c07"
      strokeWidth={w}
      strokeLinecap="round"
    />
  );
}

function Freckles() {
  const dots: [number, number][] = [[78, 70], [82, 72.5], [86, 70.4], [80, 75], [85, 74.2], [92, 71], [108, 71], [114, 70.4], [118, 72.5], [122, 70], [115, 74.2], [120, 75]];
  return (
    <g fill="#a8693a" opacity="0.6">
      {dots.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={0.7 + (i % 3) * 0.12} />
      ))}
    </g>
  );
}

function GoldDots() {
  return (
    <g fill="#f5c518" stroke="#a87a1a" strokeWidth="0.3">
      {[[78.4, 67], [80.4, 69.6], [82.8, 67.4], [121.6, 67], [119.6, 69.6], [117.2, 67.4]].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="0.9" />
      ))}
    </g>
  );
}

function Glitter() {
  const star = (cx: number, cy: number, r: number) => `M${cx} ${cy - r} L${cx + r * 0.3} ${cy - r * 0.3} L${cx + r} ${cy} L${cx + r * 0.3} ${cy + r * 0.3} L${cx} ${cy + r} L${cx - r * 0.3} ${cy + r * 0.3} L${cx - r} ${cy} L${cx - r * 0.3} ${cy - r * 0.3} Z`;
  return (
    <g fill="#fff6c2" opacity="0.95">
      <path d={star(80, 69, 2.2)} />
      <path d={star(84, 72.6, 1.3)} />
      <path d={star(120, 69, 2.2)} />
      <path d={star(116, 72.6, 1.3)} />
      <path d={star(100, 41.5, 1.5)} />
    </g>
  );
}

/** Cabelo atrás do corpo: longo e ondulado, com volume, mechas e brilho. */
function BackHair({ base, uid }: { base: DollBase; uid: string }) {
  if (base.hair !== "long" && base.hair !== "braids") return null;
  const c = base.hairColor;
  return (
    <g>
      <path d="M72 50 Q66 26 100 24 Q134 26 128 50 Q142 92 134 132 Q144 172 126 212 Q116 180 118 150 L82 150 Q84 180 74 212 Q56 172 66 132 Q58 92 72 50 Z" fill={F(c)} stroke={dark(c, 0.55)} strokeWidth="1.3" strokeLinejoin="round" />
      <g fill="none" strokeLinecap="round">
        <path d="M74 62 Q64 104 74 150 Q70 180 78 204" stroke={dark(c, 0.35)} strokeWidth="2.2" opacity="0.5" />
        <path d="M126 62 Q136 104 126 150 Q130 180 122 204" stroke={dark(c, 0.35)} strokeWidth="2.2" opacity="0.5" />
        <path d="M78 76 Q70 112 80 156 M122 76 Q130 112 120 156 M84 96 Q80 134 86 176 M116 96 Q120 134 114 176" stroke={light(c, 0.4)} strokeWidth="1.5" opacity="0.65" />
        <path d="M70 100 Q64 126 72 150" stroke="#fff" strokeWidth="3" opacity="0.18" filter={`url(#bl1-${uid})`} />
      </g>
    </g>
  );
}

/** Cabelo na frente: repartido de lado, com ondas caindo sobre os ombros. */
function FrontHair({ base, uid }: { base: DollBase; uid: string }) {
  const c = base.hairColor;
  if (base.hair === "bald") return null;
  const long = base.hair === "long" || base.hair === "braids";
  return (
    <g>
      <path d="M73 64 Q68 30 100 28 Q132 30 127 64 Q124 44 108 38 Q100 52 86 54 Q76 58 73 64 Z" fill={F(c)} stroke={dark(c, 0.55)} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M80 50 Q94 34 114 40" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" opacity="0.28" filter={`url(#bl1-${uid})`} />
      <path d="M82 50 Q94 38 112 42" fill="none" stroke={light(c, 0.5)} strokeWidth="1.4" strokeLinecap="round" opacity="0.8" />
      {long ? (
        <g>
          <path d="M73 64 Q62 100 70 138 Q76 156 66 180 Q84 158 82 132 Q78 98 81 72 Z" fill={F(c)} stroke={dark(c, 0.55)} strokeWidth="1.1" strokeLinejoin="round" />
          <path d="M127 64 Q138 100 130 138 Q124 156 134 180 Q116 158 118 132 Q122 98 119 72 Z" fill={F(c)} stroke={dark(c, 0.55)} strokeWidth="1.1" strokeLinejoin="round" />
          <path d="M72 84 Q68 116 75 142 M128 84 Q132 116 125 142" fill="none" stroke={light(c, 0.45)} strokeWidth="1.3" opacity="0.75" strokeLinecap="round" />
        </g>
      ) : null}
      {base.hair === "braids" ? (
        <g>
          {[
            [72, 184],
            [128, 184],
          ].map(([x, y]) => (
            <g key={x}>
              <path d={`M${x} 112 Q${x + (x < 100 ? -6 : 6)} 150 ${x} ${y}`} stroke={dark(c, 0.55)} strokeWidth="11" strokeLinecap="round" fill="none" />
              <path d={`M${x} 112 Q${x + (x < 100 ? -6 : 6)} 150 ${x} ${y}`} stroke={c} strokeWidth="8" strokeLinecap="round" fill="none" />
              <path d={`M${x} 112 Q${x + (x < 100 ? -6 : 6)} 150 ${x} ${y}`} stroke={light(c, 0.5)} strokeWidth="1.6" strokeDasharray="2 5" strokeLinecap="round" fill="none" />
              <path d={`M${x} ${y - 2} l0 8`} stroke="#caa56a" strokeWidth="5" strokeLinecap="round" />
            </g>
          ))}
        </g>
      ) : null}
    </g>
  );
}

/** Combinação simples (aparece quando nenhuma roupa foi escolhida ainda). */
function Slip() {
  return (
    <g>
      <Grads colors={["#efe7d6"]} />
      <path d="M74 112 Q86 118 100 116 Q114 118 126 112 L124 150 Q122 164 121 172 L134 250 Q100 260 66 250 L79 172 Q78 164 76 150 Z" fill={F("#efe7d6")} {...edge("#efe7d6", 1.3)} />
    </g>
  );
}

function limb(path: string, w: number, skin: string) {
  return (
    <g fill="none" strokeLinecap="round">
      <path d={path} stroke={dark(skin, 0.4)} strokeWidth={w + 2.4} />
      <path d={path} stroke={skin} strokeWidth={w} />
      <path d={path} stroke={light(skin, 0.5)} strokeWidth={w * 0.28} opacity="0.55" transform="translate(-1.6 0)" />
      <path d={path} stroke={dark(skin, 0.3)} strokeWidth={w * 0.3} opacity="0.35" transform="translate(2.6 0)" />
    </g>
  );
}

/**
 * Boneca do "Vista o Herói": figura esguia e feminina, com cabelo longo, rosto detalhado,
 * sombreado suave e roupas que seguem o corpo.
 * `look` diz a peça de cada espaço; sem `look`, só o corpo com uma combinação.
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
  const wrap = (id: string | undefined, back = false) => {
    if (!id) return null;
    const Art = (back ? ITEM_BACK : ITEM_ART)[id];
    if (!Art) return null;
    const kind = ITEM_BY_ID.get(id)?.slot;
    const t = kind === "head" ? HEAD_T : kind === "hand" ? HAND_T : undefined;
    return t ? (
      <g transform={t}>
        <Art />
      </g>
    ) : (
      <Art />
    );
  };
  const show = (slot: Slot) => !only || only === slot;
  const skin = base.skin;
  const shade = dark(skin, 0.42);
  const fc = base.face;
  const eyeC = fc?.eye ?? "#6a3f1c";
  const uid = `${skin.slice(1)}${base.hairColor.slice(1)}${(base.lip ?? "").slice(1)}${eyeC.slice(1)}${only ?? "f"}`;
  const gid = `bg-${uid}-${bg ? bg[0].slice(1) + bg[1].slice(1) : "x"}`;
  const noTunic = !look.tunic;
  // miniaturas de roupa/calçado/mão não precisam do rosto (deixa a lista de 75 peças leve)
  const faceOn = !only || only === "head";
  const dressed = !!look.tunic && show("tunic") && look.tunic !== "tunic_leaves" && look.tunic !== "tunic_armor";
  const hairDark = dark(base.hairColor, 0.25);
  const lipTop = base.lip ?? "#d9606d";
  const browC = fc?.browColor ?? hairDark;
  const blushC = fc ? fc.blush : "#ff6f6f";
  const lipStyle = fc?.lipStyle ?? "fosco";

  return (
    <svg viewBox={only ? SLOT_VIEWBOX[only] : FULL} className={className} role="img" aria-label={title ?? "Personagem"} xmlns="http://www.w3.org/2000/svg">
      <Grads colors={[skin, base.hairColor]} />
      <SoftDefs uid={uid} />
      <defs>
        <radialGradient id={`face-${uid}`} cx="0.4" cy="0.34" r="0.8">
          <stop offset="0" stopColor={light(skin, 0.34)} />
          <stop offset="0.6" stopColor={skin} />
          <stop offset="1" stopColor={dark(skin, 0.2)} />
        </radialGradient>
        <radialGradient id={`iris-${uid}`} cx="0.5" cy="0.4" r="0.7">
          <stop offset="0" stopColor={light(eyeC, 0.3)} />
          <stop offset="0.65" stopColor={eyeC} />
          <stop offset="1" stopColor={dark(eyeC, 0.6)} />
        </radialGradient>
        <linearGradient id={`lip-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={lipTop} />
          <stop offset="1" stopColor={dark(lipTop, 0.25)} />
        </linearGradient>
        <linearGradient id={`lipb-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={lipStyle === "degrade" ? dark(lipTop, 0.12) : lipTop} />
          <stop offset="1" stopColor={lipStyle === "degrade" ? light(lipTop, 0.45) : lipTop} />
        </linearGradient>
      </defs>
      {bg && !only ? (
        <>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={light(bg[0], 0.3)} />
              <stop offset="0.78" stopColor={bg[0]} />
              <stop offset="0.78" stopColor={bg[1]} />
              <stop offset="1" stopColor={dark(bg[1], 0.25)} />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="200" height="360" rx="18" fill={`url(#${gid})`} />
        </>
      ) : null}
      {!only ? <ellipse cx="100" cy="344" rx="50" ry="7" fill="#000" opacity="0.2" filter={`url(#bl2-${uid})`} /> : null}

      {faceOn ? <BackHair base={base} uid={uid} /> : null}
      {show("mantle") ? wrap(look.mantle, true) : null}

      {/* pernas, pés e braços */}
      {limb("M91 196 L89 330", 15, skin)}
      {limb("M109 196 L111 330", 15, skin)}
      <ellipse cx="88" cy="336" rx="12" ry="5" fill={skin} stroke={shade} strokeWidth="1.3" />
      <ellipse cx="112" cy="336" rx="12" ry="5" fill={skin} stroke={shade} strokeWidth="1.3" />
      {limb("M70 114 Q58 150 56 204", 11, skin)}
      {limb("M130 114 Q142 150 144 204", 11, skin)}

      {/* tronco e pescoço (com sombra do queixo) */}
      <path d="M92 84 L92 108 L108 108 L108 84 Z" fill={F(skin)} stroke={shade} strokeWidth="1.2" strokeLinejoin="round" />
      <ellipse cx="100" cy="93" rx="9" ry="5" fill="#000" opacity="0.22" filter={`url(#bl2-${uid})`} />
      <path d={TORSO} fill={F(skin)} stroke={shade} strokeWidth="1.2" strokeLinejoin="round" />

      {/* roupas e calçado */}
      {show("shoes") ? wrap(look.shoes) : null}
      {noTunic && !only ? <Slip /> : null}
      {show("tunic") ? wrap(look.tunic) : null}
      {dressed ? (
        <g clipPath={`url(#dclip-${uid})`} style={{ pointerEvents: "none" }}>
          <rect x="36" y="100" width="128" height="230" fill={`url(#lit-${uid})`} />
          <g fill="none" strokeLinecap="round">
            <path d="M88 180 Q80 250 70 312 M100 184 L100 318 M112 180 Q120 250 130 312" stroke="#000" strokeWidth="6" opacity="0.13" filter={`url(#bl2-${uid})`} />
            <path d="M94 182 Q88 250 80 312 M106 184 Q112 250 120 312" stroke="#fff" strokeWidth="4" opacity="0.16" filter={`url(#bl2-${uid})`} />
            <path d="M76 116 Q96 126 124 116" stroke="#000" strokeWidth="5" opacity="0.14" filter={`url(#bl2-${uid})`} />
          </g>
        </g>
      ) : null}
      {show("mantle") ? wrap(look.mantle) : null}
      {show("hand") ? wrap(look.hand) : null}

      {/* mãos */}
      <ellipse cx="55" cy="208" rx="6.5" ry="8" fill={F(skin)} stroke={shade} strokeWidth="1.3" />
      <ellipse cx="145" cy="208" rx="6.5" ry="8" fill={F(skin)} stroke={shade} strokeWidth="1.3" />

      {faceOn ? (
        <>
      <path d="M76 58 Q76 34 100 34 Q124 34 124 58 Q124 80 108 88 Q100 92 92 88 Q76 80 76 58 Z" fill={`url(#face-${uid})`} stroke={shade} strokeWidth="1.3" strokeLinejoin="round" />
      <circle cx="75.5" cy="64" r="3.6" fill={skin} stroke={shade} strokeWidth="1" />
      <circle cx="124.5" cy="64" r="3.6" fill={skin} stroke={shade} strokeWidth="1" />
      <FrontHair base={base} uid={uid} />
      <ellipse cx="100" cy="46" rx="14" ry="4.5" fill="#fff" opacity="0.2" filter={`url(#bl2-${uid})`} />
      {blushC ? (
        <>
          <ellipse cx="81" cy="73" rx="8" ry="5" fill={blushC} opacity={fc ? 0.5 : 0.3} filter={`url(#bl2-${uid})`} />
          <ellipse cx="119" cy="73" rx="8" ry="5" fill={blushC} opacity={fc ? 0.5 : 0.3} filter={`url(#bl2-${uid})`} />
        </>
      ) : null}
      {fc?.marks.includes("sardas") ? <Freckles /> : null}
      <ellipse cx="100" cy="86" rx="9" ry="3.2" fill="#000" opacity="0.1" filter={`url(#bl1-${uid})`} />

      {/* olhos */}
      {[89, 111].map((x, i) => {
        const s = i === 0 ? -1 : 1; // lado de fora
        const lid = `M${x - 9} 62.5 Q${x} 53.5 ${x + 9} 62.5 Q${x} 68.5 ${x - 9} 62.5 Z`;
        return (
          <g key={x}>
            <defs>
              <clipPath id={`eye-${uid}-${i}`}>
                <path d={lid} />
              </clipPath>
            </defs>
            <path d={lid} fill="#fff" />
            <g clipPath={`url(#eye-${uid}-${i})`}>
              <circle cx={x} cy="61.4" r="5.6" fill={`url(#iris-${uid})`} />
              <circle cx={x} cy="61.4" r="2.5" fill="#120a05" />
              <circle cx={x + 2} cy="59.4" r="1.7" fill="#fff" />
              <circle cx={x - 1.8} cy="63.6" r="0.8" fill="#fff" opacity="0.7" />
              <path d={`M${x - 10} 57 Q${x} 51 ${x + 10} 57 L${x + 10} 52 L${x - 10} 52 Z`} fill="#000" opacity="0.18" />
            </g>
            {base.shadow ? <path d={`M${x - 10} 61.5 Q${x} 49.5 ${x + 10} 61.5 Q${x} 54.5 ${x - 10} 61.5 Z`} fill={base.shadow} opacity="0.62" /> : null}
            <path d={`M${x - 9.4} 62.5 Q${x} 52.6 ${x + 9.4} 62.5`} fill="none" stroke={fc && fc.liner !== "none" ? fc.linerColor : "#150c07"} strokeWidth={fc?.liner === "grosso" ? 3.4 : fc?.liner === "fino" ? 2.4 : fc?.liner === "gatinho" ? 2.6 : 2} strokeLinecap="round" />
            {fc?.liner === "gatinho" ? <path d={`M${x + s * 9.2} 62.2 L${x + s * 14.4} 57.6 L${x + s * 11} 63.6 Z`} fill={fc.linerColor} /> : null}
            {fc?.liner === "grosso" ? <path d={`M${x - 8} 63.4 Q${x} 68.6 ${x + 8} 63.4`} fill="none" stroke={fc.linerColor} strokeWidth="1.5" strokeLinecap="round" opacity="0.9" /> : null}
            <Lashes x={x} s={s} style={fc?.lashes ?? "natural"} />
            <path d={`M${x - 7} 55.2 Q${x} 51.4 ${x + 7} 55.2`} fill="none" stroke={shade} strokeWidth="0.7" opacity="0.35" />
          </g>
        );
      })}
      {/* sobrancelhas afiladas */}
      <path d={BROW_PATH[fc?.brows ?? "afiladas"]} fill={browC} />
      <path d={BROW_PATH[fc?.brows ?? "afiladas"]} fill={browC} transform="translate(200 0) scale(-1 1)" />
      {/* nariz */}
      <ellipse cx="101.4" cy="70.4" rx="2" ry="3.4" fill="#000" opacity="0.1" filter={`url(#bl1-${uid})`} />
      <path d="M98.4 71.8 Q100 74 102.4 72.4" fill="none" stroke={shade} strokeWidth="1" strokeLinecap="round" opacity="0.8" />
      <circle cx="99.8" cy="67" r="1.4" fill="#fff" opacity="0.3" />
      {/* boca */}
      <path d="M92 79.6 Q96 76.6 100 78 Q104 76.6 108 79.6 Q100 81.6 92 79.6 Z" fill={`url(#lip-${uid})`} stroke="#8a2f3a" strokeWidth="0.7" strokeLinejoin="round" />
      <path d="M92.4 80 Q100 88.2 107.6 80 Q100 82.4 92.4 80 Z" fill={`url(#lipb-${uid})`} stroke="#8a2f3a" strokeWidth="0.7" strokeLinejoin="round" />
      <ellipse cx="100" cy="83.6" rx={lipStyle === "gloss" ? 3.6 : 2.6} ry={lipStyle === "gloss" ? 1.3 : 0.9} fill="#fff" opacity={lipStyle === "gloss" ? 0.85 : 0.55} />
      {lipStyle === "gloss" ? <path d="M95 78.6 Q98 77.4 100 78.2" fill="none" stroke="#fff" strokeWidth="1" strokeLinecap="round" opacity="0.8" /> : null}
      {fc?.marks.includes("pinta") ? <circle cx="107.6" cy="76.4" r="0.95" fill="#3a2012" /> : null}
      {fc?.marks.includes("pontos") ? <GoldDots /> : null}
      {fc?.marks.includes("brilho") ? <Glitter /> : null}

        </>
      ) : null}

      {/* peça de cabeça */}
      {show("head") ? wrap(look.head) : null}
    </svg>
  );
}
