import type { ReactElement } from "react";
import { F, Gem, Grads, INK, Shine, dark, light, line, thin } from "./ArtKit";
import type { Params } from "@/lib/games/dress/items";

// Peças de mão (desenhadas ao redor de 160,232; o boneco desloca pra mão dele).

export const HAND_ART: Record<string, (p: Params) => ReactElement> = {
  none: () => <g />,

  staff: ({ c }) => (
    <g fill="none" strokeLinecap="round">
      <path d="M160 346 L160 128 Q160 100 182 106" stroke={INK} strokeWidth="13" />
      <path d="M160 346 L160 128 Q160 100 182 106" stroke={c} strokeWidth="8" />
      <path d="M157 330 L157 140" stroke={light(c, 0.45)} strokeWidth="2.4" opacity="0.8" />
    </g>
  ),

  sling: ({ c }) => (
    <g>
      <Grads colors={[c, "#bfc4cc"]} />
      <path d="M160 232 Q132 196 150 156 Q170 190 160 232" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      <path d="M160 232 Q132 196 150 156 Q170 190 160 232" fill="none" stroke={c} strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="150" cy="154" rx="11" ry="7" fill={F(c)} {...line} />
      <circle cx="150" cy="154" r="4.5" fill={F("#bfc4cc")} {...thin} />
    </g>
  ),

  harp: ({ c }) => (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      {["M186 130 Q148 128 146 240", "M186 130 L184 250", "M144 250 L190 254"].map((d) => (
        <g key={d}>
          <path d={d} stroke={INK} strokeWidth="13" />
          <path d={d} stroke={c} strokeWidth="8" />
          <path d={d} stroke="#fff" strokeWidth="1.6" opacity="0.5" transform="translate(-1.5 -1.5)" />
        </g>
      ))}
      <path d="M156 150 L156 248 M166 138 L166 250 M176 132 L175 251" stroke="#f5e3a1" strokeWidth="2.2" />
      <path d="M156 150 L156 248 M166 138 L166 250 M176 132 L175 251" stroke={INK} strokeWidth="0.8" opacity="0.5" />
    </g>
  ),

  trumpet: ({ c }) => (
    <g transform="translate(160 232) scale(0.72) translate(-160 -232)">
      <Grads colors={[c]} />
      <path d="M154 236 L176 158 L198 128 L202 150 L184 170 L168 242 Z" fill={F(c)} {...line} />
      <path d="M194 122 Q214 118 210 158 Q196 150 194 122 Z" fill={F(dark(c, 0.12))} {...line} />
    </g>
  ),

  sword: ({ c, c2 = "#b8832f" }) => (
    <g>
      <Grads colors={[c, c2]} />
      <path d="M154 130 L166 130 L166 214 L160 224 L154 214 Z" fill={F(c)} {...line} />
      <Shine d="M156 134 L160 134 L160 214 L156 210 Z" o={0.6} />
      <rect x="140" y="222" width="40" height="9" rx="4" fill={F(c2)} {...line} />
      <rect x="155" y="236" width="10" height="24" rx="4" fill={dark(c2, 0.45)} {...thin} />
      <circle cx="160" cy="264" r="6" fill={F(c2)} {...thin} />
    </g>
  ),

  scroll: ({ c, c2 = "#c9a266" }) => (
    <g>
      <rect x="146" y="196" width="34" height="48" rx="4" fill={c} {...line} />
      <rect x="142" y="190" width="42" height="10" rx="5" fill={c2} {...line} />
      <rect x="142" y="240" width="42" height="10" rx="5" fill={c2} {...line} />
      <path d="M152 208 L174 208 M152 218 L174 218 M152 228 L168 228" stroke={dark(c, 0.35)} strokeWidth="2" strokeLinecap="round" />
    </g>
  ),

  jar: ({ c }) => (
    <g>
      <Grads colors={[c, "#f5a623"]} />
      <path d="M140 232 Q132 202 148 196 L172 196 Q188 202 180 232 Q176 252 160 252 Q144 252 140 232 Z" fill={F(c)} {...line} />
      <rect x="148" y="188" width="24" height="10" rx="3" fill={F(c)} {...line} />
      <path d="M160 190 Q142 164 160 140 Q178 164 160 190 Z" fill={F("#f5a623")} {...line} />
      <path d="M160 182 Q152 166 160 154 Q168 166 160 182 Z" fill="#fde68a" />
    </g>
  ),

  scepter: ({ c, c2 = "#e5484d" }) => (
    <g>
      <Grads colors={[c]} />
      <rect x="155" y="128" width="10" height="190" rx="5" fill={F(c)} {...line} />
      <circle cx="160" cy="118" r="15" fill={F(c)} {...line} />
      <Gem x={160} y={118} r={6} c={c2} />
    </g>
  ),

  olive: ({ c }) => (
    <g>
      <Grads colors={[c]} />
      <path d="M160 260 Q182 200 166 140" fill="none" stroke={INK} strokeWidth="7" strokeLinecap="round" />
      <path d="M160 260 Q182 200 166 140" fill="none" stroke="#6b4a2a" strokeWidth="3.4" strokeLinecap="round" />
      {[[176, 160], [166, 178], [180, 196], [168, 214], [172, 144]].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx="12" ry="6" transform={`rotate(${i % 2 ? -35 : 35} ${x} ${y})`} fill={F(c)} {...thin} />
      ))}
    </g>
  ),

  jawbone: ({ c }) => (
    <g>
      <Grads colors={[c]} />
      <path d="M140 250 Q132 190 168 150 Q182 146 182 162 Q164 190 164 244 Q152 258 140 250 Z" fill={F(c)} {...line} />
      <path d="M164 160 l10 -3 M160 172 l10 -3 M158 184 l10 -3" stroke="#8a7f5e" strokeWidth="2.6" strokeLinecap="round" />
    </g>
  ),

  pitcher: ({ c }) => (
    <g>
      <Grads colors={[c]} />
      <path d="M140 232 Q134 206 148 198 L172 198 Q186 206 180 232 Q178 256 160 256 Q142 256 140 232 Z" fill={F(c)} {...line} />
      <path d="M150 198 Q150 180 160 180 Q170 180 170 198" fill="none" stroke={INK} strokeWidth="7" strokeLinecap="round" />
      <path d="M150 198 Q150 180 160 180 Q170 180 170 198" fill="none" stroke={c} strokeWidth="3.4" strokeLinecap="round" />
      <path d="M182 214 Q198 220 182 240" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      <Shine d="M146 214 Q150 204 156 204 L154 240 Q146 236 146 214 Z" o={0.3} />
    </g>
  ),

  phone: ({ c }) => (
    <g>
      <rect x="146" y="196" width="30" height="52" rx="6" fill="#1f2937" {...line} />
      <rect x="150" y="202" width="22" height="38" rx="2" fill={c} />
      <Shine d="M150 202 L172 202 L150 226 Z" o={0.4} />
    </g>
  ),

  sheaf: ({ c }) => (
    <g>
      <Grads colors={[c, dark(c, 0.2)]} />
      <g fill="none" strokeLinecap="round">
        {[-24, -14, -5, 5, 14, 24].map((a, i) => (
          <g key={a} transform={`rotate(${a} 160 258)`}>
            <path d="M160 258 L160 160" stroke={INK} strokeWidth="6" />
            <path d="M160 258 L160 160" stroke={i % 2 ? dark(c, 0.15) : c} strokeWidth="3" />
            {[0, 1, 2, 3].map((k) => (
              <ellipse key={k} cx={k % 2 ? 164 : 156} cy={166 + k * 9} rx="4.5" ry="8" transform={`rotate(${k % 2 ? 24 : -24} ${k % 2 ? 164 : 156} ${166 + k * 9})`} fill={F(c)} {...thin} />
            ))}
          </g>
        ))}
      </g>
      <path d="M140 232 Q160 242 180 232 L180 246 Q160 256 140 246 Z" fill={F("#c43a3a")} {...line} />
    </g>
  ),

  tambourine: ({ c }) => (
    <g>
      <Grads colors={[c, "#f4e6c4"]} />
      <circle cx="162" cy="196" r="30" fill={F(c)} {...line} />
      <circle cx="162" cy="196" r="22" fill={F("#f4e6c4")} {...thin} />
      <Shine d="M148 184 Q160 172 176 178 L164 198 Z" o={0.5} />
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <g key={a} transform={`rotate(${a} 162 196)`}>
          <circle cx="162" cy="170" r="4.2" fill="#f5c518" stroke={INK} strokeWidth="1.3" />
        </g>
      ))}
      <path d="M180 220 Q196 238 184 262" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      <path d="M180 220 Q196 238 184 262" fill="none" stroke="#e5484d" strokeWidth="3" strokeLinecap="round" />
    </g>
  ),

  tentpeg: ({ c }) => (
    <g>
      <Grads colors={[c, "#6b4226"]} />
      <rect x="155" y="142" width="10" height="130" rx="4" fill={F(c)} {...line} />
      <rect x="132" y="126" width="56" height="26" rx="6" fill={F("#6b4226")} {...line} />
      <Shine d="M136 130 L184 130 L184 138 L136 138 Z" o={0.3} />
      <path d="M176 262 L190 262 L183 300 Z" fill={F(c)} {...line} />
    </g>
  ),

  alabaster: ({ c }) => (
    <g>
      <Grads colors={[c, dark(c, 0.1)]} />
      <path d="M146 246 Q138 222 150 204 L154 188 L166 188 L170 204 Q182 222 174 246 Q160 258 146 246 Z" fill={F(c)} {...line} />
      <rect x="152" y="176" width="16" height="14" rx="4" fill={F(dark(c, 0.08))} {...line} />
      <ellipse cx="160" cy="174" rx="12" ry="5" fill={F(dark(c, 0.08))} {...line} />
      <Shine d="M148 214 Q152 204 158 204 L156 240 Q148 236 148 214 Z" o={0.5} />
      <path d="M150 220 Q160 226 172 220" fill="none" stroke={dark(c, 0.25)} strokeWidth="2" />
      <path d="M186 192 Q190 200 186 206 Q182 200 186 192 Z" fill="#e86a9a" stroke={INK} strokeWidth="1.2" />
    </g>
  ),

  cloth: ({ c }) => (
    <g>
      <Grads colors={[c, dark(c, 0.2)]} />
      <path d="M134 200 L186 196 L190 244 L136 250 Z" fill={F(c)} {...line} />
      <path d="M134 200 L186 196 L184 208 L135 213 Z" fill={F(dark(c, 0.2))} {...thin} />
      <path d="M138 226 L188 222 M138 238 L189 233" stroke={dark(c, 0.4)} strokeWidth="2" opacity="0.7" />
      <Shine d="M138 204 L168 202 L166 224 L140 226 Z" o={0.22} />
      <path d="M160 194 L160 252" stroke="#f5c518" strokeWidth="5" opacity="0.9" />
    </g>
  ),

  bouquet: ({ c }) => (
    <g>
      <Grads colors={["#3fa34d"]} />
      {[-18, 0, 18].map((a) => (
        <path key={a} d="M160 262 L160 180" transform={`rotate(${a} 160 262)`} stroke="#2e8b3d" strokeWidth="4" strokeLinecap="round" />
      ))}
      {[[142, 176], [160, 164], [178, 176], [150, 194], [170, 194]].map(([x, y], i) => (
        <g key={i}>
          {[0, 72, 144, 216, 288].map((a) => (
            <circle key={a} cx={x + Math.cos((a * Math.PI) / 180) * 7} cy={y + Math.sin((a * Math.PI) / 180) * 7} r="5.4" fill={i % 2 ? c : light(c, 0.2)} stroke={dark(c, 0.5)} strokeWidth="1" />
          ))}
          <circle cx={x} cy={y} r="4" fill="#f9d56e" stroke="#a87a1a" strokeWidth="1" />
        </g>
      ))}
      <path d="M146 242 Q160 252 174 242 L170 262 Q160 266 150 262 Z" fill="#fff" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
    </g>
  ),

  lamp: ({ c }) => (
    <g>
      <Grads colors={[c, "#f5a623"]} />
      <path d="M138 228 Q146 244 168 244 L186 228 Q172 222 158 222 Q144 222 138 228 Z" fill={F(c)} {...line} />
      <path d="M186 228 Q198 222 196 212" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      <path d="M186 228 Q198 222 196 212" fill="none" stroke={c} strokeWidth="3" strokeLinecap="round" />
      <path d="M142 224 Q128 220 130 232" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      <path d="M152 222 Q144 206 152 194 Q160 206 152 222 Z" fill={F("#f5a623")} {...thin} />
      <path d="M152 216 Q148 206 152 200 Q156 206 152 216 Z" fill="#fde68a" />
    </g>
  ),

  basket: ({ c }) => (
    <g>
      <Grads colors={[c]} />
      <path d="M140 224 Q160 196 180 224" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      <path d="M140 224 Q160 196 180 224" fill="none" stroke={c} strokeWidth="3" strokeLinecap="round" />
      <path d="M134 224 L186 224 L178 262 Q160 270 142 262 Z" fill={F(c)} {...line} />
      <path d="M138 236 L182 236 M141 248 L179 248 M150 224 L148 264 M160 224 L160 267 M170 224 L172 264" stroke={dark(c, 0.4)} strokeWidth="1.6" />
    </g>
  ),

  bread: ({ c }) => (
    <g>
      <Grads colors={[c]} />
      {[[146, 226], [172, 224], [158, 208]].map(([x, y], i) => (
        <g key={i}>
          <ellipse cx={x} cy={y} rx="16" ry="10" fill={F(c)} {...line} />
          <path d={`M${x - 8} ${y - 2} q8 -5 16 0 M${x - 6} ${y + 3} q6 -3 12 0`} fill="none" stroke={dark(c, 0.4)} strokeWidth="1.6" strokeLinecap="round" />
        </g>
      ))}
    </g>
  ),

  apple: ({ c }) => (
    <g>
      <Grads colors={[c]} />
      <path d="M160 206 Q142 196 140 216 Q140 240 160 244 Q180 240 180 216 Q178 196 160 206 Z" fill={F(c)} {...line} />
      <path d="M160 206 Q158 196 164 190" fill="none" stroke="#6b4a2a" strokeWidth="3" strokeLinecap="round" />
      <path d="M164 196 Q176 188 180 196 Q172 202 164 196 Z" fill="#3fa34d" stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
      <Shine d="M146 212 Q148 204 154 206 Q150 214 148 222 Z" o={0.5} />
    </g>
  ),
};
