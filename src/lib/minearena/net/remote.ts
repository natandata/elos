// Outros jogadores da sala: modelos 3D com nome, movimento suave e animação de caminhada.
import * as THREE from "three";
import { type Rig, animate, buildModel, disposeRig } from "../entities/models";
import { hashInt } from "../world/noise";

const SKINS = [0xd09a6a, 0xc58a5a, 0xe0ac84, 0xb98058, 0xcf9868, 0xd9a272];
const SHIRTS = [0x2f6fd0, 0xc2272d, 0x2f8f43, 0x6a2f9a, 0xe0902a, 0x1f9aa8];

export interface RemotePlayer {
  id: string;
  name: string;
  rig: Rig;
  label: THREE.Sprite;
  x: number;
  y: number;
  z: number;
  yaw: number;
  tx: number;
  ty: number;
  tz: number;
  tyaw: number;
  speed: number;
  anim: number;
  seen: number;
}

function nameSprite(name: string): THREE.Sprite {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 48;
  const g = c.getContext("2d")!;
  g.font = "bold 26px sans-serif";
  g.textAlign = "center";
  const w = Math.min(244, g.measureText(name).width + 24);
  g.fillStyle = "rgba(10,12,30,0.75)";
  g.fillRect(128 - w / 2, 4, w, 40);
  g.strokeStyle = "#ffcf5a";
  g.lineWidth = 2;
  g.strokeRect(128 - w / 2, 4, w, 40);
  g.fillStyle = "#fff6dd";
  g.fillText(name.slice(0, 18), 128, 34);
  const t = new THREE.CanvasTexture(c);
  const m = new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true });
  const s = new THREE.Sprite(m);
  s.scale.set(1.9, 0.36, 1);
  s.renderOrder = 10;
  return s;
}

export class RemotePlayers {
  readonly list = new Map<string, RemotePlayer>();
  constructor(private scene: THREE.Scene) {}

  add(id: string, name: string, x: number, y: number, z: number): RemotePlayer {
    const h = hashInt(7, id.charCodeAt(0) || 1, id.charCodeAt(id.length - 1) || 1, id.length);
    const rig = buildModel({
      kind: "humanoid",
      scale: 0.95,
      skin: SKINS[h % SKINS.length],
      hair: 0x2a1c14,
      hairStyle: h % 3 === 0 ? "long" : "short",
      shirt: SHIRTS[(h >> 3) % SHIRTS.length],
      pants: 0x4a3a2a,
      shoes: 0x2e2218,
      belt: 0xe0b84a,
    });
    const label = nameSprite(name);
    label.position.y = 2.35;
    rig.root.add(label);
    rig.root.position.set(x, y, z);
    this.scene.add(rig.root);
    const p: RemotePlayer = { id, name, rig, label, x, y, z, yaw: 0, tx: x, ty: y, tz: z, tyaw: 0, speed: 0, anim: 0, seen: performance.now() };
    this.list.set(id, p);
    return p;
  }

  remove(id: string): void {
    const p = this.list.get(id);
    if (!p) return;
    (p.label.material as THREE.SpriteMaterial).map?.dispose();
    p.label.material.dispose();
    disposeRig(p.rig);
    this.list.delete(id);
  }

  setTarget(id: string, x: number, y: number, z: number, yaw: number): void {
    const p = this.list.get(id);
    if (!p) return;
    p.tx = x;
    p.ty = y;
    p.tz = z;
    p.tyaw = yaw;
    p.seen = performance.now();
  }

  update(dt: number): void {
    const k = Math.min(1, dt * 9);
    for (const p of this.list.values()) {
      const ox = p.x;
      const oz = p.z;
      p.x += (p.tx - p.x) * k;
      p.y += (p.ty - p.y) * k;
      p.z += (p.tz - p.z) * k;
      let dy = p.tyaw - p.yaw;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      p.yaw += dy * k;
      p.speed = p.speed * 0.7 + (Math.hypot(p.x - ox, p.z - oz) / Math.max(dt, 0.001)) * 0.3;
      p.anim += dt;
      p.rig.root.position.set(p.x, p.y, p.z);
      p.rig.root.rotation.y = p.yaw;
      animate(p.rig, { t: p.anim, speed: p.speed, attack: 0, windup: 0, dead: 0 });
    }
  }

  /** Posições dos outros jogadores (pros criaturas escolherem alvo). */
  positions(): { id: string; x: number; y: number; z: number }[] {
    return [...this.list.values()].map((p) => ({ id: p.id, x: p.tx, y: p.ty, z: p.tz }));
  }

  dispose(): void {
    for (const id of [...this.list.keys()]) this.remove(id);
  }
}
