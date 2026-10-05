import type { ReactElement } from "react";
import { DRESS, F, Gem, Grads, INK, SLEEVE_L, SLEEVE_R, Shine, dark, edge, light } from "./ArtKit";
import type { Params } from "@/lib/games/dress/items";

// Roupas, mantos e calçados que seguem a silhueta do corpo (ver ArtKit: DRESS, SLEEVE_*), por família e cor.

const GOLD = "#f5c518";
type R = (p: Params) => ReactElement;

/** Vestido básico: corpete, mangas até o cotovelo, cordão na cintura e barra. */
function dress(c: string, opts: { trim?: string; extra?: ReactElement; belt?: string } = {}): ReactElement {
  const { trim, extra, belt = dark(c, 0.35) } = opts;
  return (
    <g>
      <Grads colors={[c]} />
      <path d={DRESS} fill={F(c)} {...edge(c)} />
      <path d={SLEEVE_L} fill={F(c)} {...edge(c)} />
      <path d={SLEEVE_R} fill={F(c)} {...edge(c)} />
      <Shine d="M80 118 Q96 112 108 118 L104 168 Q92 172 82 168 Z" o={0.16} />
      <path d="M78 172 Q100 182 122 172" fill="none" stroke={belt} strokeWidth="3" strokeLinecap="round" />
      <path d="M86 108 Q100 126 114 108" fill="none" stroke={dark(c, 0.45)} strokeWidth="1.8" strokeLinecap="round" />
      {trim ? (
        <g fill="none" stroke={trim} strokeWidth="3.2" strokeLinecap="round">
          <path d="M50 309 Q100 324 150 309" />
          <path d="M56 158 L66 160 M144 158 L134 160" />
        </g>
      ) : null}
      {extra}
    </g>
  );
}

const DRESS_CLIP = (
  <defs>
    <clipPath id="clip-dress-all">
      <path d={DRESS} />
      <path d={SLEEVE_L} />
      <path d={SLEEVE_R} />
    </clipPath>
  </defs>
);

const CAPE_L = "M68 108 Q40 190 30 322 L72 326 Q74 230 84 150 Z";
const CAPE_R = "M132 108 Q160 190 170 322 L128 326 Q126 230 116 150 Z";

const clasp = (edgeC: string) => (
  <g>
    <path d="M78 110 Q100 124 122 110" fill="none" stroke={edgeC} strokeWidth="2.4" strokeLinecap="round" />
    <Gem x={78} y={110} r={3.6} />
    <Gem x={122} y={110} r={3.6} />
  </g>
);

