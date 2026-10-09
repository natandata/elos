import type { ReactElement } from "react";
import { F, Gem, Grads, INK, Shine, dark, light, line, thin } from "./ArtKit";
import type { Params } from "@/lib/games/dress/items";

// Mais chapéus, laços e coroas (desenhados na escala grande da cabeça; a boneca encaixa em HEAD_T).

type R = (p: Params) => ReactElement;

const star = (cx: number, cy: number, r: number) => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.45;
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)}`);
  }
  return `M${pts.join(" L")} Z`;
};

export const MORE_HEAD: Record<string, R> = {
  bow: ({ c }) => (
    <g>
      <Grads colors={[c]} />
      <path d="M58 80 Q100 46 142 80" fill="none" stroke={INK} strokeWidth="8" strokeLinecap="round" />
      <path d="M58 80 Q100 46 142 80" fill="none" stroke={dark(c, 0.15)} strokeWidth="4.5" strokeLinecap="round" />
      <path d="M118 50 Q146 22 156 50 Q148 74 118 50 Z" fill={F(c)} {...line} />
      <path d="M118 50 Q92 22 82 50 Q90 74 118 50 Z" fill={F(c)} {...line} />
      <path d="M118 50 L140 70 L124 76 Z" fill={F(dark(c, 0.15))} {...thin} />
      <path d="M118 50 L96 70 L112 76 Z" fill={F(dark(c, 0.15))} {...thin} />
      <circle cx="118" cy="50" r="7" fill={F(dark(c, 0.1))} {...thin} />
      <Shine d="M122 38 Q138 28 148 40 Q136 44 124 48 Z" o={0.4} />
    </g>
  ),
  headband: ({ c }) => (
    <g>
      <Grads colors={[c]} />
      <path d="M56 92 Q58 40 100 38 Q142 40 144 92" fill="none" stroke={INK} strokeWidth="10" strokeLinecap="round" />
      <path d="M56 92 Q58 40 100 38 Q142 40 144 92" fill="none" stroke={c} strokeWidth="6.4" strokeLinecap="round" />
      <path d="M64 70 Q76 48 98 44" fill="none" stroke="#fff" strokeWidth="1.6" opacity="0.5" strokeLinecap="round" />
    </g>
  ),
  hairclip: ({ c }) => (
    <g>
      <Grads colors={[c, dark(c, 0.2)]} />
      <g transform="translate(128 62) rotate(18)">
        <ellipse cx="-11" cy="-5" rx="11" ry="8" transform="rotate(-24 -11 -5)" fill={F(c)} {...thin} />
        <ellipse cx="11" cy="-5" rx="11" ry="8" transform="rotate(24 11 -5)" fill={F(c)} {...thin} />
        <ellipse cx="-8" cy="7" rx="8" ry="5.4" transform="rotate(20 -8 7)" fill={F(dark(c, 0.15))} {...thin} />
        <ellipse cx="8" cy="7" rx="8" ry="5.4" transform="rotate(-20 8 7)" fill={F(dark(c, 0.15))} {...thin} />
        <circle cx="-11" cy="-5" r="3" fill="#fff" opacity="0.6" />
        <circle cx="11" cy="-5" r="3" fill="#fff" opacity="0.6" />
        <rect x="-2" y="-9" width="4" height="20" rx="2" fill="#3a2a1c" />
        <path d="M-1 -9 Q-8 -20 -12 -18 M1 -9 Q8 -20 12 -18" fill="none" stroke="#3a2a1c" strokeWidth="1.4" strokeLinecap="round" />
      </g>
    </g>
  ),
  sunhat: ({ c }) => (
    <g>
      <Grads colors={["#e6c98a", c]} />
      <path d="M12 82 Q100 46 188 82 Q100 112 12 82 Z" fill={F("#e6c98a")} {...line} />
      <path d="M60 78 Q58 30 100 28 Q142 30 140 78 Q100 90 60 78 Z" fill={F("#e6c98a")} {...line} />
      <path d="M60 70 Q100 84 140 70 L140 78 Q100 92 60 78 Z" fill={F(c)} {...thin} />
      <path d="M118 74 q14 -4 12 8 q-4 8 -12 -8 Z M118 74 q-10 -10 -14 0 q6 8 14 0 Z" fill={F(c)} {...thin} />
      <path d="M22 80 Q100 56 178 80 M40 84 Q100 66 160 84" fill="none" stroke="#b8924a" strokeWidth="1.2" opacity="0.6" />
      <Shine d="M70 50 Q80 36 100 34 L92 56 Z" o={0.4} />
    </g>
  ),
  beret: ({ c }) => (
    <g>
      <Grads colors={[c]} />
      <path d="M52 76 Q50 42 102 40 Q152 40 148 70 Q120 82 70 82 Q56 82 52 76 Z" fill={F(c)} {...line} />
      <path d="M56 78 Q104 90 146 72" fill="none" stroke={dark(c, 0.4)} strokeWidth="3" strokeLinecap="round" />
      <path d="M100 40 L102 30" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      <path d="M100 40 L102 30" stroke={dark(c, 0.25)} strokeWidth="3" strokeLinecap="round" />
      <Shine d="M64 56 Q80 44 102 44 L92 62 Z" o={0.36} />
    </g>
  ),
  stars: ({ c }) => (
    <g>
      <Grads colors={[c]} />
      <path d="M60 84 Q100 52 140 84" fill="none" stroke={INK} strokeWidth="7" strokeLinecap="round" />
      <path d="M60 84 Q100 52 140 84" fill="none" stroke={c} strokeWidth="4" strokeLinecap="round" />
      {[[68, 74, 9], [82, 58, 11], [100, 48, 14], [118, 58, 11], [132, 74, 9]].map(([x, y, r], i) => (
        <path key={i} d={star(x, y, r)} fill={F(c)} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      ))}
      <circle cx="98" cy="46" r="2.4" fill="#fff" opacity="0.8" />
    </g>
  ),
  halo: ({ c }) => (
    <g>
      <ellipse cx="100" cy="42" rx="40" ry="11" fill="none" stroke={c} strokeWidth="14" opacity="0.25" />
      <ellipse cx="100" cy="42" rx="38" ry="10" fill="none" stroke={INK} strokeWidth="9" />
      <ellipse cx="100" cy="42" rx="38" ry="10" fill="none" stroke={c} strokeWidth="5.4" />
      <path d="M72 38 Q100 32 128 38" fill="none" stroke="#fff" strokeWidth="1.6" opacity="0.7" strokeLinecap="round" />
    </g>
  ),
  pearlband: ({ c }) => (
    <g>
      <path d="M58 84 Q100 50 142 84" fill="none" stroke="#caa56a" strokeWidth="2" />
      {Array.from({ length: 9 }).map((_, i) => {
        const t = i / 8;
        const x = 58 + t * 84;
        const y = 84 - Math.sin(t * Math.PI) * 30 + (t < 0.5 ? 0 : 0);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={i === 4 ? 6 : 4.4} fill={c} stroke={INK} strokeWidth="1.1" />
            <circle cx={x - 1.3} cy={y - 1.4} r="1.4" fill="#fff" opacity="0.85" />
          </g>
        );
      })}
    </g>
  ),
  feather: ({ c }) => (
    <g>
      <Grads colors={[c]} />
      <path d="M58 86 Q100 52 142 86" fill="none" stroke={INK} strokeWidth="8" strokeLinecap="round" />
      <path d="M58 86 Q100 52 142 86" fill="none" stroke={dark(c, 0.3)} strokeWidth="4.4" strokeLinecap="round" />
      <path d="M126 70 Q150 30 168 6 Q176 40 150 66 Z" fill={F(c)} {...line} />
      <path d="M128 68 Q152 36 168 8" fill="none" stroke={dark(c, 0.45)} strokeWidth="1.6" />
      <path d="M140 54 l10 2 M146 44 l9 4 M152 32 l8 6 M136 62 l8 0" stroke={dark(c, 0.35)} strokeWidth="1.2" />
      <Gem x={126} y={72} r={4.4} c="#e5484d" />
    </g>
  ),
  fascinator: ({ c }) => (
    <g>
      <Grads colors={[c]} />
      <g transform="rotate(-18 126 58)">
        <ellipse cx="126" cy="56" rx="26" ry="10" fill={F(c)} {...line} />
        <path d="M112 54 q14 -12 28 0" fill="none" stroke={dark(c, 0.3)} strokeWidth="1.6" />
        <g>
          {[0, 72, 144, 216, 288].map((a) => (
            <circle key={a} cx={+(126 + Math.cos((a * Math.PI) / 180) * 7).toFixed(2)} cy={+(46 + Math.sin((a * Math.PI) / 180) * 7).toFixed(2)} r="5" fill={light(c, 0.35)} stroke={dark(c, 0.5)} strokeWidth="1" />
          ))}
          <circle cx="126" cy="46" r="3.6" fill="#f9d56e" stroke="#a87a1a" strokeWidth="0.9" />
        </g>
        <path d="M148 58 Q168 70 160 94 M140 62 Q152 80 142 98" fill="none" stroke={dark(c, 0.4)} strokeWidth="1.2" opacity="0.7" />
      </g>
    </g>
  ),
};
