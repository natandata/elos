// Modelos 3D voxel das criaturas e heróis (montados com caixas, com rig simples).
import * as THREE from "three";

const U = 1 / 16;

export interface HumanoidSpec {
  kind: "humanoid";
  scale: number;
  skin: number;
  hair: number;
  hairStyle: "short" | "long" | "bald" | "hood";
  shirt: number;
  pants: number;
  shoes: number;
  bare?: boolean;
  /** Largura extra (heróis fortes e gigantes). */
  bulk?: number;
  belt?: number;
  robe?: boolean;
  cape?: number;
  beard?: number;
  crown?: number;
  helm?: number;
  headband?: number;
  staff?: boolean;
  sling?: boolean;
  sword?: number;
  /** Escudo no braço esquerdo, machado e arco na mão, penacho no elmo. */
  shield?: number;
  axe?: boolean;
  bow?: boolean;
  plume?: number;
  fur?: number;
  /** Chifres, asas de morcego e coroa de chamas (demônios e o Adversário). */
  horns?: number;
  wings?: number;
  flame?: number;
}
export interface BeastSpec {
  kind: "beast";
  variant: "sheep" | "boar" | "camel" | "scorpion" | "ox" | "rooster" | "lion" | "bear" | "snake" | "spider" | "locust" | "horse";
  scale: number;
  body: number;
  head: number;
  legs: number;
  accent: number;
}
export type ModelSpec = HumanoidSpec | BeastSpec;

export interface Rig {
  root: THREE.Group;
  head: THREE.Object3D;
  armL?: THREE.Object3D;
  armR?: THREE.Object3D;
  /** Pernas que balançam juntas (A com B em oposição). */
  legsA: THREE.Object3D[];
  legsB: THREE.Object3D[];
  cape?: THREE.Object3D;
  wings?: THREE.Object3D[];
  tail?: THREE.Object3D;
  mats: THREE.MeshLambertMaterial[];
  height: number;
  radius: number;
  humanoid: boolean;
}

function mk(mats: THREE.MeshLambertMaterial[], w: number, h: number, d: number, color: number, ox = 0, oy = 0, oz = 0): THREE.Mesh {
  const g = new THREE.BoxGeometry(w * U, h * U, d * U);
  g.translate(ox * U, oy * U, oz * U);
  const m = new THREE.MeshLambertMaterial({ color });
  mats.push(m);
  return new THREE.Mesh(g, m);
}

function pivot(x: number, y: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x * U, y * U, z * U);
  return g;
}

