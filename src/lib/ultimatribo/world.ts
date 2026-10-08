// O mapa de A Última Tribo: gerado por semente, igual para todos da mesma partida.
// Só dados e geometria (colisão, linha de visão, caminho). Quem desenha é o render.ts.
import { LORE } from "./data/lore";

export const HALF = 240;
export const NAV_CELL = 3;
export const NAV_N = Math.ceil((HALF * 2) / NAV_CELL);

export type Box = { x0: number; z0: number; x1: number; z1: number };
export type Circle = { x: number; z: number; r: number };

export type BuildingKind = "predio" | "casa" | "mercado" | "hospital" | "delegacia" | "igreja" | "torre" | "celeiro" | "silo" | "fabrica" | "galpao" | "conteiner" | "muro";
export type Building = Box & { kind: BuildingKind; h: number; color: number };

export type PropKind = "arvore" | "pinheiro" | "pedra" | "carro" | "tenda" | "fardo" | "barril" | "lapide" | "fogueira" | "cerca" | "poste" | "plantacao";
export type Prop = { kind: PropKind; x: number; z: number; rot: number; s: number; color: number };

export type ZoneKey = "cidade" | "floresta" | "fazenda" | "igreja" | "rodovia" | "fabrica" | "acampamento" | "ermo";
export type Zone = Box & { key: ZoneKey; name: string };

export type Container = { id: number; x: number; z: number; table: string; opened: boolean; kind: "caixa" | "carro" | "mochila"; items?: Record<string, number> };
export type LoreSpot = { id: number; lore: string; x: number; z: number; taken: boolean };

export type World = {
  seed: number;
  zones: Zone[];
  buildings: Building[];
  props: Prop[];
  boxes: Box[];
  circles: Circle[];
  circleGrid: Map<number, Circle[]>;
  containers: Container[];
  lore: LoreSpot[];
  spawns: { x: number; z: number }[];
  nav: Uint8Array;
};

