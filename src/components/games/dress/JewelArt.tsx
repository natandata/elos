import type { ReactElement } from "react";
import { F, Grads, INK, dark, light, thin } from "./ArtKit";
import type { Params } from "@/lib/games/dress/items";

// Joias da boneca: brincos, colares e pulseiras (desenhados direto nas coordenadas do corpo, 200 x 360).
// `p.size`: "p" = pequeno, "g" = grande, ausente = médio.

type R = (p: Params) => ReactElement;
const scale = (p: Params): number => (p.size === "p" ? 0.78 : p.size === "g" ? 1.32 : 1);

const starPath = (cx: number, cy: number, r: number) => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.45;
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)}`);
  }
  return `M${pts.join(" L")} Z`;
};

/** Brinco nos dois lados: `draw(x, dir)`, com dir = -1 (esquerda) ou 1 (direita). */
const ears = (draw: (x: number, dir: -1 | 1) => ReactElement): ReactElement => (
  <g>
    {draw(74.5, -1)}
    {draw(125.5, 1)}
  </g>
);
const gemFill = (c: string, c2?: string) => c2 ?? light(c, 0.35);

export const EARS_ART: Record<string, R> = {
  studs: (p) => {
    const s = scale(p);
    return (
      <g>
        <Grads colors={[p.c]} />
        {ears((x) => (
          <g>
            <circle cx={x} cy={70} r={3.2 * s} fill={F(p.c)} {...thin} />
            {p.c2 ? <circle cx={x} cy={70} r={1.7 * s} fill={p.c2} /> : null}
            <circle cx={x - 0.9 * s} cy={69 - 0.8 * s} r={0.9 * s} fill="#fff" opacity="0.9" />
          </g>
        ))}
      </g>
    );
  },
  hoops: (p) => {
    const s = scale(p);
    return (
      <g>
        {ears((x) => (
          <g fill="none">
            <circle cx={x} cy={70 + 7 * s} r={7 * s} stroke={INK} strokeWidth="3.6" />
            <circle cx={x} cy={70 + 7 * s} r={7 * s} stroke={p.c} strokeWidth="2" />
            <path d={`M${x - 5 * s} ${70 + 4 * s} Q${x - 7 * s} ${70 + 9 * s} ${x - 3 * s} ${70 + 13 * s}`} stroke="#fff" strokeWidth="0.9" opacity="0.7" />
          </g>
        ))}
      </g>
    );
  },
  drops: (p) => {
    const s = scale(p);
    return (
      <g>
        <Grads colors={[p.c]} />
        {ears((x) => (
          <g>
            <circle cx={x} cy={70} r={1.8} fill={p.c} stroke={INK} strokeWidth="0.8" />
            <path d={`M${x} 71 L${x} ${70 + 8 * s}`} stroke={p.c} strokeWidth="1.2" />
            <path d={`M${x} ${70 + 8 * s} Q${x + 4.4 * s} ${70 + 15 * s} ${x} ${70 + 19 * s} Q${x - 4.4 * s} ${70 + 15 * s} ${x} ${70 + 8 * s} Z`} fill={gemFill(p.c, p.c2)} stroke={INK} strokeWidth="1" />
            <circle cx={x - 1.2 * s} cy={70 + 13 * s} r={1 * s} fill="#fff" opacity="0.85" />
          </g>
        ))}
      </g>
    );
  },
  chandelier: (p) => {
    const s = scale(p);
    return (
      <g>
        <Grads colors={[p.c]} />
        {ears((x) => (
          <g>
            <circle cx={x} cy={70} r={1.8} fill={p.c} stroke={INK} strokeWidth="0.8" />
            <path d={`M${x} 71 L${x} ${70 + 5 * s} M${x - 4 * s} ${70 + 8 * s} L${x + 4 * s} ${70 + 8 * s}`} stroke={p.c} strokeWidth="1.4" />
            {[-4, 0, 4].map((dx, i) => (
              <g key={dx}>
                <path d={`M${x + dx * s} ${70 + 8 * s} L${x + dx * s} ${70 + (i === 1 ? 17 : 14) * s}`} stroke={p.c} strokeWidth="0.9" />
                <circle cx={x + dx * s} cy={70 + (i === 1 ? 19.5 : 16.5) * s} r={2.5 * s} fill={gemFill(p.c, p.c2)} stroke={INK} strokeWidth="0.9" />
              </g>
            ))}
          </g>
        ))}
      </g>
    );
  },
  earflowers: (p) => {
    const s = scale(p);
    return (
      <g>
        {ears((x) => (
          <g>
            {[0, 72, 144, 216, 288].map((a) => (
              <circle key={a} cx={+(x + Math.cos((a * Math.PI) / 180) * 3.6 * s).toFixed(2)} cy={+(72 + Math.sin((a * Math.PI) / 180) * 3.6 * s).toFixed(2)} r={2.6 * s} fill={p.c} stroke={dark(p.c, 0.5)} strokeWidth="0.8" />
            ))}
            <circle cx={x} cy={72} r={2 * s} fill={p.c2 ?? "#f9d56e"} stroke="#a87a1a" strokeWidth="0.7" />
          </g>
        ))}
      </g>
    );
  },
  earstars: (p) => {
    const s = scale(p);
    return (
      <g>
        <Grads colors={[p.c]} />
        {ears((x) => (
          <g>
            <path d={starPath(x, 73, 5.6 * s)} fill={F(p.c)} stroke={INK} strokeWidth="1" strokeLinejoin="round" />
            {p.c2 ? <circle cx={x} cy={73} r={1.4 * s} fill={p.c2} /> : null}
          </g>
        ))}
      </g>
    );
  },
};

const chain = (d: string, c: string, w = 1.6) => (
  <g fill="none" strokeLinecap="round">
    <path d={d} stroke={INK} strokeWidth={w + 1.6} />
    <path d={d} stroke={c} strokeWidth={w} />
  </g>
);

export const NECK_ART: Record<string, R> = {
  choker: (p) => (
    <g>
      <Grads colors={[p.c]} />
      {chain("M90 97 Q100 104 110 97", p.c, 3)}
      <circle cx="100" cy="103" r="3" fill={gemFill(p.c, p.c2)} stroke={INK} strokeWidth="1" />
      <circle cx="99" cy="102" r="0.9" fill="#fff" opacity="0.85" />
    </g>
  ),
  pendant: (p) => {
    const d = 18 * scale(p);
    return (
      <g>
        <Grads colors={[p.c]} />
        {chain(`M88 101 Q100 ${100 + d} 112 101`, p.c)}
        <path d={`M100 ${100 + d} l4 5 l-4 9 l-4 -9 Z`} fill={gemFill(p.c, p.c2)} stroke={INK} strokeWidth="1.1" strokeLinejoin="round" />
        <circle cx="99" cy={100 + d + 5} r="1" fill="#fff" opacity="0.85" />
      </g>
    );
  },
  pearls: (p) => {
    const depth = 42 * scale(p);
    const n = 13;
    return (
      <g>
        {Array.from({ length: n }).map((_, i) => {
          const t = i / (n - 1);
          const x = 80 + t * 40;
          const y = 104 + Math.sin(t * Math.PI) * depth;
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={3.1} fill={p.c} stroke={INK} strokeWidth="0.9" />
              <circle cx={x - 0.9} cy={y - 0.9} r="0.9" fill="#fff" opacity="0.9" />
            </g>
          );
        })}
      </g>
    );
  },
  scarfneck: (p) => (
    <g>
      <Grads colors={[p.c]} />
      <path d="M84 99 Q100 112 116 99 L113 114 Q100 124 87 114 Z" fill={F(p.c)} stroke={dark(p.c, 0.55)} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M100 114 L92 140 L102 136 Z M100 114 L110 138 L104 140 Z" fill={F(dark(p.c, 0.1))} stroke={dark(p.c, 0.55)} strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="100" cy="114" r="3.6" fill={F(dark(p.c, 0.15))} stroke={dark(p.c, 0.55)} strokeWidth="1.1" />
    </g>
  ),
  bowtie: (p) => (
    <g>
      <Grads colors={[p.c]} />
      <path d="M100 106 L82 98 Q78 108 82 116 Z" fill={F(p.c)} stroke={dark(p.c, 0.55)} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M100 106 L118 98 Q122 108 118 116 Z" fill={F(p.c)} stroke={dark(p.c, 0.55)} strokeWidth="1.3" strokeLinejoin="round" />
      <rect x="95.5" y="101" width="9" height="10" rx="3" fill={F(dark(p.c, 0.15))} stroke={dark(p.c, 0.55)} strokeWidth="1.2" />
      <path d="M86 104 L94 106 M114 104 L106 106" stroke={light(p.c, 0.4)} strokeWidth="1" opacity="0.7" />
    </g>
  ),
  medallion: (p) => {
    const d = 32 * scale(p);
    const r = 7 * scale(p);
    return (
      <g>
        <Grads colors={[p.c]} />
        {chain(`M86 102 Q100 ${100 + d} 114 102`, p.c)}
        <circle cx="100" cy={100 + d + r * 0.6} r={r} fill={F(p.c)} stroke={INK} strokeWidth="1.3" />
        <circle cx="100" cy={100 + d + r * 0.6} r={r * 0.68} fill="none" stroke={p.c2 ?? dark(p.c, 0.35)} strokeWidth="1.2" />
        <path d={`M100 ${100 + d + r * 0.6 - r * 0.4} L100 ${100 + d + r * 0.6 + r * 0.4} M${100 - r * 0.28} ${100 + d + r * 0.6 - r * 0.1} L${100 + r * 0.28} ${100 + d + r * 0.6 - r * 0.1}`} stroke={p.c2 ?? dark(p.c, 0.35)} strokeWidth="1.2" strokeLinecap="round" />
      </g>
    );
  },
  layered: (p) => {
    const s = scale(p);
    return (
      <g>
        <Grads colors={[p.c]} />
        {chain(`M87 101 Q100 ${100 + 12 * s} 113 101`, p.c, 1.3)}
        {chain(`M85 102 Q100 ${100 + 24 * s} 115 102`, p.c, 1.3)}
        {chain(`M83 103 Q100 ${100 + 38 * s} 117 103`, p.c, 1.3)}
        <circle cx="100" cy={100 + 24 * s} r="2.6" fill={gemFill(p.c, p.c2)} stroke={INK} strokeWidth="0.9" />
        <path d={`M100 ${100 + 38 * s} l3.4 4.4 l-3.4 6.4 l-3.4 -6.4 Z`} fill={gemFill(p.c, p.c2)} stroke={INK} strokeWidth="1" strokeLinejoin="round" />
      </g>
    );
  },
};

/** Pulseira nos dois pulsos: `draw(x, dir)`. */
const wrists = (draw: (x: number, dir: -1 | 1) => ReactElement, only?: -1 | 1): ReactElement => (
  <g>
    {only !== 1 ? draw(56, -1) : null}
    {only !== -1 ? draw(144, 1) : null}
  </g>
);

export const WRIST_ART: Record<string, R> = {
  bangle: (p) => {
    const s = scale(p);
    return wrists((x) => (
      <g fill="none">
        <ellipse cx={x} cy={199} rx={7.4 * s} ry={2.8} stroke={INK} strokeWidth="4.8" />
        <ellipse cx={x} cy={199} rx={7.4 * s} ry={2.8} stroke={p.c} strokeWidth="3" />
        <path d={`M${x - 5 * s} 200.4 Q${x} 202.6 ${x + 5 * s} 200.4`} stroke="#fff" strokeWidth="0.9" opacity="0.7" />
      </g>
    ));
  },
  beads: (p) =>
    wrists((x) => (
      <g>
        {Array.from({ length: 8 }).map((_, i) => {
          const a = Math.PI * (0.05 + (i / 7) * 0.9);
          return <circle key={i} cx={+(x + Math.cos(a) * -7 * scale(p) + 0).toFixed(2)} cy={+(199 + Math.sin(a) * 2.8).toFixed(2)} r={2.1} fill={i % 2 ? (p.c2 ?? light(p.c, 0.4)) : p.c} stroke={INK} strokeWidth="0.7" />;
        })}
      </g>
    )),
  watch: (p) =>
    wrists((x) => (
      <g>
        <Grads colors={[p.c]} />
        <ellipse cx={x} cy={199} rx={7.6} ry={2.9} fill="none" stroke={INK} strokeWidth="5" />
        <ellipse cx={x} cy={199} rx={7.6} ry={2.9} fill="none" stroke={p.c2 ?? "#3a3f48"} strokeWidth="3.2" />
        <circle cx={x} cy={197.4} r={4.8 * scale(p)} fill={F(p.c)} stroke={INK} strokeWidth="1.2" />
        <circle cx={x} cy={197.4} r={3.4 * scale(p)} fill="#f7f4ea" />
        <path d={`M${x} 197.4 L${x} 195 M${x} 197.4 L${x + 1.8} 198.4`} stroke={INK} strokeWidth="0.9" strokeLinecap="round" />
      </g>
    ), -1),
  charm: (p) =>
    wrists((x, dir) => (
      <g>
        <ellipse cx={x} cy={199} rx={7.2} ry={2.6} fill="none" stroke={INK} strokeWidth="2.6" />
        <ellipse cx={x} cy={199} rx={7.2} ry={2.6} fill="none" stroke={p.c} strokeWidth="1.2" />
        {[-4, 0, 4].map((dx, i) => (
          <g key={dx}>
            <path d={`M${x + dx * dir} 201 L${x + dx * dir} ${204 + (i % 2) * 2}`} stroke={p.c} strokeWidth="0.9" />
            <circle cx={x + dx * dir} cy={205.4 + (i % 2) * 2} r={1.9 * scale(p)} fill={i === 1 ? (p.c2 ?? "#e5484d") : p.c} stroke={INK} strokeWidth="0.7" />
          </g>
        ))}
      </g>
    )),
  cuff: (p) =>
    wrists((x) => (
      <g>
        <Grads colors={[p.c]} />
        <path d={`M${x - 7.4} 195 Q${x} 199 ${x + 7.4} 195 L${x + 7.4} 203 Q${x} 207 ${x - 7.4} 203 Z`} fill={F(p.c)} stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
        <path d={`M${x - 6} 199 Q${x} 202.6 ${x + 6} 199`} fill="none" stroke={dark(p.c, 0.4)} strokeWidth="0.9" />
        <circle cx={x} cy={199.4} r={1.7 * scale(p)} fill={p.c2 ?? "#fff"} stroke={INK} strokeWidth="0.7" />
      </g>
    )),
  ribbonw: (p) =>
    wrists((x, dir) => (
      <g>
        <Grads colors={[p.c]} />
        <ellipse cx={x} cy={199} rx={7} ry={2.7} fill="none" stroke={INK} strokeWidth="4.4" />
        <ellipse cx={x} cy={199} rx={7} ry={2.7} fill="none" stroke={p.c} strokeWidth="2.6" />
        <path d={`M${x + dir * 7} 199 q${dir * 6} -6 ${dir * 6} 1 q${-dir * 3} 5 ${-dir * 6} -1 Z M${x + dir * 7} 199 q${dir * 5} 7 ${dir * 2} 11 q${-dir * 5} -3 ${-dir * 2} -11 Z`} fill={F(p.c)} stroke={dark(p.c, 0.55)} strokeWidth="0.9" strokeLinejoin="round" />
      </g>
    )),
};
