import type { ReactElement } from "react";

// Desenho (SVG, viewBox 0 0 200 360) de cada peça. O boneco: cabeça (100,62), tronco y 98–210, pés y ~330.

const SHOULDER = "M70 98 Q100 90 130 98 L142 128 L150 178 L134 180 L131 150 L133 252 L67 252 L69 150 L66 180 L50 178 L58 128 Z";
const PANEL_L = "M62 98 Q78 92 88 100 L84 266 L46 266 Z";
const PANEL_R = "M138 98 Q122 92 112 100 L116 266 L154 266 Z";

const tunic = (fill: string, extra?: ReactElement) => (
  <g>
    <path d={SHOULDER} fill={fill} stroke="rgba(0,0,0,0.25)" strokeWidth="1.5" />
    {extra}
  </g>
);

export const ITEM_ART: Record<string, () => ReactElement> = {
  // ------------------------------------------------------------------ cabeça
  head_none: () => <g />,
  head_crown: () => (
    <g>
      <path d="M72 44 L78 22 L90 36 L100 18 L110 36 L122 22 L128 44 Z" fill="#f5c518" stroke="#b8860b" strokeWidth="2" />
      <circle cx="100" cy="30" r="3" fill="#e5484d" />
      <circle cx="80" cy="34" r="2.5" fill="#3b82f6" />
      <circle cx="120" cy="34" r="2.5" fill="#3b82f6" />
    </g>
  ),
  head_diadem: () => (
    <g>
      <path d="M72 46 Q100 30 128 46" fill="none" stroke="#f5c518" strokeWidth="5" strokeLinecap="round" />
      <path d="M72 46 Q100 30 128 46" fill="none" stroke="#b8860b" strokeWidth="1.2" />
      <circle cx="100" cy="37" r="5" fill="#e5484d" stroke="#8a1c22" strokeWidth="1.5" />
    </g>
  ),
  head_turban: () => (
    <g>
      <path d="M70 52 Q68 22 100 20 Q132 22 130 52 Q100 44 70 52 Z" fill="#f4efe2" stroke="#b9ad92" strokeWidth="2" />
      <path d="M72 44 Q100 34 128 44 M74 36 Q100 26 126 36" fill="none" stroke="#c9bd9f" strokeWidth="2" />
      <path d="M118 28 Q132 40 128 56" fill="none" stroke="#c9bd9f" strokeWidth="2" />
    </g>
  ),
  head_veil: () => (
    <g>
      <path d="M68 58 Q66 24 100 22 Q134 24 132 58 L140 120 Q100 108 60 120 Z M77 66 a23 27 0 1 0 46 0 a23 27 0 1 0 -46 0 Z" fillRule="evenodd" fill="#a9c8f0" stroke="#5f86bf" strokeWidth="2" />
      <path d="M82 40 Q100 30 118 40" fill="none" stroke="#7fa3d8" strokeWidth="2" />
    </g>
  ),
  head_helmet: () => (
    <g>
      <path d="M72 58 Q70 22 100 20 Q130 22 128 58 L120 56 Q100 46 80 56 Z" fill="#b8832f" stroke="#7a5516" strokeWidth="2" />
      <rect x="96" y="44" width="8" height="22" rx="3" fill="#a06f22" stroke="#7a5516" strokeWidth="1.5" />
      <path d="M100 20 Q104 8 112 12 Q106 16 108 22" fill="#c43a3a" stroke="#8a1c22" strokeWidth="1.2" />
    </g>
  ),
  head_scarf: () => (
    <g>
      <path d="M68 56 Q64 22 100 20 Q136 22 132 56 L132 78 Q124 60 100 56 Q76 60 68 78 Z" fill="#efe6cf" stroke="#b9a97d" strokeWidth="2" />
      <path d="M70 40 Q100 28 130 40" fill="none" stroke="#6b4a2a" strokeWidth="6" strokeLinecap="round" />
    </g>
  ),
  head_cap: () => (
    <g>
      <path d="M72 46 Q74 22 100 22 Q126 22 128 46 Z" fill="#e5484d" stroke="#8a1c22" strokeWidth="2" />
      <path d="M124 44 Q150 44 156 52 L126 52 Z" fill="#c53a40" stroke="#8a1c22" strokeWidth="2" />
      <circle cx="100" cy="22" r="3" fill="#8a1c22" />
    </g>
  ),

  // ------------------------------------------------------------------ roupa
  tunic_simple: () =>
    tunic(
      "#e8d9b5",
      <path d="M86 98 Q100 112 114 98" fill="none" stroke="#b9a77a" strokeWidth="2.5" />,
    ),
  tunic_camel: () =>
    tunic(
      "#8a6a43",
      <g stroke="#5e4527" strokeWidth="2" strokeLinecap="round">
        <path d="M80 130 l6 4 M104 140 l6 4 M90 170 l6 4 M118 185 l6 4 M78 205 l6 4 M108 225 l6 4 M92 240 l6 4 M126 130 l-6 4" />
      </g>,
    ),
  tunic_colors: () => (
    <g>
      <defs>
        <clipPath id="clip-tunic-colors">
          <path d={SHOULDER} />
        </clipPath>
      </defs>
      <g clipPath="url(#clip-tunic-colors)">
        {Array.from({ length: 6 }).flatMap((_, row) =>
          Array.from({ length: 5 }).map((__, col) => {
            const palette = ["#b83227", "#2c6fa8", "#d9a21a", "#6d3a8c", "#2f8a4f", "#d9662b", "#3a3a8c"];
            return <rect key={`${row}-${col}`} x={42 + col * 24} y={90 + row * 28} width="25" height="29" fill={palette[(row * 3 + col * 5 + row * col) % palette.length]} stroke="rgba(255,255,255,0.35)" strokeWidth="1" />;
          }),
        )}
      </g>
      <path d={SHOULDER} fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="1.5" />
    </g>
  ),
  tunic_linen: () =>
    tunic(
      "#f8f5ec",
      <g stroke="#ddd5bd" strokeWidth="1.5" fill="none">
        <path d="M86 110 L84 250 M96 110 L95 250 M106 110 L106 250 M116 110 L117 250" />
        <path d="M86 98 Q100 112 114 98" stroke="#d9b64a" strokeWidth="3" />
      </g>,
    ),
  tunic_purple: () =>
    tunic(
      "#6b2d8c",
      <g fill="none" stroke="#f5c518" strokeWidth="3">
        <path d="M67 246 L133 246" />
        <path d="M86 98 Q100 112 114 98" />
      </g>,
    ),
  tunic_blue: () => tunic("#2f5fb0", <path d="M86 98 Q100 112 114 98" fill="none" stroke="#9db8e8" strokeWidth="2.5" />),
  tunic_armor: () => (
    <g>
      <path d={SHOULDER} fill="#7d5a35" stroke="rgba(0,0,0,0.3)" strokeWidth="1.5" />
      <path d="M72 100 Q100 92 128 100 L126 176 Q100 186 74 176 Z" fill="#b8832f" stroke="#7a5516" strokeWidth="2" />
      <path d="M100 98 L100 182 M80 128 Q100 134 120 128 M80 152 Q100 158 120 152" fill="none" stroke="#7a5516" strokeWidth="1.5" />
      <g fill="#e6c26b">
        <circle cx="82" cy="110" r="2" />
        <circle cx="118" cy="110" r="2" />
      </g>
      <path d="M72 180 L70 214 M86 184 L85 218 M100 186 L100 220 M114 184 L115 218 M128 180 L130 214" stroke="#5e4527" strokeWidth="6" strokeLinecap="round" />
    </g>
  ),
  tunic_leaves: () => (
    <g>
      {[78, 90, 102, 114, 124].map((x, i) => (
        <path key={x} d={`M${x} ${196 + (i % 2) * 6} q-10 14 0 30 q10 -14 0 -30 Z`} fill={i % 2 ? "#3fa34d" : "#2e8b3d"} stroke="#1d5f28" strokeWidth="1.2" />
      ))}
      <path d="M72 194 Q100 204 128 194" fill="none" stroke="#6b4a2a" strokeWidth="3" />
      {[78, 92, 108, 122].map((x, i) => (
        <path key={`c${x}`} d={`M${x} ${112 + (i % 2) * 4} q-9 12 0 26 q9 -12 0 -26 Z`} fill={i % 2 ? "#3fa34d" : "#2e8b3d"} stroke="#1d5f28" strokeWidth="1.2" />
      ))}
    </g>
  ),
  tunic_skins: () =>
    tunic(
      "#b98a55",
      <g fill="#8a6234" opacity="0.8">
        <ellipse cx="84" cy="140" rx="7" ry="5" />
        <ellipse cx="116" cy="170" rx="8" ry="5" />
        <ellipse cx="90" cy="214" rx="8" ry="5" />
        <ellipse cx="114" cy="236" rx="6" ry="4" />
      </g>,
    ),
  tunic_sack: () =>
    tunic(
      "#7a6f5f",
      <g stroke="#51483c" strokeWidth="2" fill="none" strokeLinecap="round">
        <path d="M80 130 l10 3 M110 160 l10 -2 M86 200 l12 4 M112 230 l10 -3" />
        <rect x="96" y="176" width="14" height="14" fill="#9b8f7c" />
      </g>,
    ),
  tunic_hoodie: () => (
    <g>
      <path d={SHOULDER} fill="#6b7280" stroke="rgba(0,0,0,0.3)" strokeWidth="1.5" />
      <path d="M78 98 Q100 130 122 98 Q100 86 78 98 Z" fill="#555c68" />
      <path d="M92 118 L92 150 M108 118 L108 150" stroke="#e5e7eb" strokeWidth="2" />
      <path d="M82 210 Q100 222 118 210 L118 236 Q100 244 82 236 Z" fill="#59606c" />
    </g>
  ),

  // ------------------------------------------------------------------ manto e enfeites
  mantle_none: () => <g />,
  mantle_royal: () => (
    <g>
      <path d={PANEL_L} fill="#b4232a" stroke="#f5c518" strokeWidth="3" />
      <path d={PANEL_R} fill="#b4232a" stroke="#f5c518" strokeWidth="3" />
      <circle cx="90" cy="102" r="3" fill="#f5c518" />
      <circle cx="110" cy="102" r="3" fill="#f5c518" />
      <path d="M90 102 Q100 108 110 102" fill="none" stroke="#f5c518" strokeWidth="2" />
    </g>
  ),
  mantle_blue: () => (
    <g>
      <path d={PANEL_L} fill="#3d6fc4" stroke="#27478a" strokeWidth="2" />
      <path d={PANEL_R} fill="#3d6fc4" stroke="#27478a" strokeWidth="2" />
    </g>
  ),
  mantle_striped: () => (
    <g>
      <defs>
        <clipPath id="clip-striped-l">
          <path d={PANEL_L} />
        </clipPath>
        <clipPath id="clip-striped-r">
          <path d={PANEL_R} />
        </clipPath>
      </defs>
      {[PANEL_L, PANEL_R].map((p, k) => (
        <g key={p} clipPath={`url(#clip-striped-${k ? "r" : "l"})`}>
          <path d={p} fill="#c7a46a" />
          {[120, 150, 180, 210, 240].map((y, i) => (
            <rect key={y} x="40" y={y} width="120" height="10" fill={i % 2 ? "#6b4a2a" : "#3a2a1c"} />
          ))}
        </g>
      ))}
    </g>
  ),
  mantle_belt: () => (
    <g>
      <rect x="66" y="166" width="68" height="12" rx="3" fill="#6b4226" stroke="#3d2614" strokeWidth="1.5" />
      <rect x="94" y="164" width="12" height="16" rx="2" fill="#d9b64a" stroke="#8a6d1a" strokeWidth="1.5" />
    </g>
  ),
  mantle_collar: () => (
    <g>
      <path d="M80 98 Q100 130 120 98" fill="none" stroke="#f5c518" strokeWidth="6" strokeLinecap="round" />
      <path d="M80 98 Q100 130 120 98" fill="none" stroke="#b8860b" strokeWidth="1.2" />
      <circle cx="100" cy="124" r="5" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="1.2" />
      <circle cx="88" cy="114" r="3" fill="#e5484d" />
      <circle cx="112" cy="114" r="3" fill="#e5484d" />
    </g>
  ),
  mantle_sash: () => (
    <g>
      <path d="M66 100 L82 98 L136 190 L120 196 Z" fill="#c43a3a" stroke="#8a1c22" strokeWidth="1.5" />
      <path d="M118 196 L132 192 L138 230 L124 232 Z" fill="#c43a3a" stroke="#8a1c22" strokeWidth="1.5" />
    </g>
  ),
  mantle_white: () => (
    <g>
      <path d={PANEL_L} fill="#fbfbfb" stroke="#cfd4dc" strokeWidth="2" />
      <path d={PANEL_R} fill="#fbfbfb" stroke="#cfd4dc" strokeWidth="2" />
    </g>
  ),
  mantle_sheep: () => (
    <g fill="#f2ead8" stroke="#c9bfa5" strokeWidth="1.5">
      {[66, 78, 90, 110, 122, 134].map((x, i) => (
        <circle key={x} cx={x} cy={104 + (i % 2) * 6} r="9" />
      ))}
      {[62, 138].map((x) => (
        <circle key={x} cx={x} cy={134} r="8" />
      ))}
    </g>
  ),

  // ------------------------------------------------------------------ calçado
  shoes_none: () => <g />,
  shoes_sandals: () => (
    <g stroke="#6b4226" strokeWidth="2.5" fill="none" strokeLinecap="round">
      <ellipse cx="88" cy="334" rx="14" ry="4" fill="#b98a55" />
      <ellipse cx="112" cy="334" rx="14" ry="4" fill="#b98a55" />
      <path d="M80 322 L96 332 M96 322 L80 332 M104 322 L120 332 M120 322 L104 332" />
    </g>
  ),
  shoes_gold: () => (
    <g stroke="#8a6d1a" strokeWidth="2" strokeLinecap="round">
      <ellipse cx="88" cy="334" rx="14" ry="4" fill="#f5c518" />
      <ellipse cx="112" cy="334" rx="14" ry="4" fill="#f5c518" />
      <path d="M80 322 L96 332 M96 322 L80 332 M104 322 L120 332 M120 322 L104 332" fill="none" />
      <circle cx="88" cy="326" r="2.5" fill="#e5484d" />
      <circle cx="112" cy="326" r="2.5" fill="#e5484d" />
    </g>
  ),
  shoes_bronze: () => (
    <g fill="#b8832f" stroke="#7a5516" strokeWidth="2">
      <path d="M78 284 L98 284 L96 326 L80 326 Z" />
      <path d="M102 284 L122 284 L120 326 L104 326 Z" />
      <ellipse cx="88" cy="334" rx="14" ry="4" fill="#8a5f1c" />
      <ellipse cx="112" cy="334" rx="14" ry="4" fill="#8a5f1c" />
      <circle cx="88" cy="292" r="2.5" fill="#e6c26b" />
      <circle cx="112" cy="292" r="2.5" fill="#e6c26b" />
    </g>
  ),
  shoes_sneakers: () => (
    <g stroke="#222" strokeWidth="2">
      <path d="M72 322 Q82 316 98 322 L100 336 L72 336 Z" fill="#fff" />
      <path d="M100 322 Q116 316 128 322 L128 336 L100 336 Z" fill="#fff" />
      <path d="M74 330 L98 330 M102 330 L126 330" stroke="#e5484d" strokeWidth="3" />
    </g>
  ),
  shoes_boots: () => (
    <g fill="#6b4226" stroke="#3d2614" strokeWidth="2">
      <path d="M78 296 L98 296 L98 326 Q106 330 104 338 L72 338 Q72 330 78 326 Z" />
      <path d="M102 296 L122 296 L122 326 Q130 330 128 338 L96 338 Q96 330 102 326 Z" />
    </g>
  ),

  // ------------------------------------------------------------------ na mão (mão direita do boneco = x ~152)
  hand_none: () => <g />,
  hand_staff: () => (
    <g fill="none" strokeLinecap="round">
      <path d="M160 340 L160 150 Q160 126 176 130" stroke="#6b4226" strokeWidth="7" />
      <path d="M160 340 L160 150 Q160 126 176 130" stroke="#8c5e36" strokeWidth="3" />
    </g>
  ),
  hand_sling: () => (
    <g>
      <path d="M152 196 Q132 168 150 150 Q170 168 152 196" fill="none" stroke="#6b4226" strokeWidth="3" />
      <ellipse cx="151" cy="198" rx="9" ry="6" fill="#8c5e36" stroke="#4a2c14" strokeWidth="1.5" />
      <circle cx="151" cy="198" r="3.5" fill="#bfc4cc" stroke="#7b8190" strokeWidth="1" />
      <path d="M150 150 Q150 138 160 136" fill="none" stroke="#6b4226" strokeWidth="3" />
    </g>
  ),
  hand_harp: () => (
    <g>
      <path d="M146 214 Q138 150 168 124 Q186 130 180 170 L176 214 Z" fill="#d9a21a" stroke="#8a6d1a" strokeWidth="3" strokeLinejoin="round" />
      <path d="M156 206 Q150 160 170 136 Q178 150 172 206 Z" fill="#fff7d6" opacity="0.6" />
      <g stroke="#7a5516" strokeWidth="1.6">
        <path d="M154 200 L162 148 M160 202 L167 142 M166 204 L172 146" />
      </g>
    </g>
  ),
  hand_trumpet: () => (
    <g>
      <path d="M150 196 L168 150 L190 128 L194 144 L176 160 L160 200 Z" fill="#f5c518" stroke="#8a6d1a" strokeWidth="2" />
      <path d="M186 124 Q202 120 200 150 Q190 146 186 124 Z" fill="#e8b012" stroke="#8a6d1a" strokeWidth="2" />
    </g>
  ),
  hand_sword: () => (
    <g>
      <path d="M156 140 L162 140 L162 262 L159 270 L156 262 Z" fill="#cfd5de" stroke="#7b8190" strokeWidth="1.5" />
      <rect x="146" y="262" width="26" height="6" rx="2" fill="#b8832f" stroke="#7a5516" strokeWidth="1.5" />
      <rect x="156" y="268" width="6" height="22" rx="2" fill="#6b4226" />
      <circle cx="159" cy="294" r="4" fill="#b8832f" />
    </g>
  ),
  hand_scroll: () => (
    <g stroke="#6b4a2a" strokeWidth="2">
      <rect x="146" y="176" width="26" height="40" rx="3" fill="#f4e6c4" />
      <rect x="143" y="172" width="32" height="7" rx="3.5" fill="#c9a266" />
      <rect x="143" y="213" width="32" height="7" rx="3.5" fill="#c9a266" />
      <path d="M152 188 L166 188 M152 196 L166 196 M152 204 L162 204" stroke="#9b8456" strokeWidth="1.5" />
    </g>
  ),
  hand_jar: () => (
    <g>
      <path d="M142 196 Q138 176 150 172 L162 172 Q174 176 170 196 Q168 214 156 214 Q144 214 142 196 Z" fill="#c1713a" stroke="#7a3f18" strokeWidth="2" />
      <rect x="148" y="166" width="16" height="8" rx="2" fill="#a85f2d" stroke="#7a3f18" strokeWidth="1.5" />
      <path d="M156 166 Q144 148 156 132 Q168 148 156 166 Z" fill="#f5a623" stroke="#c2410c" strokeWidth="1.5" />
      <path d="M156 160 Q151 150 156 142 Q161 150 156 160 Z" fill="#fde68a" />
    </g>
  ),
  hand_scepter: () => (
    <g>
      <rect x="156" y="150" width="6" height="150" rx="3" fill="#f5c518" stroke="#8a6d1a" strokeWidth="1.5" />
      <circle cx="159" cy="144" r="10" fill="#f5c518" stroke="#8a6d1a" strokeWidth="2" />
      <circle cx="159" cy="144" r="4" fill="#e5484d" />
    </g>
  ),
  hand_olive: () => (
    <g>
      <path d="M156 214 Q170 170 160 130" fill="none" stroke="#6b4a2a" strokeWidth="3" strokeLinecap="round" />
      {[[166, 150], [158, 164], [168, 178], [160, 192], [164, 136]].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx="9" ry="4.5" transform={`rotate(${i % 2 ? -35 : 35} ${x} ${y})`} fill="#7bb661" stroke="#4b7f3b" strokeWidth="1.2" />
      ))}
    </g>
  ),
  hand_jawbone: () => (
    <g fill="#f1ead6" stroke="#b9ad8a" strokeWidth="2">
      <path d="M144 208 Q140 168 164 150 Q172 148 172 158 Q160 176 160 206 Q152 214 144 208 Z" />
      <path d="M160 156 l8 -2 M158 164 l8 -2 M156 172 l8 -2" stroke="#8a7f5e" strokeWidth="2" />
    </g>
  ),
  hand_pitcher: () => (
    <g>
      <path d="M144 196 Q140 178 150 172 L164 172 Q174 178 172 196 Q170 214 158 214 Q146 214 144 196 Z" fill="#b8642f" stroke="#7a3f18" strokeWidth="2" />
      <path d="M150 172 Q152 160 158 160 Q164 160 164 172" fill="none" stroke="#7a3f18" strokeWidth="3" />
      <path d="M172 184 Q184 188 172 204" fill="none" stroke="#7a3f18" strokeWidth="3" />
    </g>
  ),
  hand_phone: () => (
    <g>
      <rect x="146" y="176" width="24" height="42" rx="5" fill="#1f2937" stroke="#0b0f17" strokeWidth="2" />
      <rect x="149" y="181" width="18" height="30" rx="2" fill="#60a5fa" />
      <circle cx="158" cy="214" r="1.8" fill="#9ca3af" />
    </g>
  ),
};
