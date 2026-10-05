import type { ReactElement } from "react";
import { F, Gem, Grads, INK, Shine, dark, light, line, thin } from "./ArtKit";

// Desenho (SVG, viewBox 0 0 200 360) de cada peça no estilo "fofo" da Arena: cabeça grande (centro 100,96),
// tronco y 138–258, pernas curtas, pés y ~330. Mão direita (do boneco) em (160,232); esquerda em (40,232).

/** Túnica com mangas e saia até abaixo do joelho. */
const SHIRT = "M60 142 Q100 126 140 142 L154 188 Q144 198 134 190 L134 204 L140 284 Q100 296 60 284 L66 204 L66 190 Q56 198 46 188 Z";
const CAPE_L = "M58 140 Q42 220 36 296 L80 296 L84 142 Z";
const CAPE_R = "M142 140 Q158 220 164 296 L120 296 L116 142 Z";

const tunic = (c: string, extra?: ReactElement, trim?: string) => (
  <g>
    <Grads colors={[c]} />
    <path d={SHIRT} fill={F(c)} {...line} />
    <Shine d="M70 146 Q96 134 118 142 L112 190 L72 196 Z" o={0.18} />
    <path d="M84 140 Q100 158 116 140" fill="none" stroke={dark(c, 0.45)} strokeWidth="3" strokeLinecap="round" />
    {trim ? <path d="M60 284 Q100 296 140 284" fill="none" stroke={trim} strokeWidth="5" strokeLinecap="round" /> : null}
    {extra}
  </g>
);

const cape = (c: string, edge = "#f5c518") => (
  <g>
    <Grads colors={[c]} />
    <path d={CAPE_L} fill={F(c)} {...line} />
    <path d={CAPE_R} fill={F(c)} {...line} />
    <path d="M40 290 L78 290 M162 290 L122 290" stroke={edge} strokeWidth="4" strokeLinecap="round" />
    <path d="M84 150 Q100 162 116 150" fill="none" stroke={edge} strokeWidth="3" strokeLinecap="round" />
    <Gem x={84} y={150} r={4} c="#e5484d" />
    <Gem x={116} y={150} r={4} c="#e5484d" />
  </g>
);

const GOLD = "#f5c518";