/** Sorteio com semente (mulberry32): o mesmo mapa para todo mundo. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const ZONES: Zone[] = [
  { key: "cidade", name: "Cidade Abandonada", x0: -40, z0: -225, x1: 225, z1: -30 },
  { key: "floresta", name: "Floresta", x0: -235, z0: -225, x1: -60, z1: -25 },
  { key: "rodovia", name: "Rodovia", x0: -HALF, z0: -12, x1: HALF, z1: 12 },
  { key: "fazenda", name: "Fazenda", x0: -230, z0: 35, x1: -90, z1: 195 },
  { key: "igreja", name: "Igreja Abandonada", x0: -50, z0: 85, x1: 30, z1: 165 },
  { key: "fabrica", name: "Fábrica", x0: 115, z0: 30, x1: 232, z1: 145 },
  { key: "acampamento", name: "Acampamento de Sobreviventes", x0: 35, z0: 160, x1: 105, z1: 225 },
];

export function zoneAt(x: number, z: number): Zone | null {
  // a rodovia cruza tudo: testa as áreas específicas primeiro
  for (const zn of ZONES) if (zn.key !== "rodovia" && x >= zn.x0 && x <= zn.x1 && z >= zn.z0 && z <= zn.z1) return zn;
  const road = ZONES[2];
  return z >= road.z0 && z <= road.z1 ? road : null;
}

const gridKey = (cx: number, cz: number) => (cx + 64) * 256 + (cz + 64);
const CG = 12;

export function buildWorld(seed: number): World {
  const r = rng(seed);
  const buildings: Building[] = [];
  const props: Prop[] = [];
  const circles: Circle[] = [];
  const containers: Container[] = [];
  const range = (a: number, b: number) => a + r() * (b - a);
  const pick = <T,>(l: readonly T[]) => l[Math.floor(r() * l.length)];
  let cid = 0;
  const crate = (x: number, z: number, table: string, kind: Container["kind"] = "caixa") => containers.push({ id: cid++, x, z, table, opened: false, kind });
  const bld = (kind: BuildingKind, cx: number, cz: number, w: number, d: number, h: number, color: number) => {
    const b: Building = { kind, x0: cx - w / 2, z0: cz - d / 2, x1: cx + w / 2, z1: cz + d / 2, h, color };
    buildings.push(b);
    return b;
  };
  const tree = (kind: "arvore" | "pinheiro", x: number, z: number) => {
    const s = range(0.8, 1.5);
    props.push({ kind, x, z, rot: r() * 6.28, s, color: kind === "pinheiro" ? pick([0x2f5a3a, 0x284f34, 0x35633f]) : pick([0x4f7a3a, 0x5c8a3f, 0x466e35]) });
    circles.push({ x, z, r: 0.45 * s });
  };

  // ---------------------------------------------------------------- cidade: quarteirões em grade
  const GREYS = [0x8a8f96, 0x777c85, 0x9a948a, 0x6f7480, 0x8c8478, 0x7f8a8c];
  const special: BuildingKind[] = ["mercado", "hospital", "delegacia", "mercado", "hospital", "delegacia"];
  let sp = 0;
  const blocks: { cx: number; cz: number }[] = [];
  for (let bx = 0; bx < 6; bx++) for (let bz = 0; bz < 4; bz++) blocks.push({ cx: -18 + bx * 44, cz: -202 + bz * 46 });
  // sorteia quais quarteirões recebem prédio especial
  const order = blocks.map((_, i) => i).sort(() => r() - 0.5);
  const specialAt = new Map<number, BuildingKind>();
  for (const i of order.slice(0, special.length)) specialAt.set(i, special[sp++]);
  blocks.forEach((b, i) => {
    const kind = specialAt.get(i);
    if (kind) {
      const color = kind === "mercado" ? 0xb8553a : kind === "hospital" ? 0xdad6cc : 0x3d5a80;
      const B = bld(kind, b.cx, b.cz, 30, 24, kind === "hospital" ? 14 : 8, color);
      const table = kind;
      crate(B.x0 + 4, B.z1 + 2.2, table);
      crate(B.x1 - 4, B.z1 + 2.2, table);
      crate(B.x1 + 2.2, b.cz, table);
      if (r() < 0.6) crate(B.x0 - 2.2, b.cz, table);
      return;
    }
    // dois a quatro prédios dividindo o quarteirão
    const split = r();
    const lots: [number, number, number, number][] =
      split < 0.3
        ? [[b.cx, b.cz, 30, 30]]
        : split < 0.65
          ? [
              [b.cx - 8.5, b.cz, 14, 30],
              [b.cx + 8.5, b.cz, 14, 30],
            ]
          : [
              [b.cx - 8.5, b.cz - 8.5, 14, 14],
              [b.cx + 8.5, b.cz - 8.5, 14, 14],
              [b.cx - 8.5, b.cz + 8.5, 14, 14],
              [b.cx + 8.5, b.cz + 8.5, 14, 14],
            ];
    for (const [x, z, w, d] of lots) {
      if (r() < 0.12) continue; // terreno baldio
      const tall = r() < 0.45;
      bld(tall ? "predio" : "casa", x, z, w, d, tall ? range(14, 30) : range(5, 8), pick(GREYS));
    }
    if (r() < 0.75) crate(b.cx + range(-12, 12), b.cz + 17.5, "casa");
    if (r() < 0.5) crate(b.cx + 17.5, b.cz + range(-12, 12), "casa");
  });
  // carros largados nas ruas da cidade
  for (let i = 0; i < 26; i++) {
    const vertical = r() < 0.5;
    const x = vertical ? -40 + Math.floor(r() * 7) * 44 + range(-2, 2) : range(-36, 220);
    const z = vertical ? range(-222, -34) : -225 + Math.floor(r() * 5) * 46 + range(-2, 2);
    props.push({ kind: "carro", x, z, rot: vertical ? range(-0.3, 0.3) : Math.PI / 2 + range(-0.3, 0.3), s: 1, color: pick([0x5a6a55, 0x7a3b32, 0x3f4f66, 0x8a8a80, 0x2e3238]) });
    if (r() < 0.3) crate(x + 2.4, z + 0.5, "rodovia", "carro");
  }
  for (let i = 0; i < 14; i++) props.push({ kind: "poste", x: -40 + Math.floor(r() * 7) * 44 + 5, z: range(-220, -36), rot: 0, s: 1, color: 0x2a2a2a });

  // ---------------------------------------------------------------- rodovia
  for (let i = 0; i < 30; i++) {
    const x = range(-HALF + 10, HALF - 10);
    const z = range(-6, 6);
    props.push({ kind: "carro", x, z, rot: Math.PI / 2 + range(-0.5, 0.5), s: 1, color: pick([0x5a6a55, 0x7a3b32, 0x3f4f66, 0x8a8a80, 0x2e3238, 0x9a8a5a]) });
    if (r() < 0.45) crate(x + range(-1, 1), z + (z > 0 ? 2.4 : -2.4), "rodovia", "carro");
  }

  // ---------------------------------------------------------------- floresta
  const fz = ZONES[1];
  for (let i = 0; i < 430; i++) {
    const x = range(fz.x0, fz.x1);
    const z = range(fz.z0, fz.z1);
    tree(r() < 0.55 ? "pinheiro" : "arvore", x, z);
  }
  for (let i = 0; i < 40; i++) {
    const x = range(fz.x0, fz.x1);
    const z = range(fz.z0, fz.z1);
    const s = range(0.8, 2.2);
    props.push({ kind: "pedra", x, z, rot: r() * 6.28, s, color: pick([0x6f6f6a, 0x7d7a72, 0x5f625f]) });
    circles.push({ x, z, r: 0.8 * s });
  }
  // clareiras com acampamento e a "caverna" (pedras grandes com caixa)
  for (let i = 0; i < 7; i++) {
    const x = range(fz.x0 + 20, fz.x1 - 20);
    const z = range(fz.z0 + 20, fz.z1 - 20);
    props.push({ kind: "tenda", x, z, rot: r() * 6.28, s: 1, color: pick([0x7a6a4a, 0x566b4a, 0x6a5a5a]) });
    circles.push({ x, z, r: 1.6 });
    props.push({ kind: "fogueira", x: x + 3.2, z: z + 1, rot: 0, s: 1, color: 0x3a2a1a });
    crate(x - 2.6, z + 1.2, "floresta");
    if (r() < 0.5) crate(x + 1, z - 3, "floresta");
  }

  // ---------------------------------------------------------------- fazenda
  const barn = bld("celeiro", -165, 95, 22, 14, 9, 0x8e2f24);
  crate(barn.x0 + 4, barn.z1 + 2.2, "fazenda");
  crate(barn.x1 - 4, barn.z1 + 2.2, "fazenda");
  crate(barn.x1 + 2.2, 95, "fazenda");
  const house = bld("casa", -125, 70, 14, 12, 6.5, 0xd8cdb4);
  crate(house.x0 - 2.2, 70, "casa");
  crate(-125, house.z1 + 2.2, "fazenda");
  bld("silo", -190, 80, 7, 7, 14, 0xb9b9b0);
  bld("galpao", -140, 150, 18, 10, 5, 0x7a6a50);
  crate(-140, 157.2, "fazenda");
  crate(-151.2, 150, "fazenda");
  for (let i = 0; i < 16; i++) {
    const x = range(-225, -95);
    const z = range(40, 190);
    props.push({ kind: "fardo", x, z, rot: r() * 6.28, s: 1, color: 0xc9a84a });
    circles.push({ x, z, r: 1 });
  }
  for (const [x, z, w, d] of [
    [-200, 140, 40, 34],
    [-110, 125, 26, 30],
  ] as const)
    props.push({ kind: "plantacao", x, z, rot: d, s: w, color: 0x6a7a3a }); // na plantação, s = largura e rot = profundidade
  for (let i = 0; i < 22; i++) tree("arvore", range(-230, -92), range(36, 194));
  // cercas (colidem): um curral ao lado do celeiro
  for (const [x, z, w, d] of [
    [-185, 112, 30, 0.5],
    [-185, 132, 30, 0.5],
    [-200, 122, 0.5, 20],
  ] as const) {
    const b = bld("muro", x, z, w, d, 1.2, 0x6a4a2a);
    void b;
  }

  // ---------------------------------------------------------------- igreja no morro
  const church = bld("igreja", -10, 125, 14, 26, 9, 0xcfc6ae);
  bld("torre", -10, 109.5, 6, 6, 20, 0xc4baa0);
  crate(church.x0 - 2.2, 120, "igreja");
  crate(church.x1 + 2.2, 130, "igreja");
  crate(-10, church.z1 + 2.2, "igreja");
  for (let i = 0; i < 14; i++) {
    const x = range(-44, -22);
    const z = range(100, 150);
    props.push({ kind: "lapide", x, z, rot: range(-0.2, 0.2), s: 1, color: 0x8a8a84 });
    circles.push({ x, z, r: 0.4 });
  }
  for (let i = 0; i < 16; i++) tree(r() < 0.5 ? "pinheiro" : "arvore", range(-48, 28), r() < 0.5 ? range(88, 104) : range(148, 163));

  // ---------------------------------------------------------------- fábrica
  const hallA = bld("fabrica", 160, 70, 46, 28, 13, 0x6a6e72);
  const hallB = bld("fabrica", 195, 115, 34, 24, 11, 0x5d6468);
  bld("silo", 128, 60, 6, 6, 22, 0x4a4a4a);
  bld("silo", 128, 78, 6, 6, 18, 0x4a4a4a);
  for (const B of [hallA, hallB]) {
    crate(B.x0 + 5, B.z1 + 2.2, "fabrica");
    crate(B.x1 - 5, B.z1 + 2.2, "fabrica");
    crate(B.x0 - 2.2, (B.z0 + B.z1) / 2, "fabrica");
    crate((B.x0 + B.x1) / 2, B.z0 - 2.2, "fabrica");
  }
  for (let i = 0; i < 9; i++) {
    const x = range(122, 226);
    const z = range(36, 140);
    if (x > hallA.x0 - 4 && x < hallA.x1 + 4 && z > hallA.z0 - 4 && z < hallA.z1 + 4) continue;
    if (x > hallB.x0 - 4 && x < hallB.x1 + 4 && z > hallB.z0 - 4 && z < hallB.z1 + 4) continue;
    const rot = r() < 0.5;
    bld("conteiner", x, z, rot ? 6 : 2.6, rot ? 2.6 : 6, 2.7, pick([0x9a4a2a, 0x2f5f7a, 0x4a6a3a, 0x8a7a2a]));
  }
  for (let i = 0; i < 18; i++) {
    const x = range(120, 228);
    const z = range(34, 142);
    props.push({ kind: "barril", x, z, rot: 0, s: 1, color: pick([0x8a3a2a, 0x2a5a8a, 0x5a5a5a]) });
    circles.push({ x, z, r: 0.5 });
  }

  // ---------------------------------------------------------------- acampamento de sobreviventes
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const x = 70 + Math.cos(a) * 15;
    const z = 192 + Math.sin(a) * 13;
    props.push({ kind: "tenda", x, z, rot: a + Math.PI / 2, s: 1.1, color: pick([0x7a6a4a, 0x566b4a, 0x6a5a5a, 0x4a5a6a]) });
    circles.push({ x, z, r: 1.7 });
    if (i % 2 === 0) crate(70 + Math.cos(a) * 10.5, 192 + Math.sin(a) * 9, "acampamento");
  }
  props.push({ kind: "fogueira", x: 70, z: 192, rot: 0, s: 1.4, color: 0x3a2a1a });
  circles.push({ x: 70, z: 192, r: 1 });

  // árvores soltas pelo resto do mapa
  for (let i = 0; i < 90; i++) {
    const x = range(-HALF + 6, HALF - 6);
    const z = range(-HALF + 6, HALF - 6);
    const zn = zoneAt(x, z);
    if (zn && zn.key !== "igreja") continue;
    tree(r() < 0.4 ? "pinheiro" : "arvore", x, z);
  }

  // ---------------------------------------------------------------- colisão
  const boxes: Box[] = buildings.map((b) => ({ x0: b.x0, z0: b.z0, x1: b.x1, z1: b.z1 }));
  for (const p of props)
    if (p.kind === "carro") {
      const c = Math.abs(Math.cos(p.rot));
      const s = Math.abs(Math.sin(p.rot));
      const hx = 1 * c + 2.2 * s;
      const hz = 1 * s + 2.2 * c;
      boxes.push({ x0: p.x - hx, z0: p.z - hz, x1: p.x + hx, z1: p.z + hz });
    }
  // tira objetos redondos que nasceram dentro de construção
  const insideBox = (x: number, z: number, pad = 0) => boxes.some((b) => x > b.x0 - pad && x < b.x1 + pad && z > b.z0 - pad && z < b.z1 + pad);
  const keptCircles = circles.filter((c) => !insideBox(c.x, c.z, c.r));
  const circleGrid = new Map<number, Circle[]>();
  for (const c of keptCircles) {
    const k = gridKey(Math.floor(c.x / CG), Math.floor(c.z / CG));
    const l = circleGrid.get(k);
    if (l) l.push(c);
    else circleGrid.set(k, [c]);
  }
  const keptProps = props.filter((p) => p.kind === "carro" || p.kind === "plantacao" || !insideBox(p.x, p.z, 0.3));
  // caixas que caíram dentro de parede são empurradas para fora
  const keptContainers = containers.filter((c) => !insideBox(c.x, c.z, 0.5) && Math.abs(c.x) < HALF - 3 && Math.abs(c.z) < HALF - 3);

  // ---------------------------------------------------------------- malha de caminho
  const nav = new Uint8Array(NAV_N * NAV_N);
  for (let i = 0; i < NAV_N; i++)
    for (let j = 0; j < NAV_N; j++) {
      const x = -HALF + (i + 0.5) * NAV_CELL;
      const z = -HALF + (j + 0.5) * NAV_CELL;
      if (insideBox(x, z, 0.9)) nav[j * NAV_N + i] = 1;
    }

  // ---------------------------------------------------------------- narrativa: pergaminhos, Bíblias e mensagens
  const lore: LoreSpot[] = [];
  const free = (x: number, z: number) => !insideBox(x, z, 1.2);
  const place = (id: string, x0: number, z0: number, x1: number, z1: number) => {
    for (let t = 0; t < 40; t++) {
      const x = range(x0, x1);
      const z = range(z0, z1);
      if (free(x, z)) return lore.push({ id: lore.length, lore: id, x, z, taken: false });
    }
  };
  const shuffled = [...LORE].sort(() => r() - 0.5);
  const spots: [number, number, number, number][] = [
    [-24, 136, 4, 150], // igreja
    [-20, 96, 0, 106],
    [-40, -220, 220, -34], // cidade
    [-40, -220, 220, -34],
    [-40, -220, 220, -34],
    [-230, -220, -64, -30], // floresta
    [-230, -220, -64, -30],
    [-225, 40, -95, 190], // fazenda
    [-225, 40, -95, 190],
    [120, 34, 228, 142], // fábrica
    [120, 34, 228, 142],
    [45, 170, 95, 215], // acampamento
    [-230, -8, 230, 8], // rodovia
    [-230, -8, 230, 8],
  ];
  spots.forEach((s, i) => place(shuffled[i % shuffled.length].id, ...s));

  // ---------------------------------------------------------------- pontos de partida, bem espalhados
  const cand: { x: number; z: number }[] = [];
  for (let i = 0; i < 400; i++) {
    const x = range(-HALF + 14, HALF - 14);
    const z = range(-HALF + 14, HALF - 14);
    if (free(x, z)) cand.push({ x, z });
  }
  const spawns: { x: number; z: number }[] = [cand[0]];
  while (spawns.length < 10) {
    let best = cand[0];
    let bd = -1;
    for (const c of cand) {
      let d = Infinity;
      for (const s of spawns) d = Math.min(d, (c.x - s.x) ** 2 + (c.z - s.z) ** 2);
      if (d > bd) {
        bd = d;
        best = c;
      }
    }
    spawns.push(best);
  }

  return { seed, zones: ZONES, buildings, props: keptProps, boxes, circles: keptCircles, circleGrid, containers: keptContainers, lore, spawns, nav };
}

// ====================================================================== geometria

/** Move um círculo (sobrevivente) e desliza nas paredes, carros, árvores e na borda do mapa. */
export function moveCircle(w: World, x: number, z: number, dx: number, dz: number, rad: number): [number, number] {
  let nx = x + dx;
  let nz = z + dz;
  for (let pass = 0; pass < 2; pass++) {
    for (const b of w.boxes) {
      if (nx < b.x0 - rad || nx > b.x1 + rad || nz < b.z0 - rad || nz > b.z1 + rad) continue;
      const cx = Math.max(b.x0, Math.min(nx, b.x1));
      const cz = Math.max(b.z0, Math.min(nz, b.z1));
      let ox = nx - cx;
      let oz = nz - cz;
      const d2 = ox * ox + oz * oz;
      if (d2 >= rad * rad) continue;
      if (d2 < 1e-9) {
        // dentro da caixa: sai pelo lado mais perto
        const l = nx - b.x0;
        const rr = b.x1 - nx;
        const t = nz - b.z0;
        const bt = b.z1 - nz;
        const m = Math.min(l, rr, t, bt);
        if (m === l) nx = b.x0 - rad;
        else if (m === rr) nx = b.x1 + rad;
        else if (m === t) nz = b.z0 - rad;
        else nz = b.z1 + rad;
        continue;
      }
      const d = Math.sqrt(d2);
      ox /= d;
      oz /= d;
      nx = cx + ox * rad;
      nz = cz + oz * rad;
    }
    const gx = Math.floor(nx / CG);
    const gz = Math.floor(nz / CG);
    for (let i = -1; i <= 1; i++)
      for (let j = -1; j <= 1; j++) {
        const l = w.circleGrid.get(gridKey(gx + i, gz + j));
        if (!l) continue;
        for (const c of l) {
          const ox = nx - c.x;
          const oz = nz - c.z;
          const rr = rad + c.r;
          const d2 = ox * ox + oz * oz;
          if (d2 >= rr * rr || d2 < 1e-9) continue;
          const d = Math.sqrt(d2);
          nx = c.x + (ox / d) * rr;
          nz = c.z + (oz / d) * rr;
        }
      }
  }
  const lim = HALF - 1;
  return [Math.max(-lim, Math.min(lim, nx)), Math.max(-lim, Math.min(lim, nz))];
}

