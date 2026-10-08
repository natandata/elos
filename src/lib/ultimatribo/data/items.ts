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
  /** abertura do disparo parado, em radianos */
  spread: number;
  /** quanto cada disparo abre a mira (recuo) */
  recoil: number;
  /** automática: segurar o gatilho continua atirando */
  auto: boolean;
  /** aproximação da mira (1 = sem luneta) */
  zoom: number;
  mag: number;
  reload: number;
  ammo?: AmmoKind;
  /** raio em que os outros sobreviventes escutam (0 = silenciosa) */
  noise: number;
  /** queda da bala: metros que ela desce = drop × distância² (0 no corpo a corpo) */
  drop: number;
};

const melee = (id: string, name: string, emoji: string, tier: number, damage: number, range: number, cooldown: number): WeaponDef => ({ id, name, emoji, kind: "melee", tier, damage, pellets: 1, range, cooldown, spread: 0, recoil: 0, auto: true, zoom: 1, mag: 0, reload: 0, noise: 0, drop: 0 });

export const WEAPONS: Record<string, WeaponDef> = {
  punho: melee("punho", "Punhos", "✊", 0, 9, 2.1, 0.5),
  faca: melee("faca", "Faca", "🔪", 1, 20, 2.2, 0.42),
  bastao: melee("bastao", "Bastão", "🏏", 2, 26, 2.6, 0.62),
  machado: melee("machado", "Machado", "🪓", 3, 38, 2.5, 0.85),
  frigideira: melee("frigideira", "Frigideira", "🍳", 4, 44, 2.3, 0.8),
  arco: { id: "arco", name: "Besta", emoji: "🏹", kind: "bow", tier: 1, damage: 52, pellets: 1, range: 60, cooldown: 1.2, spread: 0.01, recoil: 0.01, auto: false, zoom: 1.5, mag: 1, reload: 1.6, ammo: "flecha", noise: 6, drop: 0.0009 },
  pistola: { id: "pistola", name: "Pistola", emoji: "🔫", kind: "gun", tier: 2, damage: 20, pellets: 1, range: 55, cooldown: 0.22, spread: 0.028, recoil: 0.012, auto: false, zoom: 1.25, mag: 15, reload: 1.6, ammo: "bala", noise: 60, drop: 0.0004 },
  submetralhadora: { id: "submetralhadora", name: "Submetralhadora", emoji: "🔫", kind: "gun", tier: 3, damage: 15, pellets: 1, range: 45, cooldown: 0.085, spread: 0.035, recoil: 0.009, auto: true, zoom: 1.3, mag: 25, reload: 2.1, ammo: "bala", noise: 65, drop: 0.0003 },
  espingarda: { id: "espingarda", name: "Espingarda", emoji: "💥", kind: "gun", tier: 3, damage: 11, pellets: 9, range: 24, cooldown: 0.9, spread: 0.1, recoil: 0.05, auto: false, zoom: 1.15, mag: 5, reload: 2.6, ammo: "cartucho", noise: 75, drop: 0.0006 },
  fuzil: { id: "fuzil", name: "Fuzil", emoji: "🪖", kind: "gun", tier: 4, damage: 24, pellets: 1, range: 85, cooldown: 0.1, spread: 0.016, recoil: 0.011, auto: true, zoom: 1.6, mag: 30, reload: 2.4, ammo: "bala", noise: 85, drop: 0.00012 },
  rifle: { id: "rifle", name: "Rifle de precisão", emoji: "🎯", kind: "gun", tier: 4, damage: 72, pellets: 1, range: 140, cooldown: 1.5, spread: 0.004, recoil: 0.06, auto: false, zoom: 2.2, mag: 5, reload: 2.8, ammo: "bala", noise: 95, drop: 6e-05 },
};

export type AttSlot = "scope" | "mag" | "muzzle";
export type AttachmentDef = { id: string; name: string; emoji: string; slot: AttSlot; zoom?: number; magMul?: number; reloadMul?: number; noiseMul?: number; recoilMul?: number; spreadMul?: number };