export const ITEM_ART: Record<string, () => ReactElement> = {
  // ------------------------------------------------------------------ cabeça
  head_none: () => <g />,
  head_crown: () => (
    <g>
      <Grads colors={[GOLD]} />
      <path d="M62 68 L66 34 L84 52 L100 28 L116 52 L134 34 L138 68 Q100 80 62 68 Z" fill={F(GOLD)} {...line} />
      <Shine d="M68 44 L82 56 L96 38 L92 62 L70 64 Z" o={0.35} />
      <Gem x={100} y={52} r={5} />
      <Gem x={78} y={62} r={3.5} c="#3b82f6" />
      <Gem x={122} y={62} r={3.5} c="#3b82f6" />
      <circle cx="66" cy="34" r="3.5" fill="#fff" stroke={INK} strokeWidth="1.4" />
      <circle cx="134" cy="34" r="3.5" fill="#fff" stroke={INK} strokeWidth="1.4" />
      <circle cx="100" cy="28" r="3.5" fill="#fff" stroke={INK} strokeWidth="1.4" />
    </g>
  ),
  head_diadem: () => (
    <g>
      <Grads colors={[GOLD]} />
      <path d="M60 80 Q100 48 140 80" fill="none" stroke={INK} strokeWidth="13" strokeLinecap="round" />
      <path d="M60 80 Q100 48 140 80" fill="none" stroke={GOLD} strokeWidth="8.5" strokeLinecap="round" />
      <path d="M66 74 Q100 46 134 74" fill="none" stroke="#fff" strokeWidth="2" opacity="0.5" strokeLinecap="round" />
      <path d="M92 60 L100 46 L108 60 Z" fill={F(GOLD)} {...thin} />
      <Gem x={100} y={62} r={5.5} />
    </g>
  ),
  head_turban: () => (
    <g>
      <Grads colors={["#f4efe2", "#d8cdb0"]} />
      <path d="M54 88 Q48 36 100 34 Q152 36 146 88 Q100 66 54 88 Z" fill={F("#f4efe2")} {...line} />
      <path d="M58 72 Q100 52 142 72 M62 58 Q100 40 138 58" fill="none" stroke="#c9bd9f" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M124 40 Q154 54 144 92 Q132 70 120 62 Z" fill={F("#d8cdb0")} {...line} />
      <Gem x={100} y={62} r={4.5} c="#3b82f6" />
    </g>
  ),
  head_veil: () => (
    <g>
      <Grads colors={["#a9c8f0"]} />
      <path
        d="M50 96 Q46 36 100 34 Q154 36 150 96 L162 196 Q100 176 38 196 Z M62 98 a38 41 0 1 0 76 0 a38 41 0 1 0 -76 0 Z"
        fillRule="evenodd"
        fill={F("#a9c8f0")}
        {...line}
      />
      <Shine d="M58 60 Q70 40 96 38 L88 60 Z" o={0.4} />
      <path d="M60 128 Q100 150 140 128" fill="none" stroke="#7fa3d8" strokeWidth="2" opacity="0.6" />
    </g>
  ),
  head_helmet: () => (
    <g>
      <Grads colors={["#b8832f", "#c43a3a"]} />
      <path d="M54 92 Q48 36 100 34 Q152 36 146 92 L134 86 Q100 66 66 86 Z" fill={F("#b8832f")} {...line} />
      <Shine d="M62 66 Q74 44 100 40 L90 60 Z" o={0.4} />
      <rect x="93" y="74" width="14" height="30" rx="6" fill={F("#b8832f")} {...line} />
      <path d="M100 34 Q86 6 124 14 Q108 20 112 36 Z" fill={F("#c43a3a")} {...line} />
      <circle cx="68" cy="78" r="3" fill="#e6c26b" stroke={INK} strokeWidth="1.2" />
      <circle cx="132" cy="78" r="3" fill="#e6c26b" stroke={INK} strokeWidth="1.2" />
    </g>
  ),
  head_scarf: () => (
    <g>
      <Grads colors={["#efe6cf"]} />
      <path d="M52 98 Q44 36 100 34 Q156 36 148 98 L156 142 Q144 104 100 86 Q56 104 44 142 Z" fill={F("#efe6cf")} {...line} />
      <path d="M58 70 Q100 50 142 70" fill="none" stroke={INK} strokeWidth="13" strokeLinecap="round" />
      <path d="M58 70 Q100 50 142 70" fill="none" stroke="#6b4a2a" strokeWidth="8.5" strokeLinecap="round" />
      <Shine d="M60 56 Q74 40 100 38 L92 58 Z" o={0.4} />
    </g>
  ),
  head_cap: () => (
    <g>
      <Grads colors={["#e5484d"]} />
      <path d="M58 82 Q58 38 100 38 Q142 38 142 82 Z" fill={F("#e5484d")} {...line} />
      <path d="M130 78 Q172 74 184 90 L136 92 Z" fill={F("#e5484d")} {...line} />
      <circle cx="100" cy="38" r="4" fill="#9b1c22" stroke={INK} strokeWidth="1.4" />
      <Shine d="M66 62 Q78 44 100 42 L90 62 Z" o={0.35} />
    </g>
  ),

  // ------------------------------------------------------------------ roupa
  tunic_simple: () =>
    tunic(
      "#e8d9b5",
      <g fill="none" stroke="#b9a77a" strokeWidth="2" strokeLinecap="round">
        <path d="M80 200 L78 280 M100 204 L100 288 M120 200 L122 280" opacity="0.5" />
      </g>,
      "#c9b685",
    ),
  tunic_camel: () =>
    tunic(
      "#8a6a43",
      <g stroke="#4f3a20" strokeWidth="2.4" strokeLinecap="round" fill="none">
        <path d="M76 160 l7 5 M110 152 l7 5 M90 190 l7 5 M122 186 l7 5 M72 220 l7 5 M104 232 l7 5 M126 250 l7 5 M84 262 l7 5 M96 170 l7 5" />
        <path d="M60 284 l6 8 l6 -8 l6 8 l6 -8 l6 8 l6 -8 l6 8 l6 -8 l6 8 l6 -8 l6 8" />
      </g>,
    ),
  tunic_colors: () => (
    <g>
      <defs>
        <clipPath id="clip-tunic-colors">
          <path d={SHIRT} />
        </clipPath>
      </defs>
      <g clipPath="url(#clip-tunic-colors)">
        {Array.from({ length: 7 }).flatMap((_, row) =>
          Array.from({ length: 6 }).map((__, col) => {
            const palette = ["#b83227", "#2c6fa8", "#d9a21a", "#6d3a8c", "#2f8a4f", "#d9662b", "#3a3a8c"];
            return <rect key={`${row}-${col}`} x={40 + col * 24} y={124 + row * 25} width="25" height="26" fill={palette[(row * 3 + col * 5 + row * col) % palette.length]} stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" />;
          }),
        )}
      </g>
      <path d={SHIRT} fill="none" {...line} />
      <path d="M84 140 Q100 158 116 140" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
    </g>
  ),
  tunic_linen: () =>
    tunic(
      "#f8f5ec",
      <g fill="none" stroke="#d6cdb3" strokeWidth="2" strokeLinecap="round">
        <path d="M80 160 L76 284 M92 166 L90 290 M108 166 L110 290 M120 160 L124 284" />
        <path d="M84 140 Q100 158 116 140" stroke="#d9b64a" strokeWidth="4" />
      </g>,
      "#d9b64a",
    ),
  tunic_purple: () =>
    tunic(
      "#6b2d8c",
      <g fill="none" stroke={GOLD} strokeWidth="3.5" strokeLinecap="round">
        <path d="M84 140 Q100 158 116 140" />
        <path d="M100 160 L100 284" strokeWidth="5" />
        <path d="M50 188 Q56 192 62 190 M150 188 Q144 192 138 190" />
      </g>,
      GOLD,
    ),
  tunic_blue: () => tunic("#2f5fb0", undefined, "#9db8e8"),
  tunic_armor: () => (
    <g>
      <Grads colors={["#7d5a35", "#b8832f"]} />
      <path d={SHIRT} fill={F("#7d5a35")} {...line} />
      <path d="M64 144 Q100 130 136 144 L132 220 Q100 234 68 220 Z" fill={F("#b8832f")} {...line} />
      <Shine d="M70 148 Q94 138 112 144 L108 196 L72 206 Z" o={0.3} />
      <path d="M100 138 L100 230 M72 170 Q100 180 128 170 M72 196 Q100 206 128 196" fill="none" stroke={dark("#b8832f", 0.5)} strokeWidth="2" />
      <circle cx="56" cy="152" r="14" fill={F("#b8832f")} {...line} />
      <circle cx="144" cy="152" r="14" fill={F("#b8832f")} {...line} />
      <g fill={F("#7d5a35")} {...thin}>
        {[72, 84, 96, 108, 120, 132].map((x) => (
          <path key={x} d={`M${x - 6} 232 L${x + 6} 232 L${x + 5} 262 L${x - 5} 262 Z`} />
        ))}
      </g>
    </g>
  ),
  tunic_leaves: () => (
    <g>
      <Grads colors={["#3fa34d", "#2e8b3d"]} />
      {[66, 78, 90, 102, 114, 126, 138].map((x, i) => (
        <path key={`s${x}`} d={`M${x} ${236 + (i % 2) * 6} q-14 20 0 44 q14 -24 0 -44 Z`} fill={F(i % 2 ? "#3fa34d" : "#2e8b3d")} {...thin} />
      ))}
      <path d="M62 238 Q100 252 138 238" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      <path d="M62 238 Q100 252 138 238" fill="none" stroke="#7a5a30" strokeWidth="3.4" strokeLinecap="round" />
      {[72, 88, 112, 128].map((x, i) => (
        <path key={`c${x}`} d={`M${x} ${146 + (i % 2) * 6} q-12 14 0 30 q12 -16 0 -30 Z`} fill={F(i % 2 ? "#3fa34d" : "#2e8b3d")} {...thin} />
      ))}
    </g>
  ),
  tunic_skins: () =>
    tunic(
      "#b98a55",
      <g fill="#7b5428" opacity="0.75">
        <ellipse cx="80" cy="160" rx="8" ry="6" />
        <ellipse cx="122" cy="190" rx="9" ry="6" />
        <ellipse cx="86" cy="226" rx="9" ry="6" />
        <ellipse cx="116" cy="256" rx="8" ry="5" />
        <ellipse cx="62" cy="186" rx="6" ry="4" />
      </g>,
    ),
  tunic_sack: () =>
    tunic(
      "#7a6f5f",
      <g stroke="#40382d" strokeWidth="2.4" fill="none" strokeLinecap="round">
        <path d="M76 166 l12 3 M110 196 l12 -2 M80 232 l14 4 M112 262 l12 -3" />
        <rect x="98" y="206" width="18" height="18" fill="#9b8f7c" strokeDasharray="3 2" />
      </g>,
    ),
  tunic_hoodie: () => (
    <g>
      <Grads colors={["#6b7280", "#555c68"]} />
      <path d={SHIRT} fill={F("#6b7280")} {...line} />
      <path d="M72 140 Q100 176 128 140 Q100 122 72 140 Z" fill={F("#555c68")} {...line} />
      <path d="M92 156 L92 190 M108 156 L108 190" stroke="#e5e7eb" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M78 232 Q100 246 122 232 L124 266 Q100 276 76 266 Z" fill={F("#555c68")} {...thin} />
    </g>
  ),

  // ------------------------------------------------------------------ manto e enfeites
  mantle_none: () => <g />,
  mantle_royal: () => cape("#b4232a"),
  mantle_blue: () => cape("#3d6fc4", "#9db8e8"),
  mantle_white: () => cape("#fbfbfb", "#cfd4dc"),
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
            {[160, 190, 220, 250, 280].map((y, i) => (
              <rect key={y} x="30" y={y} width="140" height="14" fill={i % 2 ? "#6b4a2a" : "#3a2a1c"} />
            ))}
          </g>
          <path d={p} fill="none" {...line} />
        </g>
      ))}
    </g>
  ),
  mantle_belt: () => (
    <g>
      <Grads colors={["#6b4226", GOLD]} />
      <path d="M62 206 Q100 218 138 206 L138 222 Q100 234 62 222 Z" fill={F("#6b4226")} {...line} />
      <rect x="90" y="206" width="20" height="22" rx="4" fill={F(GOLD)} {...line} />
      <rect x="96" y="212" width="8" height="10" rx="2" fill="#6b4226" />
    </g>
  ),
  mantle_collar: () => (
    <g>
      <path d="M72 140 Q100 184 128 140" fill="none" stroke={INK} strokeWidth="11" strokeLinecap="round" />
      <path d="M72 140 Q100 184 128 140" fill="none" stroke={GOLD} strokeWidth="6.5" strokeLinecap="round" />
      <path d="M76 142 Q100 176 124 142" fill="none" stroke="#fff" strokeWidth="1.5" opacity="0.5" strokeLinecap="round" />
      <Gem x={100} y={176} r={6} c="#3b82f6" />
      <Gem x={82} y={160} r={3.6} />
      <Gem x={118} y={160} r={3.6} />
    </g>
  ),
  mantle_sash: () => (
    <g>
      <Grads colors={["#c43a3a"]} />
      <path d="M58 146 L76 140 L142 250 L122 258 Z" fill={F("#c43a3a")} {...line} />
      <path d="M118 252 L138 246 L146 290 L126 292 Z" fill={F("#c43a3a")} {...line} />
    </g>
  ),
  mantle_sheep: () => (
    <g fill="#f2ead8" {...thin}>
      {[60, 76, 92, 108, 124, 140].map((x, i) => (
        <circle key={x} cx={x} cy={146 + (i % 2) * 7} r="11" />
      ))}
      {[52, 148].map((x) => (
        <circle key={x} cx={x} cy={178} r="10" />
      ))}
      {[70, 130].map((x) => (
        <circle key={x} cx={x} cy={170} r="10" />
      ))}
    </g>
  ),

  // ------------------------------------------------------------------ calçado (pés em 88,330 e 112,330)
  shoes_none: () => <g />,
  shoes_sandals: () => (
    <g>
      <Grads colors={["#b98a55"]} />
      <ellipse cx="88" cy="334" rx="19" ry="7" fill={F("#b98a55")} {...line} />
      <ellipse cx="112" cy="334" rx="19" ry="7" fill={F("#b98a55")} {...line} />
      <g stroke="#6b4226" strokeWidth="2.8" fill="none" strokeLinecap="round">
        <path d="M76 322 L92 332 M92 322 L76 332 M108 322 L124 332 M124 322 L108 332 M82 306 L94 306 M106 306 L118 306" />
      </g>
    </g>
  ),
  shoes_gold: () => (
    <g>
      <Grads colors={[GOLD]} />
      <ellipse cx="88" cy="334" rx="19" ry="7" fill={F(GOLD)} {...line} />
      <ellipse cx="112" cy="334" rx="19" ry="7" fill={F(GOLD)} {...line} />
      <g stroke="#8a6d1a" strokeWidth="2.8" fill="none" strokeLinecap="round">
        <path d="M76 322 L92 332 M92 322 L76 332 M108 322 L124 332 M124 322 L108 332" />
      </g>
      <Gem x={84} y={324} r={3.2} />
      <Gem x={116} y={324} r={3.2} />
    </g>
  ),
  shoes_bronze: () => (
    <g>
      <Grads colors={["#b8832f", "#8a5f1c"]} />
      <path d="M76 288 L100 288 L98 326 L78 326 Z" fill={F("#b8832f")} {...line} />
      <path d="M100 288 L124 288 L122 326 L102 326 Z" fill={F("#b8832f")} {...line} />
      <ellipse cx="88" cy="334" rx="19" ry="8" fill={F("#8a5f1c")} {...line} />
      <ellipse cx="112" cy="334" rx="19" ry="8" fill={F("#8a5f1c")} {...line} />
      <Shine d="M80 292 L88 292 L86 322 L81 322 Z" o={0.4} />
      <circle cx="88" cy="298" r="3" fill="#e6c26b" stroke={INK} strokeWidth="1.2" />
      <circle cx="112" cy="298" r="3" fill="#e6c26b" stroke={INK} strokeWidth="1.2" />
    </g>
  ),
  shoes_sneakers: () => (
    <g>
      <Grads colors={["#ffffff"]} />
      <path d="M68 322 Q82 314 100 322 L102 340 L66 340 Z" fill={F("#ffffff")} {...line} />
      <path d="M100 322 Q118 314 132 322 L134 340 L98 340 Z" fill={F("#ffffff")} {...line} />
      <path d="M68 334 L102 334 M98 334 L134 334" stroke="#e5484d" strokeWidth="4" />
      <path d="M78 324 l8 -3 M108 324 l8 -3" stroke={INK} strokeWidth="2" strokeLinecap="round" />
    </g>
  ),
  shoes_boots: () => (
    <g>
      <Grads colors={["#6b4226"]} />
      <path d="M74 296 L100 296 L100 324 Q112 330 108 342 L68 342 Q68 330 74 324 Z" fill={F("#6b4226")} {...line} />
      <path d="M100 296 L126 296 L126 324 Q138 330 134 342 L94 342 Q94 330 100 324 Z" fill={F("#6b4226")} {...line} />
      <path d="M74 304 L100 304 M100 304 L126 304" stroke="#3d2614" strokeWidth="2.4" />
    </g>
  ),

  // ------------------------------------------------------------------ na mão (a mão direita fecha por cima, em 160,232)
  hand_none: () => <g />,
  hand_staff: () => (
    <g fill="none" strokeLinecap="round">
      <path d="M160 346 L160 128 Q160 100 182 106" stroke={INK} strokeWidth="13" />
      <path d="M160 346 L160 128 Q160 100 182 106" stroke="#8c5e36" strokeWidth="8" />
      <path d="M157 330 L157 140" stroke="#c18a56" strokeWidth="2.4" opacity="0.8" />
    </g>
  ),
  hand_sling: () => (
    <g>
      <Grads colors={["#8c5e36", "#bfc4cc"]} />
      <path d="M160 232 Q132 196 150 156 Q170 190 160 232" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      <path d="M160 232 Q132 196 150 156 Q170 190 160 232" fill="none" stroke="#8c5e36" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="150" cy="154" rx="11" ry="7" fill={F("#8c5e36")} {...line} />
      <circle cx="150" cy="154" r="4.5" fill={F("#bfc4cc")} {...thin} />
    </g>
  ),
  hand_harp: () => (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      {["M186 130 Q148 128 146 240", "M186 130 L184 250", "M144 250 L190 254"].map((d) => (
        <g key={d}>
          <path d={d} stroke={INK} strokeWidth="13" />
          <path d={d} stroke="#d9a21a" strokeWidth="8" />
          <path d={d} stroke="#fff" strokeWidth="1.6" opacity="0.5" transform="translate(-1.5 -1.5)" />
        </g>
      ))}
      <path d="M156 150 L156 248 M166 138 L166 250 M176 132 L175 251" stroke="#f5e3a1" strokeWidth="2.2" />
      <path d="M156 150 L156 248 M166 138 L166 250 M176 132 L175 251" stroke={INK} strokeWidth="0.8" opacity="0.5" />
    </g>
  ),
  hand_trumpet: () => (
    <g transform="translate(160 232) scale(0.72) translate(-160 -232)">
      <Grads colors={[GOLD]} />
      <path d="M154 236 L176 158 L198 128 L202 150 L184 170 L168 242 Z" fill={F(GOLD)} {...line} />
      <path d="M194 122 Q214 118 210 158 Q196 150 194 122 Z" fill={F("#e8b012")} {...line} />
    </g>
  ),
  hand_sword: () => (
    <g>
      <Grads colors={["#cfd5de", "#b8832f"]} />
      <path d="M154 130 L166 130 L166 214 L160 224 L154 214 Z" fill={F("#cfd5de")} {...line} />
      <Shine d="M156 134 L160 134 L160 214 L156 210 Z" o={0.6} />
      <rect x="140" y="222" width="40" height="9" rx="4" fill={F("#b8832f")} {...line} />
      <rect x="155" y="236" width="10" height="24" rx="4" fill="#6b4226" {...thin} />
      <circle cx="160" cy="264" r="6" fill={F("#b8832f")} {...thin} />
    </g>
  ),
  hand_scroll: () => (
    <g>
      <rect x="146" y="196" width="34" height="48" rx="4" fill="#f4e6c4" {...line} />
      <rect x="142" y="190" width="42" height="10" rx="5" fill="#c9a266" {...line} />
      <rect x="142" y="240" width="42" height="10" rx="5" fill="#c9a266" {...line} />
      <path d="M152 208 L174 208 M152 218 L174 218 M152 228 L168 228" stroke="#9b8456" strokeWidth="2" strokeLinecap="round" />
    </g>
  ),
  hand_jar: () => (
    <g>
      <Grads colors={["#c1713a", "#f5a623"]} />
      <path d="M140 232 Q132 202 148 196 L172 196 Q188 202 180 232 Q176 252 160 252 Q144 252 140 232 Z" fill={F("#c1713a")} {...line} />
      <rect x="148" y="188" width="24" height="10" rx="3" fill={F("#c1713a")} {...line} />
      <path d="M160 190 Q142 164 160 140 Q178 164 160 190 Z" fill={F("#f5a623")} {...line} />
      <path d="M160 182 Q152 166 160 154 Q168 166 160 182 Z" fill="#fde68a" />
    </g>
  ),
  hand_scepter: () => (
    <g>
      <Grads colors={[GOLD]} />
      <rect x="155" y="128" width="10" height="190" rx="5" fill={F(GOLD)} {...line} />
      <circle cx="160" cy="118" r="15" fill={F(GOLD)} {...line} />
      <Gem x={160} y={118} r={6} />
    </g>
  ),
  hand_olive: () => (
    <g>
      <Grads colors={["#7bb661"]} />
      <path d="M160 260 Q182 200 166 140" fill="none" stroke={INK} strokeWidth="7" strokeLinecap="round" />
      <path d="M160 260 Q182 200 166 140" fill="none" stroke="#6b4a2a" strokeWidth="3.4" strokeLinecap="round" />
      {[[176, 160], [166, 178], [180, 196], [168, 214], [172, 144]].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx="12" ry="6" transform={`rotate(${i % 2 ? -35 : 35} ${x} ${y})`} fill={F("#7bb661")} {...thin} />
      ))}
    </g>
  ),
  hand_jawbone: () => (
    <g>
      <Grads colors={["#f1ead6"]} />
      <path d="M140 250 Q132 190 168 150 Q182 146 182 162 Q164 190 164 244 Q152 258 140 250 Z" fill={F("#f1ead6")} {...line} />
      <path d="M164 160 l10 -3 M160 172 l10 -3 M158 184 l10 -3" stroke="#8a7f5e" strokeWidth="2.6" strokeLinecap="round" />
    </g>
  ),
  hand_pitcher: () => (
    <g>
      <Grads colors={["#b8642f"]} />
      <path d="M140 232 Q134 206 148 198 L172 198 Q186 206 180 232 Q178 256 160 256 Q142 256 140 232 Z" fill={F("#b8642f")} {...line} />
      <path d="M150 198 Q150 180 160 180 Q170 180 170 198" fill="none" stroke={INK} strokeWidth="7" strokeLinecap="round" />
      <path d="M150 198 Q150 180 160 180 Q170 180 170 198" fill="none" stroke="#b8642f" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M182 214 Q198 220 182 240" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" />
    </g>
  ),
  hand_phone: () => (
    <g>
      <rect x="146" y="196" width="30" height="52" rx="6" fill="#1f2937" {...line} />
      <rect x="150" y="202" width="22" height="38" rx="2" fill="#60a5fa" />
      <Shine d="M150 202 L172 202 L150 226 Z" o={0.4} />
    </g>
  ),
};

// evita aviso de import não usado nos temas de cor
void light;
