// Ciclo de dia e noite: céu, névoa, luz, sol, lua e estrelas.
import * as THREE from "three";

const DAY = new THREE.Color(0x87c7f0);
const DUSK = new THREE.Color(0xf0955a);
const NIGHT = new THREE.Color(0x070b22);

export class Sky {
  readonly ambient = new THREE.AmbientLight(0xffffff, 0.8);
  readonly sun = new THREE.DirectionalLight(0xfff2d0, 1.1);
  private sunMesh: THREE.Mesh;
  private moonMesh: THREE.Mesh;
  private stars: THREE.Points;
  private fog: THREE.Fog;
  daylight = 1;
  /** Tempo fechado (0–1): céu mais cinza e escuro. */
  dim = 0;
  private cloudsOn = true;
  setClouds(on: boolean): void {
    this.cloudsOn = on;
    this.clouds.visible = on && !this.fire && this.starry < 0.02;
  }

  // ---- céu extremamente estrelado (cena de Abraão contando as estrelas) ----
  private starry = 0;
  private starryTarget = 0;
  private starLast = performance.now();
  private starGroups: { pts: THREE.Points; phase: number; speed: number }[] = [];
  private static readonly STARRY_SKY = new THREE.Color(0x02030f);

  /** Liga/desliga o céu cheio de estrelas (surge e some devagar). */
  setStarry(on: boolean): void {
    this.starryTarget = on ? 1 : 0;
    if (on && this.starGroups.length === 0) this.buildStarry();
  }