/** Acessórios de arma: mira, pente e boca do cano. Cada arma aceita só alguns (WEAPON_SLOTS). */
export const ATTACHMENTS: Record<string, AttachmentDef> = {
  reddot: { id: "reddot", name: "Mira de ponto vermelho", emoji: "🔴", slot: "scope", zoom: 1.9, spreadMul: 0.85 },
  mira4x: { id: "mira4x", name: "Luneta 4x", emoji: "🔭", slot: "scope", zoom: 4 },
  mira8x: { id: "mira8x", name: "Luneta 8x", emoji: "🔭", slot: "scope", zoom: 7 },
  pente: { id: "pente", name: "Pente estendido", emoji: "🧲", slot: "mag", magMul: 1.5, reloadMul: 0.82 },
  silenciador: { id: "silenciador", name: "Silenciador", emoji: "🤫", slot: "muzzle", noiseMul: 0.2 },
  compensador: { id: "compensador", name: "Compensador", emoji: "🧯", slot: "muzzle", recoilMul: 0.62 },
};

/** O que cabe em cada arma. */
export const WEAPON_SLOTS: Record<string, { scope: string[]; mag: boolean; muzzle: boolean }> = {
  pistola: { scope: ["reddot"], mag: true, muzzle: true },
  submetralhadora: { scope: ["reddot", "mira4x"], mag: true, muzzle: true },
  fuzil: { scope: ["reddot", "mira4x"], mag: true, muzzle: true },
  rifle: { scope: ["reddot", "mira4x", "mira8x"], mag: true, muzzle: true },
  espingarda: { scope: [], mag: false, muzzle: false },
  arco: { scope: ["reddot", "mira4x"], mag: false, muzzle: false },
};

export type ConsumableDef = {
  id: string;
  name: string;
  emoji: string;
  group: "food" | "drink" | "med" | "boost";
  hunger?: number;
  thirst?: number;
  hp?: number;
  /** a cura só sobe a vida até este teto (como a bandagem e os primeiros socorros do PUBG) */
  hpCap?: number;
  energy?: number;
  boost?: number;
  /** segundos para usar (o personagem fica lento e vulnerável) */
  useTime: number;
};

export const CONSUMABLES: Record<string, ConsumableDef> = {
  agua: { id: "agua", name: "Água", emoji: "💧", group: "drink", thirst: 45, useTime: 1.4 },
  pao: { id: "pao", name: "Pão", emoji: "🍞", group: "food", hunger: 28, useTime: 1.6 },
  fruta: { id: "fruta", name: "Fruta", emoji: "🍎", group: "food", hunger: 16, thirst: 12, useTime: 1.2 },
  carne: { id: "carne", name: "Carne", emoji: "🍖", group: "food", hunger: 50, useTime: 2.2 },
  enlatado: { id: "enlatado", name: "Enlatado", emoji: "🥫", group: "food", hunger: 36, useTime: 1.8 },
  bandagem: { id: "bandagem", name: "Bandagem", emoji: "🩹", group: "med", hp: 15, hpCap: 75, useTime: 2.5 },
  socorros: { id: "socorros", name: "Primeiros socorros", emoji: "⛑️", group: "med", hp: 75, hpCap: 75, useTime: 5 },
  kit: { id: "kit", name: "Kit médico", emoji: "🧰", group: "med", hp: 100, useTime: 7 },
  energetico: { id: "energetico", name: "Energético", emoji: "🥤", group: "boost", boost: 40, energy: 40, thirst: 10, useTime: 3 },
  remedio: { id: "remedio", name: "Analgésico", emoji: "💊", group: "boost", boost: 60, energy: 30, useTime: 4 },
};

export type GearDef = { id: string; name: string; emoji: string; slot: "mochila" | "colete" | "capacete" | "lanterna" | "radio"; level: number; capacity?: number; armor?: number; reduce?: number };

/** Mochila, colete e capacete vêm em 3 níveis (como no PUBG): o nível mais alto substitui o menor. */
export const GEAR: Record<string, GearDef> = {
  mochila1: { id: "mochila1", name: "Mochila (nv. 1)", emoji: "🎒", slot: "mochila", level: 1, capacity: 5 },
  mochila2: { id: "mochila2", name: "Mochila (nv. 2)", emoji: "🎒", slot: "mochila", level: 2, capacity: 10 },
  mochila3: { id: "mochila3", name: "Mochila (nv. 3)", emoji: "🎒", slot: "mochila", level: 3, capacity: 15 },
  colete1: { id: "colete1", name: "Colete (nv. 1)", emoji: "🦺", slot: "colete", level: 1, armor: 100, reduce: 0.3 },
  colete2: { id: "colete2", name: "Colete (nv. 2)", emoji: "🦺", slot: "colete", level: 2, armor: 150, reduce: 0.4 },
  colete3: { id: "colete3", name: "Colete (nv. 3)", emoji: "🦺", slot: "colete", level: 3, armor: 200, reduce: 0.55 },
  capacete1: { id: "capacete1", name: "Capacete (nv. 1)", emoji: "🪖", slot: "capacete", level: 1, armor: 80, reduce: 0.3 },
  capacete2: { id: "capacete2", name: "Capacete (nv. 2)", emoji: "🪖", slot: "capacete", level: 2, armor: 120, reduce: 0.4 },
  capacete3: { id: "capacete3", name: "Capacete (nv. 3)", emoji: "🪖", slot: "capacete", level: 3, armor: 180, reduce: 0.55 },
  lanterna: { id: "lanterna", name: "Lanterna", emoji: "🔦", slot: "lanterna", level: 1 },
  radio: { id: "radio", name: "Rádio", emoji: "📻", slot: "radio", level: 1 },
};

