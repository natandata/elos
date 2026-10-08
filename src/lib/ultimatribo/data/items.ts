// Itens de A Última Tribo (só dados): armas, comida, remédios e equipamentos. Um item novo entra aqui.

export type WeaponKind = "melee" | "gun" | "bow";
export type AmmoKind = "bala" | "cartucho" | "flecha";

export type WeaponDef = {
  id: string;
  name: string;
  emoji: string;
  kind: WeaponKind;
  /** quanto maior, melhor (o saque troca a arma pela de nível mais alto) */
  tier: number;
  damage: number;
  /** projéteis por disparo (a espingarda solta vários) */
  pellets: number;
  range: number;
  /** segundos entre golpes ou disparos */
  cooldown: number;
  /** abertura do disparo, em radianos */
  spread: number;
  mag: number;
  reload: number;
  ammo?: AmmoKind;
  /** raio em que os outros sobreviventes escutam (0 = silenciosa) */
  noise: number;
};

const w = (d: WeaponDef): WeaponDef => d;

export const WEAPONS: Record<string, WeaponDef> = {
  punho: w({ id: "punho", name: "Punhos", emoji: "✊", kind: "melee", tier: 0, damage: 8, pellets: 1, range: 2.1, cooldown: 0.5, spread: 0, mag: 0, reload: 0, noise: 0 }),
  faca: w({ id: "faca", name: "Faca", emoji: "🔪", kind: "melee", tier: 1, damage: 18, pellets: 1, range: 2.2, cooldown: 0.42, spread: 0, mag: 0, reload: 0, noise: 0 }),
  bastao: w({ id: "bastao", name: "Bastão", emoji: "🏏", kind: "melee", tier: 2, damage: 24, pellets: 1, range: 2.6, cooldown: 0.62, spread: 0, mag: 0, reload: 0, noise: 0 }),
  machado: w({ id: "machado", name: "Machado", emoji: "🪓", kind: "melee", tier: 3, damage: 36, pellets: 1, range: 2.5, cooldown: 0.85, spread: 0, mag: 0, reload: 0, noise: 0 }),
  arco: w({ id: "arco", name: "Arco", emoji: "🏹", kind: "bow", tier: 1, damage: 40, pellets: 1, range: 48, cooldown: 1.15, spread: 0.012, mag: 1, reload: 0.9, ammo: "flecha", noise: 6 }),
  pistola: w({ id: "pistola", name: "Pistola", emoji: "🔫", kind: "gun", tier: 2, damage: 19, pellets: 1, range: 55, cooldown: 0.34, spread: 0.03, mag: 10, reload: 1.5, ammo: "bala", noise: 60 }),
  espingarda: w({ id: "espingarda", name: "Espingarda", emoji: "💥", kind: "gun", tier: 3, damage: 10, pellets: 8, range: 22, cooldown: 0.95, spread: 0.11, mag: 5, reload: 2.4, ammo: "cartucho", noise: 75 }),
  rifle: w({ id: "rifle", name: "Rifle", emoji: "🎯", kind: "gun", tier: 4, damage: 48, pellets: 1, range: 115, cooldown: 1.05, spread: 0.008, mag: 5, reload: 2.2, ammo: "bala", noise: 90 }),
};

export type ConsumableDef = {
  id: string;
  name: string;
  emoji: string;
  group: "food" | "drink" | "med";
  hunger?: number;
  thirst?: number;
  hp?: number;
  energy?: number;
  /** segundos para usar (o personagem fica parado e vulnerável) */
  useTime: number;
};

export const CONSUMABLES: Record<string, ConsumableDef> = {
  agua: { id: "agua", name: "Água", emoji: "💧", group: "drink", thirst: 45, useTime: 1.2 },
  pao: { id: "pao", name: "Pão", emoji: "🍞", group: "food", hunger: 28, useTime: 1.4 },
  fruta: { id: "fruta", name: "Fruta", emoji: "🍎", group: "food", hunger: 16, thirst: 12, useTime: 1 },
  carne: { id: "carne", name: "Carne", emoji: "🍖", group: "food", hunger: 50, useTime: 2 },
  enlatado: { id: "enlatado", name: "Enlatado", emoji: "🥫", group: "food", hunger: 36, useTime: 1.6 },
  bandagem: { id: "bandagem", name: "Bandagem", emoji: "🩹", group: "med", hp: 25, useTime: 2 },
  kit: { id: "kit", name: "Kit médico", emoji: "🧰", group: "med", hp: 75, useTime: 4 },
  remedio: { id: "remedio", name: "Remédio", emoji: "💊", group: "med", hp: 10, energy: 60, useTime: 1.2 },
  antisseptico: { id: "antisseptico", name: "Antisséptico", emoji: "🧴", group: "med", hp: 40, useTime: 2.6 },
};

export type GearDef = { id: string; name: string; emoji: string; armor?: number; capacity?: number };

export const GEAR: Record<string, GearDef> = {
  mochila: { id: "mochila", name: "Mochila", emoji: "🎒", capacity: 8 },
  colete: { id: "colete", name: "Colete", emoji: "🦺", armor: 60 },
  capacete: { id: "capacete", name: "Capacete", emoji: "⛑️", armor: 30 },
  lanterna: { id: "lanterna", name: "Lanterna", emoji: "🔦" },
  radio: { id: "radio", name: "Rádio", emoji: "📻" },
};

