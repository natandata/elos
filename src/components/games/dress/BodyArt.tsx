import type { ReactElement } from "react";
import { DRESS, F, Gem, Grads, INK, SLEEVE_L, SLEEVE_R, Shine, dark, edge } from "./ArtKit";

// Roupas, mantos e calçados que seguem a silhueta do corpo (ver ArtKit: DRESS, SLEEVE_*).

const GOLD = "#f5c518";

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

const CAPE_L = "M68 108 Q40 190 30 322 L72 326 Q74 230 84 150 Z";
const CAPE_R = "M132 108 Q160 190 170 322 L128 326 Q126 230 116 150 Z";

/** Capa que fica ATRÁS do corpo (aparece nas laterais). */
function capeBack(c: string, edgeC = GOLD): ReactElement {
  return (
    <g>
      <Grads colors={[c]} />
      <path d={CAPE_L} fill={F(c)} {...edge(c)} />
      <path d={CAPE_R} fill={F(c)} {...edge(c)} />
      <path d="M32 316 L72 320 M168 316 L128 320" stroke={edgeC} strokeWidth="3.4" strokeLinecap="round" />
    </g>
  );
}

/** Fecho da capa na frente (corrente e pedras no pescoço). */
const clasp = (
  <g>
    <path d="M78 110 Q100 124 122 110" fill="none" stroke={GOLD} strokeWidth="2.4" strokeLinecap="round" />
    <Gem x={78} y={110} r={3.6} />
    <Gem x={122} y={110} r={3.6} />
  </g>
);