/** Espaço para comida e remédios sem mochila. */
export const BASE_CAPACITY = 8;
export const MAX_GRENADES = 4;

export type LootEntry = { id: string; n?: [number, number]; w: number };

/** Tabelas de saque por tipo de lugar. `w` é o peso no sorteio. */
export const LOOT_TABLES: Record<string, LootEntry[]> = {
  mercado: [
    { id: "agua", n: [1, 2], w: 10 },
    { id: "enlatado", n: [1, 2], w: 9 },
    { id: "pao", n: [1, 2], w: 8 },
    { id: "fruta", n: [1, 2], w: 6 },
    { id: "energetico", n: [1, 2], w: 6 },
    { id: "mochila1", w: 3 },
    { id: "mochila2", w: 2 },
    { id: "faca", w: 3 },
    { id: "frigideira", w: 2 },
    { id: "lanterna", w: 2 },
  ],
  hospital: [
    { id: "bandagem", n: [2, 5], w: 10 },
    { id: "socorros", w: 7 },
    { id: "kit", w: 3 },
    { id: "remedio", n: [1, 2], w: 7 },
    { id: "energetico", n: [1, 2], w: 5 },
    { id: "agua", w: 4 },
  ],
  delegacia: [
    { id: "mira4x", w: 3 },
    { id: "reddot", w: 4 },
    { id: "pente", w: 4 },
    { id: "silenciador", w: 2 },
    { id: "compensador", w: 3 },
    { id: "pistola", w: 6 },
    { id: "submetralhadora", w: 6 },
    { id: "espingarda", w: 5 },
    { id: "fuzil", w: 4 },
    { id: "rifle", w: 2 },
    { id: "bala", n: [20, 40], w: 12 },
    { id: "cartucho", n: [5, 10], w: 6 },
    { id: "colete1", w: 4 },
    { id: "colete2", w: 4 },
    { id: "capacete1", w: 4 },
    { id: "capacete2", w: 3 },
    { id: "granada", n: [1, 2], w: 4 },
    { id: "radio", w: 3 },
  ],
  casa: [
    { id: "reddot", w: 3 },
    { id: "pente", w: 3 },
    { id: "compensador", w: 2 },
    { id: "agua", w: 7 },
    { id: "pao", w: 6 },
    { id: "enlatado", w: 6 },
    { id: "bandagem", n: [1, 3], w: 7 },
    { id: "energetico", w: 4 },
    { id: "faca", w: 3 },
    { id: "bastao", w: 3 },
    { id: "frigideira", w: 2 },
    { id: "mochila1", w: 4 },
    { id: "capacete1", w: 4 },
    { id: "colete1", w: 3 },
    { id: "lanterna", w: 2 },
    { id: "bala", n: [15, 30], w: 6 },
    { id: "pistola", w: 5 },
    { id: "submetralhadora", w: 3 },
    { id: "espingarda", w: 2 },
    { id: "cartucho", n: [5, 10], w: 2 },
  ],
  floresta: [
    { id: "fruta", n: [1, 3], w: 10 },
    { id: "carne", w: 6 },
    { id: "agua", n: [1, 2], w: 8 },
    { id: "arco", w: 5 },
    { id: "flecha", n: [5, 10], w: 8 },
    { id: "machado", w: 3 },
    { id: "bandagem", n: [1, 3], w: 4 },
    { id: "mochila1", w: 3 },
    { id: "pistola", w: 3 },
    { id: "bala", n: [15, 30], w: 4 },
  ],
  fazenda: [
    { id: "carne", w: 7 },
    { id: "fruta", n: [1, 3], w: 8 },
    { id: "pao", n: [1, 2], w: 7 },
    { id: "agua", n: [1, 2], w: 9 },
    { id: "machado", w: 4 },
    { id: "frigideira", w: 3 },
    { id: "espingarda", w: 5 },
    { id: "cartucho", n: [5, 10], w: 6 },
    { id: "mochila2", w: 3 },
    { id: "colete1", w: 3 },
    { id: "bandagem", n: [1, 3], w: 4 },
  ],
  igreja: [
    { id: "mira4x", w: 3 },
    { id: "silenciador", w: 2 },
    { id: "socorros", w: 6 },
    { id: "kit", w: 3 },
    { id: "agua", n: [1, 2], w: 6 },
    { id: "pao", n: [1, 2], w: 6 },
    { id: "colete2", w: 4 },
    { id: "capacete2", w: 4 },
    { id: "rifle", w: 4 },
    { id: "fuzil", w: 3 },
    { id: "bala", n: [20, 40], w: 7 },
    { id: "radio", w: 4 },
    { id: "mochila2", w: 3 },
  ],
  rodovia: [
    { id: "reddot", w: 2 },
    { id: "pente", w: 2 },
    { id: "agua", w: 6 },
    { id: "enlatado", w: 6 },
    { id: "energetico", w: 5 },
    { id: "bandagem", n: [1, 3], w: 6 },
    { id: "bastao", w: 3 },
    { id: "pistola", w: 5 },
    { id: "submetralhadora", w: 3 },
    { id: "bala", n: [15, 30], w: 7 },
    { id: "capacete1", w: 3 },
    { id: "mochila1", w: 3 },
    { id: "lanterna", w: 2 },
    { id: "radio", w: 2 },
  ],
  fabrica: [
    { id: "mira4x", w: 4 },
    { id: "mira8x", w: 1 },
    { id: "pente", w: 4 },
    { id: "silenciador", w: 3 },
    { id: "compensador", w: 3 },
    { id: "espingarda", w: 5 },
    { id: "fuzil", w: 6 },
    { id: "rifle", w: 3 },
    { id: "submetralhadora", w: 5 },
    { id: "bala", n: [20, 40], w: 12 },
    { id: "cartucho", n: [5, 10], w: 6 },
    { id: "colete2", w: 5 },
    { id: "colete3", w: 1 },
    { id: "capacete2", w: 5 },
    { id: "capacete3", w: 1 },
    { id: "mochila3", w: 2 },
    { id: "granada", n: [1, 2], w: 5 },
    { id: "socorros", w: 4 },
  ],
  acampamento: [
    { id: "reddot", w: 3 },
    { id: "mira4x", w: 2 },
    { id: "agua", n: [1, 2], w: 8 },
    { id: "carne", w: 6 },
    { id: "enlatado", w: 6 },
    { id: "bandagem", n: [2, 4], w: 7 },
    { id: "socorros", w: 3 },
    { id: "arco", w: 3 },
    { id: "flecha", n: [5, 10], w: 5 },
    { id: "fuzil", w: 2 },
    { id: "bala", n: [15, 30], w: 5 },
    { id: "mochila2", w: 3 },
    { id: "radio", w: 3 },
  ],
};

/** A caixa de suprimentos que cai de paraquedas: sempre o melhor equipamento. */
export const AIRDROP_ITEMS: Record<string, number> = { rifle: 1, fuzil: 1, mira8x: 1, silenciador: 1, pente: 1, bala: 90, colete3: 1, capacete3: 1, mochila3: 1, kit: 2, remedio: 2, granada: 2 };

export const AMMO_NAME: Record<AmmoKind, string> = { bala: "Balas", cartucho: "Cartuchos", flecha: "Flechas" };
export const isAmmo = (id: string): id is AmmoKind => id === "bala" || id === "cartucho" || id === "flecha";

export function itemLabel(id: string): { name: string; emoji: string } {
  if (WEAPONS[id]) return WEAPONS[id];
  if (CONSUMABLES[id]) return CONSUMABLES[id];
  if (GEAR[id]) return GEAR[id];
  if (ATTACHMENTS[id]) return ATTACHMENTS[id];
  if (id === "granada") return { name: "Granada", emoji: "💣" };
  if (isAmmo(id)) return { name: AMMO_NAME[id], emoji: id === "flecha" ? "➶" : "🔸" };
  return { name: id, emoji: "📦" };
}
