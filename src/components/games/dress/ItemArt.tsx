import type { ReactElement } from "react";
import { F, Gem, Grads, INK, Shine, light, line, thin } from "./ArtKit";
import { BACK_ART, BODY_ART } from "./BodyArt";

// Desenho (SVG, viewBox 0 0 200 360) de cada peça no estilo "fofo" da Arena: cabeça grande (centro 100,96),
// tronco y 138–258, pernas curtas, pés y ~330. Mão direita (do boneco) em (160,232); esquerda em (40,232).

const GOLD = "#f5c518";

const HEAD_HAND_ART: Record<string, () => ReactElement> = {
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
  hand_sheaf: () => (
    <g>
      <Grads colors={["#e3b941", "#c98a1c"]} />
      <g fill="none" strokeLinecap="round">
        {[-24, -14, -5, 5, 14, 24].map((a, i) => (
          <g key={a} transform={`rotate(${a} 160 258)`}>
            <path d="M160 258 L160 160" stroke={INK} strokeWidth="6" />
            <path d="M160 258 L160 160" stroke={i % 2 ? "#d9a21a" : "#e3b941"} strokeWidth="3" />
            {[0, 1, 2, 3].map((k) => (
              <ellipse key={k} cx={k % 2 ? 164 : 156} cy={166 + k * 9} rx="4.5" ry="8" transform={`rotate(${k % 2 ? 24 : -24} ${k % 2 ? 164 : 156} ${166 + k * 9})`} fill={F("#e3b941")} {...thin} />
            ))}
          </g>
        ))}
      </g>
      <path d="M140 232 Q160 242 180 232 L180 246 Q160 256 140 246 Z" fill={F("#c43a3a")} {...line} />
    </g>
  ),
  hand_tambourine: () => (
    <g>
      <Grads colors={["#b8642f", "#f4e6c4"]} />
      <circle cx="162" cy="196" r="30" fill={F("#b8642f")} {...line} />
      <circle cx="162" cy="196" r="22" fill={F("#f4e6c4")} {...thin} />
      <Shine d="M148 184 Q160 172 176 178 L164 198 Z" o={0.5} />
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <g key={a} transform={`rotate(${a} 162 196)`}>
          <circle cx="162" cy="170" r="4.2" fill={GOLD} stroke={INK} strokeWidth="1.3" />
        </g>
      ))}
      <path d="M180 220 Q196 238 184 262" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      <path d="M180 220 Q196 238 184 262" fill="none" stroke="#e5484d" strokeWidth="3" strokeLinecap="round" />
    </g>
  ),
  hand_tentpeg: () => (
    <g>
      <Grads colors={["#8c5e36", "#6b4226", "#cfd5de"]} />
      <rect x="155" y="142" width="10" height="130" rx="4" fill={F("#8c5e36")} {...line} />
      <rect x="132" y="126" width="56" height="26" rx="6" fill={F("#6b4226")} {...line} />
      <Shine d="M136 130 L184 130 L184 138 L136 138 Z" o={0.3} />
      <path d="M176 262 L190 262 L183 300 Z" fill={F("#8c5e36")} {...line} />
    </g>
  ),
  hand_alabaster: () => (
    <g>
      <Grads colors={["#f7f1e2", "#e8dcc2"]} />
      <path d="M146 246 Q138 222 150 204 L154 188 L166 188 L170 204 Q182 222 174 246 Q160 258 146 246 Z" fill={F("#f7f1e2")} {...line} />
      <rect x="152" y="176" width="16" height="14" rx="4" fill={F("#e8dcc2")} {...line} />
      <ellipse cx="160" cy="174" rx="12" ry="5" fill={F("#e8dcc2")} {...line} />
      <Shine d="M148 214 Q152 204 158 204 L156 240 Q148 236 148 214 Z" o={0.5} />
      <path d="M150 220 Q160 226 172 220" fill="none" stroke="#b8a77a" strokeWidth="2" />
      <path d="M186 192 Q190 200 186 206 Q182 200 186 192 Z" fill="#e86a9a" stroke={INK} strokeWidth="1.2" />
    </g>
  ),
  hand_cloth: () => (
    <g>
      <Grads colors={["#a84a8c", "#8a3a74"]} />
      <path d="M134 200 L186 196 L190 244 L136 250 Z" fill={F("#a84a8c")} {...line} />
      <path d="M134 200 L186 196 L184 208 L135 213 Z" fill={F("#8a3a74")} {...thin} />
      <path d="M138 226 L188 222 M138 238 L189 233" stroke="#6a2a58" strokeWidth="2" opacity="0.7" />
      <Shine d="M138 204 L168 202 L166 224 L140 226 Z" o={0.22} />
      <path d="M160 194 L160 252" stroke={GOLD} strokeWidth="5" opacity="0.9" />
    </g>
  ),
};

// evita aviso de import não usado nos temas de cor
void light;

/** Todas as peças (frente). */
export const ITEM_ART: Record<string, () => ReactElement> = { ...HEAD_HAND_ART, ...BODY_ART };

/** Capas que ficam atrás do corpo. */
export const ITEM_BACK = BACK_ART;
