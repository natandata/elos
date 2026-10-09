import type { ReactElement } from "react";
import { F, Gem, Grads, SLEEVE_L, SLEEVE_R, Shine, dark, edge, light } from "./ArtKit";
import type { Params } from "@/lib/games/dress/items";

// Mais roupas, casacos e calçados do "Vista o Herói": vestidos de vários cortes, conjuntos, macacão, estampas, asas e sapatos.
// Mesma silhueta do corpo (ArtKit: DRESS, SLEEVE_*), por família e cor.

type R = (p: Params) => ReactElement;
const GOLD = "#f5c518";

const lum = (hex: string): number => {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
};
/** Cor que combina com a principal: clara para as escuras e escura para as claras. */
export const partner = (c: string): string => (lum(c) > 0.62 ? dark(c, 0.42) : light(c, 0.62));

const BODICE = "M71 108 Q85 114 93 107 L107 107 Q115 114 129 108 L128 150 Q126 164 124 172 L76 172 Q74 164 72 150 Z";
const STRAP = "M80 110 L87 106 Q100 120 113 106 L120 110 L126 150 Q124 164 124 172 L76 172 Q74 164 74 150 Z";
const ONE = "M71 108 Q85 114 93 107 L107 107 L126 146 Q124 164 124 172 L76 172 Q74 164 72 150 Z";
const CROP = "M80 110 L87 106 Q100 118 113 106 L120 110 L124 146 Q100 156 76 146 Z";
const SK = {
  a: "M76 172 L124 172 L152 310 Q100 326 48 310 Z",
  full: "M76 172 L124 172 Q168 230 178 312 Q100 332 22 312 Q32 230 76 172 Z",
  mermaid: "M76 172 L124 172 Q128 246 130 276 Q160 298 168 322 Q100 336 32 322 Q40 298 70 276 Q72 246 76 172 Z",
  mini: "M76 172 L124 172 L142 238 Q100 250 58 238 Z",
  pencil: "M76 172 L124 172 Q128 228 125 284 Q100 292 75 284 Q72 228 76 172 Z",
  midiHi: "M75 146 L125 146 L146 284 Q100 298 54 284 Z",
  pantL: "M76 172 L100 172 L99 208 Q98 268 97 322 L54 322 Q64 250 76 172 Z",
  pantR: "M124 172 L100 172 L101 208 Q102 268 103 322 L146 322 Q136 250 124 172 Z",
  kaftan: "M70 108 Q100 102 130 108 L150 150 L162 312 Q100 328 38 312 L50 150 Z",
};
const HEM = {
  a: "M50 309 Q100 324 150 309",
  full: "M24 311 Q100 330 176 311",
  mermaid: "M34 321 Q100 334 166 321",
  mini: "M60 237 Q100 249 140 237",
  pencil: "M76 283 Q100 291 124 283",
  midi: "M56 283 Q100 296 144 283",
  pants: "M54 321 L97 321 M103 321 L146 321",
  kaftan: "M40 311 Q100 327 160 311",
};
const LONG_L = "M71 108 Q58 120 55 204 L66 206 Q68 140 80 120 Z";
const LONG_R = "M129 108 Q142 120 145 204 L134 206 Q132 140 120 120 Z";
const WIDE_L = "M70 108 Q44 132 36 210 L58 214 Q64 150 82 124 Z";
const WIDE_R = "M130 108 Q156 132 164 210 L142 214 Q136 150 118 124 Z";

type Gar = {
  id: string;
  top: string;
  skirts: string[];
  skirtC?: string;
  sleeves?: string[];
  hem?: string;
  trim?: string;
  belt?: string | null;
  neck?: string | null;
  extra?: ReactElement;
  over?: ReactElement;
};

