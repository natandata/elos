import type { ReactElement } from "react";
import { F, Gem, Grads, INK, Shine, dark, light, line, thin } from "./ArtKit";
import type { Params } from "@/lib/games/dress/items";

// Peças de cabeça (desenhadas na escala grande; o boneco encolhe e encaixa).

export const HEAD_ART: Record<string, (p: Params) => ReactElement> = {
  none: () => <g />,

  crown: ({ c, c2 = "#e5484d" }) => (
    <g>
      <Grads colors={[c]} />
      <path d="M62 68 L66 34 L84 52 L100 28 L116 52 L134 34 L138 68 Q100 80 62 68 Z" fill={F(c)} {...line} />
      <Shine d="M68 44 L82 56 L96 38 L92 62 L70 64 Z" o={0.35} />
      <Gem x={100} y={52} r={5} c={c2} />
      <Gem x={78} y={62} r={3.5} c={c2} />
      <Gem x={122} y={62} r={3.5} c={c2} />
      <circle cx="66" cy="34" r="3.5" fill="#fff" stroke={INK} strokeWidth="1.4" />
      <circle cx="134" cy="34" r="3.5" fill="#fff" stroke={INK} strokeWidth="1.4" />
      <circle cx="100" cy="28" r="3.5" fill="#fff" stroke={INK} strokeWidth="1.4" />
    </g>
  ),

  diadem: ({ c, c2 = "#e5484d" }) => (
    <g>
      <Grads colors={[c]} />
      <path d="M60 80 Q100 48 140 80" fill="none" stroke={INK} strokeWidth="13" strokeLinecap="round" />
      <path d="M60 80 Q100 48 140 80" fill="none" stroke={c} strokeWidth="8.5" strokeLinecap="round" />
      <path d="M66 74 Q100 46 134 74" fill="none" stroke="#fff" strokeWidth="2" opacity="0.5" strokeLinecap="round" />
      <path d="M92 60 L100 46 L108 60 Z" fill={F(c)} {...thin} />
      <Gem x={100} y={62} r={5.5} c={c2} />
    </g>
  ),

  turban: ({ c }) => (
    <g>
      <Grads colors={[c, dark(c, 0.15)]} />
      <path d="M54 88 Q48 36 100 34 Q152 36 146 88 Q100 66 54 88 Z" fill={F(c)} {...line} />
      <path d="M58 72 Q100 52 142 72 M62 58 Q100 40 138 58" fill="none" stroke={dark(c, 0.25)} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M124 40 Q154 54 144 92 Q132 70 120 62 Z" fill={F(dark(c, 0.15))} {...line} />
      <Gem x={100} y={62} r={4.5} c="#3b82f6" />
    </g>
  ),

  veil: ({ c }) => (
    <g>
      <Grads colors={[c]} />
      <path d="M50 96 Q46 36 100 34 Q154 36 150 96 L162 196 Q100 176 38 196 Z M62 98 a38 41 0 1 0 76 0 a38 41 0 1 0 -76 0 Z" fillRule="evenodd" fill={F(c)} {...line} />
      <Shine d="M58 60 Q70 40 96 38 L88 60 Z" o={0.4} />
      <path d="M60 128 Q100 150 140 128" fill="none" stroke={dark(c, 0.2)} strokeWidth="2" opacity="0.6" />
    </g>
  ),

  scarf: ({ c }) => (
    <g>
      <Grads colors={[c]} />
      <path d="M52 98 Q44 36 100 34 Q156 36 148 98 L156 142 Q144 104 100 86 Q56 104 44 142 Z" fill={F(c)} {...line} />
      <path d="M58 70 Q100 50 142 70" fill="none" stroke={INK} strokeWidth="13" strokeLinecap="round" />
      <path d="M58 70 Q100 50 142 70" fill="none" stroke={dark(c, 0.55)} strokeWidth="8.5" strokeLinecap="round" />
      <Shine d="M60 56 Q74 40 100 38 L92 58 Z" o={0.4} />
    </g>
  ),

  helmet: ({ c, c2 = "#c43a3a" }) => (
    <g>
      <Grads colors={[c, c2]} />
      <path d="M54 92 Q48 36 100 34 Q152 36 146 92 L134 86 Q100 66 66 86 Z" fill={F(c)} {...line} />
      <Shine d="M62 66 Q74 44 100 40 L90 60 Z" o={0.4} />
      <rect x="93" y="74" width="14" height="30" rx="6" fill={F(c)} {...line} />
      <path d="M100 34 Q86 6 124 14 Q108 20 112 36 Z" fill={F(c2)} {...line} />
      <circle cx="68" cy="78" r="3" fill={light(c, 0.5)} stroke={INK} strokeWidth="1.2" />
      <circle cx="132" cy="78" r="3" fill={light(c, 0.5)} stroke={INK} strokeWidth="1.2" />
    </g>
  ),

  cap: ({ c }) => (
    <g>
      <Grads colors={[c]} />
      <path d="M58 82 Q58 38 100 38 Q142 38 142 82 Z" fill={F(c)} {...line} />
      <path d="M130 78 Q172 74 184 90 L136 92 Z" fill={F(c)} {...line} />
      <circle cx="100" cy="38" r="4" fill={dark(c, 0.3)} stroke={INK} strokeWidth="1.4" />
      <Shine d="M66 62 Q78 44 100 42 L90 62 Z" o={0.35} />
    </g>
  ),

  hood: ({ c }) => (
    <g>
      <Grads colors={[c, dark(c, 0.3)]} />
      <path d="M46 104 Q36 26 100 24 Q164 26 154 104 L164 204 Q100 180 36 204 Z M64 98 a36 41 0 1 0 72 0 a36 41 0 1 0 -72 0 Z" fillRule="evenodd" fill={F(c)} {...line} />
      <path d="M64 98 a36 41 0 1 0 72 0" fill="none" stroke={dark(c, 0.5)} strokeWidth="5" opacity="0.5" />
      <Shine d="M54 60 Q70 34 100 32 L88 56 Z" o={0.35} />
      <path d="M100 26 L100 50" stroke={dark(c, 0.45)} strokeWidth="1.6" opacity="0.7" />
    </g>
  ),

  flowers: ({ c }) => (
    <g>
      <Grads colors={["#3fa34d"]} />
      <path d="M58 76 Q60 36 100 34 Q140 36 142 76" fill="none" stroke="#2e8b3d" strokeWidth="5" strokeLinecap="round" />
      {[[60, 72], [66, 52], [82, 40], [100, 34], [118, 40], [134, 52], [140, 72]].map(([x, y], i) => (
        <g key={i}>
          <ellipse cx={x + (x < 100 ? -6 : x > 100 ? 6 : 0)} cy={y + 8} rx="6" ry="3" transform={`rotate(${x < 100 ? -40 : 40} ${x} ${y + 8})`} fill={F("#3fa34d")} {...thin} />
          {[0, 72, 144, 216, 288].map((a) => (
            <circle key={a} cx={x + Math.cos((a * Math.PI) / 180) * 5.4} cy={y + Math.sin((a * Math.PI) / 180) * 5.4} r="3.8" fill={c} stroke={dark(c, 0.5)} strokeWidth="1" />
          ))}
          <circle cx={x} cy={y} r="3" fill="#f9d56e" stroke="#a87a1a" strokeWidth="0.9" />
        </g>
      ))}
    </g>
  ),

  ribbon: ({ c }) => (
    <g>
      <Grads colors={[c]} />
      <path d="M58 78 Q100 42 142 78" fill="none" stroke={INK} strokeWidth="10" strokeLinecap="round" />
      <path d="M58 78 Q100 42 142 78" fill="none" stroke={c} strokeWidth="6" strokeLinecap="round" />
      <path d="M64 66 Q40 44 44 70 Q48 84 64 66 Z" fill={F(c)} {...thin} />
      <path d="M64 66 Q76 36 84 56 Q80 70 64 66 Z" fill={F(c)} {...thin} />
      <circle cx="64" cy="66" r="5" fill={dark(c, 0.15)} {...thin} />
    </g>
  ),

  tiara: ({ c }) => {
    const metal = c === "#f5c518" ? "#f5c518" : "#c9ced6";
    const pearl = c === "#f5c518" || c === "#c9ced6" ? "#fff" : c;
    return (
      <g>
        <Grads colors={[metal]} />
        <path d="M62 78 Q100 50 138 78" fill="none" stroke={INK} strokeWidth="9" strokeLinecap="round" />
        <path d="M62 78 Q100 50 138 78" fill="none" stroke={metal} strokeWidth="5" strokeLinecap="round" />
        {[[72, 70], [84, 60], [100, 54], [116, 60], [128, 70]].map(([x, y], i) => (
          <g key={i}>
            <path d={`M${x} ${y + 2} L${x} ${y - (i === 2 ? 14 : 8)}`} stroke={metal} strokeWidth="2.6" strokeLinecap="round" />
            <circle cx={x} cy={y - (i === 2 ? 17 : 11)} r={i === 2 ? 5 : 3.6} fill={pearl} stroke={INK} strokeWidth="1.1" />
            <circle cx={x - 1.2} cy={y - (i === 2 ? 18.4 : 12.2)} r="1.2" fill="#fff" opacity="0.8" />
          </g>
        ))}
        <path d="M100 60 L100 72" stroke={metal} strokeWidth="2" />
        <circle cx="100" cy="76" r="3.8" fill={pearl} stroke={INK} strokeWidth="1.1" />
      </g>
    );
  },

  laurel: ({ c }) => (
    <g>
      <Grads colors={[c]} />
      <path d="M58 80 Q60 40 100 36 Q140 40 142 80" fill="none" stroke={dark(c, 0.4)} strokeWidth="3" strokeLinecap="round" />
      {[[60, 74], [62, 62], [68, 51], [78, 43], [90, 38], [110, 38], [122, 43], [132, 51], [138, 62], [140, 74]].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx="9" ry="4.4" transform={`rotate(${x < 100 ? 60 + (74 - y) * 0.9 : -60 - (74 - y) * 0.9} ${x} ${y})`} fill={F(c)} {...thin} />
      ))}
    </g>
  ),
};