function humanoid(s: HumanoidSpec): Rig {
  const mats: THREE.MeshLambertMaterial[] = [];
  const root = new THREE.Group();
  const bulk = s.bulk ?? 1;
  const legColor = s.robe ? s.shirt : s.pants;

  const legL = pivot(-2 * bulk, 12, 0);
  legL.add(mk(mats, 4 * bulk, 12, 4, legColor, 0, -6, 0), mk(mats, 4 * bulk + 0.2, 3, 4.2, s.shoes, 0, -10.5, 0.2));
  const legR = pivot(2 * bulk, 12, 0);
  legR.add(mk(mats, 4 * bulk, 12, 4, legColor, 0, -6, 0), mk(mats, 4 * bulk + 0.2, 3, 4.2, s.shoes, 0, -10.5, 0.2));
  root.add(legL, legR);

  root.add(mk(mats, 8 * bulk, 12, 4, s.shirt, 0, 18, 0));
  if (s.robe) root.add(mk(mats, 8.8 * bulk, 10, 5, s.shirt, 0, 8, 0));
  if (s.belt !== undefined) root.add(mk(mats, 8.4 * bulk, 2, 4.4, s.belt, 0, 14, 0));

  const armColor = s.bare ? s.skin : s.shirt;
  const armL = pivot(-6 * bulk - 0.5, 23, 0);
  armL.add(mk(mats, 4 * bulk, 11, 4, armColor, 0, -4.5, 0), mk(mats, 4 * bulk, 3, 4, s.skin, 0, -11, 0));
  const armR = pivot(6 * bulk + 0.5, 23, 0);
  armR.add(mk(mats, 4 * bulk, 11, 4, armColor, 0, -4.5, 0), mk(mats, 4 * bulk, 3, 4, s.skin, 0, -11, 0));
  root.add(armL, armR);

  const head = pivot(0, 24, 0);
  head.add(mk(mats, 8, 8, 8, s.skin, 0, 4, 0));
  head.add(mk(mats, 1.6, 1.6, 0.5, 0x1b1b1b, -2, 4.6, 4.1), mk(mats, 1.6, 1.6, 0.5, 0x1b1b1b, 2, 4.6, 4.1));
  if (s.hairStyle === "short") head.add(mk(mats, 8.6, 3, 8.6, s.hair, 0, 8.4, 0), mk(mats, 8.6, 6, 2, s.hair, 0, 5, -3.8));
  if (s.hairStyle === "long") head.add(mk(mats, 8.6, 3, 8.6, s.hair, 0, 8.4, 0), mk(mats, 8.6, 15, 2, s.hair, 0, 0.5, -4), mk(mats, 1.8, 8, 7, s.hair, -4.4, 4, -0.5), mk(mats, 1.8, 8, 7, s.hair, 4.4, 4, -0.5));
  if (s.hairStyle === "hood") head.add(mk(mats, 9.4, 9.4, 9.4, s.shirt, 0, 4.2, -0.4));
  if (s.beard !== undefined) head.add(mk(mats, 6.4, 5.5, 1.6, s.beard, 0, 0.8, 4.2));
  if (s.crown !== undefined) {
    head.add(mk(mats, 8.5, 2, 8.5, s.crown, 0, 8.6, 0));
    for (const x of [-3, 0, 3]) head.add(mk(mats, 1.4, 2.2, 1.4, s.crown, x, 10.6, 3));
  }
  if (s.helm !== undefined) head.add(mk(mats, 9.2, 5, 9.2, s.helm, 0, 7.2, 0), mk(mats, 1.5, 5, 1.2, s.helm, 0, 3, 4.6));
  if (s.plume !== undefined) head.add(mk(mats, 2, 4, 10, s.plume, 0, 11, -0.5), mk(mats, 2, 6, 3, s.plume, 0, 10, -5));
  if (s.horns !== undefined) {
    head.add(mk(mats, 1.8, 4, 1.8, s.horns, -3, 9.5, 0), mk(mats, 1.2, 3, 1.2, s.horns, -4, 12.5, 0.4), mk(mats, 1.8, 4, 1.8, s.horns, 3, 9.5, 0), mk(mats, 1.2, 3, 1.2, s.horns, 4, 12.5, 0.4));
  }
  if (s.flame !== undefined) {
    for (const x of [-3, -1, 1, 3]) head.add(mk(mats, 1.4, 3 + ((x + 4) % 3), 1.4, s.flame, x, 9.5, -1));
  }
  if (s.headband !== undefined) head.add(mk(mats, 8.5, 1.4, 8.5, s.headband, 0, 6.6, 0));
  root.add(head);

  let cape: THREE.Group | undefined;
  if (s.cape !== undefined) {
    cape = pivot(0, 23, -2.6);
    cape.add(mk(mats, 8.4 * bulk, 15, 1, s.cape, 0, -7.5, -0.5));
    root.add(cape);
  }
  let wings: THREE.Group[] | undefined;
  if (s.wings !== undefined) {
    const wl = pivot(-4, 22, -2.5);
    wl.add(mk(mats, 1, 16, 4, s.wings, -6, -2, -1), mk(mats, 1, 12, 8, s.wings, -9, 0, -3), mk(mats, 1, 8, 10, s.wings, -12, 2, -5));
    const wr = pivot(4, 22, -2.5);
    wr.add(mk(mats, 1, 16, 4, s.wings, 6, -2, -1), mk(mats, 1, 12, 8, s.wings, 9, 0, -3), mk(mats, 1, 8, 10, s.wings, 12, 2, -5));
    root.add(wl, wr);
    wings = [wl, wr];
  }
  if (s.staff) {
    armR.add(mk(mats, 1.4, 34, 1.4, 0x7a5230, 0, -2, 4), mk(mats, 3.2, 3.2, 3.2, 0xe0b84a, 0, 17, 4));
  }
  if (s.sling) armL.add(mk(mats, 1.6, 7, 1.6, 0x8a5a33, 0, -13, 2), mk(mats, 3, 3, 3, 0x9a9aa0, 0, -17, 2));
  if (s.shield !== undefined) armL.add(mk(mats, 1.6, 10, 8, s.shield, -3, -7, 2), mk(mats, 1.8, 4, 4, 0xe0b84a, -3.2, -7, 2));
  if (s.axe) armR.add(mk(mats, 1.4, 16, 1.4, 0x6a4a2a, 0, -11, 3), mk(mats, 1.6, 6, 7, 0xc9ced6, 0, -17, 5.5));
  if (s.bow) armL.add(mk(mats, 1.4, 20, 1.4, 0x8a5a2a, 0, -9, 4), mk(mats, 0.6, 18, 0.6, 0xe8dcb8, 0, -9, 2.2));
  if (s.fur !== undefined) root.add(mk(mats, 10 * bulk, 4, 6, s.fur, 0, 24, 0), mk(mats, 8.4 * bulk, 11, 1.2, s.fur, 0, 17, -2.8));
  if (s.sword !== undefined) armR.add(mk(mats, 1.2, 14, 0.8, s.sword, 0, -17, 2), mk(mats, 4, 1.2, 1.2, 0x6a4a2a, 0, -10.5, 2));

  root.scale.setScalar(s.scale);
  return { root, head, armL, armR, legsA: [legL], legsB: [legR], cape, wings, mats, height: 2 * s.scale, radius: 0.3 * s.scale * Math.max(1, bulk), humanoid: true };
}