/** Espaço para comida e remédios sem mochila. */
export const BASE_CAPACITY = 8;

export type LootEntry = { id: string; n?: [number, number]; w: number };

/** Tabelas de saque por tipo de lugar. `w` é o peso no sorteio. */
export const LOOT_TABLES: Record<string, LootEntry[]> = {
  mercado: [
    { id: "agua", n: [1, 2], w: 10 },
    { id: "enlatado", n: [1, 2], w: 9 },
    { id: "pao", n: [1, 2], w: 8 },
    { id: "fruta", n: [1, 2], w: 6 },
    { id: "mochila", w: 2 },
    { id: "faca", w: 3 },
    { id: "lanterna", w: 2 },
  ],
  hospital: [
    { id: "bandagem", n: [1, 3], w: 10 },
    { id: "kit", w: 5 },
    { id: "remedio", n: [1, 2], w: 7 },
    { id: "antisseptico", w: 6 },
    { id: "agua", w: 4 },
  ],
  delegacia: [
    { id: "pistola", w: 8 },
    { id: "espingarda", w: 5 },
    { id: "rifle", w: 2 },
    { id: "bala", n: [8, 16], w: 10 },
    { id: "cartucho", n: [4, 8], w: 6 },
    { id: "colete", w: 5 },
    { id: "capacete", w: 4 },
    { id: "radio", w: 3 },
  ],
  casa: [
    { id: "agua", w: 7 },
    { id: "pao", w: 6 },
    { id: "enlatado", w: 6 },
    { id: "bandagem", w: 5 },
    { id: "faca", w: 4 },
    { id: "bastao", w: 4 },
    { id: "mochila", w: 2 },
    { id: "lanterna", w: 3 },
    { id: "bala", n: [4, 8], w: 3 },
    { id: "pistola", w: 1 },
  ],
  floresta: [
    { id: "fruta", n: [1, 3], w: 10 },
    { id: "carne", w: 6 },
    { id: "agua", n: [1, 2], w: 8 },
    { id: "arco", w: 5 },
    { id: "flecha", n: [4, 8], w: 8 },
    { id: "machado", w: 3 },
    { id: "bandagem", w: 3 },
  ],
  fazenda: [
    { id: "carne", w: 7 },
    { id: "fruta", n: [1, 3], w: 8 },
    { id: "pao", n: [1, 2], w: 7 },
    { id: "agua", n: [1, 2], w: 9 },
    { id: "machado", w: 5 },
    { id: "bastao", w: 4 },
    { id: "espingarda", w: 2 },
    { id: "cartucho", n: [3, 6], w: 4 },
    { id: "mochila", w: 2 },
  ],
  igreja: [
    { id: "kit", w: 6 },
    { id: "agua", n: [1, 2], w: 6 },
    { id: "pao", n: [1, 2], w: 6 },
    { id: "colete", w: 4 },
    { id: "rifle", w: 3 },
    { id: "bala", n: [6, 12], w: 5 },
    { id: "radio", w: 4 },
    { id: "mochila", w: 3 },
  ],
  rodovia: [
    { id: "agua", w: 6 },
    { id: "enlatado", w: 6 },
    { id: "bandagem", w: 5 },
    { id: "bastao", w: 4 },
    { id: "pistola", w: 2 },
    { id: "bala", n: [4, 10], w: 5 },
    { id: "lanterna", w: 3 },
    { id: "radio", w: 2 },
  ],
  fabrica: [
    { id: "espingarda", w: 6 },
    { id: "rifle", w: 4 },
    { id: "pistola", w: 5 },
    { id: "bala", n: [8, 16], w: 9 },
    { id: "cartucho", n: [4, 8], w: 7 },
    { id: "colete", w: 6 },
    { id: "capacete", w: 5 },
    { id: "machado", w: 4 },
    { id: "kit", w: 3 },
  ],
  acampamento: [
    { id: "agua", n: [1, 2], w: 8 },
    { id: "carne", w: 6 },
    { id: "enlatado", w: 6 },
    { id: "bandagem", n: [1, 2], w: 6 },
    { id: "arco", w: 3 },
    { id: "flecha", n: [4, 8], w: 5 },
    { id: "mochila", w: 3 },
    { id: "radio", w: 3 },
  ],
};

export const AMMO_NAME: Record<AmmoKind, string> = { bala: "Balas", cartucho: "Cartuchos", flecha: "Flechas" };
export const isAmmo = (id: string): id is AmmoKind => id === "bala" || id === "cartucho" || id === "flecha";

export function itemLabel(id: string): { name: string; emoji: string } {
  if (WEAPONS[id]) return WEAPONS[id];
  if (CONSUMABLES[id]) return CONSUMABLES[id];
  if (GEAR[id]) return GEAR[id];
  if (isAmmo(id)) return { name: AMMO_NAME[id], emoji: id === "flecha" ? "➶" : "🔸" };
  return { name: id, emoji: "📦" };
}