export const BODY_ART: Record<string, () => ReactElement> = {
  // ------------------------------------------------------------------ roupa
  tunic_simple: () => dress("#e8d9b5", { trim: "#c9b685" }),
  tunic_camel: () =>
    dress("#8a6a43", {
      extra: (
        <g stroke="#4f3a20" strokeWidth="1.8" strokeLinecap="round" fill="none">
          <path d="M82 130 l5 4 M110 128 l5 4 M92 150 l5 4 M118 148 l5 4 M70 220 l5 4 M104 232 l5 4 M126 256 l5 4 M86 270 l5 4 M98 200 l5 4" />
          <path d="M50 310 l6 8 l6 -8 l6 8 l6 -8 l6 8 l6 -8 l6 8 l6 -8 l6 8 l6 -8 l6 8 l6 -8 l6 8" />
        </g>
      ),
    }),
  tunic_colors: () => (
    <g>
      <defs>
        <clipPath id="clip-tunic-colors">
          <path d={DRESS} />
          <path d={SLEEVE_L} />
          <path d={SLEEVE_R} />
        </clipPath>
      </defs>
      <g clipPath="url(#clip-tunic-colors)">
        {Array.from({ length: 9 }).flatMap((_, row) =>
          Array.from({ length: 8 }).map((__, col) => {
            const palette = ["#b83227", "#2c6fa8", "#d9a21a", "#6d3a8c", "#2f8a4f", "#d9662b", "#3a3a8c"];
            return <rect key={`${row}-${col}`} x={42 + col * 19} y={104 + row * 24} width="20" height="25" fill={palette[(row * 3 + col * 5 + row * col) % palette.length]} stroke="rgba(255,255,255,0.4)" strokeWidth="1" />;
          }),
        )}
      </g>
      <path d={DRESS} fill="none" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" opacity="0.7" />
      <path d={SLEEVE_L} fill="none" stroke={INK} strokeWidth="1.4" opacity="0.6" />
      <path d={SLEEVE_R} fill="none" stroke={INK} strokeWidth="1.4" opacity="0.6" />
      <path d="M78 172 Q100 182 122 172" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
    </g>
  ),
  tunic_linen: () =>
    dress("#f8f5ec", {
      trim: "#d9b64a",
      extra: (
        <g fill="none" stroke="#d6cdb3" strokeWidth="1.6" strokeLinecap="round">
          <path d="M84 178 L70 304 M94 182 L88 312 M106 182 L112 312 M116 178 L130 304" />
        </g>
      ),
    }),
  tunic_purple: () =>
    dress("#6b2d8c", {
      trim: GOLD,
      extra: (
        <g fill="none" stroke={GOLD} strokeWidth="3" strokeLinecap="round">
          <path d="M86 108 Q100 126 114 108" />
          <path d="M100 126 L100 176" />
          <path d="M100 182 L100 316" strokeWidth="4.4" />
        </g>
      ),
    }),
  tunic_blue: () => dress("#2f5fb0", { trim: "#9db8e8" }),
  tunic_armor: () => (
    <g>
      <Grads colors={["#7d5a35", "#b8832f"]} />
      <path d="M72 108 Q100 102 128 108 L126 150 Q124 164 122 172 L130 262 L70 262 L78 172 Q76 164 74 150 Z" fill={F("#7d5a35")} {...edge("#7d5a35")} />
      <path d="M72 110 Q100 100 128 110 L124 168 Q100 180 76 168 Z" fill={F("#b8832f")} {...edge("#b8832f")} />
      <Shine d="M78 114 Q96 106 108 112 L104 156 L80 162 Z" o={0.3} />
      <path d="M100 106 L100 176 M80 134 Q100 142 120 134 M80 152 Q100 160 120 152" fill="none" stroke={dark("#b8832f", 0.5)} strokeWidth="1.4" />
      <circle cx="68" cy="112" r="9" fill={F("#b8832f")} {...edge("#b8832f")} />
      <circle cx="132" cy="112" r="9" fill={F("#b8832f")} {...edge("#b8832f")} />
      <g fill={F("#7d5a35")} {...edge("#7d5a35", 1.2)}>
        {[82, 91, 100, 109, 118].map((x) => (
          <path key={x} d={`M${x - 5} 176 L${x + 5} 176 L${x + 6} 262 L${x - 6} 262 Z`} />
        ))}
      </g>
    </g>
  ),
  tunic_leaves: () => (
    <g>
      <Grads colors={["#3fa34d", "#2e8b3d", "#52b95e"]} />
      {/* saia de folhas */}
      {[74, 84, 94, 104, 114, 124].map((x, i) => (
        <path key={`s${x}`} d={`M${x} ${172 + (i % 2) * 4} q-12 40 -${6 - i} 98 q14 -42 ${6 + (i % 3)} -98 Z`} fill={F(i % 2 ? "#3fa34d" : "#2e8b3d")} {...edge("#2e8b3d", 1.2)} />
      ))}
      {[66, 78, 88, 100, 112, 122, 132].map((x, i) => (
        <path key={`t${x}`} d={`M${x} ${190 + (i % 2) * 8} q-12 36 -${4 + (i % 3)} 80 q14 -36 ${6} -80 Z`} fill={F(i % 2 ? "#52b95e" : "#2e8b3d")} {...edge("#2e8b3d", 1.2)} />
      ))}
      {/* corpete */}
      <path d="M78 112 Q100 106 122 112 L124 150 Q100 164 76 150 Z" fill={F("#3fa34d")} {...edge("#2e8b3d")} />
      {[84, 100, 116].map((x, i) => (
        <path key={`c${x}`} d={`M${x} ${116 + (i % 2) * 6} q-8 12 0 26 q8 -14 0 -26 Z`} fill={F(i % 2 ? "#52b95e" : "#2e8b3d")} {...edge("#2e8b3d", 1)} />
      ))}
      {/* flores */}
      {[[92, 152], [112, 200], [86, 238], [118, 262]].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="5" fill="#f08aa8" stroke="#a83a62" strokeWidth="1" />
          <circle cx={x} cy={y} r="1.8" fill="#f9d56e" />
        </g>
      ))}
    </g>
  ),
  tunic_skins: () =>
    dress("#b98a55", {
      extra: (
        <g fill="#7b5428" opacity="0.7">
          <ellipse cx="86" cy="130" rx="6" ry="4" />
          <ellipse cx="116" cy="150" rx="6" ry="4" />
          <ellipse cx="84" cy="220" rx="7" ry="5" />
          <ellipse cx="120" cy="262" rx="7" ry="5" />
          <ellipse cx="62" cy="140" rx="4" ry="3" />
        </g>
      ),
    }),
  tunic_sack: () =>
    dress("#7a6f5f", {
      extra: (
        <g stroke="#40382d" strokeWidth="1.8" fill="none" strokeLinecap="round">
          <path d="M84 130 l10 3 M110 152 l10 -2 M84 226 l12 4 M112 270 l12 -3" />
          <rect x="102" y="218" width="16" height="16" fill="#9b8f7c" strokeDasharray="3 2" />
        </g>
      ),
    }),
  tunic_hoodie: () => (
    <g>
      <Grads colors={["#6b7280", "#555c68"]} />
      <path d={DRESS} fill={F("#6b7280")} {...edge("#6b7280")} />
      <path d={SLEEVE_L} fill={F("#6b7280")} {...edge("#6b7280")} />
      <path d={SLEEVE_R} fill={F("#6b7280")} {...edge("#6b7280")} />
      <path d="M78 110 Q100 138 122 110 Q100 98 78 110 Z" fill={F("#555c68")} {...edge("#555c68")} />
      <path d="M94 126 L94 156 M106 126 L106 156" stroke="#e5e7eb" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M82 200 Q100 212 118 200 L120 240 Q100 252 80 240 Z" fill={F("#555c68")} {...edge("#555c68", 1.2)} />
    </g>
  ),

  // ------------------------------------------------------------------ manto e enfeites (a frente)
  mantle_none: () => <g />,
  mantle_royal: () => clasp,
  mantle_blue: () => clasp,
  mantle_white: () => clasp,
  mantle_striped: () => <g />,
  mantle_belt: () => (
    <g>
      <Grads colors={["#6b4226", GOLD]} />
      <path d="M77 168 Q100 178 123 168 L123 180 Q100 190 77 180 Z" fill={F("#6b4226")} {...edge("#6b4226", 1.4)} />
      <rect x="93" y="168" width="14" height="16" rx="3" fill={F(GOLD)} {...edge(GOLD, 1.4)} />
      <rect x="97" y="173" width="6" height="7" rx="1.5" fill="#6b4226" />
    </g>
  ),
  mantle_collar: () => (
    <g>
      <path d="M82 108 Q100 142 118 108" fill="none" stroke="#8a6d1a" strokeWidth="7" strokeLinecap="round" />
      <path d="M82 108 Q100 142 118 108" fill="none" stroke={GOLD} strokeWidth="4.6" strokeLinecap="round" />
      <path d="M85 110 Q100 138 115 110" fill="none" stroke="#fff" strokeWidth="1" opacity="0.6" strokeLinecap="round" />
      <Gem x={100} y={136} r={5} c="#3b82f6" />
      <Gem x={89} y={124} r={3} />
      <Gem x={111} y={124} r={3} />
    </g>
  ),
  mantle_sash: () => (
    <g>
      <Grads colors={["#c43a3a"]} />
      <path d="M70 110 L80 106 L134 196 L122 204 Z" fill={F("#c43a3a")} {...edge("#c43a3a")} />
      <path d="M120 200 L134 194 L142 240 L128 242 Z" fill={F("#c43a3a")} {...edge("#c43a3a")} />
      <path d="M118 202 Q112 214 126 222" fill="none" stroke={dark("#c43a3a", 0.5)} strokeWidth="1.6" />
    </g>
  ),
  mantle_sheep: () => (
    <g fill="#f2ead8" stroke="#bdb297" strokeWidth="1.2">
      {[72, 82, 92, 108, 118, 128].map((x, i) => (
        <circle key={x} cx={x} cy={112 + (i % 2) * 5} r="8" />
      ))}
      {[66, 134].map((x) => (
        <circle key={x} cx={x} cy={126} r="7" />
      ))}
    </g>
  ),

  // ------------------------------------------------------------------ calçado (pés em 88,336 e 112,336; barra do vestido em y ~312)
  shoes_none: () => <g />,
  shoes_sandals: () => (
    <g>
      <Grads colors={["#b98a55"]} />
      <ellipse cx="88" cy="338" rx="13" ry="5" fill={F("#b98a55")} {...edge("#b98a55", 1.3)} />
      <ellipse cx="112" cy="338" rx="13" ry="5" fill={F("#b98a55")} {...edge("#b98a55", 1.3)} />
      <g stroke="#6b4226" strokeWidth="1.8" fill="none" strokeLinecap="round">
        <path d="M80 332 L94 337 M94 332 L80 337 M106 332 L120 337 M120 332 L106 337 M82 322 L94 322 M106 322 L118 322" />
      </g>
    </g>
  ),
  shoes_gold: () => (
    <g>
      <Grads colors={[GOLD]} />
      <ellipse cx="88" cy="338" rx="13" ry="5" fill={F(GOLD)} {...edge(GOLD, 1.3)} />
      <ellipse cx="112" cy="338" rx="13" ry="5" fill={F(GOLD)} {...edge(GOLD, 1.3)} />
      <g stroke="#8a6d1a" strokeWidth="1.8" fill="none" strokeLinecap="round">
        <path d="M80 332 L94 337 M94 332 L80 337 M106 332 L120 337 M120 332 L106 337" />
      </g>
      <Gem x={88} y={330} r={2.6} />
      <Gem x={112} y={330} r={2.6} />
    </g>
  ),
  shoes_bronze: () => (
    <g>
      <Grads colors={["#b8832f", "#8a5f1c"]} />
      <path d="M80 314 L96 314 L95 336 L81 336 Z" fill={F("#b8832f")} {...edge("#b8832f", 1.4)} />
      <path d="M104 314 L120 314 L119 336 L105 336 Z" fill={F("#b8832f")} {...edge("#b8832f", 1.4)} />
      <ellipse cx="88" cy="340" rx="14" ry="5.5" fill={F("#8a5f1c")} {...edge("#8a5f1c", 1.3)} />
      <ellipse cx="112" cy="340" rx="14" ry="5.5" fill={F("#8a5f1c")} {...edge("#8a5f1c", 1.3)} />
      <circle cx="88" cy="319" r="2" fill="#e6c26b" />
      <circle cx="112" cy="319" r="2" fill="#e6c26b" />
    </g>
  ),
  shoes_sneakers: () => (
    <g>
      <Grads colors={["#ffffff"]} />
      <path d="M74 330 Q86 324 100 330 L102 344 L74 344 Z" fill={F("#ffffff")} {...edge("#9ca3af", 1.4)} />
      <path d="M100 330 Q114 324 126 330 L128 344 L98 344 Z" fill={F("#ffffff")} {...edge("#9ca3af", 1.4)} />
      <path d="M74 340 L102 340 M98 340 L128 340" stroke="#e5484d" strokeWidth="3" />
    </g>
  ),
  shoes_boots: () => (
    <g>
      <Grads colors={["#6b4226"]} />
      <path d="M80 308 L96 308 L96 334 Q106 336 104 346 L72 346 Q72 338 80 334 Z" fill={F("#6b4226")} {...edge("#6b4226", 1.4)} />
      <path d="M104 308 L120 308 L120 334 Q130 336 128 346 L96 346 Q96 338 104 334 Z" fill={F("#6b4226")} {...edge("#6b4226", 1.4)} />
    </g>
  ),
};

/** Capas desenhadas ATRÁS do corpo (antes do vestido). */
export const BACK_ART: Record<string, () => ReactElement> = {
  mantle_royal: () => capeBack("#b4232a"),
  mantle_blue: () => capeBack("#3d6fc4", "#9db8e8"),
  mantle_white: () => capeBack("#fbfbfb", "#cfd4dc"),
  mantle_striped: () => (
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
            <path d={p} fill="#c7a46a" />
            {[160, 190, 220, 250, 280, 310].map((y, i) => (
              <rect key={y} x="20" y={y} width="160" height="14" fill={i % 2 ? "#6b4a2a" : "#3a2a1c"} />
            ))}
          </g>
          <path d={p} fill="none" stroke="#3a2a1c" strokeWidth="1.6" strokeLinejoin="round" />
        </g>
      ))}
    </g>
  ),
};