function beast(s: BeastSpec): Rig {
  const mats: THREE.MeshLambertMaterial[] = [];
  const root = new THREE.Group();
  const legsA: THREE.Object3D[] = [];
  const legsB: THREE.Object3D[] = [];
  let head: THREE.Group;
  let tail: THREE.Group | undefined;
  let height = 1;
  let radius = 0.45;

  const legs = (lh: number, lw: number, x: number, z: number, color: number) => {
    const pos: [number, number, number][] = [[-x, lh, z], [x, lh, z], [-x, lh, -z], [x, lh, -z]];
    pos.forEach((p, i) => {
      const l = pivot(p[0], p[1], p[2]);
      l.add(mk(mats, lw, lh, lw, color, 0, -lh / 2, 0));
      root.add(l);
      (i === 0 || i === 3 ? legsA : legsB).push(l);
    });
  };

  if (s.variant === "sheep") {
    legs(7, 3, 3, 5, s.legs);
    root.add(mk(mats, 10, 9, 16, s.body, 0, 11.5, 0));
    head = pivot(0, 14, 8);
    head.add(mk(mats, 6, 6, 6, s.head, 0, 0, 3), mk(mats, 1.4, 1.4, 0.4, 0x111111, -1.8, 1, 6.1), mk(mats, 1.4, 1.4, 0.4, 0x111111, 1.8, 1, 6.1));
    root.add(head);
    height = 1.1;
    radius = 0.45;
  } else if (s.variant === "boar") {
    legs(6, 3, 3, 5, s.legs);
    root.add(mk(mats, 9, 8, 15, s.body, 0, 10, 0));
    head = pivot(0, 11, 8);
    head.add(mk(mats, 7, 7, 7, s.head, 0, 0, 3), mk(mats, 3.5, 3, 2.5, s.accent, 0, -1.4, 7.4), mk(mats, 1.2, 3, 1.2, 0xf3ecd2, -2.2, -2.6, 7), mk(mats, 1.2, 3, 1.2, 0xf3ecd2, 2.2, -2.6, 7), mk(mats, 1.4, 1.4, 0.4, 0x111111, -2, 1.6, 6.6), mk(mats, 1.4, 1.4, 0.4, 0x111111, 2, 1.6, 6.6));
    root.add(head);
    height = 0.95;
    radius = 0.5;
  } else if (s.variant === "camel") {
    legs(15, 3, 3.5, 7, s.legs);
    root.add(mk(mats, 11, 10, 20, s.body, 0, 20, 0), mk(mats, 7, 6, 7, s.body, 0, 28, 0));
    head = pivot(0, 24, 10);
    head.add(mk(mats, 4.5, 14, 4.5, s.body, 0, 6, 1), mk(mats, 5.5, 5.5, 8, s.head, 0, 14, 4), mk(mats, 1.4, 1.4, 0.4, 0x111111, -2.2, 15, 8.1), mk(mats, 1.4, 1.4, 0.4, 0x111111, 2.2, 15, 8.1));
    root.add(head);
    height = 2.1;
    radius = 0.6;
  } else if (s.variant === "ox") {
    legs(9, 3.4, 3.8, 6.5, s.legs);
    root.add(mk(mats, 11, 10, 19, s.body, 0, 14, 0), mk(mats, 5, 4, 6, s.accent, 3, 17, 2));
    head = pivot(0, 16, 9.5);
    head.add(mk(mats, 7, 7, 7, s.head, 0, 0, 3), mk(mats, 5, 3, 2.5, 0xe8d6c0, 0, -2, 7.2), mk(mats, 1.2, 3, 1.2, 0xf3ecd2, -3.8, 4, 1), mk(mats, 1.2, 3, 1.2, 0xf3ecd2, 3.8, 4, 1), mk(mats, 1.4, 1.4, 0.4, 0x111111, -2, 1.5, 6.6), mk(mats, 1.4, 1.4, 0.4, 0x111111, 2, 1.5, 6.6));
    root.add(head);
    height = 1.4;
    radius = 0.6;
  } else if (s.variant === "rooster") {
    legs(4, 1, 1.6, 0.5, s.legs);
    root.add(mk(mats, 5, 5, 7, s.body, 0, 6.5, 0), mk(mats, 3, 6, 2, s.accent, 0, 10, -4.5));
    head = pivot(0, 9, 3);
    head.add(mk(mats, 3.4, 4, 3.4, s.head, 0, 2, 1), mk(mats, 1, 2, 3, 0xd63a3a, 0, 5, 1), mk(mats, 1.6, 1.2, 2, 0xf2c94c, 0, 2, 3.2), mk(mats, 1, 1, 0.4, 0x111111, -1.2, 3, 2.7), mk(mats, 1, 1, 0.4, 0x111111, 1.2, 3, 2.7));
    root.add(head);
    height = 0.65;
    radius = 0.25;
  } else if (s.variant === "lion") {
    legs(8, 3.2, 3.4, 6.5, s.legs);
    root.add(mk(mats, 10, 9, 18, s.body, 0, 12.5, 0));
    head = pivot(0, 15, 9);
    head.add(mk(mats, 8, 8, 8, s.head, 0, 0, 4), mk(mats, 12, 12, 5, s.accent, 0, 0, 0.5), mk(mats, 4, 3, 2.5, 0xe8c9a0, 0, -2.2, 8.2), mk(mats, 1.4, 1.4, 0.4, 0x111111, -2.2, 1.6, 8.1), mk(mats, 1.4, 1.4, 0.4, 0x111111, 2.2, 1.6, 8.1));
    root.add(head);
    tail = pivot(0, 14, -9);
    tail.add(mk(mats, 1.6, 1.6, 9, s.body, 0, 0, -4.5), mk(mats, 3, 3, 3, s.accent, 0, 0, -10));
    root.add(tail);
    height = 1.15;
    radius = 0.55;
  } else if (s.variant === "bear") {
    legs(7, 4.2, 4.2, 6, s.legs);
    root.add(mk(mats, 12, 11, 17, s.body, 0, 12.5, 0));
    head = pivot(0, 15, 8.5);
    head.add(mk(mats, 8, 7, 7, s.head, 0, 0, 3.5), mk(mats, 4, 3, 3, 0xc9a07a, 0, -1.5, 7.5), mk(mats, 2, 2, 1.5, s.head, -3, 4, 1), mk(mats, 2, 2, 1.5, s.head, 3, 4, 1), mk(mats, 1.4, 1.4, 0.4, 0x111111, -2.2, 1.5, 7.1), mk(mats, 1.4, 1.4, 0.4, 0x111111, 2.2, 1.5, 7.1));
    root.add(head);
    height = 1.25;
    radius = 0.62;
  } else if (s.variant === "spider") {
    root.add(mk(mats, 6, 5, 7, s.body, 0, 5, -3), mk(mats, 8, 6, 9, s.body, 0, 5.5, -10));
    head = pivot(0, 5, 1);
    head.add(mk(mats, 5, 4, 4, s.head, 0, 0, 2), mk(mats, 1.2, 1.2, 0.4, s.accent, -1.3, 1, 4.2), mk(mats, 1.2, 1.2, 0.4, s.accent, 1.3, 1, 4.2), mk(mats, 0.8, 0.8, 0.4, s.accent, -0.5, 0, 4.2), mk(mats, 0.8, 0.8, 0.4, s.accent, 0.5, 0, 4.2));
    root.add(head);
    for (const side of [-1, 1]) {
      for (let k = 0; k < 4; k++) {
        const l = pivot(side * 3, 5, -1 - k * 2.4);
        l.add(mk(mats, 9, 1.2, 1.2, s.legs, side * 4.5, -0.5, 0));
        l.rotation.z = side * -0.45;
        root.add(l);
        (k % 2 === 0 ? legsA : legsB).push(l);
      }
    }
    height = 0.7;
    radius = 0.6;
  } else if (s.variant === "locust") {
    legs(6, 1.6, 2, 3.5, s.legs);
    root.add(mk(mats, 5, 5, 12, s.body, 0, 7.5, 0), mk(mats, 3, 6, 4, s.accent, 0, 7, -7));
    head = pivot(0, 9, 6);
    head.add(mk(mats, 5, 5, 5, s.head, 0, 0, 2.5), mk(mats, 1.2, 1.2, 0.4, 0xffd54a, -1.4, 1, 5.2), mk(mats, 1.2, 1.2, 0.4, 0xffd54a, 1.4, 1, 5.2), mk(mats, 0.6, 5, 0.6, s.legs, -1.5, 4, 3), mk(mats, 0.6, 5, 0.6, s.legs, 1.5, 4, 3));
    root.add(head);
    height = 0.8;
    radius = 0.4;
  } else if (s.variant === "horse") {
    legs(9, 2.4, 2.6, 6, s.legs);
    root.add(mk(mats, 7, 8, 17, s.body, 0, 13, 0), mk(mats, 1.5, 3, 12, s.accent, 0, 18, -1));
    head = pivot(0, 16, 8);
    head.add(mk(mats, 3.5, 9, 4, s.head, 0, 4, 0), mk(mats, 4, 4.5, 8, s.head, 0, 9.5, 3.5), mk(mats, 1.2, 2.5, 1.2, s.head, -1.5, 13, 1), mk(mats, 1.2, 2.5, 1.2, s.head, 1.5, 13, 1), mk(mats, 0.8, 0.8, 0.4, 0x111111, -1.8, 10.5, 7.7), mk(mats, 0.8, 0.8, 0.4, 0x111111, 1.8, 10.5, 7.7));
    root.add(head);
    tail = pivot(0, 16, -9);
    tail.add(mk(mats, 2.4, 10, 2.4, s.accent, 0, -5, -1));
    root.add(tail);
    height = 1.65;
    radius = 0.5;
  } else if (s.variant === "snake") {
    const seg: [number, number][] = [[0, -12], [0, -7], [0, -2], [0, 3], [0, 8]];
    tail = pivot(0, 0, 0);
    seg.forEach(([x, z], i) => tail!.add(mk(mats, 3.2 - i * 0.2, 2.6, 6, i % 2 ? s.accent : s.body, x, 1.3, z)));
    root.add(tail);
    head = pivot(0, 1, 10);
    head.add(mk(mats, 4, 3, 5, s.head, 0, 1, 2), mk(mats, 0.8, 0.5, 2.5, 0xd63a3a, 0, 0.5, 6), mk(mats, 0.9, 0.9, 0.4, 0xffd54a, -1.2, 2, 3.8), mk(mats, 0.9, 0.9, 0.4, 0xffd54a, 1.2, 2, 3.8));
    root.add(head);
    height = 0.3;
    radius = 0.28;
  } else {
    legs(4, 1.6, 4, 4, s.legs);
    root.add(mk(mats, 10, 4, 12, s.body, 0, 6, 0));
    head = pivot(0, 7, 6);
    head.add(mk(mats, 6, 3.5, 4, s.head, 0, 0, 2), mk(mats, 3, 3, 7, s.accent, -6, -0.5, 3), mk(mats, 3, 3, 7, s.accent, 6, -0.5, 3), mk(mats, 1.2, 1.2, 0.4, 0xffd54a, -1.4, 1.2, 4.2), mk(mats, 1.2, 1.2, 0.4, 0xffd54a, 1.4, 1.2, 4.2));
    root.add(head);
    tail = pivot(0, 7, -6);
    tail.add(mk(mats, 3, 3, 6, s.body, 0, 2, -3), mk(mats, 3, 3, 6, s.body, 0, 6, -6), mk(mats, 3, 6, 3, s.body, 0, 10, -5), mk(mats, 2, 3, 2, s.accent, 0, 14, -4));
    root.add(tail);
    height = 0.75;
    radius = 0.45;
  }
  root.scale.setScalar(s.scale);
  return { root, head, legsA, legsB, tail, mats, height: height * s.scale, radius: radius * s.scale, humanoid: false };
}

