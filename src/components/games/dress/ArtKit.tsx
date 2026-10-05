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
      {colors.map((c) => (
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
