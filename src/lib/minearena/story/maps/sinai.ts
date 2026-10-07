// Mapas da Fase 4 (continuação): o deserto de Sim com Refidim e o santuário (O Deserto), e o monte Sinai com o acampamento (Sinai e O Bezerro de Ouro).
import { B } from "../../blocks/blocks";
import { fbm2 } from "../../world/noise";
import type { StoryMapDef } from "../types";
import { type ChunkCtx } from "./builder";
import { type MapSpec, groundOf, makeMap, palm, tent } from "./gen";

// ============================================================ O DESERTO (maná, rocha, tabernáculo)
export const DESERTO = { camp: { x: 36, z: 38 }, manna: { x: 90, z: 56 }, rocha: { x: 132, z: 104 }, pool: { x: 132, z: 116 }, tab: { x: 92, z: 143 } };
/** O átrio do tabernáculo: 15 x 31 blocos, com a entrada ao norte (z0). */
export const TAB = { x0: 85, x1: 99, z0: 128, z1: 158 };

const deserto: MapSpec = {
  id: "deserto",
  name: "O deserto de Sim, Refidim e o santuário",
  w: 176,
  d: 176,
  seed: 9898,
  time: 0.14,
  bgm: "deserto",
  spawn: { x: 30, z: 26, yaw: Math.PI },
  zones: {
    start: { x: 30, z: 26, r: 5 },
    acampamento: { x: DESERTO.camp.x, z: DESERTO.camp.z, r: 12 },
    campo: { x: DESERTO.manna.x, z: DESERTO.manna.z, r: 11 },
    rocha: { x: 132, z: 118, r: 5 },
    tabernaculo: { x: DESERTO.tab.x, z: DESERTO.tab.z, r: 14 },
  },
  base: 24,
  amp: 2,
  scale: 36,
  flat: [
    { x: DESERTO.camp.x, z: DESERTO.camp.z, r: 12, h: 24 },
    { x: 30, z: 26, r: 6, h: 24 },
    { x: DESERTO.manna.x, z: DESERTO.manna.z, r: 13, h: 24 },
    { x: 132, z: 117, r: 7, h: 24 },
    { x: DESERTO.tab.x, z: DESERTO.tab.z, r: 22, h: 24 },
  ],
  surf: (x, z, k) => {
    k.top = B.sand;
    k.sub = B.sandstone;
    // a rocha de Horebe, em Refidim
    const d = Math.hypot(x - DESERTO.rocha.x, z - DESERTO.rocha.z);
    if (d < 8) {
      k.h = Math.max(k.h, 24 + Math.round(7 * (1 - d / 8)));
      k.top = B.stone;
      k.sub = B.stone;
      return;
    }
    // afloramentos de pedra, longe dos lugares da história
    if (fbm2(9898 + 7, x / 22, z / 22, 2) > 0.7 && Math.hypot(x - DESERTO.tab.x, z - DESERTO.tab.z) > 26 && Math.hypot(x - DESERTO.camp.x, z - DESERTO.camp.z) > 16 && Math.hypot(x - DESERTO.manna.x, z - DESERTO.manna.z) > 16) {
      k.top = B.stone;
      k.sub = B.stone;
    }
  },
  tree: () => null,
  // o maná: pequenos flocos brancos cobrindo o chão do campo
  cover: (x, z, r) => (Math.hypot(x - DESERTO.manna.x, z - DESERTO.manna.z) < 10.5 && r < 0.3 ? B.snow : 0),
  extra: (c: ChunkCtx) => {
    const { x, z } = DESERTO.camp;
    for (const [dx, dz] of [[-9, -6], [8, -7], [-10, 5], [9, 6], [0, -11], [-2, 10]]) tent(c, x + dx - 2, 24, z + dz - 2);
    for (const [px, pz] of [[62, 30], [70, 78], [18, 64], [112, 82], [150, 132], [60, 118], [140, 60]]) palm(c, px, groundOf(deserto, px, pz), pz, 6);
  },
};
export const DESERTO_MAP: StoryMapDef = makeMap(deserto);

// ============================================================ O SINAI
export const SINAI = { camp: { x: 88, z: 44 }, mount: { x: 88, z: 146 }, lavar: { x: 40, z: 60 }, tenda: { x: 146, z: 56 }, calf: { x: 88, z: 52 }, radius: 52, top: 42 };

const sinai: MapSpec = {
  id: "sinai",
  name: "O monte Sinai",
  w: 176,
  d: 208,
  seed: 10101,
  time: 0.14,
  bgm: "sinai",
  spawn: { x: 88, z: 16, yaw: Math.PI },
  zones: {
    start: { x: 88, z: 16, r: 5 },
    acampamento: { x: SINAI.camp.x, z: SINAI.camp.z, r: 12 },
    lavar: { x: SINAI.lavar.x, z: SINAI.lavar.z, r: 6 },
    limite: { x: 88, z: 92, r: 9 },
    meio: { x: 88, z: 114, r: 6 },
    cume: { x: SINAI.mount.x, z: SINAI.mount.z, r: 5 },
    tenda: { x: SINAI.tenda.x, z: SINAI.tenda.z, r: 6 },
  },
  base: 24,
  amp: 2,
  scale: 38,
  flat: [
    { x: SINAI.camp.x, z: SINAI.camp.z, r: 14, h: 24 },
    { x: 88, z: 16, r: 6, h: 24 },
    { x: SINAI.tenda.x, z: SINAI.tenda.z, r: 8, h: 24 },
    { x: 88, z: 92, r: 10, h: 24 },
  ],
  surf: (x, z, k) => {
    k.top = B.sand;
    k.sub = B.sandstone;
    // o ribeiro onde o povo lava as vestes: uma poça rasa
    const dp = Math.hypot(x - SINAI.lavar.x, z - SINAI.lavar.z);
    if (dp < 6) {
      k.h = 24 - Math.round(2 * Math.min(1, (6 - dp) / 2));
      k.water = k.h < 23 ? 23 : 0;
      return;
    }
    // o monte: cone suave (≈ 1 bloco de subida a cada 2,6 passos) com um topo plano onde Moisés fala com Deus
    const dm = Math.hypot(x - SINAI.mount.x, z - SINAI.mount.z);
    if (dm < SINAI.radius) {
      const t = Math.min(1, (SINAI.radius - dm) / (SINAI.radius - 5));
      k.h = Math.max(k.h, 24 + Math.round((SINAI.top - 24) * t));
      if (t > 0.3) {
        k.top = B.stone;
        k.sub = B.stone;
      }
    }
  },
  tree: () => null,
  cover: () => 0,
  extra: (c: ChunkCtx) => {
    const { x, z } = SINAI.camp;
    for (const [dx, dz] of [[-12, -4], [12, -4], [-8, -10], [8, -10], [0, -13], [-14, 4], [14, 4]]) tent(c, x + dx - 2, 24, z + dz - 2);
    // a tenda da congregação, fora do acampamento
    tent(c, SINAI.tenda.x - 2, 24, SINAI.tenda.z - 2);
    for (const [px, pz] of [[30, 30], [140, 24], [20, 100], [150, 92], [56, 24]]) palm(c, px, groundOf(sinai, px, pz), pz, 6);
  },
};
export const SINAI_MAP: StoryMapDef = makeMap(sinai);