/** Distância até a primeira parede na direção dada (ou `max` se não bater em nada). */
export function rayBoxes(w: World, x: number, z: number, dx: number, dz: number, max: number): number {
  let best = max;
  for (const b of w.boxes) {
    let t0 = 0;
    let t1 = best;
    if (Math.abs(dx) < 1e-9) {
      if (x < b.x0 || x > b.x1) continue;
    } else {
      let a = (b.x0 - x) / dx;
      let c = (b.x1 - x) / dx;
      if (a > c) [a, c] = [c, a];
      t0 = Math.max(t0, a);
      t1 = Math.min(t1, c);
      if (t0 > t1) continue;
    }
    if (Math.abs(dz) < 1e-9) {
      if (z < b.z0 || z > b.z1) continue;
    } else {
      let a = (b.z0 - z) / dz;
      let c = (b.z1 - z) / dz;
      if (a > c) [a, c] = [c, a];
      t0 = Math.max(t0, a);
      t1 = Math.min(t1, c);
      if (t0 > t1) continue;
    }
    if (t0 < best) best = t0;
  }
  return best;
}

/** Há parede entre dois pontos? */
export function blocked(w: World, x0: number, z0: number, x1: number, z1: number): boolean {
  const dx = x1 - x0;
  const dz = z1 - z0;
  const d = Math.hypot(dx, dz);
  if (d < 1e-6) return false;
  return rayBoxes(w, x0, z0, dx / d, dz / d, d) < d - 0.01;
}

