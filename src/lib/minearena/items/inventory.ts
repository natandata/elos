import { type EnchantKey, enchantLevel } from "./enchant";
import { itemDef } from "./items";

/** `wear` = usos já gastos; `ench` = bênçãos (nível por chave). */
export type Stack = { item: string; count: number; wear?: number; ench?: Partial<Record<EnchantKey, number>> } | null;
export const HOTBAR = 9;
export const INV_SLOTS = 36;

/** Inventário: 9 slots de barra + 27 de mochila + 4 de armadura. Notifica a interface a cada mudança. */
export class Inventory {
  slots: Stack[] = Array.from({ length: INV_SLOTS }, () => null);
  armor: Stack[] = [null, null, null, null];
  /** Mão esquerda: só escudo. */
  offhand: Stack = null;
  /** Grade de fabricação (3 por linha, só vale em parte quando é 2×2). */
  grid: Stack[] = Array.from({ length: 9 }, () => null);
  selected = 0;
  version = 0;
  /** Espaços do baú/fornalha aberto (ids 200+). */
  ext: { slots: Stack[]; accepts: (i: number, s: Stack) => boolean } | null = null;
  private listeners = new Set<() => void>();

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  changed(): void {
    this.version++;
    this.listeners.forEach((f) => f());
  }

  /** Guarda o item; devolve o que não coube. */
  add(item: string, count: number): number {
    const def = itemDef(item);
    if (!def || count <= 0) return count;
    let left = count;
    for (const s of this.slots) {
      if (left <= 0) break;
      if (s && s.item === item && s.count < def.maxStack) {
        const n = Math.min(def.maxStack - s.count, left);
        s.count += n;
        left -= n;
      }
    }
    for (let i = 0; i < this.slots.length && left > 0; i++) {
      if (!this.slots[i]) {
        const n = Math.min(def.maxStack, left);
        this.slots[i] = { item, count: n };
        left -= n;
      }
    }
    this.changed();
    return left;
  }

  /** Guarda um item com desgaste/bênçãos (vai pra um espaço próprio). Devolve quantos NÃO couberam. */
  addStack(s: NonNullable<Stack>): number {
    if (!s.wear && !s.ench) return this.add(s.item, s.count);
    const i = this.slots.findIndex((x) => !x);
    if (i < 0) return s.count;
    this.slots[i] = { ...s, count: 1 };
    this.changed();
    return s.count - 1;
  }

  count(item: string): number {
    return this.slots.reduce((n, s) => n + (s && s.item === item ? s.count : 0), 0);
  }

  remove(item: string, count: number): boolean {
    if (this.count(item) < count) return false;
    let left = count;
    for (let i = this.slots.length - 1; i >= 0 && left > 0; i--) {
      const s = this.slots[i];
      if (s && s.item === item) {
        const n = Math.min(s.count, left);
        s.count -= n;
        left -= n;
        if (s.count <= 0) this.slots[i] = null;
      }
    }
    this.changed();
    return true;
  }

  held(): Stack {
    return this.slots[this.selected];
  }
  consumeHeld(n = 1): void {
    const s = this.slots[this.selected];
    if (!s) return;
    s.count -= n;
    if (s.count <= 0) this.slots[this.selected] = null;
    this.changed();
  }
  select(i: number): void {
    this.selected = ((i % HOTBAR) + HOTBAR) % HOTBAR;
    this.changed();
  }

  armorDefense(): number {
    return this.armor.reduce((n, s) => n + (s ? (itemDef(s.item)?.armor?.def ?? 0) + enchantLevel(s, "guarda") : 0), 0);
  }

  /** Slots: 0–35 mochila/barra, 100–103 armadura, 104 mão esquerda. */
  getSlot(i: number): Stack {
    if (i >= 300) return this.grid[i - 300] ?? null;
    if (i >= 200) return this.ext?.slots[i - 200] ?? null;
    if (i === 104) return this.offhand;
    return i >= 100 ? this.armor[i - 100] : this.slots[i];
  }
  setSlot(i: number, s: Stack): void {
    if (i >= 300) this.grid[i - 300] = s;
    else if (i >= 200) {
      if (this.ext) this.ext.slots[i - 200] = s;
    } else if (i === 104) this.offhand = s;
    else if (i >= 100) this.armor[i - 100] = s;
    else this.slots[i] = s;
  }
  /** O item pode ficar neste slot? (armaduras só no slot certo) */
  accepts(i: number, s: Stack): boolean {
    if (i >= 300) return i < 309;
    if (i >= 200) return this.ext ? this.ext.accepts(i - 200, s) : false;
    if (i < 100 || !s) return true;
    if (i === 104) return !!itemDef(s.item)?.shield;
    return itemDef(s.item)?.armor?.slot === i - 100;
  }

  toJSON(): { slots: Stack[]; armor: Stack[]; offhand: Stack; selected: number } {
    return { slots: this.slots, armor: this.armor, offhand: this.offhand, selected: this.selected };
  }
  load(d: { slots?: Stack[]; armor?: Stack[]; offhand?: Stack; selected?: number } | undefined): void {
    if (!d) return;
    const clean = (s: Stack | undefined): Stack => {
      if (!s || !itemDef(s.item) || s.count <= 0) return null;
      const o: NonNullable<Stack> = { item: s.item, count: s.count };
      if (s.wear) o.wear = s.wear;
      if (s.ench && Object.keys(s.ench).length) o.ench = { ...s.ench };
      return o;
    };
    this.slots = Array.from({ length: INV_SLOTS }, (_, i) => clean(d.slots?.[i]));
    this.armor = [0, 1, 2, 3].map((i) => clean(d.armor?.[i]));
    this.offhand = itemDef(d.offhand?.item ?? "")?.shield ? clean(d.offhand) : null;
    this.selected = d.selected ?? 0;
    this.changed();
  }
}
