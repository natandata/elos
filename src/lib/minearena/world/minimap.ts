// Mapa de pergaminho: vista de cima do terreno em volta do jogador, desenhada a partir do gerador (sem precisar dos chunks).
import { SEA_LEVEL } from "../config/config";
import { type BiomeId, columnInfo } from "./worldgen";

const BIOME_RGB: Record<BiomeId, [number, number, number]> = {
  planicie: [112, 168, 64],
  floresta: [58, 128, 52],
  deserto: [222, 196, 120],
  montanha: [128, 128, 132],
  lago: [58, 118, 214],
  oasis: [92, 176, 84],
  savana: [186, 176, 76],
  libano: [42, 106, 74],
  hermom: [240, 244, 250],
  pantano: [78, 110, 62],
  taiga: [150, 190, 170],
  selva: [28, 110, 40],
  oceano: [30, 70, 160],
};

/** Imagem RGBA (w×w) do terreno em volta de (cx, cz), com `radius` blocos de cada lado. */
export function buildMap(seed: number, cx: number, cz: number, radius: number, w: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(w * w * 4);
  const step = (radius * 2) / w;
  for (let py = 0; py < w; py++) {
    for (let px = 0; px < w; px++) {
      const x = Math.floor(cx - radius + px * step);
      const z = Math.floor(cz - radius + py * step);
      const c = columnInfo(seed, x, z);
      let [r, g, b] = BIOME_RGB[c.biome];
      if (c.river || c.h <= SEA_LEVEL) {
        const depth = Math.min(1, (SEA_LEVEL - c.h) / 14);
        [r, g, b] = [58 - depth * 30, 118 - depth * 50, 214 - depth * 60];
      } else {
        const k = 0.78 + Math.min(0.4, (c.h - SEA_LEVEL) / 90);
        r *= k;
        g *= k;
        b *= k;
      }
      const i = (py * w + px) * 4;
      out[i] = r;
      out[i + 1] = g;
      out[i + 2] = b;
      out[i + 3] = 255;
    }
  }
  return out;
}
