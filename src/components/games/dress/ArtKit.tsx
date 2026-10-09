import type { ReactElement } from "react";

// Ferramentas de desenho do "Vista o Herói": contorno escuro, degradê e brilho (estilo da Arena dos Heróis).

export const INK = "#2b1a10";
export const line = { stroke: INK, strokeWidth: 3, strokeLinejoin: "round", strokeLinecap: "round" } as const;
export const thin = { stroke: INK, strokeWidth: 1.8, strokeLinejoin: "round", strokeLinecap: "round" } as const;

function mix(hex: string, t: number, to: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.round(v + (to - v) * t);
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
export const light = (c: string, t = 0.38) => mix(c, t, 255);
export const dark = (c: string, t = 0.32) => mix(c, t, 0);

const gid = (c: string) => `kg${c.slice(1)}`;
/** Preenchimento em degradê (claro em cima à esquerda, escuro embaixo à direita). */
export const F = (c: string) => `url(#${gid(c)})`;

/** Declara os degradês usados por uma peça (ids iguais têm conteúdo igual, então repetir é seguro). */
export function Grads({ colors }: { colors: string[] }): ReactElement {
  return (
    <defs>
      {[...new Set(colors)].map((c) => (
        <linearGradient key={c} id={gid(c)} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor={light(c)} />
          <stop offset="0.5" stopColor={c} />
          <stop offset="1" stopColor={dark(c)} />
        </linearGradient>
      ))}
    </defs>
  );
}

/** Brilho suave (faixa clara) por cima de uma forma. */
export const Shine = ({ d, o = 0.28 }: { d: string; o?: number }) => <path d={d} fill="#fff" opacity={o} stroke="none" />;

/** Pedra preciosa com brilho. */
export function Gem({ x, y, r = 4, c = "#e5484d" }: { x: number; y: number; r?: number; c?: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={c} stroke={INK} strokeWidth="1.4" />
      <circle cx={x - r * 0.3} cy={y - r * 0.3} r={r * 0.32} fill="#fff" opacity="0.85" />
    </g>
  );
}

/** Traço fino da cor da própria peça (mais suave que o contorno preto). */
export const edge = (c: string, w = 1.5) => ({ stroke: dark(c, 0.55), strokeWidth: w, strokeLinejoin: "round", strokeLinecap: "round" }) as const;

// Silhueta do corpo (viewBox 0 0 200 360): cabeça (100,62), ombros y 108, cintura y 172, quadril y 200, pés y 336.
/** Vestido: corpete + saia até acima do tornozelo. */
export const DRESS = "M71 108 Q85 114 93 107 L107 107 Q115 114 129 108 L128 150 Q126 164 124 172 L152 310 Q100 326 48 310 L76 172 Q74 164 72 150 Z";
export const SLEEVE_L = "M71 108 Q58 118 55 160 L67 162 Q70 134 80 120 Z";
export const SLEEVE_R = "M129 108 Q142 118 145 160 L133 162 Q130 134 120 120 Z";
export const TORSO = "M72 108 Q100 102 128 108 L126 150 Q124 164 122 172 L120 200 L80 200 L78 172 Q76 164 74 150 Z";