function garment(c: string, o: Gar): ReactElement {
  const clip = `clip-g-${o.id}`;
  const sc = o.skirtC ?? c;
  const shapes = [o.top, ...o.skirts, ...(o.sleeves ?? [])];
  return (
    <g>
      <Grads colors={[c, sc]} />
      <defs>
        <clipPath id={clip}>
          {shapes.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </clipPath>
      </defs>
      {o.skirts.map((d, i) => (
        <path key={`s${i}`} d={d} fill={F(sc)} {...edge(sc)} />
      ))}
      <path d={o.top} fill={F(c)} {...edge(c)} />
      {(o.sleeves ?? []).map((d, i) => (
        <path key={`m${i}`} d={d} fill={F(c)} {...edge(c)} />
      ))}
      <Shine d="M80 118 Q96 112 108 118 L104 168 Q92 172 82 168 Z" o={0.16} />
      {o.belt !== null ? <path d="M77 172 Q100 182 123 172" fill="none" stroke={o.belt ?? dark(c, 0.35)} strokeWidth="3" strokeLinecap="round" /> : null}
      {o.neck !== null ? <path d={o.neck ?? "M86 108 Q100 126 114 108"} fill="none" stroke={dark(c, 0.45)} strokeWidth="1.8" strokeLinecap="round" /> : null}
      {o.hem && o.trim ? <path d={o.hem} fill="none" stroke={o.trim} strokeWidth="3" strokeLinecap="round" /> : null}
      {o.extra ? <g clipPath={`url(#${clip})`}>{o.extra}</g> : null}
      {o.over}
    </g>
  );
}

const sparkles = (pts: [number, number][], c = "#fff") => (
  <g fill={c} opacity="0.6">
    {pts.map(([x, y], i) => (
      <circle key={i} cx={x} cy={y} r={1.5 + (i % 3) * 0.5} />
    ))}
  </g>
);

const FLOWER_PTS: [number, number][] = [[62, 244], [96, 262], [128, 240], [78, 290], [118, 292], [100, 214], [140, 288], [58, 296], [84, 196], [116, 190], [100, 306], [70, 220], [132, 262]];
const POLKA_PTS: [number, number][] = [[64, 190], [92, 196], [120, 192], [78, 222], [108, 226], [136, 224], [60, 254], [90, 258], [122, 256], [148, 258], [74, 288], [104, 292], [134, 290], [100, 128], [84, 150], [116, 150]];

export const MORE_TUNIC: Record<string, R> = {
  gown: ({ c }) => garment(c, { id: "gown", top: STRAP, skirts: [SK.full], hem: HEM.full, trim: GOLD, belt: GOLD, extra: sparkles([[50, 260], [86, 292], [124, 268], [152, 296], [32, 298], [100, 232], [136, 244], [68, 238], [104, 306]]), over: <Gem x={100} y={122} r={3.4} c={GOLD} /> }),
  mermaid: ({ c }) => garment(c, { id: "mermaid", top: STRAP, skirts: [SK.mermaid], hem: HEM.mermaid, trim: partner(c), extra: <path d="M100 176 L100 330 M86 190 Q80 250 74 290 M114 190 Q120 250 126 290" fill="none" stroke={dark(c, 0.2)} strokeWidth="1.3" opacity="0.5" />, over: <path d="M80 140 Q100 156 120 140" fill="none" stroke={partner(c)} strokeWidth="2" /> }),
  mini: ({ c }) => garment(c, { id: "mini", top: BODICE, sleeves: [SLEEVE_L, SLEEVE_R], skirts: [SK.mini], hem: HEM.mini, trim: partner(c) }),
  pencil: ({ c }) => garment(c, { id: "pencil", top: BODICE, sleeves: [SLEEVE_L, SLEEVE_R], skirts: [SK.pencil], hem: HEM.pencil, trim: partner(c), belt: partner(c), extra: <path d="M100 250 L100 290" stroke={dark(c, 0.4)} strokeWidth="1.4" /> }),
  sleeveless: ({ c }) => garment(c, { id: "sleeveless", top: STRAP, skirts: [SK.a], hem: HEM.a, trim: dark(c, 0.14), belt: partner(c) }),
  longsleeve: ({ c }) => garment(c, { id: "longsleeve", top: BODICE, sleeves: [LONG_L, LONG_R], skirts: [SK.a], hem: HEM.a, trim: dark(c, 0.14), over: <path d="M56 198 L66 200 M144 198 L134 200" stroke={partner(c)} strokeWidth="3.4" strokeLinecap="round" /> }),
  puff: ({ c }) =>
    garment(c, {
      id: "puff",
      top: BODICE,
      sleeves: [SLEEVE_L, SLEEVE_R],
      skirts: [SK.a],
      hem: HEM.a,
      trim: dark(c, 0.14),
      over: (
        <g fill={F(c)} {...edge(c)}>
          <ellipse cx="64" cy="122" rx="13" ry="10" />
          <ellipse cx="136" cy="122" rx="13" ry="10" />
        </g>
      ),
    }),
  twopiece: ({ c, c2 }) => {
    const b = c2 ?? partner(c);
    return garment(c, { id: "twopiece", top: CROP, skirts: [SK.midiHi], skirtC: b, hem: HEM.midi, trim: dark(b, 0.2), belt: null, neck: null, over: <path d="M76 146 Q100 156 124 146" fill="none" stroke={dark(c, 0.4)} strokeWidth="2" /> });
  },
  pants: ({ c, c2 }) => {
    const b = c2 ?? partner(c);
    return garment(c, { id: "pants", top: BODICE, sleeves: [SLEEVE_L, SLEEVE_R], skirts: [SK.pantL, SK.pantR], skirtC: b, hem: HEM.pants, trim: dark(b, 0.2), belt: GOLD, extra: <path d="M100 176 L100 206" stroke={dark(b, 0.4)} strokeWidth="1.4" /> });
  },
  jumpsuit: ({ c }) => garment(c, { id: "jumpsuit", top: STRAP, skirts: [SK.pantL, SK.pantR], hem: HEM.pants, trim: dark(c, 0.2), belt: GOLD, extra: <path d="M100 176 L100 206" stroke={dark(c, 0.4)} strokeWidth="1.4" />, over: <rect x="94" y="170" width="12" height="10" rx="2" fill={GOLD} stroke={dark(GOLD, 0.5)} strokeWidth="1" /> }),
  toga: ({ c }) =>
    garment(c, {
      id: "toga",
      top: ONE,
      skirts: [SK.a],
      hem: HEM.a,
      trim: GOLD,
      belt: GOLD,
      neck: "M93 107 L124 146",
      extra: <path d="M96 112 Q112 150 90 190 M104 118 Q120 160 100 210" fill="none" stroke={dark(c, 0.25)} strokeWidth="1.4" opacity="0.6" />,
      over: <Gem x={74} y={110} r={3.4} c="#e5484d" />,
    }),
  kaftan: ({ c }) =>
    garment(c, {
      id: "kaftan",
      top: SK.kaftan,
      skirts: [],
      sleeves: [WIDE_L, WIDE_R],
      hem: HEM.kaftan,
      trim: GOLD,
      belt: null,
      neck: "M84 108 Q100 134 116 108",
      extra: (
        <g fill="none" stroke={GOLD} strokeWidth="2.4" strokeLinecap="round">
          <path d="M84 108 Q100 134 116 108 M100 134 L100 220" />
          <path d="M40 206 L58 210 M160 206 L142 210" />
          <path d="M96 150 q4 -4 8 0 M96 170 q4 -4 8 0 M96 190 q4 -4 8 0" />
        </g>
      ),
    }),
  ruffle: ({ c }) => {
    const wave = (y: number) => `M44 ${y} q8 10 16 0 q8 10 16 0 q8 10 16 0 q8 10 16 0 q8 10 16 0 q8 10 16 0 q8 10 16 0 q8 10 16 0`;
    return garment(c, {
      id: "ruffle",
      top: BODICE,
      sleeves: [SLEEVE_L, SLEEVE_R],
      skirts: [SK.a],
      hem: HEM.a,
      trim: dark(c, 0.14),
      extra: (
        <g fill="none" strokeLinecap="round">
          <path d={wave(214)} stroke={light(c, 0.35)} strokeWidth="3" />
          <path d={wave(256)} stroke={dark(c, 0.22)} strokeWidth="3" />
          <path d={wave(294)} stroke={light(c, 0.35)} strokeWidth="3" />
        </g>
      ),
    });
  },
  wrap: ({ c }) =>
    garment(c, {
      id: "wrap",
      top: BODICE,
      sleeves: [SLEEVE_L, SLEEVE_R],
      skirts: [SK.a],
      hem: HEM.a,
      trim: dark(c, 0.14),
      neck: "M88 107 L112 150",
      extra: <path d="M112 107 L88 150 M110 160 Q126 230 136 312 M122 172 L116 176" fill="none" stroke={dark(c, 0.3)} strokeWidth="1.6" strokeLinecap="round" />,
      over: (
        <g fill={F(c)} {...edge(c, 1.2)}>
          <path d="M118 168 q14 -8 12 6 q-4 10 -12 -6 Z" />
          <path d="M118 168 q-4 -12 -14 -4 q4 12 14 4 Z" />
        </g>
      ),
    }),
  flower: ({ c, c2, c3 }) => {
    const p1 = c2 ?? partner(c);
    const p2 = c3 ?? "#f2b6c6";
    return garment(c, {
      id: "flower",
      top: BODICE,
      sleeves: [SLEEVE_L, SLEEVE_R],
      skirts: [SK.a],
      hem: HEM.a,
      trim: dark(c, 0.14),
      extra: (
        <g>
          {FLOWER_PTS.map(([x, y], i) => (
            <g key={i}>
              {[0, 72, 144, 216, 288].map((a) => (
                <circle key={a} cx={+(x + Math.cos((a * Math.PI) / 180) * 4.2).toFixed(2)} cy={+(y + Math.sin((a * Math.PI) / 180) * 4.2).toFixed(2)} r="3" fill={i % 2 ? p1 : p2} opacity="0.95" />
              ))}
              <circle cx={x} cy={y} r="2" fill="#f9d56e" />
            </g>
          ))}
        </g>
      ),
    });
  },
  polka: ({ c, c2 }) =>
    garment(c, {
      id: "polka",
      top: BODICE,
      sleeves: [SLEEVE_L, SLEEVE_R],
      skirts: [SK.a],
      hem: HEM.a,
      trim: dark(c, 0.14),
      extra: (
        <g fill={c2 ?? (lum(c) > 0.55 ? dark(c, 0.55) : "#fffdf4")}>
          {POLKA_PTS.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="4.2" />
          ))}
        </g>
      ),
    }),
  plaid: ({ c, c2 }) => {
    const l = c2 ?? (lum(c) > 0.55 ? dark(c, 0.5) : "#fffdf4");
    return garment(c, {
      id: "plaid",
      top: BODICE,
      sleeves: [SLEEVE_L, SLEEVE_R],
      skirts: [SK.a],
      hem: HEM.a,
      trim: dark(c, 0.14),
      extra: (
        <g stroke={l} strokeWidth="3" opacity="0.7">
          {[120, 150, 180, 210, 240, 270, 300].map((y) => (
            <path key={y} d={`M30 ${y} L170 ${y}`} />
          ))}
          {[60, 80, 100, 120, 140].map((x) => (
            <path key={x} d={`M${x} 100 L${x} 330`} />
          ))}
        </g>
      ),
    });
  },
};