export function buildModel(spec: ModelSpec): Rig {
  return spec.kind === "humanoid" ? humanoid(spec) : beast(spec);
}

export interface AnimState {
  t: number;
  speed: number;
  attack: number;
  windup: number;
  dead: number;
}

export function animate(rig: Rig, a: AnimState): void {
  const swing = Math.sin(a.t * 9) * Math.min(1, a.speed / 2.2) * 0.9;
  for (const l of rig.legsA) l.rotation.x = swing;
  for (const l of rig.legsB) l.rotation.x = -swing;
  if (rig.humanoid) {
    if (rig.armL) rig.armL.rotation.x = -swing * 0.8 + Math.sin(a.t * 1.6) * 0.03;
    if (rig.armR) rig.armR.rotation.x = swing * 0.8 - Math.sin(a.t * 1.6) * 0.03;
    if (a.attack > 0 && rig.armR) rig.armR.rotation.x = -Math.sin(a.attack * Math.PI) * 2;
    if (a.windup > 0) {
      if (rig.armL) rig.armL.rotation.x = -2.7 * a.windup;
      if (rig.armR) rig.armR.rotation.x = -2.7 * a.windup;
    }
    if (rig.cape) rig.cape.rotation.x = 0.12 + Math.abs(swing) * 0.5;
    if (rig.wings) {
      const flap = Math.sin(a.t * 2.4) * 0.28;
      rig.wings[0].rotation.y = 0.25 + flap;
      rig.wings[1].rotation.y = -0.25 - flap;
    }
  } else {
    if (a.attack > 0) rig.head.rotation.x = Math.sin(a.attack * Math.PI) * 0.7;
    else rig.head.rotation.x = Math.sin(a.t * 1.3) * 0.05;
    if (rig.tail) rig.tail.rotation.y = Math.sin(a.t * 4) * 0.35;
  }
  rig.head.rotation.y = Math.sin(a.t * 0.7) * 0.12;
  if (a.dead > 0) {
    rig.root.rotation.z = Math.min(1, a.dead) * (Math.PI / 2);
  }
}

export function flash(rig: Rig, amount: number): void {
  for (const m of rig.mats) m.emissive.setRGB(amount, amount * 0.1, amount * 0.1);
}

export function disposeRig(rig: Rig): void {
  rig.root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
  });
  rig.mats.forEach((m) => m.dispose());
  rig.root.removeFromParent();
}