const TUNIC: Record<string, R> = {
  dress: ({ c }) => dress(c, { trim: dark(c, 0.14) }),
  embroidered: ({ c }) =>
    dress(c, {
      trim: GOLD,
      extra: (
        <g fill="none" stroke={GOLD} strokeWidth="3" strokeLinecap="round">
          <path d="M86 108 Q100 126 114 108" />
          <path d="M100 126 L100 176" />
          <path d="M100 182 L100 316" strokeWidth="4.4" />
        </g>
      ),
    }),
  pleated: ({ c }) =>
    dress(c, {
      trim: "#d9b64a",
      extra: (
        <g fill="none" stroke={dark(c, 0.14)} strokeWidth="1.6" strokeLinecap="round">
          <path d="M84 178 L70 304 M94 182 L88 312 M106 182 L112 312 M116 178 L130 304" />
        </g>
      ),
    }),
  striped: ({ c, c2 = "#f4efe2" }) =>
    dress(c, {
      extra: (
        <g>
          {DRESS_CLIP}
          <g clipPath="url(#clip-dress-all)">
            {[124, 148, 172, 196, 220, 244, 268, 292].map((y) => (
              <rect key={y} x="36" y={y} width="128" height="8" fill={c2} opacity="0.92" />
            ))}
          </g>
        </g>
      ),
    }),
  twotone: ({ c, c2 = "#2f5fb0" }) =>
    dress(c, {
      extra: (
        <g>
          {DRESS_CLIP}
          <g clipPath="url(#clip-dress-all)">
            <path d="M40 252 Q100 266 160 252 L160 330 L40 330 Z" fill={c2} />
            <rect x="40" y="150" width="30" height="16" fill={c2} />
            <rect x="130" y="150" width="30" height="16" fill={c2} />
            <path d="M40 252 Q100 266 160 252" fill="none" stroke={dark(c2, 0.4)} strokeWidth="1.4" />
          </g>
          <path d="M78 172 Q100 182 122 172" fill="none" stroke={dark(c, 0.35)} strokeWidth="3" strokeLinecap="round" />
        </g>
      ),
    }),
  patchwork: ({ c, c2 = "#2c6fa8", c3 = "#d9a21a" }) => {
    const palette = [c, c2, c3, dark(c, 0.25), light(c2, 0.2), dark(c3, 0.2), light(c, 0.2)];
    return (
      <g>
        {DRESS_CLIP}
        <g clipPath="url(#clip-dress-all)">
          {Array.from({ length: 9 }).flatMap((_, row) =>
            Array.from({ length: 8 }).map((__, col) => (
              <rect key={`${row}-${col}`} x={42 + col * 19} y={104 + row * 24} width="20" height="25" fill={palette[(row * 3 + col * 5 + row * col) % palette.length]} stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
            )),
          )}
        </g>
        <path d={DRESS} fill="none" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" opacity="0.7" />
        <path d={SLEEVE_L} fill="none" stroke={INK} strokeWidth="1.4" opacity="0.6" />
        <path d={SLEEVE_R} fill="none" stroke={INK} strokeWidth="1.4" opacity="0.6" />
        <path d="M78 172 Q100 182 122 172" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
      </g>
    );
  },
  fur: ({ c }) =>
    dress(c, {
      extra: (
        <g stroke={dark(c, 0.5)} strokeWidth="1.8" strokeLinecap="round" fill="none">
          <path d="M82 130 l5 4 M110 128 l5 4 M92 150 l5 4 M118 148 l5 4 M70 220 l5 4 M104 232 l5 4 M126 256 l5 4 M86 270 l5 4 M98 200 l5 4" />
          <path d="M50 310 l6 8 l6 -8 l6 8 l6 -8 l6 8 l6 -8 l6 8 l6 -8 l6 8 l6 -8 l6 8 l6 -8 l6 8" />
        </g>
      ),
    }),
  skins: ({ c }) =>
    dress(c, {
      extra: (
        <g fill={dark(c, 0.4)} opacity="0.7">
          <ellipse cx="86" cy="130" rx="6" ry="4" />
          <ellipse cx="116" cy="150" rx="6" ry="4" />
          <ellipse cx="84" cy="220" rx="7" ry="5" />
          <ellipse cx="120" cy="262" rx="7" ry="5" />
          <ellipse cx="62" cy="140" rx="4" ry="3" />
        </g>
      ),
    }),
  sack: ({ c }) =>
    dress(c, {
      extra: (
        <g stroke={dark(c, 0.45)} strokeWidth="1.8" fill="none" strokeLinecap="round">
          <path d="M84 130 l10 3 M110 152 l10 -2 M84 226 l12 4 M112 270 l12 -3" />
          <rect x="102" y="218" width="16" height="16" fill={light(c, 0.2)} strokeDasharray="3 2" />
        </g>
      ),
    }),
  hoodie: ({ c }) => (
    <g>
      <Grads colors={[c, dark(c, 0.2)]} />
      <path d={DRESS} fill={F(c)} {...edge(c)} />
      <path d={SLEEVE_L} fill={F(c)} {...edge(c)} />
      <path d={SLEEVE_R} fill={F(c)} {...edge(c)} />
      <path d="M78 110 Q100 138 122 110 Q100 98 78 110 Z" fill={F(dark(c, 0.2))} {...edge(c)} />
      <path d="M94 126 L94 156 M106 126 L106 156" stroke="#e5e7eb" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M82 200 Q100 212 118 200 L120 240 Q100 252 80 240 Z" fill={F(dark(c, 0.2))} {...edge(c, 1.2)} />
    </g>
  ),
  armor: ({ c }) => (
    <g>
      <Grads colors={["#7d5a35", c]} />
      <path d="M72 108 Q100 102 128 108 L126 150 Q124 164 122 172 L130 262 L70 262 L78 172 Q76 164 74 150 Z" fill={F("#7d5a35")} {...edge("#7d5a35")} />
      <path d="M72 110 Q100 100 128 110 L124 168 Q100 180 76 168 Z" fill={F(c)} {...edge(c)} />
      <Shine d="M78 114 Q96 106 108 112 L104 156 L80 162 Z" o={0.3} />
      <path d="M100 106 L100 176 M80 134 Q100 142 120 134 M80 152 Q100 160 120 152" fill="none" stroke={dark(c, 0.5)} strokeWidth="1.4" />
      <circle cx="68" cy="112" r="9" fill={F(c)} {...edge(c)} />
      <circle cx="132" cy="112" r="9" fill={F(c)} {...edge(c)} />
      <g fill={F("#7d5a35")} {...edge("#7d5a35", 1.2)}>
        {[82, 91, 100, 109, 118].map((x) => (
          <path key={x} d={`M${x - 5} 176 L${x + 5} 176 L${x + 6} 262 L${x - 6} 262 Z`} />
        ))}
      </g>
    </g>
  ),
  leaves: ({ c, c2 = "#2e8b3d", c3 = "#f08aa8" }) => (
    <g>
      <Grads colors={[c, c2, light(c, 0.2)]} />
      {[74, 84, 94, 104, 114, 124].map((x, i) => (
        <path key={`s${x}`} d={`M${x} ${172 + (i % 2) * 4} q-12 40 -${6 - i} 98 q14 -42 ${6 + (i % 3)} -98 Z`} fill={F(i % 2 ? c : c2)} {...edge(c2, 1.2)} />
      ))}
      {[66, 78, 88, 100, 112, 122, 132].map((x, i) => (
        <path key={`t${x}`} d={`M${x} ${190 + (i % 2) * 8} q-12 36 -${4 + (i % 3)} 80 q14 -36 ${6} -80 Z`} fill={F(i % 2 ? light(c, 0.2) : c2)} {...edge(c2, 1.2)} />
      ))}
      <path d="M78 112 Q100 106 122 112 L124 150 Q100 164 76 150 Z" fill={F(c)} {...edge(c2)} />
      {[84, 100, 116].map((x, i) => (
        <path key={`c${x}`} d={`M${x} ${116 + (i % 2) * 6} q-8 12 0 26 q8 -14 0 -26 Z`} fill={F(i % 2 ? light(c, 0.2) : c2)} {...edge(c2, 1)} />
      ))}
      {[[92, 152], [112, 200], [86, 238], [118, 262]].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="5" fill={c3} stroke={dark(c3, 0.5)} strokeWidth="1" />
          <circle cx={x} cy={y} r="1.8" fill="#f9d56e" />
        </g>
      ))}
    </g>
  ),
  royal: ({ c }) =>
    dress(c, {
      trim: GOLD,
      extra: (
        <g fill="none" stroke={GOLD} strokeWidth="3" strokeLinecap="round">
          <path d="M86 108 Q100 126 114 108" />
          <path d="M100 126 L100 176" />
          <path d="M100 182 L100 316" strokeWidth="4.4" />
          <path d="M60 162 L66 163 M140 162 L134 163" />
        </g>
      ),
    }),
};