export const MORE_MANTLE: Record<string, R> = {
  bolero: ({ c }) => (
    <g>
      <Grads colors={[c]} />
      <path d="M68 108 Q54 122 52 178 L64 180 Q66 136 78 120 Z M132 108 Q146 122 148 178 L136 180 Q134 136 122 120 Z" fill={F(c)} {...edge(c)} />
      <path d="M68 108 Q100 100 132 108 L136 154 Q100 164 64 154 Z" fill={F(c)} {...edge(c)} />
      <path d="M100 104 L100 158 M82 112 Q100 134 118 112" fill="none" stroke={dark(c, 0.4)} strokeWidth="1.6" />
      <path d="M64 154 Q100 164 136 154" fill="none" stroke={partner(c)} strokeWidth="2.6" strokeLinecap="round" />
      <Shine d="M74 112 Q92 106 104 112 L96 146 L72 146 Z" o={0.22} />
    </g>
  ),
  cardigan: ({ c }) => (
    <g>
      <Grads colors={[c]} />
      <path d="M68 108 Q54 122 52 206 L64 208 Q66 142 78 120 Z M132 108 Q146 122 148 206 L136 208 Q134 142 122 120 Z" fill={F(c)} {...edge(c)} />
      <path d="M68 108 Q100 100 132 108 L142 252 L110 256 L106 150 L94 150 L90 256 L58 252 Z" fill={F(c)} {...edge(c)} />
      <path d="M94 150 L90 256 M106 150 L110 256" stroke={dark(c, 0.4)} strokeWidth="1.8" fill="none" />
      <g fill={light(c, 0.3)} stroke={dark(c, 0.5)} strokeWidth="1">
        <circle cx="98" cy="170" r="2.4" />
        <circle cx="98" cy="196" r="2.4" />
        <circle cx="98" cy="222" r="2.4" />
      </g>
      <path d="M58 252 L90 256 M110 256 L142 252" stroke={partner(c)} strokeWidth="3" strokeLinecap="round" />
      <Shine d="M72 114 Q90 108 98 114 L92 170 L70 170 Z" o={0.2} />
    </g>
  ),
  apron: ({ c }) => (
    <g>
      <Grads colors={[c]} />
      <path d="M84 150 L94 108 M116 150 L106 108" fill="none" stroke={dark(c, 0.4)} strokeWidth="3" strokeLinecap="round" />
      <path d="M82 148 L118 148 L127 172 L134 296 Q100 304 66 296 L73 172 Z" fill={F(c)} {...edge(c)} />
      <path d="M80 172 Q100 182 120 172" fill="none" stroke={dark(c, 0.4)} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M86 214 L114 214 L112 242 L88 242 Z" fill={F(light(c, 0.15))} {...edge(c, 1.2)} />
      <Shine d="M80 154 Q94 150 104 154 L98 200 L78 204 Z" o={0.22} />
      <path d="M66 296 Q100 304 134 296" fill="none" stroke={partner(c)} strokeWidth="3" strokeLinecap="round" />
    </g>
  ),
  wings: () => <g />,
  scarfwrap: ({ c }) => (
    <g>
      <Grads colors={[c]} />
      <path d="M76 104 Q100 120 124 104 L126 118 Q100 136 74 118 Z" fill={F(c)} {...edge(c)} />
      <path d="M106 122 L118 184 L102 190 L96 130 Z" fill={F(dark(c, 0.08))} {...edge(c)} />
      <path d="M100 124 L108 188" stroke={dark(c, 0.3)} strokeWidth="1.2" opacity="0.6" />
      <g stroke={partner(c)} strokeWidth="1.6" strokeLinecap="round">
        <path d="M102 190 l-1 6 M106 189 l-1 6 M110 188 l-1 6 M114 187 l-1 6 M118 186 l-1 6" />
      </g>
    </g>
  ),
  poncho: ({ c }) => (
    <g>
      <Grads colors={[c]} />
      <path d="M52 112 Q100 94 148 112 L162 192 Q100 214 38 192 Z" fill={F(c)} {...edge(c)} />
      <path d="M82 108 Q100 126 118 108" fill="none" stroke={dark(c, 0.5)} strokeWidth="2.4" />
      <path d="M44 156 Q100 176 156 156 M40 174 Q100 194 160 174" fill="none" stroke={partner(c)} strokeWidth="2.4" opacity="0.8" />
      <g stroke={partner(c)} strokeWidth="1.8" strokeLinecap="round">
        {Array.from({ length: 13 }).map((_, i) => (
          <path key={i} d={`M${42 + i * 9.2} ${196 + Math.sin((i / 12) * Math.PI) * 10 - 2} l-1 8`} />
        ))}
      </g>
      <Shine d="M60 118 Q84 106 104 112 L90 160 L52 160 Z" o={0.22} />
    </g>
  ),
};

