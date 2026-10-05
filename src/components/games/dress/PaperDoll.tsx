import type { DollBase } from "@/lib/games/dress/characters";
import { ITEM_BY_ID, type Look, type Slot } from "@/lib/games/dress/items";
import { F, Grads, TORSO, dark, edge, light } from "./ArtKit";
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

/** Cabelo atrás do corpo: longo e ondulado, com mechas. */
function BackHair({ base }: { base: DollBase }) {
  if (base.hair !== "long" && base.hair !== "braids") return null;
  const c = base.hairColor;
  return (
    <g>
      <path d="M72 50 Q68 28 100 26 Q132 28 128 50 Q138 92 130 130 Q138 168 124 204 Q116 176 118 150 L82 150 Q84 176 76 204 Q62 168 70 130 Q62 92 72 50 Z" fill={F(c)} stroke={dark(c, 0.5)} strokeWidth="1.4" strokeLinejoin="round" />
      <g fill="none" stroke={light(c, 0.35)} strokeWidth="1.4" strokeLinecap="round" opacity="0.7">
        <path d="M76 70 Q70 110 78 150 M124 70 Q130 110 122 150 M82 90 Q78 130 84 170 M118 90 Q122 130 116 170" />
      </g>
    </g>
  );
}

/** Cabelo na frente: repartido de lado, caindo sobre os ombros. */
function FrontHair({ base }: { base: DollBase }) {
  const c = base.hairColor;
  if (base.hair === "bald") return null;
  return (
    <g>
      <path d="M74 62 Q70 32 100 30 Q130 32 126 62 Q122 44 106 40 Q96 52 84 54 Q76 58 74 62 Z" fill={F(c)} stroke={dark(c, 0.5)} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M80 50 Q92 36 112 40" fill="none" stroke={light(c, 0.45)} strokeWidth="1.8" strokeLinecap="round" opacity="0.8" />
      {base.hair === "long" || base.hair === "braids" ? (
        <g>
          <path d="M74 62 Q66 96 72 134 Q76 150 70 168 Q84 150 82 130 Q78 96 80 70 Z" fill={F(c)} stroke={dark(c, 0.5)} strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M126 62 Q134 96 128 134 Q124 150 130 168 Q116 150 118 130 Q122 96 120 70 Z" fill={F(c)} stroke={dark(c, 0.5)} strokeWidth="1.2" strokeLinejoin="round" />
        </g>
      ) : null}
      {base.hair === "braids" ? (
        <g>
          {[
            [74, 180],
            [126, 180],
          ].map(([x, y]) => (
            <g key={x}>
              <path d={`M${x} 110 Q${x + (x < 100 ? -6 : 6)} 150 ${x} ${y}`} stroke={dark(c, 0.5)} strokeWidth="11" strokeLinecap="round" fill="none" />
              <path d={`M${x} 110 Q${x + (x < 100 ? -6 : 6)} 150 ${x} ${y}`} stroke={c} strokeWidth="8" strokeLinecap="round" fill="none" />
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
      <path d={path} stroke={light(skin, 0.45)} strokeWidth={w * 0.3} opacity="0.6" transform="translate(-1.5 0)" />
    </g>
  );
}

/**
 * Boneca do "Vista o Herói": figura esguia e feminina, com cabelo longo, rosto detalhado e roupas que seguem o corpo.
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
  const shade = dark(skin, 0.4);
  const gid = `bg-${skin.slice(1)}-${bg ? bg[0].slice(1) + bg[1].slice(1) : "x"}`;
  const lipC = "#cc4f5d";
  const noTunic = !look.tunic;

  return (
    <svg viewBox={only ? SLOT_VIEWBOX[only] : FULL} className={className} role="img" aria-label={title ?? "Personagem"} xmlns="http://www.w3.org/2000/svg">
      <Grads colors={[skin, base.hairColor]} />
      {bg && !only ? (
        <>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={light(bg[0], 0.25)} />
              <stop offset="0.78" stopColor={bg[0]} />
              <stop offset="0.78" stopColor={bg[1]} />
              <stop offset="1" stopColor={dark(bg[1], 0.25)} />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="200" height="360" rx="18" fill={`url(#${gid})`} />
        </>
      ) : null}
      {!only ? <ellipse cx="100" cy="344" rx="50" ry="7" fill="#000" opacity="0.18" /> : null}

      <BackHair base={base} />
      {show("mantle") ? wrap(look.mantle, true) : null}

      {/* pernas, pés e braços */}
      {limb("M91 196 L89 330", 15, skin)}
      {limb("M109 196 L111 330", 15, skin)}
      <ellipse cx="88" cy="336" rx="12" ry="5" fill={skin} stroke={shade} strokeWidth="1.4" />
      <ellipse cx="112" cy="336" rx="12" ry="5" fill={skin} stroke={shade} strokeWidth="1.4" />
      {limb("M70 114 Q58 150 56 204", 11, skin)}
      {limb("M130 114 Q142 150 144 204", 11, skin)}

      {/* tronco e pescoço */}
      <path d="M92 84 L92 108 L108 108 L108 84 Z" fill={F(skin)} stroke={shade} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M92 96 Q100 104 108 96" fill="none" stroke={shade} strokeWidth="1.4" opacity="0.5" />
      <path d={TORSO} fill={F(skin)} stroke={shade} strokeWidth="1.3" strokeLinejoin="round" />

      {/* roupas e calçado */}
      {show("shoes") ? wrap(look.shoes) : null}
      {noTunic && !only ? <Slip /> : null}
      {show("tunic") ? wrap(look.tunic) : null}
      {show("mantle") ? wrap(look.mantle) : null}
      {show("hand") ? wrap(look.hand) : null}

      {/* mãos */}
      <ellipse cx="55" cy="208" rx="6.5" ry="8" fill={F(skin)} stroke={shade} strokeWidth="1.4" />
      <ellipse cx="145" cy="208" rx="6.5" ry="8" fill={F(skin)} stroke={shade} strokeWidth="1.4" />

      {/* cabeça */}
      <path d="M76 58 Q76 34 100 34 Q124 34 124 58 Q124 80 108 88 Q100 92 92 88 Q76 80 76 58 Z" fill={F(skin)} stroke={shade} strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="75.5" cy="64" r="3.6" fill={skin} stroke={shade} strokeWidth="1" />
      <circle cx="124.5" cy="64" r="3.6" fill={skin} stroke={shade} strokeWidth="1" />
      <FrontHair base={base} />
      <ellipse cx="85" cy="72" rx="6" ry="3.4" fill="#e86a6a" opacity="0.28" />
      <ellipse cx="115" cy="72" rx="6" ry="3.4" fill="#e86a6a" opacity="0.28" />
      {/* olhos */}
      {[90, 110].map((x, i) => (
        <g key={x}>
          <path d={`M${x - 8} 62 Q${x} 54 ${x + 8} 62 Q${x} 68 ${x - 8} 62 Z`} fill="#fff" />
          <circle cx={x} cy="61.4" r="4.6" fill="#7a4a24" />
          <circle cx={x} cy="61.4" r="2.2" fill="#1d120b" />
          <circle cx={x + 1.6} cy="59.6" r="1.3" fill="#fff" />
          <path d={`M${x - 8.6} 62 Q${x} 53 ${x + 8.6} 62`} fill="none" stroke="#1d120b" strokeWidth="1.7" strokeLinecap="round" />
          <path d={i === 0 ? `M${x - 8.6} 62 l-2.6 -2` : `M${x + 8.6} 62 l2.6 -2`} stroke="#1d120b" strokeWidth="1.4" strokeLinecap="round" />
          <path d={i === 0 ? `M${x - 7} 50.5 Q${x - 1} 45.5 ${x + 6} 48` : `M${x - 6} 48 Q${x + 1} 45.5 ${x + 7} 50.5`} fill="none" stroke={dark(base.hairColor, 0.2)} strokeWidth="1.3" strokeLinecap="round" />
        </g>
      ))}
      <path d="M100 64 Q102.5 70 99.5 72 Q98 72.5 96.5 71.6" fill="none" stroke={shade} strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
      <path d="M93 79 Q100 76.6 107 79 Q100 85 93 79 Z" fill={lipC} stroke="#8a2f3a" strokeWidth="0.9" strokeLinejoin="round" />
      <path d="M96 79.4 Q100 78 104 79.4" fill="none" stroke="#fff" strokeWidth="0.9" opacity="0.6" strokeLinecap="round" />

      {/* peça de cabeça */}
      {show("head") ? wrap(look.head) : null}
    </svg>
  );
}
