import type { ReactElement } from "react";
import type { Params } from "@/lib/games/dress/items";
import { BACK_FAMILY, BODY_FAMILY } from "./BodyArt";
import { HEAD_ART } from "./HeadArt";
import { EARS_ART, NECK_ART } from "./JewelArt";
import { WRIST_ART } from "./JewelArt";
import { MORE_SHOES, MORE_TUNIC } from "./MoreBodyArt";
import { MORE_HAND } from "./MoreHandArt";

// Edição limitada do Madureira Shopping: cada peça usa o desenho de uma família já existente, com cores próprias e um brilho de estrelinhas por cima.

type Draw = (p: Params) => ReactElement;
type Box = { x: number; y: number; w: number; h: number };

/** Mesmas janelas de SLOT_VIEWBOX (PaperDoll). */
const BOX: Record<string, Box> = {
  head: { x: 38, y: 10, w: 124, h: 118 },
  tunic: { x: 36, y: 96, w: 128, h: 236 },
  mantle: { x: 22, y: 96, w: 156, h: 236 },
  shoes: { x: 56, y: 296, w: 88, h: 56 },
  hand: { x: 88, y: 80, w: 112, h: 200 },
  ears: { x: 52, y: 46, w: 96, h: 56 },
  neck: { x: 64, y: 82, w: 72, h: 92 },
  wrist: { x: 30, y: 172, w: 140, h: 52 },
};
/** Posições (frações da janela) e tamanhos das estrelinhas. */
const SPOTS: [number, number, number][] = [
  [0.14, 0.18, 1],
  [0.84, 0.12, 0.7],
  [0.5, 0.04, 0.55],
  [0.9, 0.55, 0.9],
  [0.08, 0.62, 0.6],
  [0.62, 0.86, 0.75],
  [0.3, 0.46, 0.5],
];

function Spark({ x, y, r, c }: { x: number; y: number; r: number; c: string }) {
  const d = `M${x} ${y - r} L${x + r * 0.22} ${y - r * 0.22} L${x + r} ${y} L${x + r * 0.22} ${y + r * 0.22} L${x} ${y + r} L${x - r * 0.22} ${y + r * 0.22} L${x - r} ${y} L${x - r * 0.22} ${y - r * 0.22} Z`;
  return (
    <g>
      <circle cx={x} cy={y} r={r * 0.9} fill={c} opacity="0.22" />
      <path d={d} fill="#ffffff" stroke={c} strokeWidth={r * 0.12} strokeLinejoin="round" />
    </g>
  );
}

function glam(slot: string, base: Draw, glow = "#ffd34d"): Draw {
  const b = BOX[slot];
  const unit = Math.min(b.w, b.h) * 0.075;
  return function Glam(p) {
    return (
      <g>
        {base(p)}
        {SPOTS.map(([fx, fy, s], i) => (
          <Spark key={i} x={b.x + b.w * fx} y={b.y + b.h * fy} r={unit * s} c={i % 2 ? (p.c3 ?? glow) : glow} />
        ))}
      </g>
    );
  };
}

const need = (d: Draw | undefined): Draw => d ?? (() => <g />);

export const LIMITED_ART: Record<string, Draw> = {
  "head:madcrown": glam("head", need(HEAD_ART.crown)),
  "head:aurora": glam("head", need(HEAD_ART.tiara), "#7cf0ff"),
  "tunic:galadress": glam("tunic", need(MORE_TUNIC.gown)),
  "tunic:starmaid": glam("tunic", need(MORE_TUNIC.mermaid), "#a78bfa"),
  "mantle:starcape": glam("mantle", need(BODY_FAMILY["mantle:cape"]), "#7cf0ff"),
  "shoes:crystal": glam("shoes", need(MORE_SHOES.kitten), "#7cf0ff"),
  "hand:starwand": glam("hand", need(MORE_HAND.wand), "#ff4fa3"),
  "ears:comet": glam("ears", need(EARS_ART.earstars), "#7cf0ff"),
  "neck:constel": glam("neck", need(NECK_ART.layered), "#a78bfa"),
  "wrist:auroracuff": glam("wrist", need(WRIST_ART.cuff), "#ff9ad5"),
};

/** A parte de trás da capa. */
export const LIMITED_BACK: Record<string, Draw> = {
  starcape: (p) => need(BACK_FAMILY.cape)(p),
};

