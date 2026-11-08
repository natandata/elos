// ArenaSoccer · monta a cena de um lance decisivo (quem tem a bola, quem recebe, onde está a defesa). Só números, sem tela.
import { mulberry, type Chance, type Match, type Player } from "./sim";

export type StepKind = "pass" | "cross" | "shot" | "header" | "freekick" | "penalty";
export type Spot = { x: number; y: number };
export type ScenePlayer = Spot & { player: Player };
export type Scene = {
  steps: StepKind[];
  carrier: ScenePlayer;
  /** opções de passe (o primeiro é quem chutaria no sorteio) */
  mates: ScenePlayer[];
  defenders: Spot[];
  keeperX: number;
  wall: Spot[];
  /** para onde a câmera olha */
  focus: [number, number];
  tip: string;
};

const rnd = (r: () => number, a: number, b: number) => a + r() * (b - a);

export function buildScene(m: Match, c: Chance): Scene {
  const r = mulberry(c.id * 9973 + c.min * 31 + 7);
  const mine = m.lineups[c.side].xi.filter((p) => p.pos !== "GK");
  const others = mine.filter((p) => p.name !== c.shooter.name);
  const passer = c.assister ?? others[0] ?? c.shooter;
  const decoys = others.filter((p) => p.name !== passer.name).sort(() => r() - 0.5).slice(0, 2);
  const keeperX = rnd(r, -0.8, 0.8);
  const base = { keeperX, wall: [] as Spot[], defenders: [] as Spot[] };
  const placeDef = (n: number, near: Spot[]): Spot[] =>
    Array.from({ length: n }, (_, i) => {
      const t = near[i % Math.max(1, near.length)] ?? { x: 0, y: -10 };
      const mark = r() < 0.55;
      return mark ? { x: t.x + rnd(r, -1.6, 1.6), y: t.y + rnd(r, -2.5, -0.4) } : { x: rnd(r, -9, 9), y: rnd(r, -16, -7) };
    });

  if (c.kind === "penalty") {
    return { ...base, steps: ["penalty"], carrier: { x: 0, y: -11, player: c.shooter }, mates: [], focus: [0, 0], tip: "Pênalti! Arraste do jogador até o canto do gol." };
  }
  if (c.kind === "freekick") {
    const bx = rnd(r, -11, 11);
    const by = rnd(r, -25, -19);
    const dx = -bx;
    const dy = -by;
    const len = Math.hypot(dx, dy);
    const wx = bx + (dx / len) * 9.15;
    const wy = by + (dy / len) * 9.15;
    const wall = [-1.2, -0.4, 0.4, 1.2].map((o) => ({ x: wx + (dy / len) * o, y: wy - (dx / len) * o }));
    return { ...base, wall, steps: ["freekick"], carrier: { x: bx, y: by, player: c.shooter }, mates: [], focus: [0, 0], tip: "Falta direta! Faça a bola passar por cima da barreira: mire alto." };
  }
  if (c.kind === "counter") {
    const x = rnd(r, -9, 9);
    return { ...base, steps: ["shot"], carrier: { x, y: rnd(r, -24, -17), player: c.shooter }, mates: [], defenders: [{ x: x + rnd(r, -2.5, 2.5), y: rnd(r, -30, -26) }], focus: [0, 0], tip: "Contra-ataque! Só você e o goleiro. Arraste até o canto." };
  }
  const wing = c.kind === "cross" || c.kind === "corner";
  const mates: ScenePlayer[] = [c.shooter, ...decoys].map((p, i) => ({ player: p, x: rnd(r, -4.5, 4.5) + (i === 0 ? 0 : i % 2 ? -3.2 : 3.2), y: wing ? rnd(r, -13, -5) : rnd(r, -19, -9) }));
  const defenders = placeDef(wing ? (c.kind === "corner" ? 5 : 4) : 4, mates);
  if (c.kind === "corner") {
    const side = r() < 0.5 ? -1 : 1;
    return { ...base, defenders, steps: ["cross", "header"], carrier: { x: side * 33.5, y: -0.8, player: passer }, mates, focus: [0, -7], tip: "Escanteio! Desenhe a linha até a cabeça de um companheiro." };
  }
  if (c.kind === "cross") {
    const side = r() < 0.5 ? -1 : 1;
    return { ...base, defenders, steps: ["cross", "header"], carrier: { x: side * 27, y: rnd(r, -24, -18), player: passer }, mates, focus: [0, -6], tip: "Desenhe a linha até a cabeça do companheiro para um cruzamento no alto." };
  }
  // jogada trabalhada: às vezes já dá para chutar
  if (r() < 0.4) {
    return { ...base, defenders: defenders.slice(0, 3), steps: ["shot"], carrier: { x: rnd(r, -8, 8), y: rnd(r, -22, -15), player: c.shooter }, mates: [], focus: [0, 0], tip: "Chance clara! Arraste da bola até o canto do gol." };
  }
  return { ...base, defenders, steps: ["pass", "shot"], carrier: { x: rnd(r, -10, 10), y: rnd(r, -32, -26), player: passer }, mates, focus: [0, -6], tip: "Desenhe uma linha até um companheiro livre para tocar a bola." };
}

/** Distância de um ponto a um segmento. */
export function distToSegment(p: Spot, a: Spot, b: Spot): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Quantos marcadores cortam a linha do passe (ou marcam o recebedor). */
export function blockersOn(scene: Scene, from: Spot, to: Spot, aerial: boolean): number {
  let n = 0;
  for (const d of scene.defenders) {
    if (distToSegment(d, from, to) < (aerial ? 1.2 : 2.0)) n++;
    else if (Math.hypot(d.x - to.x, d.y - to.y) < 2.2) n += 0.6;
  }
  return n;
}
