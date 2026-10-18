import * as THREE from "three";
import { pointInPoly, pts, roadIndex, type Collider, type MapData } from "@/lib/missao/map";
import { pillarTex } from "./textures2";
import { asphaltTex, ballastTex, churchAnnexTex, churchDoorTex, churchHallTex, grassTex, houseTex, metalTex, roofTex, shopTex, sidewalkTex, signTex, skyTex, upperTex } from "./textures";

// Monta Madureira em 3D a partir do mapa: chão, calçadas, prédios (fundidos por pedaço do mapa para pesar pouco),
// trilhos e estação, viaduto, parque, torres de energia, árvores, postes e as placas dos pontos marcantes.

type Acc = { pos: number[]; nor: number[]; uv: number[]; col: number[] };
const acc = (): Acc => ({ pos: [], nor: [], uv: [], col: [] });

function toGeo(a: Acc): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(a.pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(a.nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(a.uv, 2));
  if (a.col.length) g.setAttribute("color", new THREE.Float32BufferAttribute(a.col, 3));
  g.computeBoundingSphere();
  return g;
}

function quad(a: Acc, p: number[][], n: number[], uv: number[][], c: number[]) {
  // p = 4 cantos (a0, b0, b1, a1) já na ordem anti-horária vista de fora
  const tri = [0, 2, 1, 0, 3, 2];
  for (const i of tri) {
    a.pos.push(p[i][0], p[i][1], p[i][2]);
    a.nor.push(n[0], n[1], n[2]);
    a.uv.push(uv[i][0], uv[i][1]);
    a.col.push(c[0], c[1], c[2]);
  }
}

/** Triângulos de um polígono horizontal na altura y, virados para cima (ou para baixo). */
function cap(a: Acc, flat: number[], y: number, c: number[], uvScale: number, down = false) {
  const p = pts(flat);
  const contour = p.map(([x, z]) => new THREE.Vector2(x, z));
  let tris: number[][];
  try {
    tris = THREE.ShapeUtils.triangulateShape(contour, []);
  } catch {
    return;
  }
  for (const t of tris) {
    const [i0, i1, i2] = t;
    const A = p[i0];
    const B = p[i1];
    const C = p[i2];
    // normal para cima exige (B-A) x (C-A) com y > 0
    const cy = (B[1] - A[1]) * (C[0] - A[0]) - (B[0] - A[0]) * (C[1] - A[1]);
    let order = cy > 0 ? [A, B, C] : [A, C, B];
    if (down) order = [order[0], order[2], order[1]];
    for (const q of order) {
      a.pos.push(q[0], y, q[1]);
      a.nor.push(0, down ? -1 : 1, 0);
      a.uv.push(q[0] / uvScale, q[1] / uvScale);
      a.col.push(c[0], c[1], c[2]);
    }
  }
}

function signedArea(flat: number[]) {
  let s = 0;
  const n = flat.length / 2;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    s += flat[i * 2] * flat[j * 2 + 1] - flat[j * 2] * flat[i * 2 + 1];
  }
  return s / 2;
}

/** Paredes de um prisma. `band` decide a textura por faixa de altura. */
function walls(a: Acc, flat: number[], y0: number, y1: number, period: number, vScale: number, vOff: number, c: number[], vStretch = false) {
  const ccw = signedArea(flat) > 0;
  const n = flat.length / 2;
  let d = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    let ax = flat[i * 2];
    let az = flat[i * 2 + 1];
    let bx = flat[j * 2];
    let bz = flat[j * 2 + 1];
    if (!ccw) [ax, az, bx, bz] = [bx, bz, ax, az];
    const dx = bx - ax;
    const dz = bz - az;
    const L = Math.hypot(dx, dz);
    if (L < 0.05) continue;
    const nx = dz / L;
    const nz = -dx / L;
    // de fora, a direita de quem olha vai de b para a: u cresce nesse sentido (senão o letreiro sai espelhado)
    const u0 = -d / period;
    const u1 = -(d + L) / period;
    d += L;
    const v0 = vStretch ? 0 : (y0 - vOff) / vScale;
    const v1 = vStretch ? vScale : (y1 - vOff) / vScale;
    quad(
      a,
      [
        [ax, y0, az],
        [bx, y0, bz],
        [bx, y1, bz],
        [ax, y1, az],
      ],
      [nx, 0, nz],
      [
        [u0, v0],
        [u1, v0],
        [u1, v1],
        [u0, v1],
      ],
      c,
    );
  }
}

const PALETTE = ["#f3e2c7", "#e8d5b5", "#f6efe2", "#e9c9b0", "#d9e4cf", "#cfe0ea", "#f0d1d6", "#e7e1d3", "#d8c3a5", "#f5e6a8", "#c9d6df", "#efe3d0", "#e3cfc0", "#f7f3ea", "#e8b44a", "#dc8a45", "#9fd4c4", "#bfd88f", "#e8a39a", "#bcd6cc", "#d7a77a", "#c5cdbf", "#f3c969"];
const rgb = (hex: string) => {
  const c = new THREE.Color(hex);
  return [c.r, c.g, c.b];
};
const PAL = PALETTE.map(rgb);
const WHITE = [1, 1, 1];

