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
  setClouds(on: boolean): void {
    this.clouds.visible = on && !this.fire;
  }
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
    (this.scene.background as THREE.Color).copy(sky);
    this.fog.color.copy(sky);
    const dir = new THREE.Vector3(Math.cos(ang), sunH, 0.3).normalize();
    this.sunMesh.position.copy(cam).addScaledVector(dir, 220);
    this.sunMesh.lookAt(cam);
    this.moonMesh.position.copy(cam).addScaledVector(dir, -220);
    this.moonMesh.lookAt(cam);
    this.stars.position.copy(cam);
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
    this.sun.intensity = 0.15 + this.daylight * 1.0;
    this.ambient.intensity = 0.22 + this.daylight * 0.65;
    const k = 0.2 + this.daylight * 0.8;
    for (const m of this.worldMat) m.color.setRGB(k * (0.85 + 0.15 * this.daylight), k * (0.9 + 0.1 * this.daylight), k);
  }

  dispose(): void {
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
