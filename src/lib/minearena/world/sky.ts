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
    // nuvens de blocos que passam devagar
    const geo = new THREE.BoxGeometry(1, 1, 1);
    for (let i = 0; i < 16; i++) {
      const c = new THREE.Group();
      const n = 3 + Math.floor(Math.random() * 4);
      for (let k = 0; k < n; k++) {
        const m = new THREE.Mesh(geo, this.cloudMat);
        m.scale.set(10 + Math.random() * 14, 4 + Math.random() * 2, 8 + Math.random() * 8);
        m.position.set((k - n / 2) * 9 + Math.random() * 4, Math.random() * 2, (Math.random() - 0.5) * 8);
        c.add(m);
      }
      c.position.set((Math.random() - 0.5) * 520, 92 + Math.random() * 14, (Math.random() - 0.5) * 520);
      this.clouds.add(c);
    }
    scene.add(this.clouds);
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
    this.clouds.children.forEach((c) => {
      c.position.x += 0.012;
      if (c.position.x - cam.x > 260) c.position.x -= 520;
      if (c.position.x - cam.x < -260) c.position.x += 520;
      if (c.position.z - cam.z > 260) c.position.z -= 520;
      if (c.position.z - cam.z < -260) c.position.z += 520;
    });
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
    this.clouds.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
    this.cloudMat.dispose();
    this.clouds.removeFromParent();
    this.stars.geometry.dispose();
    (this.stars.material as THREE.Material).dispose();
    this.stars.removeFromParent();
    this.ambient.removeFromParent();
    this.sun.removeFromParent();
  }
}