  private buildStarry(): void {
    const R = 300;
    const PALETTE = [new THREE.Color(0xffffff), new THREE.Color(0xcfe0ff), new THREE.Color(0xfff1c8), new THREE.Color(0xffd9b0), new THREE.Color(0xb8d0ff)];
    const make = (n: number, size: number, pick: () => [number, number, number], bright: [number, number]) => {
      const pos = new Float32Array(n * 3);
      const col = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const [x, y, z] = pick();
        pos[i * 3] = x * R;
        pos[i * 3 + 1] = y * R;
        pos[i * 3 + 2] = z * R;
        const c = PALETTE[Math.floor(Math.random() * PALETTE.length)];
        const b = bright[0] + Math.random() * (bright[1] - bright[0]);
        col[i * 3] = c.r * b;
        col[i * 3 + 1] = c.g * b;
        col[i * 3 + 2] = c.b * b;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      g.setAttribute("color", new THREE.BufferAttribute(col, 3));
      const pts = new THREE.Points(g, new THREE.PointsMaterial({ size, vertexColors: true, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false, blending: THREE.AdditiveBlending }));
      pts.frustumCulled = false;
      pts.visible = false;
      this.scene.add(pts);
      return pts;
    };
    // direção aleatória na esfera, um pouco abaixo do horizonte também (o céu "desce" até o chão)
    const sphere = (): [number, number, number] => {
      const u = Math.random() * 1.1 - 0.1;
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      return [Math.cos(a) * r, u, Math.sin(a) * r];
    };
    // Via Láctea: faixa densa ao redor de um círculo máximo inclinado
    const nrm = new THREE.Vector3(0.35, 0.82, 0.45).normalize();
    const e1 = new THREE.Vector3().crossVectors(nrm, new THREE.Vector3(0, 0, 1)).normalize();
    const e2 = new THREE.Vector3().crossVectors(nrm, e1).normalize();
    const band = (): [number, number, number] => {
      for (;;) {
        const a = Math.random() * Math.PI * 2;
        const off = (Math.random() + Math.random() + Math.random() - 1.5) * 0.2;
        const v = e1.clone().multiplyScalar(Math.cos(a)).addScaledVector(e2, Math.sin(a)).addScaledVector(nrm, off).normalize();
        if (v.y > -0.1) return [v.x, v.y, v.z];
      }
    };
    this.starGroups = [
      { pts: make(14000, 2.6, sphere, [0.7, 1.2]), phase: 0, speed: 1.1 },
      { pts: make(5000, 3.8, sphere, [0.9, 1.3]), phase: 2, speed: 1.7 },
      { pts: make(1200, 6, sphere, [1.1, 1.5]), phase: 4, speed: 2.3 },
      { pts: make(24000, 2.4, band, [0.55, 1.1]), phase: 1, speed: 0.6 },
    ];  }
  private fire = false;
  setMaterials(mats: THREE.MeshBasicMaterial[]): void {
    this.worldMat = mats;
  }
  /** Geena: sem sol nem lua, céu e névoa vermelhos e luz fixa. */
  setFire(on: boolean): void {
    this.fire = on;
    this.sunMesh.visible = this.moonMesh.visible = this.stars.visible = !on;
    this.clouds.visible = !on;
  }
  updateFire(): void {
    const bg = new THREE.Color(0x2a0806);
    (this.scene.background as THREE.Color).copy(bg);
    this.fog.color.copy(bg);
    this.daylight = 0;
    this.sun.intensity = 0.2;
    this.ambient.intensity = 0.55;
    for (const m of this.worldMat) m.color.setRGB(0.9, 0.62, 0.55);
  }
  private clouds = new THREE.Group();
  private cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, fog: false, depthWrite: false });

  constructor(
    private scene: THREE.Scene,
    far: number,
    private worldMat: THREE.MeshBasicMaterial[],
  ) {
    this.fog = new THREE.Fog(DAY, far * 0.45, far);
    scene.fog = this.fog;
    scene.background = DAY.clone();
    scene.add(this.ambient, this.sun);
    this.sunMesh = new THREE.Mesh(new THREE.BoxGeometry(20, 20, 2), new THREE.MeshBasicMaterial({ color: 0xffe9a0, fog: false }));
    this.moonMesh = new THREE.Mesh(new THREE.BoxGeometry(14, 14, 2), new THREE.MeshBasicMaterial({ color: 0xdfe8ff, fog: false }));
    scene.add(this.sunMesh, this.moonMesh);
    const n = 350;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 2 - 1;
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      pos[i * 3] = Math.cos(a) * r * 300;
      pos[i * 3 + 1] = Math.abs(u) * 300 * 0.9 + 20;
      pos[i * 3 + 2] = Math.sin(a) * r * 300;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.stars = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false }));
    scene.add(this.stars);
    // nuvens de blocos que passam devagar (uma única malha instanciada = 1 chamada de desenho)
    const parts: { g: number; x: number; y: number; z: number; sx: number; sy: number; sz: number }[] = [];
    for (let i = 0; i < 16; i++) {
      const n = 3 + Math.floor(Math.random() * 4);
      this.cloudPos.push({ x: (Math.random() - 0.5) * 520, y: 92 + Math.random() * 14, z: (Math.random() - 0.5) * 520 });
      for (let k = 0; k < n; k++) {
        parts.push({ g: i, x: (k - n / 2) * 9 + Math.random() * 4, y: Math.random() * 2, z: (Math.random() - 0.5) * 8, sx: 10 + Math.random() * 14, sy: 4 + Math.random() * 2, sz: 8 + Math.random() * 8 });
      }
    }
    this.cloudParts = parts;
    this.cloudMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), this.cloudMat, parts.length);
    this.cloudMesh.frustumCulled = false;
    this.clouds.add(this.cloudMesh);
    this.refreshClouds();
    scene.add(this.clouds);
  }

  private cloudPos: { x: number; y: number; z: number }[] = [];
  private cloudParts: { g: number; x: number; y: number; z: number; sx: number; sy: number; sz: number }[] = [];
  private cloudMesh!: THREE.InstancedMesh;
  private cloudTick = 0;
  private m4 = new THREE.Matrix4();
  private refreshClouds(): void {
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const sc = new THREE.Vector3();
    this.cloudParts.forEach((part, i) => {
      const g = this.cloudPos[part.g];
      p.set(g.x + part.x, g.y + part.y, g.z + part.z);
      sc.set(part.sx, part.sy, part.sz);
      this.m4.compose(p, q, sc);
      this.cloudMesh.setMatrixAt(i, this.m4);
    });
    this.cloudMesh.instanceMatrix.needsUpdate = true;
  }

  /** t: 0 amanhecer · .25 meio-dia · .5 pôr do sol · .75 meia-noite. */
  update(t: number, cam: THREE.Vector3): void {
    const ang = t * Math.PI * 2;
    const sunH = Math.sin(ang);
    this.daylight = Math.min(1, Math.max(0, sunH * 2 + 0.3));
    const dusk = Math.max(0, 1 - Math.abs(sunH) * 4);
    const sky = NIGHT.clone().lerp(DAY, this.daylight).lerp(DUSK, dusk * 0.55);
    if (this.dim > 0) sky.lerp(new THREE.Color(0x6b7380), this.dim * 0.55).multiplyScalar(1 - 0.3 * this.dim);
    (this.scene.background as THREE.Color).copy(sky);
    this.fog.color.copy(sky);
    const dir = new THREE.Vector3(Math.cos(ang), sunH, 0.3).normalize();
    this.sunMesh.position.copy(cam).addScaledVector(dir, 220);
    this.sunMesh.lookAt(cam);
    this.moonMesh.position.copy(cam).addScaledVector(dir, -220);
    this.moonMesh.lookAt(cam);
    this.stars.position.copy(cam);
    this.updateStarry(cam, sky);
    if ((this.cloudTick++ & 3) === 0) {
      for (const c of this.cloudPos) {
        c.x += 0.048;
        if (c.x - cam.x > 260) c.x -= 520;
        if (c.x - cam.x < -260) c.x += 520;
        if (c.z - cam.z > 260) c.z -= 520;
        if (c.z - cam.z < -260) c.z += 520;
      }
      this.refreshClouds();
    }
    const shade = 0.25 + this.daylight * 0.75;
    this.cloudMat.color.setRGB(shade, shade * (0.9 + 0.1 * dusk), shade * (1 - dusk * 0.2));
    (this.stars.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - this.daylight * 1.6);
    this.sun.position.copy(cam).addScaledVector(dir, 60);
    this.sun.intensity = (0.15 + this.daylight * 1.0) * (1 - 0.5 * this.dim);
    this.ambient.intensity = 0.22 + this.daylight * 0.65;
    const k = (0.2 + this.daylight * 0.8) * (1 - 0.22 * this.dim);
    for (const m of this.worldMat) m.color.setRGB(k * (0.85 + 0.15 * this.daylight), k * (0.9 + 0.1 * this.daylight), k);
  }

  /** Sobe/desce o céu estrelado, escurece o fundo e faz as estrelas piscarem. */
  private updateStarry(cam: THREE.Vector3, sky: THREE.Color): void {
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.starLast) / 1000);
    this.starLast = now;
    const d = this.starryTarget - this.starry;
    this.starry += Math.sign(d) * Math.min(Math.abs(d), dt / 2.5);
    const k = this.starry;
    const on = k > 0.001;
    for (const g of this.starGroups) {
      g.pts.visible = on && !this.fire;
      if (!g.pts.visible) continue;
      g.pts.position.copy(cam);
      (g.pts.material as THREE.PointsMaterial).opacity = k * (0.82 + 0.18 * Math.sin(now / 1000 * g.speed + g.phase));
    }
    if (!on) return;
    sky.lerp(Sky.STARRY_SKY, k);
    (this.scene.background as THREE.Color).copy(sky);
    this.fog.color.copy(sky);
    this.moonMesh.visible = k < 0.5 && !this.fire;
    this.clouds.visible = this.cloudsOn && !this.fire && k < 0.02;
    (this.stars.material as THREE.PointsMaterial).opacity = Math.max((this.stars.material as THREE.PointsMaterial).opacity, k);
  }

  dispose(): void {
    for (const g of this.starGroups) {
      g.pts.geometry.dispose();
      (g.pts.material as THREE.Material).dispose();
      g.pts.removeFromParent();
    }
    for (const o of [this.sunMesh, this.moonMesh]) {
      o.geometry.dispose();
      (o.material as THREE.Material).dispose();
      o.removeFromParent();
    }
    this.cloudMesh.geometry.dispose();
    this.cloudMesh.dispose();
    this.cloudMat.dispose();
    this.clouds.removeFromParent();
    this.stars.geometry.dispose();
    (this.stars.material as THREE.Material).dispose();
    this.stars.removeFromParent();
    this.ambient.removeFromParent();
    this.sun.removeFromParent();
  }
}
