import * as THREE from "three";
import { carpetTex, ceilingTex, hallWallTex, screenTex, woodWallTex } from "./textures2";
import { churchDoorTex, signTex } from "./textures";

// Interior da Primeira Igreja Batista de Madureira (fotos): salão com carpete azul, bancos de madeira, galeria no fundo,
// palco com parede de madeira cor de mel, telão e piano. Fica longe do mapa; o jogador chega pela porta da igreja.

export const INTERIOR = { ox: 4000, oz: 4000, W: 24, D: 34, floor: 0.15 };

export type PersonSlot = { x: number; y: number; z: number; yaw: number; model: number; stage: boolean };

export type Interior = {
  group: THREE.Group;
  /** posição inicial do jogador (mundo) e para onde ele olha */
  spawn: { x: number; z: number; yaw: number };
  /** onde o jogador reaparece ao entrar pela porta da frente */
  entry: { x: number; z: number; yaw: number };
  atDoor: (x: number, z: number) => boolean;
  resolve: (x: number, z: number, r: number) => [number, number];
  clampCam: (x: number, z: number) => [number, number];
  inside: (x: number, z: number) => boolean;
  people: PersonSlot[];
  dispose: () => void;
};

function hash(n: number) {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

export function buildChurchInterior(opts: { low: boolean }): Interior {
  const { ox, oz, W, D, floor } = INTERIOR;
  const hw = W / 2;
  const hd = D / 2;
  const H = 11;
  const group = new THREE.Group();
  group.position.set(ox, 0, oz);
  const own: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(x: T) => (own.push(x), x);
  const std = (o: THREE.MeshStandardMaterialParameters) => keep(opts.low ? new THREE.MeshLambertMaterial(o as THREE.MeshLambertMaterialParameters) : new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, ...o }));
  const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) => {
    const me = new THREE.Mesh(keep(new THREE.BoxGeometry(w, h, d)), m);
    me.position.set(x, y, z);
    me.castShadow = !opts.low;
    me.receiveShadow = !opts.low;
    group.add(me);
    return me;
  };
  const rep = (t: THREE.Texture, u: number, v: number) => {
    const c = keep(t.clone());
    c.wrapS = c.wrapT = THREE.RepeatWrapping;
    c.repeat.set(u, v);
    c.needsUpdate = true;
    return c;
  };

  // piso de carpete azul
  const floorMesh = new THREE.Mesh(keep(new THREE.PlaneGeometry(W, D)), std({ map: rep(keep(carpetTex()), W / 4, D / 4) }));
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.set(0, floor, 0);
  floorMesh.receiveShadow = !opts.low;
  group.add(floorMesh);

  // paredes brancas com janelas escuras
  const wallTex = keep(hallWallTex());
  const sideM = std({ map: rep(wallTex, D / 6, 1), side: THREE.DoubleSide });
  const endM = std({ map: rep(wallTex, W / 6, 1), side: THREE.DoubleSide });
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(keep(new THREE.PlaneGeometry(D, H)), sideM);
    w.rotation.y = -s * Math.PI / 2;
    w.position.set(s * hw, H / 2 + floor, 0);
    w.receiveShadow = !opts.low;
    group.add(w);
  }
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(keep(new THREE.PlaneGeometry(W, H)), endM);
    w.rotation.y = s > 0 ? Math.PI : 0;
    w.position.set(0, H / 2 + floor, s * hd);
    group.add(w);
  }

  // forro com luminárias redondas
  const ceil = new THREE.Mesh(keep(new THREE.PlaneGeometry(W, D)), std({ map: rep(keep(ceilingTex()), W / 4, D / 4), side: THREE.DoubleSide }));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, H + floor, 0);
  group.add(ceil);
  const spotG = keep(new THREE.CircleGeometry(0.22, 12));
  spotG.rotateX(Math.PI / 2);
  const spotM = keep(new THREE.MeshBasicMaterial({ color: 0xfffbea }));
  const spots: [number, number][] = [];
  for (let x = -9; x <= 9; x += 4.5) for (let z = -13; z <= 14; z += 4.5) spots.push([x, z]);
  const spotIM = new THREE.InstancedMesh(spotG, spotM, spots.length);
  const m4 = new THREE.Matrix4();
  spots.forEach(([x, z], i) => spotIM.setMatrixAt(i, m4.makeTranslation(x, H + floor - 0.02, z)));
  group.add(spotIM);

  // palco: parede de madeira cor de mel, telão, degraus e carpete
  const woodM = std({ map: rep(keep(woodWallTex()), 18 / 4, 6 / 4) });
  const wood = new THREE.Mesh(keep(new THREE.PlaneGeometry(18, 6.4)), woodM);
  wood.rotation.y = Math.PI;
  wood.position.set(0, 3.2 + floor, hd - 0.04);
  group.add(wood);
  const screen = new THREE.Mesh(keep(new THREE.PlaneGeometry(7.2, 4.05)), keep(new THREE.MeshBasicMaterial({ map: keep(screenTex()) })));
  screen.rotation.y = Math.PI;
  screen.position.set(0, 4.4 + floor, hd - 0.08);
  group.add(screen);
  const stageTop = floor + 0.8;
  const stageM = std({ map: rep(keep(carpetTex("#3b3d8c")), 4, 2) });
  box(18, 0.8, 7, stageM, 0, floor + 0.4, hd - 3.5);
  box(8, 0.5, 0.5, stageM, 0, floor + 0.25, hd - 7.25);
  box(8, 0.25, 0.45, stageM, 0, floor + 0.125, hd - 7.7);
  // piano, caixas de som e mesa com toalha branca e flores
  const black = std({ color: 0x151517 });
  box(2.3, 1.1, 1.6, black, -6.5, stageTop + 0.55, hd - 3);
  box(2.3, 0.08, 0.5, std({ color: 0xf2f2ee }), -6.5, stageTop + 1.14, hd - 3.75);
  for (const s of [-1, 1]) box(0.8, 1.3, 0.7, black, s * 8.2, stageTop + 0.65, hd - 6.2);
  const table = std({ color: 0xf6f6f2 });
  box(2.4, 0.95, 1.2, table, 0, floor + 0.475, 8.2);
  const flowers = new THREE.Mesh(keep(new THREE.SphereGeometry(0.42, 8, 6)), std({ color: 0xd9488b }));
  flowers.position.set(0, floor + 1.25, 8.2);
  group.add(flowers);

  // barras de refletores sobre o palco
  const bar = std({ color: 0x1a1a1c });
  for (const z of [hd - 6, hd - 2.5]) {
    box(16, 0.15, 0.15, bar, 0, 9.3 + floor, z);
    for (let x = -7; x <= 7; x += 2) {
      const sp = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.16, 0.22, 0.4, 8)), bar);
      sp.position.set(x, 9.0 + floor, z);
      group.add(sp);
      const lens = new THREE.Mesh(keep(new THREE.CircleGeometry(0.15, 8)), keep(new THREE.MeshBasicMaterial({ color: hash(x * 7 + z) < 0.5 ? 0xff8a3d : 0xfff0c8 })));
      lens.rotation.x = Math.PI / 2;
      lens.position.set(x, 8.79 + floor, z);
      group.add(lens);
    }
  }

  // bancos de madeira (dois blocos separados por corredor central)
  const rowsZ: number[] = [];
  for (let i = 0; i < 11; i++) rowsZ.push(-8.5 + i * 1.5);
  const blockX = [-5.8, 5.8];
  const seatG = keep(new THREE.BoxGeometry(8.4, 0.45, 0.5));
  const backG = keep(new THREE.BoxGeometry(8.4, 0.62, 0.08));
  const cushG = keep(new THREE.BoxGeometry(8.0, 0.07, 0.4));
  const pewM = std({ color: 0x5a3320 });
  const nPew = rowsZ.length * 2;
  const seats = new THREE.InstancedMesh(seatG, pewM, nPew);
  const backs = new THREE.InstancedMesh(backG, pewM, nPew);
  const cushions: [number, number][] = [];
  let pi = 0;
  rowsZ.forEach((z, ri) =>
    blockX.forEach((x, bi) => {
      seats.setMatrixAt(pi, m4.makeTranslation(x, floor + 0.225, z));
      backs.setMatrixAt(pi, m4.makeTranslation(x, floor + 0.76, z - 0.28));
      if (hash(ri * 3 + bi) < 0.45) cushions.push([x, z]);
      pi++;
    }),
  );
  seats.castShadow = backs.castShadow = !opts.low;
  group.add(seats, backs);
  const cush = new THREE.InstancedMesh(cushG, std({ color: 0xc23b3b }), Math.max(1, cushions.length));
  cushions.forEach(([x, z], i) => cush.setMatrixAt(i, m4.makeTranslation(x, floor + 0.49, z)));
  cush.count = cushions.length;
  group.add(cush);

  // galeria no fundo, com parapeito branco e bancos em degraus
  const white = std({ color: 0xf1eee6 });
  box(W, 0.4, 6, white, 0, 4.4 + floor, -hd + 3);
  box(W, 1.05, 0.25, white, 0, 5.1 + floor, -hd + 6.1);
  box(W, 0.18, 0.28, std({ color: 0x5a7fb0 }), 0, 4.65 + floor, -hd + 6.1);
  for (const x of [-7, 0, 7]) {
    const col = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.35, 0.35, 4.4, 10)), white);
    col.position.set(x, 2.2 + floor, -hd + 6.3);
    col.castShadow = !opts.low;
    group.add(col);
  }
  for (let i = 0; i < 3; i++) box(21, 0.4 + i * 0.4, 0.7, pewM, 0, 4.6 + floor + (0.4 + i * 0.4) / 2, -hd + 5.0 - i * 1.4);

  // porta dupla de madeira no fundo, com placa "SAÍDA"
  const door = new THREE.Mesh(keep(new THREE.PlaneGeometry(2.8, 3.2)), keep(new THREE.MeshLambertMaterial({ map: keep(churchDoorTex()) })));
  door.position.set(0, 1.6 + floor, -hd + 0.03);
  group.add(door);
  box(3.2, 0.2, 0.15, std({ color: 0x3a2417 }), 0, 3.3 + floor, -hd + 0.06);
  const exit = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(1.8, 0.45)),
    keep(
      new THREE.MeshBasicMaterial({
        map: keep(
          signTex([{ text: "SAÍDA", font: "bold 64px Arial", color: "#ffffff", y: 40 }], 256, 80, (c) => {
            c.fillStyle = "#12803c";
            c.fillRect(0, 0, 256, 80);
          }),
        ),
      }),
    ),
  );
  exit.position.set(0, 3.7 + floor, -hd + 0.05);
  group.add(exit);

  // luz quente de dentro (o ambiente já vem da luz geral da cena)
  for (const z of [-8, 2, 11]) {
    const l = new THREE.PointLight(0xfff0d8, opts.low ? 120 : 220, 26, 1.6);
    l.position.set(0, 8.5 + floor, z);
    group.add(l);
  }

  // gente: palco (louvor) e congregação em pé entre os bancos
  const people: PersonSlot[] = [];
  for (let i = 0; i < 5; i++) people.push({ x: -5 + i * 2.5, y: stageTop, z: hd - 4.5 + hash(i) * 1.2, yaw: Math.PI, model: i % 4, stage: true });
  if (!opts.low) {
    rowsZ.forEach((z, ri) => {
      if (ri % 2 === 0) return;
      blockX.forEach((bx, bi) => {
        for (let k = 0; k < 3; k++) {
          const x = bx - 3.2 + k * 3.1 + (hash(ri * 11 + bi * 5 + k) - 0.5) * 0.8;
          if (hash(ri * 17 + bi * 3 + k) < 0.7) people.push({ x, y: floor, z: z - 0.55, yaw: 0, model: (ri + bi + k) % 4, stage: false });
        }
      });
    });
  }

  // colisões simples: limites do salão, bancos, mesa e degraus do palco
  type Rect = [number, number, number, number];
  const rects: Rect[] = [];
  for (const z of rowsZ) for (const x of blockX) rects.push([x - 4.2, z - 0.32, x + 4.2, z + 0.32]);
  rects.push([-1.5, 7.5, 1.5, 8.9]);
  const resolve = (x: number, z: number, r: number): [number, number] => {
    x = Math.max(-hw + 0.5 + r, Math.min(hw - 0.5 - r, x));
    z = Math.max(-hd + 0.45 + r, Math.min(hd - 7.6 - r, z));
    for (const [a, b, c, d] of rects) {
      if (x > a - r && x < c + r && z > b - r && z < d + r) {
        const l = x - (a - r);
        const rr = c + r - x;
        const t = z - (b - r);
        const bt = d + r - z;
        const m = Math.min(l, rr, t, bt);
        if (m === l) x = a - r;
        else if (m === rr) x = c + r;
        else if (m === t) z = b - r;
        else z = d + r;
      }
    }
    return [x, z];
  };
  const inside = (x: number, z: number) => Math.abs(x - ox) < hw + 1 && Math.abs(z - oz) < hd + 1;

  return {
    group,
    spawn: { x: ox + 0, z: oz + 0.5, yaw: Math.PI },
    entry: { x: ox + 0, z: oz - hd + 2.4, yaw: 0 },
    atDoor: (x, z) => Math.abs(x - ox) < 1.9 && z - oz < -hd + 1.6,
    resolve: (x, z, r) => {
      const [rx, rz] = resolve(x - ox, z - oz, r);
      return [rx + ox, rz + oz];
    },
    clampCam: (x, z) => [Math.max(ox - hw + 0.4, Math.min(ox + hw - 0.4, x)), Math.max(oz - hd + 0.4, Math.min(oz + hd - 0.4, z))],
    inside,
    people: people.map((p) => ({ ...p, x: p.x + ox, z: p.z + oz })),
    dispose: () => {
      for (const d of own) d.dispose();
    },
  };
}