/** Asas desenhadas ATRÁS do corpo (anjo, fada...). */
export const MORE_BACK: Record<string, (p: Params) => ReactElement> = {
  wings: ({ c }) => (
    <g>
      <Grads colors={[c]} />
      <path d="M72 122 Q8 70 10 168 Q14 228 76 218 Z" fill={F(c)} {...edge(c)} />
      <path d="M128 122 Q192 70 190 168 Q186 228 124 218 Z" fill={F(c)} {...edge(c)} />
      <path d="M72 134 Q30 108 26 168 M72 150 Q36 140 34 190 M74 168 Q44 170 44 206" fill="none" stroke={dark(c, 0.3)} strokeWidth="1.6" opacity="0.6" />
      <path d="M128 134 Q170 108 174 168 M128 150 Q164 140 166 190 M126 168 Q156 170 156 206" fill="none" stroke={dark(c, 0.3)} strokeWidth="1.6" opacity="0.6" />
      <Shine d="M70 126 Q30 92 22 140 Q40 120 72 142 Z" o={0.4} />
      <Shine d="M130 126 Q170 92 178 140 Q160 120 128 142 Z" o={0.4} />
    </g>
  ),
};

/** Dois pés iguais (esquerdo em 88, direito em 112). */
const feet = (draw: (cx: number) => ReactElement): ReactElement => (
  <g>
    {draw(88)}
    {draw(112)}
  </g>
);