// ====================================================================== caminho (A* na malha)

const navIdx = (x: number, z: number): [number, number] => [Math.max(0, Math.min(NAV_N - 1, Math.floor((x + HALF) / NAV_CELL))), Math.max(0, Math.min(NAV_N - 1, Math.floor((z + HALF) / NAV_CELL)))];
const navPos = (i: number, j: number): [number, number] => [-HALF + (i + 0.5) * NAV_CELL, -HALF + (j + 0.5) * NAV_CELL];

/** Célula livre mais próxima de um ponto (o destino pode estar encostado numa parede). */
function nearestFree(w: World, i: number, j: number): [number, number] {
  if (!w.nav[j * NAV_N + i]) return [i, j];
  for (let rad = 1; rad < 8; rad++)
    for (let a = -rad; a <= rad; a++)
      for (let b = -rad; b <= rad; b++) {
        if (Math.max(Math.abs(a), Math.abs(b)) !== rad) continue;
        const x = i + a;
        const y = j + b;
        if (x < 0 || y < 0 || x >= NAV_N || y >= NAV_N) continue;
        if (!w.nav[y * NAV_N + x]) return [x, y];
      }
  return [i, j];
}

const gScore = new Float32Array(NAV_N * NAV_N);
const came = new Int32Array(NAV_N * NAV_N);
const stamp = new Uint32Array(NAV_N * NAV_N);
let stampNow = 0;

