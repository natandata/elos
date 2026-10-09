import type { ReactElement } from "react";
import { F, Gem, Grads, INK, Shine, dark, light, line, thin } from "./ArtKit";
import type { Params } from "@/lib/games/dress/items";

// Mais coisas para segurar (desenhadas ao redor de 160,232; a boneca desloca pra mão dela).

type R = (p: Params) => ReactElement;

export const MORE_HAND: Record<string, R> = {
  bag: ({ c }) => (
    <g>
      <Grads colors={[c]} />
      <path d="M144 240 Q146 208 160 208 Q174 208 176 240" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      <path d="M144 240 Q146 208 160 208 Q174 208 176 240" fill="none" stroke={dark(c, 0.25)} strokeWidth="3" strokeLinecap="round" />
      <path d="M130 238 L190 238 L184 282 Q160 290 136 282 Z" fill={F(c)} {...line} />
      <path d="M134 252 Q160 262 186 252" fill="none" stroke={dark(c, 0.4)} strokeWidth="1.6" />
      <circle cx="160" cy="254" r="5" fill="#f5c518" stroke={INK} strokeWidth="1.3" />
      <Shine d="M136 242 Q150 238 158 242 L152 270 L140 272 Z" o={0.3} />
    </g>
  ),
  clutch: ({ c }) => (
    <g>
      <Grads colors={[c]} />
      <rect x="130" y="222" width="60" height="34" rx="6" fill={F(c)} {...line} />
      <path d="M130 228 Q160 250 190 228" fill={F(light(c, 0.1))} {...thin} />
      <circle cx="160" cy="240" r="4.6" fill="#f5c518" stroke={INK} strokeWidth="1.3" />
      <Shine d="M134 226 L156 226 L146 244 L134 244 Z" o={0.3} />
    </g>
  ),
  fan: ({ c, c2 }) => {
    const b = c2 ?? light(c, 0.55);
    const blades = [-62, -42, -22, -2, 18, 38, 58];
    return (
      <g>
        <Grads colors={[c, b]} />
        {blades.map((a, i) => (
          <path key={a} d="M160 250 L146 168 Q160 160 174 168 Z" transform={`rotate(${a} 160 250)`} fill={F(i % 2 ? b : c)} stroke={dark(c, 0.5)} strokeWidth="1.2" strokeLinejoin="round" />
        ))}
        <circle cx="160" cy="250" r="5" fill={dark(c, 0.4)} stroke={INK} strokeWidth="1.2" />
        <path d="M160 250 L160 270" stroke={INK} strokeWidth="5" strokeLinecap="round" />
        <path d="M160 250 L160 270" stroke={dark(c, 0.3)} strokeWidth="2.6" strokeLinecap="round" />
      </g>
    );
  },
  parasol: ({ c }) => (
    <g>
      <Grads colors={[c]} />
      <path d="M160 184 L160 268 Q160 280 150 276" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      <path d="M160 184 L160 268 Q160 280 150 276" fill="none" stroke="#b8924a" strokeWidth="3" strokeLinecap="round" />
      <path d="M100 196 Q106 136 160 130 Q214 136 220 196 Q202 182 190 196 Q175 182 160 196 Q145 182 130 196 Q118 182 100 196 Z" fill={F(c)} {...line} />
      <path d="M160 130 L160 196 M130 196 Q132 160 160 132 M190 196 Q188 160 160 132" fill="none" stroke={dark(c, 0.3)} strokeWidth="1.4" opacity="0.6" />
      <Shine d="M112 190 Q118 150 150 138 Q130 164 126 190 Z" o={0.34} />
    </g>
  ),
  mirror: ({ c }) => (
    <g>
      <Grads colors={[c]} />
      <path d="M160 224 L160 268" stroke={INK} strokeWidth="9" strokeLinecap="round" />
      <path d="M160 224 L160 268" stroke={c} strokeWidth="5.4" strokeLinecap="round" />
      <circle cx="160" cy="196" r="28" fill={F(c)} {...line} />
      <circle cx="160" cy="196" r="21" fill="#d6ecff" stroke={dark(c, 0.5)} strokeWidth="1.6" />
      <path d="M146 184 Q154 176 166 178 L150 200 Z" fill="#fff" opacity="0.75" />
      <Gem x={160} y={166} r={3.6} c="#e5484d" />
    </g>
  ),
  candle: ({ c }) => (
    <g>
      <Grads colors={[c, "#c9ced6"]} />
      <ellipse cx="160" cy="268" rx="24" ry="6" fill={F("#c9ced6")} {...thin} />
      <path d="M152 218 L168 218 L170 266 Q160 270 150 266 Z" fill={F(c)} {...line} />
      <path d="M158 206 Q150 190 160 176 Q170 190 162 206 Z" fill="#f5a623" stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M160 202 Q156 192 160 184 Q164 192 160 202 Z" fill="#fde68a" />
      <path d="M160 216 L160 208" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M154 232 Q150 244 154 256" fill="none" stroke="#fff" strokeWidth="1.4" opacity="0.5" />
    </g>
  ),
  book: ({ c }) => (
    <g>
      <Grads colors={[c]} />
      <path d="M134 214 L184 210 L184 266 L134 270 Z" fill="#f7f1e2" {...thin} />
      <path d="M130 212 L180 208 L180 264 L130 268 Z" fill={F(c)} {...line} />
      <path d="M138 216 L176 213 M138 260 L176 257" stroke={dark(c, 0.4)} strokeWidth="1" opacity="0.6" />
      <path d="M155 224 L155 252 M146 233 L164 232" stroke="#f5c518" strokeWidth="3" strokeLinecap="round" />
      <Shine d="M134 216 L150 214 L146 262 L134 264 Z" o={0.25} />
    </g>
  ),
  balloon: ({ c }) => (
    <g>
      <Grads colors={[c]} />
      <path d="M160 242 Q156 220 164 196" fill="none" stroke="#9aa3b0" strokeWidth="1.6" />
      <path d="M170 176 Q150 140 134 160 Q122 178 150 196 L170 214 L190 196 Q218 178 206 160 Q190 140 170 176 Z" transform="translate(-4 -20)" fill={F(c)} {...line} />
      <path d="M150 154 Q144 148 140 156" fill="none" stroke="#fff" strokeWidth="2.4" opacity="0.7" strokeLinecap="round" />
      <path d="M164 196 L158 204 L168 204 Z" fill={dark(c, 0.2)} />
    </g>
  ),
  wand: ({ c, c2 }) => {
    const s = c2 ?? "#f5c518";
    const pts: string[] = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 16 : 7;
      const a = (i * Math.PI) / 5 - Math.PI / 2;
      pts.push(`${(184 + Math.cos(a) * r).toFixed(1)} ${(190 + Math.sin(a) * r).toFixed(1)}`);
    }
    return (
      <g>
        <Grads colors={[c, s]} />
        <path d="M150 268 L180 198" stroke={INK} strokeWidth="8" strokeLinecap="round" />
        <path d="M150 268 L180 198" stroke={c} strokeWidth="4.4" strokeLinecap="round" />
        <path d={`M${pts.join(" L")} Z`} fill={F(s)} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
        <g fill="#fff" opacity="0.8">
          <circle cx="206" cy="172" r="2" />
          <circle cx="168" cy="168" r="1.6" />
          <circle cx="204" cy="212" r="1.6" />
        </g>
      </g>
    );
  },
  teacup: ({ c }) => (
    <g>
      <Grads colors={[c]} />
      <ellipse cx="160" cy="258" rx="28" ry="6" fill={F("#fbfbfb")} {...thin} />
      <path d="M138 226 L182 226 Q180 252 160 254 Q140 252 138 226 Z" fill={F("#fbfbfb")} {...line} />
      <path d="M138 232 Q160 240 182 232" fill="none" stroke={c} strokeWidth="3.4" />
      <path d="M182 232 Q198 232 194 244 Q190 250 180 248" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      <path d="M182 232 Q198 232 194 244 Q190 250 180 248" fill="none" stroke="#fbfbfb" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M150 220 q-4 -8 0 -14 M162 220 q-4 -8 0 -14 M172 220 q-4 -8 0 -14" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
    </g>
  ),
};
