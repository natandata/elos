// Partículas em um único InstancedMesh (barato mesmo no celular).
import * as THREE from "three";

const MAX = 220;

export class Particles {
  private mesh: THREE.InstancedMesh;
  private px = new Float32Array(MAX);
  private py = new Float32Array(MAX);
  private pz = new Float32Array(MAX);
  private vx = new Float32Array(MAX);
  private vy = new Float32Array(MAX);
  private vz = new Float32Array(MAX);
  private life = new Float32Array(MAX);
  private size = new Float32Array(MAX);
  private next = 0;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private s = new THREE.Vector3();
  private p = new THREE.Vector3();

  constructor(scene: THREE.Scene) {
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff }), MAX);
    this.mesh.frustumCulled = false;
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
    scene.add(this.mesh);
    for (let i = 0; i < MAX; i++) this.hide(i);
  }

  private hide(i: number): void {
    this.life[i] = 0;
    this.m.makeScale(0, 0, 0);
    this.mesh.setMatrixAt(i, this.m);
  }

  burst(x: number, y: number, z: number, color: number, n: number, speed = 3, size = 0.12, up = 2): void {
    const c = new THREE.Color(color);
    for (let k = 0; k < n; k++) {
      const i = this.next++ % MAX;
      this.px[i] = x + (Math.random() - 0.5) * 0.5;
      this.py[i] = y + (Math.random() - 0.5) * 0.5;
      this.pz[i] = z + (Math.random() - 0.5) * 0.5;
      this.vx[i] = (Math.random() - 0.5) * speed;
      this.vy[i] = Math.random() * speed * 0.8 + up * 0.5;
      this.vz[i] = (Math.random() - 0.5) * speed;
      this.life[i] = 0.5 + Math.random() * 0.5;
      this.size[i] = size * (0.6 + Math.random() * 0.8);
      const j = 0.85 + Math.random() * 0.3;
      this.mesh.setColorAt(i, new THREE.Color(c.r * j, c.g * j, c.b * j));
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  update(dt: number): void {
    for (let i = 0; i < MAX; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.hide(i);
        continue;
      }
      this.vy[i] -= 14 * dt;
      this.px[i] += this.vx[i] * dt;
      this.py[i] += this.vy[i] * dt;
      this.pz[i] += this.vz[i] * dt;
      const sc = this.size[i] * Math.min(1, this.life[i] * 3);
      this.p.set(this.px[i], this.py[i], this.pz[i]);
      this.s.set(sc, sc, sc);
      this.m.compose(this.p, this.q, this.s);
      this.mesh.setMatrixAt(i, this.m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.mesh.dispose();
    this.mesh.removeFromParent();
  }
}
