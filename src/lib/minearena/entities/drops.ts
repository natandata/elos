// Itens soltos no chão: caem, quicam, são atraídos e recolhidos quando o jogador chega perto.
import * as THREE from "three";
import { isFluid } from "../blocks/blocks";
import type { Stack } from "../items/inventory";
import { itemDef } from "../items/items";
import { type Body, newBody, stepBody } from "../player/physics";
import { itemIconUrl } from "../textures/sprites";
import type { World } from "../world/world";

type Item = NonNullable<Stack>;

export interface SavedDrop {
  s: Item;
  x: number;
  y: number;
  z: number;
  age: number;
  ttl: number;
}

interface Drop {
  stack: Item;
  body: Body;
  age: number;
  /** Tempo antes de poder ser recolhido (itens largados pelo jogador). */
  delay: number;
  ttl: number;
  sprite: THREE.Sprite;
}

const MAX_DROPS = 160;
const TTL = 300;
const textures = new Map<string, THREE.Texture>();

function materialFor(item: string): THREE.SpriteMaterial {
  let t = textures.get(item);
  if (!t) {
    t = new THREE.TextureLoader().load(itemIconUrl(item));
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.colorSpace = THREE.SRGBColorSpace;
    textures.set(item, t);
  }
  return new THREE.SpriteMaterial({ map: t, transparent: true, alphaTest: 0.05 });
}

export class Drops {
  private list: Drop[] = [];
  private clock = 0;

  constructor(
    private scene: THREE.Scene,
    private world: World,
  ) {}

  setWorld(w: World): void {
    this.world = w;
    this.dispose();
  }

  get count(): number {
    return this.list.length;
  }

  spawn(stack: Item, x: number, y: number, z: number, vx?: number, vy?: number, vz?: number, delay = 0.35, ttl = TTL, age = 0): void {
    if (!itemDef(stack.item)) return;
    const body = newBody(x, y, z, 0.25, 0.25);
    body.vx = vx ?? (Math.random() - 0.5) * 2.4;
    body.vy = vy ?? 2.5 + Math.random() * 1.5;
    body.vz = vz ?? (Math.random() - 0.5) * 2.4;
    const sprite = new THREE.Sprite(materialFor(stack.item));
    sprite.scale.set(0.42, 0.42, 1);
    this.scene.add(sprite);
    this.list.push({ stack: { ...stack }, body, age, delay, ttl, sprite });
    while (this.list.length > MAX_DROPS) this.remove(0);
  }

  private remove(i: number): void {
    const d = this.list[i];
    this.scene.remove(d.sprite);
    d.sprite.material.dispose();
    this.list.splice(i, 1);
  }

  /** `pickup` recebe o item e devolve quantos NÃO couberam na mochila. */
  update(dt: number, px: number, py: number, pz: number, canPick: boolean, pickup: (s: Item) => number): void {
    this.clock += dt;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const d = this.list[i];
      d.age += dt;
      d.delay -= dt;
      const b = d.body;
      if (d.age > d.ttl || b.y < -8) {
        this.remove(i);
        continue;
      }
      if (isFluid(this.world.getBlock(Math.floor(b.x), Math.floor(b.y + 0.1), Math.floor(b.z)), "lava")) {
        this.remove(i);
        continue;
      }
      const dx = px - b.x;
      const dy = py + 0.8 - b.y;
      const dz = pz - b.z;
      const dist = Math.hypot(dx, dy, dz);
      if (canPick && d.delay <= 0 && dist < 3) {
        const k = 7 / Math.max(0.3, dist);
        b.vx += (dx * k - b.vx) * Math.min(1, dt * 6);
        b.vz += (dz * k - b.vz) * Math.min(1, dt * 6);
        b.vy += (dy * k - b.vy) * Math.min(1, dt * 4);
      } else {
        b.vy = Math.max(-14, Math.min(1.5, b.vy + (b.inWater ? 7 : -22) * dt));
        const f = Math.exp(-(b.onGround ? 9 : 0.6) * dt);
        b.vx *= f;
        b.vz *= f;
      }
      stepBody(this.world, b, dt);
      if (canPick && d.delay <= 0 && Math.hypot(px - b.x, pz - b.z) < 1.15 && Math.abs(py + 0.8 - b.y) < 1.7) {
        const left = pickup(d.stack);
        if (left <= 0) {
          this.remove(i);
          continue;
        }
        d.stack.count = left;
        d.delay = 1;
      }
      d.sprite.position.set(b.x, b.y + 0.24 + Math.sin(this.clock * 3 + i) * 0.05, b.z);
    }
  }

  /** Quantos itens soltos (de um tipo) existem perto de um ponto, pra mostrar no mapa. */
  toJSON(): SavedDrop[] {
    return this.list.map((d) => ({ s: d.stack, x: +d.body.x.toFixed(2), y: +d.body.y.toFixed(2), z: +d.body.z.toFixed(2), age: Math.round(d.age), ttl: d.ttl }));
  }

  load(arr: SavedDrop[] | undefined): void {
    for (const s of arr ?? []) {
      if (!s?.s || !itemDef(s.s.item) || !(s.s.count > 0)) continue;
      this.spawn(s.s, s.x, s.y + 0.1, s.z, 0, 0, 0, 0, s.ttl, s.age);
    }
  }

  dispose(): void {
    while (this.list.length) this.remove(0);
  }
}