function hash(n: number) {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

const COMMERCIAL = new Set(["primary", "secondary", "tertiary", "busway", "pedestrian", "primary_link", "secondary_link"]);

export type City = {
  /** porta da frente da igreja (mundo) e a normal que aponta para a rua */
  door: { x: number; z: number; nx: number; nz: number } | null;
  group: THREE.Group;
  sun: THREE.DirectionalLight;
  sky: THREE.Mesh;
  dispose: () => void;
};

export function buildCity(map: MapData, col: Collider, opts: { low: boolean }): City {
  const group = new THREE.Group();
  const disposables: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(x: T) => {
    disposables.push(x);
    return x;
  };
  const [X0, Z0, X1, Z1] = map.bounds;
  const lam = (o: THREE.MeshLambertMaterialParameters) => keep(new THREE.MeshLambertMaterial(o));
  const std = (o: THREE.MeshStandardMaterialParameters) => (opts.low ? keep(new THREE.MeshLambertMaterial(o as THREE.MeshLambertMaterialParameters)) : keep(new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0, ...o })));
  const shadow = (m: THREE.Mesh, cast = true) => {
    if (opts.low) return m;
    m.castShadow = cast;
    m.receiveShadow = true;
    return m;
  };

  // ---------------------------------------------------------------- céu e luz
  const sky = new THREE.Mesh(keep(new THREE.SphereGeometry(1400, 32, 16)), new THREE.MeshBasicMaterial({ map: keep(skyTex()), side: THREE.BackSide, fog: false, depthWrite: false }));
  sky.renderOrder = -1;
  group.add(sky);
  group.add(new THREE.HemisphereLight(0xdcecff, 0x8f7f6a, 1.15));
  const sun = new THREE.DirectionalLight(0xfff0d6, opts.low ? 2.0 : 2.6);
  sun.position.set(-60, 70, 40);
  if (!opts.low) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -70;
    sc.right = 70;
    sc.top = 70;
    sc.bottom = -70;
    sc.near = 1;
    sc.far = 260;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.04;
  }
  group.add(sun);
  group.add(sun.target);

  // ---------------------------------------------------------------- chão
  const asphalt = keep(asphaltTex());
  asphalt.repeat.set(1 / 8, 1 / 8);
  const groundGeo = keep(new THREE.PlaneGeometry(X1 - X0 + 600, Z1 - Z0 + 600));
  groundGeo.rotateX(-Math.PI / 2);
  // uv em metros (a textura repete a cada 8 m)
  const guv = groundGeo.attributes.uv as THREE.BufferAttribute;
  const gpos = groundGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < guv.count; i++) guv.setXY(i, gpos.getX(i), gpos.getZ(i));
  const ground = shadow(new THREE.Mesh(groundGeo, std({ map: asphalt })), false);
  ground.position.set((X0 + X1) / 2, 0, (Z0 + Z1) / 2);
  // uv precisa considerar a posição do mesh
  for (let i = 0; i < guv.count; i++) guv.setXY(i, gpos.getX(i) + ground.position.x, gpos.getZ(i) + ground.position.z);
  group.add(ground);

  // calçadas (quadras): placas de 15 cm
  const swTex = keep(sidewalkTex());
  swTex.repeat.set(1 / 4, 1 / 4);
  const sw = acc();
  for (const b of map.blocks) {
    cap(sw, b, 0.15, WHITE, 1);
    walls(sw, b, 0, 0.15, 4, 4, 0, [0.85, 0.83, 0.8]);
  }
  group.add(shadow(new THREE.Mesh(keep(toGeo(sw)), std({ map: swTex, vertexColors: true })), false));

  // parques e grama
  const gTex = keep(grassTex());
  gTex.repeat.set(1 / 6, 1 / 6);
  const gr = acc();
  for (const p of [...map.parks, ...map.grass]) cap(gr, p, 0.17, WHITE, 1);
  group.add(shadow(new THREE.Mesh(keep(toGeo(gr)), std({ map: gTex, vertexColors: true })), false));
  const wa = acc();
  for (const w of map.water) cap(wa, w, 0.12, WHITE, 1);
  if (wa.pos.length) group.add(new THREE.Mesh(keep(toGeo(wa)), std({ color: 0x5b9bc9, vertexColors: true })));

  // faixas das ruas
  const mk = acc();
  const Y = [0.95, 0.75, 0.15];
  const Wt = [0.95, 0.95, 0.92];
  const stripe = (p: [number, number][], off: number, w: number, c: number[], dash: number) => {
    for (let i = 1; i < p.length; i++) {
      const [ax, az] = p[i - 1];
      const [bx, bz] = p[i];
      const L = Math.hypot(bx - ax, bz - az);
      if (L < 0.5) continue;
      const ux = (bx - ax) / L;
      const uz = (bz - az) / L;
      const nx = -uz;
      const nz = ux;
      const step = dash > 0 ? dash * 2 : L;
      for (let s = 0; s < L; s += step) {
        const e = Math.min(L, s + (dash > 0 ? dash : L));
        const sx = ax + ux * s + nx * off;
        const sz = az + uz * s + nz * off;
        const ex = ax + ux * e + nx * off;
        const ez = az + uz * e + nz * off;
        quad(
          mk,
          [
            [sx - (nx * w) / 2, 0.025, sz - (nz * w) / 2],
            [ex - (nx * w) / 2, 0.025, ez - (nz * w) / 2],
            [ex + (nx * w) / 2, 0.025, ez + (nz * w) / 2],
            [sx + (nx * w) / 2, 0.025, sz + (nz * w) / 2],
          ],
          [0, 1, 0],
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
          ],
          c,
        );
      }
    }
  };
  for (const r of map.roads) {
    if (r.b || !["primary", "secondary", "tertiary", "residential", "busway", "primary_link", "unclassified"].includes(r.k)) continue;
    const p = pts(r.c);
    if (r.o) stripe(p, 0, 0.14, Wt, 3);
    else {
      stripe(p, -0.13, 0.12, Y, 0);
      stripe(p, 0.13, 0.12, Y, 0);
    }
  }
  if (mk.pos.length) {
    const mkMesh = new THREE.Mesh(keep(toGeo(mk)), lam({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    mkMesh.receiveShadow = !opts.low;
    group.add(mkMesh);
  }

  // ---------------------------------------------------------------- prédios (fundidos por pedaço de 80 m)
  const T = {
    shop: keep(shopTex()),
    house: keep(houseTex()),
    upper: keep(upperTex()),
    metal: keep(metalTex()),
    roof: keep(roofTex()),
  };
  T.roof.repeat.set(1 / 6, 1 / 6);
  const churchHall = keep(churchHallTex());
  const churchAnnex = keep(churchAnnexTex());
  const mats = {
    shop: std({ map: T.shop, vertexColors: true }),
    house: std({ map: T.house, vertexColors: true }),
    upper: std({ map: T.upper, vertexColors: true }),
    metal: std({ map: T.metal, vertexColors: true }),
    roof: std({ map: T.roof, vertexColors: true }),
    church: std({ map: churchHall, vertexColors: true }),
    annex: std({ map: churchAnnex, vertexColors: true }),
    slab: std({ color: 0xffffff, vertexColors: true }),
  };
  type MatKey = keyof typeof mats;
  const chunks = new Map<string, Record<MatKey, Acc>>();
  const chunkOf = (x: number, z: number) => {
    const k = `${Math.floor(x / 80)},${Math.floor(z / 80)}`;
    let c = chunks.get(k);
    if (!c) {
      c = { shop: acc(), house: acc(), upper: acc(), metal: acc(), roof: acc(), church: acc(), annex: acc(), slab: acc() };
      chunks.set(k, c);
    }
    return c;
  };
  const commercial = roadIndex(map, COMMERCIAL);
  const tanks: [number, number, number][] = [];
  let churchDoor: City["door"] = null;
  map.bld.forEach((b, i) => {
    const p = pts(b.p);
    let cx = 0;
    let cz = 0;
    for (const [x, z] of p) {
      cx += x;
      cz += z;
    }
    cx /= p.length;
    cz /= p.length;
    const C = chunkOf(cx, cz);
    const y0 = b.y ?? 0;
    const y1 = y0 + b.h;
    const tint = PAL[Math.floor(hash(i) * PAL.length)];
    const roofTint = [0.8 + hash(i + 7) * 0.25, 0.8 + hash(i + 7) * 0.22, 0.78 + hash(i + 7) * 0.2];
    if (b.k === 3 || b.k === 2) {
      // marquise / telheiro: laje fina
      const c = b.k === 3 ? [0.86, 0.85, 0.82] : [0.62 + hash(i) * 0.2, 0.38, 0.28];
      cap(C.slab, b.p, y1, c, 1);
      cap(C.slab, b.p, y1 - 0.14, c, 1, true);
      walls(C.slab, b.p, y1 - 0.14, y1, 1, 1, 0, c);
      return;
    }
    if (b.m === "church") {
      const ar = Math.abs(signedArea(b.p));
      if (ar < 60) {
        // torre azul fina da esquina (nas fotos)
        walls(C.slab, b.p, y0, y1, 1, 1, 0, [0.1, 0.22, 0.5]);
        cap(C.slab, b.p, y1, [0.08, 0.17, 0.4], 1);
      } else if (b.h < 17) {
        walls(C.church, b.p, y0, y1, 8, 1, 0, [1, 1, 1], true);
        cap(C.slab, b.p, y1, [0.72, 0.72, 0.7], 1);
      } else {
        walls(C.annex, b.p, y0, y1, 8, 8, 0, [1, 1, 1]);
        cap(C.roof, b.p, y1, [0.86, 0.85, 0.82], 1);
      }
      return;
    }
    if (b.k === 1 || b.m === "mercadao") {
      walls(C.metal, b.p, y0, y1, 4, 4, 0, b.m === "mercadao" ? [0.95, 0.93, 0.9] : tint);
      cap(C.roof, b.p, y1, roofTint, 1);
      return;
    }
    if (b.k === 4 || b.k === 5) {
      walls(C.upper, b.p, y0, y1, 12, 12, 0, tint);
      cap(C.roof, b.p, y1, roofTint, 1);
      return;
    }
    const shopFront = !b.y && commercial(cx, cz) < 22;
    const band = shopFront ? 3.8 : 3.2;
    if (b.y) {
      walls(C.upper, b.p, y0, y1, 12, 12, y0, tint);
    } else if (b.h <= band + 0.9) {
      if (shopFront) walls(C.shop, b.p, 0, y1, 32, 0.95, 0, WHITE, true);
      else walls(C.house, b.p, 0, y1, 16, 0.92, 0, tint, true);
    } else {
      if (shopFront) walls(C.shop, b.p, 0, band, 32, 0.95, 0, WHITE, true);
      else walls(C.house, b.p, 0, band, 16, 0.92, 0, tint, true);
      walls(C.upper, b.p, band, y1, 12, 12, band, tint);
    }
    cap(C.roof, b.p, y1, roofTint, 1);
    // caixa d'água azul em parte das lajes (cara de Rio)
    if (b.h < 16 && Math.abs(signedArea(b.p)) > 35 && hash(i + 3) < 0.32 && pointInPoly(cx, cz, b.p)) tanks.push([cx, y1, cz]);
  });
  for (const c of chunks.values()) {
    for (const k of Object.keys(mats) as MatKey[]) {
      if (!c[k].pos.length) continue;
      group.add(shadow(new THREE.Mesh(keep(toGeo(c[k])), mats[k])));
    }
  }
  if (tanks.length) {
    const tg = keep(new THREE.CylinderGeometry(0.75, 0.75, 1.1, 12));
    tg.translate(0, 0.55, 0);
    const im = new THREE.InstancedMesh(tg, std({ color: 0x2f6db3 }), tanks.length);
    const m4 = new THREE.Matrix4();
    tanks.forEach(([x, y, z], i) => im.setMatrixAt(i, m4.makeTranslation(x, y, z)));
    group.add(shadow(im as unknown as THREE.Mesh));
  }

  // ---------------------------------------------------------------- trilhos, plataformas e estação
  const bal = keep(ballastTex());
  const rl = acc();
  for (const r of map.rails) {
    const p = pts(r.c);
    let d = 0;
    for (let i = 1; i < p.length; i++) {
      const [ax, az] = p[i - 1];
      const [bx, bz] = p[i];
      const L = Math.hypot(bx - ax, bz - az);
      if (L < 0.1) continue;
      const nx = -(bz - az) / L;
      const nz = (bx - ax) / L;
      const w = 1.6;
      quad(
        rl,
        [
          [ax - nx * w, 0.06, az - nz * w],
          [bx - nx * w, 0.06, bz - nz * w],
          [bx + nx * w, 0.06, bz + nz * w],
          [ax + nx * w, 0.06, az + nz * w],
        ],
        [0, 1, 0],
        [
          [d / 4, 0],
          [(d + L) / 4, 0],
          [(d + L) / 4, 1],
          [d / 4, 1],
        ],
        WHITE,
      );
      d += L;
    }
  }
  if (rl.pos.length) group.add(shadow(new THREE.Mesh(keep(toGeo(rl)), std({ map: bal, vertexColors: true, polygonOffset: true, polygonOffsetFactor: -1 })), false));

  const pf = acc();
  const canopy = acc();
  const posts: [number, number][] = [];
  for (const p of map.platforms) {
    cap(pf, p, 1.0, [0.82, 0.8, 0.76], 1);
    walls(pf, p, 0, 1.0, 4, 4, 0, [0.95, 0.85, 0.2]);
    cap(canopy, p, 4.6, [0.92, 0.92, 0.94], 1);
    cap(canopy, p, 4.45, [0.75, 0.76, 0.8], 1, true);
    const q = pts(p);
    let minx = 1e9;
    let maxx = -1e9;
    let minz = 1e9;
    let maxz = -1e9;
    for (const [x, z] of q) {
      minx = Math.min(minx, x);
      maxx = Math.max(maxx, x);
      minz = Math.min(minz, z);
      maxz = Math.max(maxz, z);
    }
    for (let x = minx + 4; x < maxx; x += 9)
      for (let z = minz + 4; z < maxz; z += 9) if (pointInPoly(x, z, p)) posts.push([x, z]);
  }
  if (pf.pos.length) {
    group.add(shadow(new THREE.Mesh(keep(toGeo(pf)), std({ map: swTex, vertexColors: true }))));
    group.add(shadow(new THREE.Mesh(keep(toGeo(canopy)), std({ color: 0xffffff, vertexColors: true, side: THREE.DoubleSide }))));
  }
  if (posts.length) {
    const g = keep(new THREE.CylinderGeometry(0.12, 0.12, 3.6, 8));
    g.translate(0, 2.8, 0);
    const im = new THREE.InstancedMesh(g, std({ color: 0x3c6fb3 }), posts.length);
    const m4 = new THREE.Matrix4();
    posts.forEach(([x, z], i) => im.setMatrixAt(i, m4.makeTranslation(x, 0, z)));
    group.add(im);
  }

  // estação de Madureira: o prédio azul sobre os trilhos, com treliças vermelhas
  {
    const [lx, lz] = map.landmarks.estacao;
    let dir: [number, number] = [1, 0];
    let bd = 1e9;
    for (const r of map.rails) {
      const p = pts(r.c);
      for (let i = 1; i < p.length; i++) {
        const mx = (p[i][0] + p[i - 1][0]) / 2;
        const mz = (p[i][1] + p[i - 1][1]) / 2;
        const d = Math.hypot(mx - lx, mz - lz);
        if (d < bd) {
          bd = d;
          const L = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]) || 1;
          dir = [(p[i][0] - p[i - 1][0]) / L, (p[i][1] - p[i - 1][1]) / L];
        }
      }
    }
    const st = new THREE.Group();
    st.position.set(lx, 0, lz);
    // o prédio atravessa os trilhos: comprido no sentido perpendicular a eles
    st.rotation.y = Math.atan2(dir[0], dir[1]);
    const len = 52;
    const wid = 14;
    const body = shadow(new THREE.Mesh(keep(new THREE.BoxGeometry(len, 5.2, wid)), std({ color: 0xe9e4da })));
    body.position.y = 9.2;
    st.add(body);
    const roof = shadow(new THREE.Mesh(keep(new THREE.BoxGeometry(len + 1.5, 1.6, wid + 1.5)), std({ color: 0x2856a3 })));
    roof.position.y = 12.5;
    st.add(roof);
    const deck = shadow(new THREE.Mesh(keep(new THREE.BoxGeometry(len, 0.8, wid)), std({ color: 0xb8b2a6 })));
    deck.position.y = 6.2;
    st.add(deck);
    const red = std({ color: 0xd9342b });
    for (const side of [-1, 1]) {
      for (let k = 0; k < 6; k++) {
        const x = -len / 2 + 4 + k * ((len - 8) / 5);
        for (const s of [-1, 1]) {
          const bar = shadow(new THREE.Mesh(keep(new THREE.BoxGeometry(0.45, 6.4, 0.45)), red));
          bar.position.set(x + s * 1.6, 9.2, side * (wid / 2 + 0.3));
          bar.rotation.z = s * 0.55;
          st.add(bar);
        }
      }
      const beam = shadow(new THREE.Mesh(keep(new THREE.BoxGeometry(len, 0.5, 0.5)), red));
      beam.position.set(0, 6.6, side * (wid / 2 + 0.3));
      st.add(beam);
      const sign = new THREE.Mesh(
        keep(new THREE.PlaneGeometry(22, 2.4)),
        lam({
          map: keep(
            signTex(
              [
                { text: "ESTAÇÃO", font: "bold 40px Arial", color: "#ffffff", y: 40 },
                { text: "Madureira", font: "italic bold 90px Georgia, serif", color: "#ffffff", y: 112 },
              ],
              1024,
              160,
              (c) => {
                c.fillStyle = "#1f4f9e";
                c.fillRect(0, 0, 1024, 160);
              },
            ),
          ),
        }),
      );
      sign.position.set(0, 12.6, side * (wid / 2 + 0.8));
      sign.rotation.y = side > 0 ? 0 : Math.PI;
      st.add(sign);
    }
    for (const x of [-len / 2 + 3, -8, 8, len / 2 - 3]) {
      const pil = shadow(new THREE.Mesh(keep(new THREE.CylinderGeometry(0.7, 0.8, 6.2, 10)), std({ color: 0xa8a39a })));
      pil.position.set(x, 3.1, 0);
      st.add(pil);
    }
    group.add(st);
  }

  // ---------------------------------------------------------------- viaduto
  {
    const bridges = map.roads.filter((r) => r.b);
    const ends: [number, number][] = [];
    for (const r of bridges) {
      const p = pts(r.c);
      ends.push(p[0], p[p.length - 1]);
    }
    const connected = (q: [number, number]) => ends.filter((e) => Math.hypot(e[0] - q[0], e[1] - q[1]) < 3).length > 1;
    const deck = acc();
    const pierPos: [number, number, number][] = [];
    const H = 6.5;
    for (const r of bridges) {
      const p = pts(r.c);
      const cum = [0];
      for (let i = 1; i < p.length; i++) cum.push(cum[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
      const total = cum[cum.length - 1];
      const freeA = !connected(p[0]);
      const freeB = !connected(p[p.length - 1]);
      const hAt = (s: number) => {
        let h = H;
        if (freeA) h = Math.min(h, (s / 40) * H);
        if (freeB) h = Math.min(h, ((total - s) / 40) * H);
        return Math.max(0.2, h);
      };
      const w = r.w / 2;
      let lastPier = -99;
      for (let i = 1; i < p.length; i++) {
        const [ax, az] = p[i - 1];
        const [bx, bz] = p[i];
        const L = cum[i] - cum[i - 1];
        if (L < 0.1) continue;
        const nx = -(bz - az) / L;
        const nz = (bx - ax) / L;
        const ha = hAt(cum[i - 1]);
        const hb = hAt(cum[i]);
        // pista
        quad(deck, [[ax - nx * w, ha, az - nz * w], [bx - nx * w, hb, bz - nz * w], [bx + nx * w, hb, bz + nz * w], [ax + nx * w, ha, az + nz * w]], [0, 1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]], [0.33, 0.33, 0.35]);
        // laterais (mureta de concreto) e fundo
        for (const s of [-1, 1]) {
          const ox = nx * w * s;
          const oz = nz * w * s;
          const n = [nx * s, 0, nz * s];
          const pts4 = s > 0
            ? [[ax + ox, ha - 1.1, az + oz], [bx + ox, hb - 1.1, bz + oz], [bx + ox, hb + 1.0, bz + oz], [ax + ox, ha + 1.0, az + oz]]
            : [[bx + ox, hb - 1.1, bz + oz], [ax + ox, ha - 1.1, az + oz], [ax + ox, ha + 1.0, az + oz], [bx + ox, hb + 1.0, bz + oz]];
          quad(deck, pts4, n, [[0, 0], [1, 0], [1, 1], [0, 1]], [0.6, 0.59, 0.56]);
        }
        quad(deck, [[ax + nx * w, ha - 1.1, az + nz * w], [bx + nx * w, hb - 1.1, bz + nz * w], [bx - nx * w, hb - 1.1, bz - nz * w], [ax - nx * w, ha - 1.1, az - nz * w]], [0, -1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]], [0.38, 0.38, 0.38]);
        for (let s = Math.ceil((cum[i - 1] - lastPier) / 18) * 18 + lastPier; s < cum[i]; s += 18) {
          if (s - lastPier < 17) continue;
          const t = (s - cum[i - 1]) / L;
          const h = hAt(s) - 1.1;
          if (h > 2) pierPos.push([ax + (bx - ax) * t, h, az + (bz - az) * t]);
          lastPier = s;
        }
      }
    }
    if (deck.pos.length) group.add(shadow(new THREE.Mesh(keep(toGeo(deck)), std({ vertexColors: true }))));
    if (pierPos.length) {
      const g = keep(new THREE.CylinderGeometry(0.8, 0.9, 1, 10));
      g.translate(0, 0.5, 0);
      const im = new THREE.InstancedMesh(g, std({ map: keep(pillarTex()) }), pierPos.length);
      const m4 = new THREE.Matrix4();
      pierPos.forEach(([x, h, z], i) => im.setMatrixAt(i, m4.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion(), new THREE.Vector3(1, h, 1))));
      group.add(shadow(im as unknown as THREE.Mesh));
    }
    // nome do viaduto na lateral, perto do ponto marcante
    const [vx, vz] = map.landmarks.viaduto;
    let best: { x: number; z: number; ang: number; nx: number; nz: number; w: number } | null = null;
    let bd = 1e9;
    for (const r of bridges) {
      const p = pts(r.c);
      for (let i = 1; i < p.length; i++) {
        const mx = (p[i][0] + p[i - 1][0]) / 2;
        const mz = (p[i][1] + p[i - 1][1]) / 2;
        const d = Math.hypot(mx - vx, mz - vz);
        const L = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
        if (d < bd && L > 10) {
          bd = d;
          best = { x: mx, z: mz, ang: Math.atan2(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]), nx: -(p[i][1] - p[i - 1][1]) / L, nz: (p[i][0] - p[i - 1][0]) / L, w: r.w / 2 };
        }
      }
    }
    if (best) {
      const t = keep(
        signTex([{ text: "VIADUTO NEGRÃO DE LIMA", font: "bold 64px Arial", color: "#3d3d3a", y: 50 }], 1024, 100, (c) => {
          c.fillStyle = "#c9c6bd";
          c.fillRect(0, 0, 1024, 100);
        }),
      );
      for (const s of [-1, 1]) {
        const sg = new THREE.Mesh(keep(new THREE.PlaneGeometry(14, 1.2)), lam({ map: t }));
        sg.position.set(best.x + best.nx * (best.w + 0.03) * s, H - 0.2, best.z + best.nz * (best.w + 0.03) * s);
        sg.rotation.y = best.ang + (s > 0 ? -Math.PI / 2 : Math.PI / 2);
        group.add(sg);
      }
    }
  }

  // ---------------------------------------------------------------- torres de energia e fios
  if (map.towers.length) {
    const tower = new THREE.Group();
    const m = std({ color: 0x8b9096 });
    const legG = keep(new THREE.CylinderGeometry(0.12, 0.2, 30, 5));
    const parts: THREE.BufferGeometry[] = [];
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const g = legG.clone();
      g.rotateZ(sx * 0.07);
      g.rotateX(-sz * 0.07);
      g.translate(sx * 1.6, 15, sz * 1.6);
      parts.push(g);
    }
    for (let y = 4; y < 28; y += 4) {
      const r = 2.7 - (y / 30) * 1.9;
      for (const rot of [0, Math.PI / 2]) {
        const g = new THREE.BoxGeometry(r * 2, 0.12, 0.12);
        g.rotateY(rot);
        g.translate(0, y, r * (rot ? 0 : 1));
        parts.push(g);
        const g2 = g.clone();
        g2.translate(0, 0, -2 * r * (rot ? 0 : 1));
        parts.push(g2);
      }
    }
    for (const y of [24, 28]) {
      const g = new THREE.BoxGeometry(11, 0.3, 0.3);
      g.translate(0, y, 0);
      parts.push(g);
    }
    const merged = mergeGeos(parts);
    keep(merged);
    const im = new THREE.InstancedMesh(merged, m, map.towers.length);
    const m4 = new THREE.Matrix4();
    map.towers.forEach(([x, z], i) => im.setMatrixAt(i, m4.makeTranslation(x, 0, z)));
    group.add(shadow(im as unknown as THREE.Mesh));
    tower.clear();
    // fios: entre torres seguidas de cada linha
    const wires: number[] = [];
    for (const line of map.plines) {
      const p = pts(line);
      for (let i = 1; i < p.length; i++) {
        const [ax, az] = p[i - 1];
        const [bx, bz] = p[i];
        const L = Math.hypot(bx - ax, bz - az);
        if (L < 5 || L > 400) continue;
        const nx = -(bz - az) / L;
        const nz = (bx - ax) / L;
        for (const [off, h] of [[-5.3, 24], [5.3, 24], [-5.3, 28], [5.3, 28]]) {
          const N = 10;
          for (let k = 0; k < N; k++) {
            const t0 = k / N;
            const t1 = (k + 1) / N;
            const sag = (t: number) => -4 * (L / 120) * 4 * t * (1 - t);
            wires.push(ax + (bx - ax) * t0 + nx * off, h + sag(t0), az + (bz - az) * t0 + nz * off);
            wires.push(ax + (bx - ax) * t1 + nx * off, h + sag(t1), az + (bz - az) * t1 + nz * off);
          }
        }
      }
    }
    if (wires.length) {
      const g = keep(new THREE.BufferGeometry());
      g.setAttribute("position", new THREE.Float32BufferAttribute(wires, 3));
      group.add(new THREE.LineSegments(g, keep(new THREE.LineBasicMaterial({ color: 0x2b2b2b }))));
    }
  }

  // ---------------------------------------------------------------- árvores, palmeiras e postes ao longo das ruas
  const palms: [number, number, number][] = [];
  const leafy: [number, number, number][] = [];
  const saplings: [number, number, number][] = [];
  const lamps: [number, number, number][] = [];
  const taken: [number, number][] = [];
  const free = (x: number, z: number, r: number) => {
    if (x < X0 + 2 || x > X1 - 2 || z < Z0 + 2 || z > Z1 - 2) return false;
    if (col.inside(x, z)) return false;
    for (const [tx, tz] of taken) if (Math.abs(tx - x) < r && Math.abs(tz - z) < r) return false;
    return true;
  };
  map.roads.forEach((r, ri) => {
    if (r.b || ["footway", "steps", "cycleway", "service"].includes(r.k)) return;
    const p = pts(r.c);
    const main = ["primary", "secondary", "busway", "primary_link"].includes(r.k);
    let d = 0;
    for (let i = 1; i < p.length; i++) {
      const [ax, az] = p[i - 1];
      const [bx, bz] = p[i];
      const L = Math.hypot(bx - ax, bz - az);
      if (L < 1) continue;
      const nx = -(bz - az) / L;
      const nz = (bx - ax) / L;
      for (let s = (d % 13) + 6; s < L; s += 13) {
        const k = Math.floor((d + s) / 13);
        const side = k % 2 === 0 ? 1 : -1;
        const off = r.w / 2 + 0.7;
        const x = ax + ((bx - ax) * s) / L + nx * off * side;
        const z = az + ((bz - az) * s) / L + nz * off * side;
        const h = hash(ri * 977 + k);
        if (k % 3 === 0) {
          if (free(x, z, 6)) {
            lamps.push([x, z, Math.atan2(-nx * side, -nz * side)]);
            taken.push([x, z]);
          }
        } else if ((main && h < 0.55) || (!main && h < 0.22)) {
          if (free(x, z, 7)) {
            (main && h < 0.38 ? palms : leafy).push([x, z, h]);
            taken.push([x, z]);
          }
        }
      }
      d += L;
    }
  });
  // palmeiras e árvores dentro das praças e do parque
  for (const pk of [...map.parks, ...map.grass]) {
    const q = pts(pk);
    let minx = 1e9;
    let maxx = -1e9;
    let minz = 1e9;
    let maxz = -1e9;
    for (const [x, z] of q) {
      minx = Math.min(minx, x);
      maxx = Math.max(maxx, x);
      minz = Math.min(minz, z);
      maxz = Math.max(maxz, z);
    }
    let k = 0;
    for (let x = minx + 3; x < maxx; x += 11)
      for (let z = minz + 3; z < maxz; z += 11) {
        k++;
        const jx = x + (hash(k * 31) - 0.5) * 7;
        const jz = z + (hash(k * 57) - 0.5) * 7;
        if (pointInPoly(jx, jz, pk) && free(jx, jz, 4)) {
          (hash(k) < 0.25 ? palms : saplings).push([jx, jz, hash(k * 3)]);
          taken.push([jx, jz]);
        }
      }
  }
  const m4 = new THREE.Matrix4();
  const q4 = new THREE.Quaternion();
  const v3 = new THREE.Vector3();
  const s3 = new THREE.Vector3();
  if (palms.length) {
    const trunk = keep(new THREE.CylinderGeometry(0.16, 0.26, 8, 7));
    trunk.translate(0, 4, 0);
    const tm = new THREE.InstancedMesh(trunk, std({ color: 0x8a7a63 }), palms.length);
    const leafG = palmCrown();
    keep(leafG);
    const lm = new THREE.InstancedMesh(leafG, std({ color: 0x3f7a2c, side: THREE.DoubleSide }), palms.length);
    palms.forEach(([x, z, h], i) => {
      const sc = 0.85 + h * 0.45;
      q4.setFromEuler(new THREE.Euler((h - 0.5) * 0.12, h * 6.28, (h - 0.3) * 0.1));
      tm.setMatrixAt(i, m4.compose(v3.set(x, 0, z), q4, s3.set(sc, sc, sc)));
      lm.setMatrixAt(i, m4.compose(v3.set(x, 8 * sc, z), q4, s3.set(sc, sc, sc)));
    });
    group.add(shadow(tm as unknown as THREE.Mesh));
    group.add(shadow(lm as unknown as THREE.Mesh));
  }
  if (leafy.length) {
    const trunk = keep(new THREE.CylinderGeometry(0.18, 0.28, 3.4, 6));
    trunk.translate(0, 1.7, 0);
    const tm = new THREE.InstancedMesh(trunk, std({ color: 0x6b5338 }), leafy.length);
    const crown = keep(new THREE.IcosahedronGeometry(2.6, 1));
    crown.translate(0, 4.6, 0);
    crown.scale(1, 0.85, 1);
    const cm = new THREE.InstancedMesh(crown, std({ color: 0x4d7f35, flatShading: true }), leafy.length);
    leafy.forEach(([x, z, h], i) => {
      const sc = 0.8 + h * 0.6;
      q4.setFromEuler(new THREE.Euler(0, h * 6.28, 0));
      tm.setMatrixAt(i, m4.compose(v3.set(x, 0, z), q4, s3.set(sc, sc, sc)));
      cm.setMatrixAt(i, m4.compose(v3.set(x, 0, z), q4, s3.set(sc, sc * (0.9 + h * 0.3), sc)));
      cm.setColorAt(i, new THREE.Color().setHSL(0.27 + h * 0.06, 0.45, 0.28 + h * 0.1));
    });
    group.add(shadow(tm as unknown as THREE.Mesh));
    group.add(shadow(cm as unknown as THREE.Mesh));
  }
  if (saplings.length) {
    // mudas finas de tronco pintado de branco (o Parque Madureira é aberto e baixo)
    const trunk = keep(new THREE.CylinderGeometry(0.06, 0.08, 3.2, 6));
    trunk.translate(0, 1.6, 0);
    const paint = keep(new THREE.CylinderGeometry(0.085, 0.095, 1.1, 6));
    paint.translate(0, 0.55, 0);
    const crown = keep(new THREE.IcosahedronGeometry(0.95, 1));
    crown.translate(0, 3.5, 0);
    crown.scale(1, 0.9, 1);
    const tm = new THREE.InstancedMesh(trunk, std({ color: 0x6b5338 }), saplings.length);
    const pm = new THREE.InstancedMesh(paint, std({ color: 0xf3f1ea }), saplings.length);
    const cm = new THREE.InstancedMesh(crown, std({ color: 0x5a9a3a, flatShading: true }), saplings.length);
    saplings.forEach(([x, z, h], i) => {
      const sc = 0.85 + h * 0.5;
      q4.setFromEuler(new THREE.Euler(0, h * 6.28, 0));
      m4.compose(v3.set(x, 0.17, z), q4, s3.set(sc, sc, sc));
      tm.setMatrixAt(i, m4);
      pm.setMatrixAt(i, m4);
      cm.setMatrixAt(i, m4);
      cm.setColorAt(i, new THREE.Color().setHSL(0.25 + h * 0.07, 0.5, 0.33 + h * 0.1));
    });
    for (const m of [tm, pm, cm]) group.add(shadow(m as unknown as THREE.Mesh));
  }
  if (lamps.length) {
    // poste preto com braço e luminária (estilo do Rio antigo)
    const parts = [new THREE.CylinderGeometry(0.07, 0.11, 5, 6).translate(0, 2.5, 0), new THREE.BoxGeometry(0.08, 0.08, 1.2).translate(0, 4.9, 0.55), new THREE.CylinderGeometry(0.22, 0.12, 0.45, 6).translate(0, 4.65, 1.1)];
    const g = mergeGeos(parts);
    keep(g);
    const im = new THREE.InstancedMesh(g, std({ color: 0x22262b }), lamps.length);
    lamps.forEach(([x, z, a], i) => {
      q4.setFromEuler(new THREE.Euler(0, a, 0));
      im.setMatrixAt(i, m4.compose(v3.set(x, 0.15, z), q4, s3.set(1, 1, 1)));
    });
    group.add(shadow(im as unknown as THREE.Mesh));
  }

  // ---------------------------------------------------------------- placas dos pontos marcantes
  // Igreja: marquise, letreiro, porta de madeira, escada e grade, na parede do templo mais perto do ponto de spawn
  {
    const church = map.bld.filter((b) => b.m === "church" && Math.abs(signedArea(b.p)) > 60 && b.h < 17);
    const [fx, fz] = map.spawn.front ?? [map.spawn.x, map.spawn.z];
    let best: { x: number; z: number; ang: number; L: number; d: number } | null = null;
    let bd = 1e9;
    for (const b of church) {
      const p = pts(b.p);
      const ccw = signedArea(b.p) > 0;
      for (let i = 0; i < p.length; i++) {
        let [ax, az] = p[i];
        let [bx, bz] = p[(i + 1) % p.length];
        if (!ccw) [ax, az, bx, bz] = [bx, bz, ax, az];
        const L = Math.hypot(bx - ax, bz - az);
        if (L < 8) continue;
        const ux = (bx - ax) / L;
        const uz = (bz - az) / L;
        const t = Math.max(2, Math.min(L - 2, (fx - ax) * ux + (fz - az) * uz));
        const px = ax + ux * t;
        const pz = az + uz * t;
        const d = Math.hypot(px - fx, pz - fz);
        if (d < bd) {
          bd = d;
          // normal para fora = (uz, -ux); o grupo olha para +z local
          best = { x: px, z: pz, ang: Math.atan2(uz, -ux), L, d };
        }
      }
    }
    if (best) {
      const g = new THREE.Group();
      g.position.set(best.x, 0.15, best.z);
      g.rotation.y = best.ang;
      const white = std({ color: 0xf1f1ec });
      const dark = std({ color: 0x1b1b1d });
      const add = (m: THREE.Mesh, x: number, y: number, z: number) => {
        m.position.set(x, y, z);
        g.add(shadow(m));
      };
      // marquise sobre a porta e letreiro escuro na frente dela
      add(new THREE.Mesh(keep(new THREE.BoxGeometry(11, 0.28, 1.9)), white), 0, 3.55, 0.95);
      add(new THREE.Mesh(keep(new THREE.BoxGeometry(10, 1.0, 0.16)), dark), 0, 4.15, 1.9);
      const signMat = lam({
        map: keep(
          signTex([], 1024, 110, (c) => {
            c.fillStyle = "#2b2a30";
            c.fillRect(0, 0, 1024, 110);
            c.fillStyle = "#e9e4d8";
            c.textAlign = "center";
            c.textBaseline = "middle";
            c.font = "italic 28px Georgia, serif";
            c.fillText("Primeira", 110, 58);
            c.fillText("de Madureira", 905, 58);
            c.font = "bold 56px Georgia, serif";
            c.fillText("IGREJA BATISTA", 510, 56);
            c.strokeStyle = "rgba(233,228,216,0.5)";
            c.lineWidth = 3;
            c.strokeRect(5, 5, 1014, 100);
          }),
        ),
      });
      const sg = new THREE.Mesh(keep(new THREE.PlaneGeometry(9.8, 0.98)), signMat);
      sg.position.set(0, 4.15, 1.99);
      g.add(sg);
      // porta dupla de madeira e blocos de vidro dos lados
      const door = new THREE.Mesh(keep(new THREE.PlaneGeometry(2.8, 3.2)), lam({ map: keep(churchDoorTex()) }));
      door.position.set(0, 1.6, 0.04);
      g.add(door);
      for (const s of [-1, 1]) {
        const gb = new THREE.Mesh(keep(new THREE.PlaneGeometry(1.5, 2.4)), lam({ color: 0xaab8bb }));
        gb.position.set(s * 2.9, 1.5, 0.04);
        g.add(gb);
      }
      // escada de três degraus
      const stepM = std({ color: 0xcfcfca });
      for (let i = 0; i < 3; i++) {
        const h = 0.15 * (3 - i);
        add(new THREE.Mesh(keep(new THREE.BoxGeometry(3.6 + i * 0.4, h, 0.45)), stepM), 0, h / 2, 0.225 + 0.45 * i);
      }
      // mureta de pastilha e grade preta no limite do lote, com portão aberto na frente da escada
      const fz2 = Math.max(3.2, best.d - 1);
      const Lw = Math.min(best.L - 1, 26);
      const gate = 1.9;
      const lowM = std({ color: 0xe8e8e2 });
      const bars: [number, number][] = [];
      for (const s of [-1, 1]) {
        const w = Lw / 2 - gate;
        const cx = s * (gate + w / 2);
        add(new THREE.Mesh(keep(new THREE.BoxGeometry(w, 0.9, 0.35)), lowM), cx, 0.45, fz2);
        for (let x = gate + 0.1; x < Lw / 2; x += 0.14) bars.push([s * x, fz2]);
        add(new THREE.Mesh(keep(new THREE.BoxGeometry(w, 0.05, 0.05)), dark), cx, 2.4, fz2);
      }
      if (bars.length) {
        const im = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(0.03, 1.5, 0.03)), dark, bars.length);
        const m4 = new THREE.Matrix4();
        bars.forEach(([x, z], i) => im.setMatrixAt(i, m4.makeTranslation(x, 1.65, z)));
        g.add(im);
      }
      // canteiros com plantas
      for (const s of [-1, 1]) {
        const pl = new THREE.Mesh(keep(new THREE.SphereGeometry(0.9, 8, 6)), std({ color: 0x3f7a2c, flatShading: true }));
        pl.scale.set(1.3, 0.8, 1);
        add(pl, s * 4.4, 0.8, 1.2);
      }
      churchDoor = { x: best.x, z: best.z, nx: Math.sin(best.ang), nz: Math.cos(best.ang) };
      group.add(g);
    }
  }
  // Mercadão: faixa colorida na fachada mais comprida voltada para a rua principal
  {
    const merc = map.bld.filter((b) => b.m === "mercadao");
    const comm = roadIndex(map, new Set(["primary", "secondary", "tertiary"]));
    let best: { x: number; z: number; ang: number; L: number; h: number } | null = null;
    let score = -1e9;
    for (const b of merc) {
      const p = pts(b.p);
      const ccw = signedArea(b.p) > 0;
      for (let i = 0; i < p.length; i++) {
        let [ax, az] = p[i];
        let [bx, bz] = p[(i + 1) % p.length];
        if (!ccw) [ax, az, bx, bz] = [bx, bz, ax, az];
        const L = Math.hypot(bx - ax, bz - az);
        if (L < 12) continue;
        const nx = (bz - az) / L;
        const nz = -(bx - ax) / L;
        const mx = (ax + bx) / 2 + nx * 4;
        const mz = (az + bz) / 2 + nz * 4;
        const sc = L - comm(mx, mz) * 3;
        if (sc > score) {
          score = sc;
          best = { x: (ax + bx) / 2 + nx * 0.15, z: (az + bz) / 2 + nz * 0.15, ang: Math.atan2(nx, nz), L, h: b.h };
        }
      }
    }
    if (best) {
      const w = Math.min(best.L - 2, 28);
      const banner = new THREE.Mesh(
        keep(new THREE.PlaneGeometry(w, w * 0.2)),
        lam({
          map: keep(
            signTex(
              [
                { text: "MERCADÃO", font: "900 120px Arial Black, Arial", color: "#ffffff", y: 92 },
                { text: "DE MADUREIRA", font: "900 64px Arial Black, Arial", color: "#fff6c9", y: 168 },
              ],
              1024,
              205,
              (c) => {
                const g = c.createLinearGradient(0, 0, 1024, 0);
                g.addColorStop(0, "#5b2a86");
                g.addColorStop(0.5, "#c2185b");
                g.addColorStop(1, "#f59e0b");
                c.fillStyle = g;
                c.fillRect(0, 0, 1024, 205);
              },
            ),
          ),
        }),
      );
      banner.position.set(best.x, Math.min(best.h, 9) - w * 0.1 - 0.4, best.z);
      banner.rotation.y = best.ang;
      group.add(banner);
    }
  }
  // Parque Madureira: muro de concreto com as letras verdes recortadas
  {
    const [px, pz] = map.landmarks.parque;
    const wall = new THREE.Group();
    const t = keep(
      signTex(
        [
          { text: "PARQUE", font: "bold 70px Arial", color: "#b6e33a", y: 70 },
          { text: "MADUREIRA", font: "900 170px Arial Black, Arial", color: "#b6e33a", y: 200 },
        ],
        1024,
        300,
        (c) => {
          c.fillStyle = "#8a8f86";
          c.fillRect(0, 0, 1024, 300);
          for (let y = 0; y < 300; y += 28) {
            c.fillStyle = "rgba(0,0,0,0.08)";
            c.fillRect(0, y, 1024, 2);
          }
        },
      ),
    );
    const body = shadow(new THREE.Mesh(keep(new THREE.BoxGeometry(14, 3.6, 0.7)), std({ color: 0x8a8f86 })));
    body.position.y = 1.8;
    wall.add(body);
    for (const s of [-1, 1]) {
      const face = new THREE.Mesh(keep(new THREE.PlaneGeometry(13.6, 3.4)), lam({ map: t }));
      face.position.set(0, 1.8, s * 0.36);
      face.rotation.y = s > 0 ? 0 : Math.PI;
      wall.add(face);
    }
    // vira para a rua mais próxima
    const near = roadIndex(map, new Set(["primary", "secondary", "tertiary", "residential"]));
    let ang = 0;
    let bd = 1e9;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
      const d = near(px + Math.sin(a) * 8, pz + Math.cos(a) * 8);
      if (d < bd) {
        bd = d;
        ang = a;
      }
    }
    wall.position.set(px, 0.17, pz);
    wall.rotation.y = ang;
    group.add(wall);
  }

  return {
    door: churchDoor,
    group,
    sun,
    sky,
    dispose: () => {
      for (const d of disposables) d.dispose();
      group.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else m?.dispose();
      });
    },
  };
}

/** Copa da palmeira: folhas compridas caídas em volta do topo. */
function palmCrown(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 9; i++) {
    const leaf = new THREE.PlaneGeometry(0.9, 4.2, 1, 4);
    const p = leaf.attributes.position as THREE.BufferAttribute;
    for (let k = 0; k < p.count; k++) {
      const y = p.getY(k) + 2.1; // 0..4.2 ao longo da folha
      const t = y / 4.2;
      p.setX(k, p.getX(k) * (1 - t * 0.7));
      p.setZ(k, -t * t * 1.9);
      p.setY(k, y);
    }
    leaf.rotateX(-Math.PI / 2 + 0.55);
    leaf.rotateY((i / 9) * Math.PI * 2);
    parts.push(leaf);
  }
  const g = mergeGeos(parts);
  g.computeVertexNormals();
  return g;
}

function mergeGeos(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  for (const g0 of list) {
    const g = g0.index ? g0.toNonIndexed() : g0;
    if (!g.attributes.normal) g.computeVertexNormals();
    const p = g.attributes.position as THREE.BufferAttribute;
    const n = g.attributes.normal as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      nor.push(n.getX(i), n.getY(i), n.getZ(i));
    }
    g0.dispose();
    if (g !== g0) g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  return out;
}