const MANTLE: Record<string, R> = {
  none: () => <g />,
  cape: ({ c2 = GOLD }) => clasp(c2),
  caped: () => <g />,
  belt: ({ c }) => {
    const buckle = c === GOLD || c === "#c9ced6" ? "#b8832f" : GOLD;
    return (
      <g>
        <Grads colors={[c, buckle]} />
        <path d="M77 168 Q100 178 123 168 L123 180 Q100 190 77 180 Z" fill={F(c)} {...edge(c, 1.4)} />
        <rect x="93" y="168" width="14" height="16" rx="3" fill={F(buckle)} {...edge(buckle, 1.4)} />
        <rect x="97" y="173" width="6" height="7" rx="1.5" fill={dark(c, 0.3)} />
      </g>
    );
  },
  necklace: ({ c, c2 = "#3b82f6" }) => (
    <g>
      <path d="M82 108 Q100 142 118 108" fill="none" stroke={dark(c, 0.5)} strokeWidth="7" strokeLinecap="round" />
      <path d="M82 108 Q100 142 118 108" fill="none" stroke={c} strokeWidth="4.6" strokeLinecap="round" />
      <path d="M85 110 Q100 138 115 110" fill="none" stroke="#fff" strokeWidth="1" opacity="0.6" strokeLinecap="round" />
      <Gem x={100} y={136} r={5} c={c2} />
      <Gem x={89} y={124} r={3} c={c2} />
      <Gem x={111} y={124} r={3} c={c2} />
    </g>
  ),
  sash: ({ c }) => (
    <g>
      <Grads colors={[c]} />
      <path d="M70 110 L80 106 L134 196 L122 204 Z" fill={F(c)} {...edge(c)} />
      <path d="M120 200 L134 194 L142 240 L128 242 Z" fill={F(c)} {...edge(c)} />
      <path d="M118 202 Q112 214 126 222" fill="none" stroke={dark(c, 0.5)} strokeWidth="1.6" />
    </g>
  ),
  shawl: ({ c }) => (
    <g>
      <Grads colors={[c]} />
      <path d="M68 108 Q100 98 132 108 L142 158 Q100 190 58 158 Z" fill={F(c)} {...edge(c)} />
      <path d="M100 118 L100 178" stroke={dark(c, 0.4)} strokeWidth="1.6" opacity="0.7" />
      <Shine d="M72 112 Q96 104 112 110 L100 150 L66 150 Z" o={0.25} />
      <g stroke={dark(c, 0.3)} strokeWidth="1.5" strokeLinecap="round">
        {Array.from({ length: 11 }).map((_, i) => (
          <path key={i} d={`M${64 + i * 7.6} ${158 + Math.sin((i / 10) * Math.PI) * 16 - 4} l-1 6`} />
        ))}
      </g>
    </g>
  ),
  sheep: ({ c }) => (
    <g fill={c} stroke={dark(c, 0.3)} strokeWidth="1.2">
      {[72, 82, 92, 108, 118, 128].map((x, i) => (
        <circle key={x} cx={x} cy={112 + (i % 2) * 5} r="8" />
      ))}
      {[66, 134].map((x) => (
        <circle key={x} cx={x} cy={126} r="7" />
      ))}
    </g>
  ),
};