export const MORE_SHOES: Record<string, R> = {
  mary: ({ c }) => (
    <g>
      <Grads colors={[c]} />
      {feet((cx) => (
        <g>
          <path d={`M${cx - 15} 338 Q${cx - 14} 326 ${cx} 326 Q${cx + 14} 326 ${cx + 14} 338 Q${cx + 14} 346 ${cx} 346 Q${cx - 15} 346 ${cx - 15} 338 Z`} fill={F(c)} {...edge(c, 1.3)} />
          <path d={`M${cx - 12} 332 Q${cx} 327 ${cx + 12} 332`} fill="none" stroke={dark(c, 0.5)} strokeWidth="2.2" strokeLinecap="round" />
          <circle cx={cx + 10} cy="332" r="1.8" fill={GOLD} stroke={dark(GOLD, 0.5)} strokeWidth="0.8" />
        </g>
      ))}
    </g>
  ),
  peep: ({ c }) => (
    <g>
      <Grads colors={[c]} />
      {feet((cx) => (
        <g>
          <path d={`M${cx - 13} 338 Q${cx - 12} 328 ${cx - 2} 328 L${cx + 4} 334 Q${cx + 6} 340 ${cx - 2} 344 Q${cx - 12} 346 ${cx - 13} 338 Z`} fill={F(c)} {...edge(c, 1.3)} />
          <ellipse cx={cx + 8} cy="338" rx="5" ry="3.2" fill="#e8b88a" opacity="0.9" />
          <path d={`M${cx - 4} 330 L${cx - 4} 322`} stroke={dark(c, 0.5)} strokeWidth="2" strokeLinecap="round" />
          <path d={`M${cx - 12} 344 L${cx - 12} 352`} stroke={dark(c, 0.45)} strokeWidth="3" strokeLinecap="round" />
        </g>
      ))}
    </g>
  ),
  wedge: ({ c }) => (
    <g>
      <Grads colors={[c, "#c9a266"]} />
      {feet((cx) => (
        <g>
          <path d={`M${cx - 14} 332 Q${cx} 322 ${cx + 12} 332 L${cx + 12} 340 L${cx - 14} 340 Z`} fill={F(c)} {...edge(c, 1.3)} />
          <path d={`M${cx - 14} 340 L${cx + 14} 340 L${cx + 14} 352 L${cx - 10} 352 Z`} fill={F("#c9a266")} {...edge("#c9a266", 1.3)} />
          <path d={`M${cx - 12} 345 L${cx + 12} 345`} stroke={dark("#c9a266", 0.3)} strokeWidth="1" />
          <path d={`M${cx - 6} 332 L${cx + 6} 336 M${cx + 6} 332 L${cx - 6} 336`} stroke={dark(c, 0.5)} strokeWidth="1.6" />
        </g>
      ))}
    </g>
  ),
  bootie: ({ c }) => (
    <g>
      <Grads colors={[c]} />
      {feet((cx) => (
        <g>
          <path d={`M${cx - 9} 314 L${cx + 8} 314 L${cx + 8} 332 Q${cx + 18} 334 ${cx + 16} 346 L${cx - 14} 346 Q${cx - 14} 338 ${cx - 9} 334 Z`} fill={F(c)} {...edge(c, 1.4)} />
          <path d={`M${cx - 9} 320 L${cx + 8} 320`} stroke={dark(c, 0.4)} strokeWidth="1.4" />
          <path d={`M${cx} 316 L${cx} 334`} stroke={light(c, 0.35)} strokeWidth="1.2" strokeDasharray="2 2" />
          <path d={`M${cx - 12} 346 L${cx - 12} 352`} stroke={dark(c, 0.45)} strokeWidth="3" strokeLinecap="round" />
        </g>
      ))}
    </g>
  ),
  bowflat: ({ c }) => (
    <g>
      <Grads colors={[c]} />
      {feet((cx) => (
        <g>
          <path d={`M${cx - 14} 338 Q${cx - 13} 328 ${cx} 328 Q${cx + 14} 328 ${cx + 14} 338 Q${cx + 14} 345 ${cx} 345 Q${cx - 14} 345 ${cx - 14} 338 Z`} fill={F(c)} {...edge(c, 1.3)} />
          <path d={`M${cx + 4} 332 q8 -8 8 2 q-4 6 -8 -2 Z M${cx + 4} 332 q-6 -9 -9 0 q4 7 9 0 Z`} fill={F(light(c, 0.2))} {...edge(c, 1)} />
          <circle cx={cx + 4} cy="332" r="1.8" fill={dark(c, 0.3)} />
        </g>
      ))}
    </g>
  ),
  kitten: ({ c }) => (
    <g>
      <Grads colors={[c]} />
      {feet((cx) => (
        <g>
          <path d={`M${cx - 14} 336 Q${cx - 12} 326 ${cx - 2} 328 L${cx + 14} 342 Q${cx + 12} 347 ${cx} 345 L${cx - 10} 344 Q${cx - 14} 342 ${cx - 14} 336 Z`} fill={F(c)} {...edge(c, 1.3)} />
          <path d={`M${cx - 10} 344 L${cx - 11} 354`} stroke={dark(c, 0.4)} strokeWidth="2" strokeLinecap="round" />
          <path d={`M${cx - 4} 330 Q${cx + 2} 334 ${cx + 8} 340`} fill="none" stroke="#fff" strokeWidth="1.1" opacity="0.5" />
        </g>
      ))}
    </g>
  ),
  lace: ({ c }) => (
    <g>
      <Grads colors={[c]} />
      {feet((cx) => (
        <g>
          <path d={`M${cx - 14} 338 Q${cx - 13} 328 ${cx} 328 Q${cx + 14} 328 ${cx + 14} 338 Q${cx + 14} 345 ${cx} 345 Q${cx - 14} 345 ${cx - 14} 338 Z`} fill={F(c)} {...edge(c, 1.3)} />
          <path d={`M${cx - 6} 330 L${cx + 6} 318 M${cx + 6} 330 L${cx - 6} 318 M${cx - 6} 318 L${cx + 6} 306 M${cx + 6} 318 L${cx - 6} 306`} stroke={dark(c, 0.3)} strokeWidth="1.8" strokeLinecap="round" fill="none" />
          <path d={`M${cx - 7} 304 q7 -6 14 0`} fill="none" stroke={dark(c, 0.3)} strokeWidth="1.8" strokeLinecap="round" />
        </g>
      ))}
    </g>
  ),
};

