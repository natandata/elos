import * as THREE from "three";
import { pointInPoly, pts, roadIndex, type Collider, type MapData } from "@/lib/missao/map";
import { fenceTex, graffitiWallTex, pathTex, roadSignTex } from "./textures2";

// Detalhes de Madureira que as fotos do bairro mostram e o mapa não tem: fiação aérea nos postes, muro pichado com
// grade ao longo da linha do trem, calçadão vermelho do Parque (com a grade verde) e placas azuis perto do viaduto.

type Acc = { pos: number[]; nor: number[]; uv: number[] };
const acc = (): Acc => ({ pos: [], nor: [], uv: [] });
function toGeo(a: Acc): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(a.pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(a.nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(a.uv, 2));
  g.computeBoundingSphere();
  return g;
}
/** Faixa vertical de (ax,az) a (bx,bz) entre y0 e y1; u em metros / `period`. */
function strip(a: Acc, ax: number, az: number, bx: number, bz: number, y0: number, y1: number, u0: number, u1: number) {
  const L = Math.hypot(bx - ax, bz - az) || 1;
  const nx = (bz - az) / L;
  const nz = -(bx - ax) / L;
  const P = [
    [ax, y0, az, u0, 0],
    [bx, y0, bz, u1, 0],
    [bx, y1, bz, u1, 1],
    [ax, y1, az, u0, 1],
  ];
  for (const i of [0, 2, 1, 0, 3, 2]) {
    a.pos.push(P[i][0], P[i][1], P[i][2]);
    a.nor.push(nx, 0, nz);
    a.uv.push(P[i][3], P[i][4]);
  }
}
function hash(n: number) {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

const POLE_ROADS = new Set(["primary", "secondary", "tertiary", "residential", "unclassified", "busway", "primary_link", "secondary_link"]);

export function buildExtras(map: MapData, col: Collider, opts: { low: boolean }): { group: THREE.Group; dispose: () => void } {
  const group = new THREE.Group();
  const own: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(x: T) => (own.push(x), x);
  const [X0, Z0, X1, Z1] = map.bounds;
  const mat = (o: THREE.MeshStandardMaterialParameters) => keep(opts.low ? new THREE.MeshLambertMaterial(o as THREE.MeshLambertMaterialParameters) : new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0, ...o }));
  const inMap = (x: number, z: number) => x > X0 + 3 && x < X1 - 3 && z > Z0 + 3 && z < Z1 - 3;

  // ------------------------------------------------------------ postes e fios
  type Pole = { x: number; z: number; ux: number; uz: number; k: number };
  const poles: Pole[] = [];
  const spans: [Pole, Pole][] = [];
  const STEP = 27;
  map.roads.forEach((r, ri) => {
    if (r.b || !POLE_ROADS.has(r.k)) return;
    const p = pts(r.c);
    const cum = [0];
    for (let i = 1; i < p.length; i++) cum.push(cum[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
    const total = cum[cum.length - 1];
    let seg = 1;
    let prev: Pole | null = null;
    const side = hash(ri) < 0.5 ? 1 : -1;
    for (let s = 8 + hash(ri + 3) * 10, k = 0; s < total - 4; s += STEP, k++) {
      while (seg < p.length - 1 && cum[seg] < s) seg++;
      const [ax, az] = p[seg - 1];
      const [bx, bz] = p[seg];
      const L = cum[seg] - cum[seg - 1] || 1;
      const t = (s - cum[seg - 1]) / L;
      const ux = (bx - ax) / L;
      const uz = (bz - az) / L;
      const off = r.w / 2 + 0.9;
      const x = ax + (bx - ax) * t - uz * off * side;
      const z = az + (bz - az) * t + ux * off * side;
      if (!inMap(x, z) || col.inside(x, z)) {
        prev = null;
        continue;
      }
      const cur: Pole = { x, z, ux, uz, k: ri * 131 + k };
      poles.push(cur);
      if (prev) spans.push([prev, cur]);
      prev = cur;
    }
  });
  if (poles.length) {
    const post = keep(new THREE.CylinderGeometry(0.1, 0.15, 9, 6));
    post.translate(0, 4.5, 0);
    const arm = keep(new THREE.BoxGeometry(2.2, 0.1, 0.1));
    arm.translate(0, 8.5, 0);
    const trans = keep(new THREE.CylinderGeometry(0.28, 0.28, 0.7, 8));
    trans.translate(0, 7.4, 0.35);
    const pm = mat({ color: 0x6f6a62 });
    const im = new THREE.InstancedMesh(post, pm, poles.length);
    const ia = new THREE.InstancedMesh(arm, mat({ color: 0x4a4540 }), poles.length);
    const tr = poles.filter((p) => hash(p.k) < 0.14);
    const it = new THREE.InstancedMesh(trans, mat({ color: 0x7d8286 }), Math.max(1, tr.length));
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const v = new THREE.Vector3();
    const one = new THREE.Vector3(1, 1, 1);
    poles.forEach((p, i) => {
      // travessa perpendicular à rua
      q.setFromEuler(new THREE.Euler(0, Math.atan2(-p.uz, p.ux) + Math.PI / 2 + 0.0, 0));
      m4.compose(v.set(p.x, 0.15, p.z), q, one);
      im.setMatrixAt(i, m4);
      ia.setMatrixAt(i, m4);
    });
    tr.forEach((p, i) => {
      q.setFromEuler(new THREE.Euler(0, Math.atan2(-p.uz, p.ux), 0));
      it.setMatrixAt(i, m4.compose(v.set(p.x, 0.15, p.z), q, one));
    });
    it.count = tr.length;
    for (const m of [im, ia, it]) {
      m.castShadow = !opts.low;
      group.add(m);
    }
    // fios: quatro cabos na travessa + um lateral mais baixo, com barriga (caem entre os postes)
    const w: number[] = [];
    const sag = (t: number, d: number) => -4 * (d / 30) * 0.45 * t * (1 - t);
    for (const [a, b] of spans) {
      const d = Math.hypot(b.x - a.x, b.z - a.z);
      if (d < 3 || d > 60) continue;
      const nax = -a.uz;
      const naz = a.ux;
      const nbx = -b.uz;
      const nbz = b.ux;
      for (const [off, h] of [
        [-0.95, 8.5],
        [-0.3, 8.5],
        [0.35, 8.5],
        [0.95, 8.5],
        [0.2, 7.5],
      ]) {
        const N = 6;
        for (let i = 0; i < N; i++) {
          const t0 = i / N;
          const t1 = (i + 1) / N;
          const f = (t: number) => [a.x + (b.x - a.x) * t + (nax + (nbx - nax) * t) * off, h + 0.15 + sag(t, d), a.z + (b.z - a.z) * t + (naz + (nbz - naz) * t) * off];
          w.push(...f(t0), ...f(t1));
        }
      }
    }
    if (w.length) {
      const g = keep(new THREE.BufferGeometry());
      g.setAttribute("position", new THREE.Float32BufferAttribute(w, 3));
      group.add(new THREE.LineSegments(g, keep(new THREE.LineBasicMaterial({ color: 0x1d1d1f }))));
    }
  }

  // ------------------------------------------------------------ muro pichado com grade ao longo da linha do trem
  {
    const wallTex = keep(graffitiWallTex());
    const fTex = keep(fenceTex());
    const wall = acc();
    const fence = acc();
    const anyRoad = roadIndex(map, new Set(["primary", "secondary", "tertiary", "residential", "unclassified", "service", "busway", "primary_link", "secondary_link"]));
    const [sx, sz] = map.landmarks.estacao;
    const OFF = 3.1;
    let dW = 0;
    let dF = 0;
    for (const r of map.rails) {
      if (r.b) continue;
      const p = pts(r.c);
      for (const side of [1, -1]) {
        let run: [number, number][] = [];
        const flush = () => {
          for (let i = 1; i < run.length; i++) {
            const [ax, az] = run[i - 1];
            const [bx, bz] = run[i];
            const L = Math.hypot(bx - ax, bz - az);
            if (L < 0.5) continue;
            strip(wall, ax, az, bx, bz, 0.15, 2.4, dW / 8, (dW + L) / 8);
            strip(wall, bx, bz, ax, az, 0.15, 2.4, dW / 8, (dW + L) / 8);
            strip(fence, ax, az, bx, bz, 2.4, 3.4, dF / 8, (dF + L) / 8);
            strip(fence, bx, bz, ax, az, 2.4, 3.4, dF / 8, (dF + L) / 8);
            dW += L;
            dF += L;
            // sólido fininho: não deixa atravessar o muro
            const ux = (bx - ax) / L;
            const uz = (bz - az) / L;
            const hx = -uz * 0.25;
            const hz = ux * 0.25;
            col.addSolid([ax + hx, az + hz, bx + hx, bz + hz, bx - hx, bz - hz, ax - hx, az - hz]);
          }
          run = [];
        };
        for (let i = 1; i < p.length; i++) {
          const [ax, az] = p[i - 1];
          const [bx, bz] = p[i];
          const L = Math.hypot(bx - ax, bz - az);
          if (L < 0.5) continue;
          const ux = (bx - ax) / L;
          const uz = (bz - az) / L;
          for (let s = 0; s <= L; s += 4) {
            const x = ax + ux * s - uz * OFF * side;
            const z = az + uz * s + ux * OFF * side;
            const ok = inMap(x, z) && Math.hypot(x - sx, z - sz) > 55 && anyRoad(x, z) > 8 && !col.inside(x, z);
            if (ok) run.push([x, z]);
            else flush();
          }
        }
        flush();
      }
    }
    if (wall.pos.length) {
      const m = new THREE.Mesh(keep(toGeo(wall)), mat({ map: wallTex, side: THREE.DoubleSide }));
      m.receiveShadow = !opts.low;
      m.castShadow = !opts.low;
      group.add(m);
    }
    if (fence.pos.length) group.add(new THREE.Mesh(keep(toGeo(fence)), mat({ map: fTex, transparent: false, alphaTest: 0.5, side: THREE.DoubleSide })));
  }

  // ------------------------------------------------------------ calçadão vermelho e grade verde do Parque
  {
    const pTex = keep(pathTex());
    const gTex = keep(fenceTex("#2e7d3a"));
    const path = acc();
    const fence = acc();
    const area = (f: number[]) => {
      let s = 0;
      const n = f.length / 2;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        s += f[i * 2] * f[j * 2 + 1] - f[j * 2] * f[i * 2 + 1];
      }
      return Math.abs(s / 2);
    };
    const big = map.parks.filter((p) => area(p) > 1500);
    let dP = 0;
    for (const pk of big) {
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
      const alongX = maxx - minx >= maxz - minz;
      const a0 = alongX ? minx : minz;
      const a1 = alongX ? maxx : maxz;
      const b0 = alongX ? minz : minx;
      const b1 = alongX ? maxz : maxx;
      const line: ([number, number] | null)[] = [];
      for (let a = a0; a <= a1; a += 3) {
        let lo = 1e9;
        let hi = -1e9;
        for (let b = b0; b <= b1; b += 2) {
          const x = alongX ? a : b;
          const z = alongX ? b : a;
          if (pointInPoly(x, z, pk)) {
            lo = Math.min(lo, b);
            hi = Math.max(hi, b);
          }
        }
        if (hi < lo || hi - lo < 8) {
          line.push(null);
          continue;
        }
        const wig = Math.sin(a * 0.045 + hash(Math.floor(a0)) * 6) * Math.min(7, (hi - lo) * 0.22);
        const b = (lo + hi) / 2 + wig;
        line.push(alongX ? [a, b] : [b, a]);
      }
      for (let i = 1; i < line.length; i++) {
        const A = line[i - 1];
        const B = line[i];
        if (!A || !B) continue;
        const L = Math.hypot(B[0] - A[0], B[1] - A[1]);
        const nx = -(B[1] - A[1]) / L;
        const nz = (B[0] - A[0]) / L;
        const w = 1.9;
        const P = [
          [A[0] - nx * w, A[1] - nz * w, dP / 4, 0],
          [B[0] - nx * w, B[1] - nz * w, (dP + L) / 4, 0],
          [B[0] + nx * w, B[1] + nz * w, (dP + L) / 4, 1],
          [A[0] + nx * w, A[1] + nz * w, dP / 4, 1],
        ];
        for (const k of [0, 2, 1, 0, 3, 2]) {
          path.pos.push(P[k][0], 0.2, P[k][1]);
          path.nor.push(0, 1, 0);
          path.uv.push(P[k][2], P[k][3]);
        }
        dP += L;
      }
      // grade verde nas bordas do maior parque, com aberturas
      if (pk === big.reduce((m, b) => (area(b) > area(m) ? b : m), big[0])) {
        let dF = 0;
        const n = q.length;
        let acum = 0;
        for (let i = 0; i < n; i++) {
          const [ax, az] = q[i];
          const [bx, bz] = q[(i + 1) % n];
          const L = Math.hypot(bx - ax, bz - az);
          if (L < 1) continue;
          const ux = (bx - ax) / L;
          const uz = (bz - az) / L;
          for (let s = 0; s < L; s += 6) {
            const e = Math.min(L, s + 6);
            acum += e - s;
            if (Math.floor(acum / 6) % 6 === 5) continue; // abertura a cada 36 m
            const x0 = ax + ux * s;
            const z0 = az + uz * s;
            const x1 = ax + ux * e;
            const z1 = az + uz * e;
            strip(fence, x0, z0, x1, z1, 0.17, 1.9, dF / 8, (dF + (e - s)) / 8);
            strip(fence, x1, z1, x0, z0, 0.17, 1.9, dF / 8, (dF + (e - s)) / 8);
            dF += e - s;
          }
        }
      }
    }
    if (path.pos.length) {
      const m = new THREE.Mesh(keep(toGeo(path)), mat({ map: pTex, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
      m.receiveShadow = !opts.low;
      group.add(m);
    }
    if (fence.pos.length) group.add(new THREE.Mesh(keep(toGeo(fence)), mat({ map: gTex, alphaTest: 0.5, side: THREE.DoubleSide })));
  }

  // ------------------------------------------------------------ placas azuis e semáforos de braço perto do viaduto
  {
    const [vx, vz] = map.landmarks.viaduto;
    const roads = map.roads.filter((r) => !r.b && POLE_ROADS.has(r.k));
    const signTex = keep(roadSignTex("Madureira Shopping", "Parque Madureira"));
    const found: { x: number; z: number; ux: number; uz: number; side: number }[] = [];
    for (const r of roads) {
      const p = pts(r.c);
      for (let i = 1; i < p.length && found.length < 5; i++) {
        const mx = (p[i][0] + p[i - 1][0]) / 2;
        const mz = (p[i][1] + p[i - 1][1]) / 2;
        const d = Math.hypot(mx - vx, mz - vz);
        if (d < 18 || d > 70) continue;
        const L = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]) || 1;
        const ux = (p[i][0] - p[i - 1][0]) / L;
        const uz = (p[i][1] - p[i - 1][1]) / L;
        for (const side of [1, -1]) {
          const x = mx - uz * (r.w / 2 + 0.7) * side;
          const z = mz + ux * (r.w / 2 + 0.7) * side;
          if (!col.inside(x, z) && !found.some((f) => Math.hypot(f.x - x, f.z - z) < 25)) {
            found.push({ x, z, ux, uz, side });
            break;
          }
        }
      }
    }
    const metal = mat({ color: 0x59595b });
    for (const f of found) {
      const g = new THREE.Group();
      g.position.set(f.x, 0.15, f.z);
      g.rotation.y = Math.atan2(f.ux, f.uz);
      const post = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.1, 0.13, 6, 8)), metal);
      post.position.set(0, 3, 0);
      // braço sobre a pista, em direção à rua (lado oposto ao poste)
      const arm = new THREE.Mesh(keep(new THREE.BoxGeometry(4.2, 0.12, 0.12)), metal);
      arm.position.set(-f.side * 2.1 * -1, 5.6, 0);
      const sign = new THREE.Mesh(keep(new THREE.PlaneGeometry(2.6, 0.82)), keep(new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide })));
      sign.position.set(f.side * 2.6 * -1, 5.2, 0.05);
      sign.rotation.y = Math.PI / 2;
      const light = new THREE.Mesh(keep(new THREE.BoxGeometry(0.28, 0.8, 0.28)), mat({ color: 0x1a1a1a }));
      light.position.set(f.side * 3.7 * -1, 5.2, 0);
      const lamp = new THREE.Mesh(keep(new THREE.SphereGeometry(0.09, 6, 6)), keep(new THREE.MeshBasicMaterial({ color: 0x22e07a })));
      lamp.position.set(f.side * 3.7 * -1, 4.98, 0.15);
      g.add(post, arm, sign, light, lamp);
      group.add(g);
    }
  }

  return {
    group,
    dispose: () => {
      for (const d of own) d.dispose();
    },
  };
}