const SHOES: Record<string, R> = {
  none: () => <g />,
  sandals: ({ c }) => (
    <g>
      <Grads colors={[c]} />
      <ellipse cx="88" cy="338" rx="13" ry="5" fill={F(c)} {...edge(c, 1.3)} />
      <ellipse cx="112" cy="338" rx="13" ry="5" fill={F(c)} {...edge(c, 1.3)} />
      <g stroke={dark(c, 0.5)} strokeWidth="1.8" fill="none" strokeLinecap="round">
        <path d="M80 332 L94 337 M94 332 L80 337 M106 332 L120 337 M120 332 L106 337 M82 322 L94 322 M106 322 L118 322" />
      </g>
    </g>
  ),
  gladiator: ({ c }) => (
    <g>
      <Grads colors={[c]} />
      <ellipse cx="88" cy="338" rx="13" ry="5" fill={F(c)} {...edge(c, 1.3)} />
      <ellipse cx="112" cy="338" rx="13" ry="5" fill={F(c)} {...edge(c, 1.3)} />
      <g stroke={dark(c, 0.45)} strokeWidth="2" fill="none" strokeLinecap="round">
        <path d="M80 334 L96 326 M96 334 L80 326 M82 322 L96 314 M96 322 L82 314 M83 310 L95 305 M95 310 L83 305" />
        <path d="M104 326 L120 334 M120 326 L104 334 M104 314 L118 322 M118 314 L104 322 M105 305 L117 310 M117 305 L105 310" />
      </g>
    </g>
  ),
  slipper: ({ c }) => (
    <g>
      <Grads colors={[c]} />
      <path d="M74 336 Q76 326 88 326 Q102 326 102 336 Q102 344 88 344 Q74 344 74 336 Z" fill={F(c)} {...edge(c, 1.3)} />
      <path d="M98 336 Q98 326 112 326 Q124 326 126 336 Q126 344 112 344 Q98 344 98 336 Z" fill={F(c)} {...edge(c, 1.3)} />
      <path d="M78 334 Q88 329 98 334 M102 334 Q112 329 122 334" fill="none" stroke="#fff" strokeWidth="1.2" opacity="0.5" />
      <circle cx="88" cy="331" r="2" fill={light(c, 0.4)} />
      <circle cx="112" cy="331" r="2" fill={light(c, 0.4)} />
    </g>
  ),
  boots: ({ c }) => (
    <g>
      <Grads colors={[c]} />
      <path d="M80 308 L96 308 L96 334 Q106 336 104 346 L72 346 Q72 338 80 334 Z" fill={F(c)} {...edge(c, 1.4)} />
      <path d="M104 308 L120 308 L120 334 Q130 336 128 346 L96 346 Q96 338 104 334 Z" fill={F(c)} {...edge(c, 1.4)} />
      <path d="M80 316 L96 316 M104 316 L120 316" stroke={dark(c, 0.4)} strokeWidth="1.4" />
    </g>
  ),
  sneakers: ({ c }) => (
    <g>
      <Grads colors={["#ffffff", c]} />
      <path d="M74 330 Q86 324 100 330 L102 344 L74 344 Z" fill={F("#ffffff")} {...edge("#9ca3af", 1.4)} />
      <path d="M100 330 Q114 324 126 330 L128 344 L98 344 Z" fill={F("#ffffff")} {...edge("#9ca3af", 1.4)} />
      <path d="M74 340 L102 340 M98 340 L128 340" stroke={c} strokeWidth="3" />
      <path d="M80 332 l8 -2 M110 332 l8 -2" stroke={c} strokeWidth="2" strokeLinecap="round" />
    </g>
  ),
  metal: ({ c, c2 }) =>
    c2 ? (
      <g>
        <Grads colors={[c]} />
        <ellipse cx="88" cy="338" rx="13" ry="5" fill={F(c)} {...edge(c, 1.3)} />
        <ellipse cx="112" cy="338" rx="13" ry="5" fill={F(c)} {...edge(c, 1.3)} />
        <g stroke={dark(c, 0.5)} strokeWidth="1.8" fill="none" strokeLinecap="round">
          <path d="M80 332 L94 337 M94 332 L80 337 M106 332 L120 337 M120 332 L106 337" />
        </g>
        <Gem x={88} y={330} r={2.6} c={c2} />
        <Gem x={112} y={330} r={2.6} c={c2} />
      </g>
    ) : (
      <g>
        <Grads colors={[c, dark(c, 0.3)]} />
        <path d="M80 314 L96 314 L95 336 L81 336 Z" fill={F(c)} {...edge(c, 1.4)} />
        <path d="M104 314 L120 314 L119 336 L105 336 Z" fill={F(c)} {...edge(c, 1.4)} />
        <ellipse cx="88" cy="340" rx="14" ry="5.5" fill={F(dark(c, 0.3))} {...edge(c, 1.3)} />
        <ellipse cx="112" cy="340" rx="14" ry="5.5" fill={F(dark(c, 0.3))} {...edge(c, 1.3)} />
        <circle cx="88" cy="319" r="2" fill={light(c, 0.5)} />
        <circle cx="112" cy="319" r="2" fill={light(c, 0.5)} />
      </g>
    ),
  anklet: ({ c }) => (
    <g>
      {[89, 111].map((x) => (
        <g key={x}>
          <path d={`M${x - 7} 322 Q${x} 327 ${x + 7} 322`} fill="none" stroke={INK} strokeWidth="3.6" strokeLinecap="round" />
          <path d={`M${x - 7} 322 Q${x} 327 ${x + 7} 322`} fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" />
          <circle cx={x} cy="327" r="2.2" fill={c} stroke={INK} strokeWidth="1" />
        </g>
      ))}
    </g>
  ),
  jeweled: ({ c, c2 = "#e5484d" }) => (
    <g>
      <Grads colors={[c]} />
      <ellipse cx="88" cy="338" rx="14" ry="5.5" fill={F(c)} {...edge(c, 1.3)} />
      <ellipse cx="112" cy="338" rx="14" ry="5.5" fill={F(c)} {...edge(c, 1.3)} />
      <g stroke={dark(c, 0.5)} strokeWidth="1.8" fill="none" strokeLinecap="round">
        <path d="M80 332 L94 337 M94 332 L80 337 M106 332 L120 337 M120 332 L106 337 M81 322 L95 322 M105 322 L119 322" />
      </g>
      <Gem x={88} y={331} r={3.2} c={c2} />
      <Gem x={112} y={331} r={3.2} c={c2} />
      <Gem x={88} y={322} r={2.2} c={c2} />
      <Gem x={112} y={322} r={2.2} c={c2} />
    </g>
  ),
};