/** Caminho entre dois pontos desviando das construções. Devolve os pontos a seguir (sem o de partida). */
export function findPath(w: World, x0: number, z0: number, x1: number, z1: number): [number, number][] {
  if (!blocked(w, x0, z0, x1, z1)) return [[x1, z1]];
  const [si, sj] = nearestFree(w, ...navIdx(x0, z0));
  const [ti, tj] = nearestFree(w, ...navIdx(x1, z1));
  const start = sj * NAV_N + si;
  const goal = tj * NAV_N + ti;
  stampNow++;
  const open: number[] = [start];
  const f = new Map<number, number>([[start, 0]]);
  gScore[start] = 0;
  stamp[start] = stampNow;
  came[start] = -1;
  let found = false;
  let guard = 0;
  while (open.length && guard++ < 6000) {
    // fila simples: o mapa é pequeno e a busca roda poucas vezes por segundo
    let bi = 0;
    let bf = Infinity;
    for (let k = 0; k < open.length; k++) {
      const v = f.get(open[k])!;
      if (v < bf) {
        bf = v;
        bi = k;
      }
    }
    const cur = open[bi];
    open[bi] = open[open.length - 1];
    open.pop();
    if (cur === goal) {
      found = true;
      break;
    }
    const ci = cur % NAV_N;
    const cj = (cur - ci) / NAV_N;
    for (let a = -1; a <= 1; a++)
      for (let b = -1; b <= 1; b++) {
        if (!a && !b) continue;
        const ni = ci + a;
        const nj = cj + b;
        if (ni < 0 || nj < 0 || ni >= NAV_N || nj >= NAV_N) continue;
        const n = nj * NAV_N + ni;
        if (w.nav[n]) continue;
        // não corta quina de parede
        if (a && b && (w.nav[cj * NAV_N + ni] || w.nav[nj * NAV_N + ci])) continue;
        const g = gScore[cur] + (a && b ? 1.414 : 1);
        if (stamp[n] === stampNow && g >= gScore[n]) continue;
        stamp[n] = stampNow;
        gScore[n] = g;
        came[n] = cur;
        f.set(n, g + Math.hypot(ni - ti, nj - tj));
        open.push(n);
      }
  }
  if (!found) return [[x1, z1]];
  const cells: number[] = [];
  for (let c = goal; c !== -1 && c !== start; c = came[c]) cells.push(c);
  cells.reverse();
  // enxuga: só guarda os pontos onde a linha reta deixa de ser possível
  const pts: [number, number][] = cells.map((c) => navPos(c % NAV_N, Math.floor(c / NAV_N)));
  const out: [number, number][] = [];
  let ax = x0;
  let az = z0;
  for (let k = 0; k < pts.length; k++) {
    const next = pts[k + 1];
    if (!next || blocked(w, ax, az, next[0], next[1])) {
      out.push(pts[k]);
      [ax, az] = pts[k];
    }
  }
  out.push([x1, z1]);
  return out;
}