/** Capas desenhadas ATRÁS do corpo (antes do vestido). */
const capeBack = (c: string, edgeC: string): ReactElement => (
  <g>
    <Grads colors={[c]} />
    <path d={CAPE_L} fill={F(c)} {...edge(c)} />
    <path d={CAPE_R} fill={F(c)} {...edge(c)} />
    <path d="M32 316 L72 320 M168 316 L128 320" stroke={edgeC} strokeWidth="3.4" strokeLinecap="round" />
  </g>
);

const stripedCape = (base: string, s1: string, s2: string): ReactElement => (
  <g>
    <defs>
      <clipPath id="clip-striped-l">
        <path d={CAPE_L} />
      </clipPath>
      <clipPath id="clip-striped-r">
        <path d={CAPE_R} />
      </clipPath>
    </defs>
    {[CAPE_L, CAPE_R].map((p, k) => (
      <g key={p}>
        <g clipPath={`url(#clip-striped-${k ? "r" : "l"})`}>
          <path d={p} fill={base} />
          {[160, 190, 220, 250, 280, 310].map((y, i) => (
            <rect key={y} x="20" y={y} width="160" height="14" fill={i % 2 ? s1 : s2} />
          ))}
        </g>
        <path d={p} fill="none" stroke={dark(s2, 0.3)} strokeWidth="1.6" strokeLinejoin="round" />
      </g>
    ))}
  </g>
);

export const BACK_FAMILY: Record<string, (p: Params) => ReactElement> = {
  cape: ({ c, c2 = GOLD }) => capeBack(c, c2),
  caped: ({ c, c2 = "#6b4a2a", c3 = "#3a2a1c" }) => stripedCape(c, c2, c3),
};

/** Desenho (frente) de cada família de roupa/manto/calçado, por espaço. */
export const BODY_FAMILY: Record<string, R> = {
  ...Object.fromEntries(Object.entries(TUNIC).map(([k, v]) => [`tunic:${k}`, v])),
  ...Object.fromEntries(Object.entries(MANTLE).map(([k, v]) => [`mantle:${k}`, v])),
  ...Object.fromEntries(Object.entries(SHOES).map(([k, v]) => [`shoes:${k}`, v])),
};
