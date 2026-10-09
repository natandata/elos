// Madureira Shopping (client-safe): a planta do shopping, as lojas, os restaurantes e o cardápio.
// A conta de verdade (preços das ofertas, bilhetes, doações) é feita no banco (migração 0192); aqui ficam só os números que a tela mostra
// e a geometria que o jogo 3D e os testes usam.
import { ITEMS, familiesBySlot, type DressItem, type FamilyGroup, type Slot } from "./items";
import { priceOf, rarityOf } from "./rarity";

export const MALL_NAME = "Madureira Shopping";
export const GIFT_DAILY_MAX = 30;

// ------------------------------------------------------------------ planta
export const FLOOR_H = 9;
export const HX = 60;
export const FLOOR_COUNT = 5;
/** Meia profundidade de cada andar (a praça de alimentação é bem maior). */
export const floorHalfZ = (f: number): number => (f === 4 ? 44 : 20);
export const floorY = (f: number): number => f * FLOOR_H;
export const FLOOR_INFO: { name: string; sub: string; color: number; tile: [string, string] }[] = [
  { name: "Térreo", sub: "Praça Madureira", color: 0xf6e7cf, tile: ["#f4e6cc", "#e9d4b0"] },
  { name: "1º andar", sub: "Moda e Coroas", color: 0xf3dcea, tile: ["#f6e0ee", "#ecc9de"] },
  { name: "2º andar", sub: "Calçados e Acessórios", color: 0xdfeaf7, tile: ["#e3edf8", "#cbdcf0"] },
  { name: "3º andar", sub: "Ateliês e Galeria", color: 0xe6f3e1, tile: ["#e8f4e3", "#d1e6c9"] },
  { name: "4º andar", sub: "Praça de Alimentação", color: 0xfff0d0, tile: ["#fff1d6", "#f7dca8"] },
];

export type Rect = { x0: number; x1: number; z0: number; z1: number };
export const inRect = (r: Rect, x: number, z: number): boolean => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;

export type Escalator = { id: string; from: number; up: boolean; end: 1 | -1; rect: Rect; xLow: number; xHigh: number };
/** As escadas rolantes alternam de ponta: do térreo ao 1º é a leste, do 1º ao 2º é a oeste, e assim por diante. */
export const escEnd = (f: number): 1 | -1 => (f % 2 === 0 ? 1 : -1);
export const ESC_X0 = 38;
export const ESC_X1 = 50;
export const LANE_UP = { z0: -4.6, z1: -2.2 };
export const LANE_DOWN = { z0: 2.2, z1: 4.6 };

export function escalators(): Escalator[] {
  const out: Escalator[] = [];
  for (let f = 0; f < FLOOR_COUNT - 1; f++) {
    const end = escEnd(f);
    const xLow = end * ESC_X0;
    const xHigh = end * ESC_X1;
    const xa = Math.min(xLow, xHigh);
    const xb = Math.max(xLow, xHigh);
    out.push({ id: `e${f}u`, from: f, up: true, end, rect: { x0: xa, x1: xb, ...{ z0: LANE_UP.z0, z1: LANE_UP.z1 } }, xLow, xHigh });
    out.push({ id: `e${f}d`, from: f, up: false, end, rect: { x0: xa, x1: xb, ...{ z0: LANE_DOWN.z0, z1: LANE_DOWN.z1 } }, xLow, xHigh });
  }
  return out;
}
export const ESCALATORS = escalators();

/** Altura da rampa da escada rolante na posição x. */
export const rampY = (e: Escalator, x: number): number => {
  const t = Math.max(0, Math.min(1, (x - e.xLow) / (e.xHigh - e.xLow)));
  return floorY(e.from) + t * FLOOR_H;
};

export const ATRIUM: Rect = { x0: -14, x1: 14, z0: -9, z1: 9 };
/** Buracos do andar: o átrio (do 1º para cima) e o poço por onde chega a escada rolante de baixo. */
export function holesOf(floor: number): Rect[] {
  if (floor <= 0) return [];
  const end = escEnd(floor - 1);
  const xa = Math.min(end * ESC_X0, end * ESC_X1);
  const xb = Math.max(end * ESC_X0, end * ESC_X1);
  return [ATRIUM, { x0: xa, x1: xb, z0: -5.2, z1: 5.2 }];
}

/** Retângulo menos buracos (os buracos não se sobrepõem): pedaços para desenhar o piso. */
export function subtractRects(base: Rect, holes: Rect[]): Rect[] {
  let parts: Rect[] = [base];
  for (const h of holes) {
    const next: Rect[] = [];
    for (const p of parts) {
      if (h.x1 <= p.x0 || h.x0 >= p.x1 || h.z1 <= p.z0 || h.z0 >= p.z1) {
        next.push(p);
        continue;
      }
      if (h.z0 > p.z0) next.push({ x0: p.x0, x1: p.x1, z0: p.z0, z1: h.z0 });
      if (h.z1 < p.z1) next.push({ x0: p.x0, x1: p.x1, z0: h.z1, z1: p.z1 });
      const zz0 = Math.max(p.z0, h.z0);
      const zz1 = Math.min(p.z1, h.z1);
      if (h.x0 > p.x0) next.push({ x0: p.x0, x1: h.x0, z0: zz0, z1: zz1 });
      if (h.x1 < p.x1) next.push({ x0: h.x1, x1: p.x1, z0: zz0, z1: zz1 });
    }
    parts = next;
  }
  return parts;
}

export const STEP_UP = 0.45;
/** Piso sob (x, z) logo abaixo da altura y: o chão do andar ou a rampa da escada rolante. -Infinity = vazio (cai). */
export function surfaceY(x: number, z: number, y: number): number {
  let best = -Infinity;
  if (Math.abs(x) <= HX) {
    for (let f = 0; f < FLOOR_COUNT; f++) {
      if (Math.abs(z) > floorHalfZ(f)) continue;
      const fy = floorY(f);
      if (fy > y + STEP_UP || fy <= best) continue;
      if (holesOf(f).some((h) => inRect(h, x, z))) continue;
      best = fy;
    }
  }
  for (const e of ESCALATORS) {
    if (!inRect(e.rect, x, z)) continue;
    const ry = rampY(e, x);
    if (ry <= y + STEP_UP && ry > best) best = ry;
  }
  return best;
}

/** Em que andar a jogadora está (o chão mais próximo abaixo dela). */
export const floorAt = (y: number): number => Math.max(0, Math.min(FLOOR_COUNT - 1, Math.round(y / FLOOR_H)));

/** Paredes de vidro e grades (não dá para atravessar nem pular). Cada uma vale só na faixa de altura [y0, y1]. */
export type Wall = Rect & { y0: number; y1: number };
export function walls(): Wall[] {
  const out: Wall[] = [];
  const T = 0.18;
  const box = (x0: number, x1: number, z0: number, z1: number, f: number): Wall => ({ x0, x1, z0, z1, y0: floorY(f) - 0.6, y1: floorY(f) + 2.4 });
  for (let f = 1; f < FLOOR_COUNT; f++) {
    // átrio
    out.push(box(ATRIUM.x0 - T, ATRIUM.x1 + T, ATRIUM.z0 - T, ATRIUM.z0 + T, f), box(ATRIUM.x0 - T, ATRIUM.x1 + T, ATRIUM.z1 - T, ATRIUM.z1 + T, f));
    out.push(box(ATRIUM.x0 - T, ATRIUM.x0 + T, ATRIUM.z0, ATRIUM.z1, f), box(ATRIUM.x1 - T, ATRIUM.x1 + T, ATRIUM.z0, ATRIUM.z1, f));
    // poço da escada que chega: fechado dos lados e do fundo; só as duas faixas abrem para a plataforma
    const end = escEnd(f - 1);
    const xa = Math.min(end * ESC_X0, end * ESC_X1);
    const xb = Math.max(end * ESC_X0, end * ESC_X1);
    const outer = end * ESC_X1;
    const inner = end * ESC_X0;
    out.push(box(xa, xb, -5.2 - T, -5.2 + T, f), box(xa, xb, 5.2 - T, 5.2 + T, f));
    out.push(box(inner - T, inner + T, -5.2, 5.2, f));
    out.push(box(outer - T, outer + T, -5.2, LANE_UP.z0, f), box(outer - T, outer + T, LANE_UP.z1, LANE_DOWN.z0, f), box(outer - T, outer + T, LANE_DOWN.z1, 5.2, f));
  }
  // corrimãos das faixas das escadas rolantes (do pé da escada ao andar de cima)
  for (const e of ESCALATORS) {
    const lane = e.up ? LANE_UP : LANE_DOWN;
    for (const zz of [lane.z0, lane.z1]) out.push({ x0: e.rect.x0, x1: e.rect.x1, z0: zz - T, z1: zz + T, y0: floorY(e.from) - 0.6, y1: floorY(e.from + 1) + 1.6 });
  }
  return out;
}
export const WALLS = walls();

// ------------------------------------------------------------------ lojas
export type StoreDef = {
  id: string;
  name: string;
  floor: number;
  /** -1 = parede norte (z negativo), 1 = parede sul */
  side: 1 | -1;
  x: number;
  /** o que vende (null = em reforma, porta fechada) */
  slots: Slot[] | null;
  color: number;
  accent: number;
  attendant: string;
  emoji: string;
};
export const STORE_W = 16;

export const STORES: StoreDef[] = [
  { id: "vestidos", name: "Vestidos Reais", floor: 0, side: -1, x: -18, slots: ["tunic"], color: 0xf3b3d1, accent: 0xb5307a, attendant: "Dona Raquel", emoji: "👗" },
  { id: "mantos", name: "Mantos & Capas", floor: 0, side: 1, x: -18, slots: ["mantle"], color: 0xc9b6f0, accent: 0x5b3aa8, attendant: "Seu Davi", emoji: "🧣" },
  { id: "coroas", name: "Coroas & Tiaras", floor: 1, side: -1, x: 0, slots: ["head"], color: 0xffe08a, accent: 0xc2870a, attendant: "Dona Ester", emoji: "👑" },
  { id: "joalheria", name: "Joalheria Estrela", floor: 1, side: 1, x: 0, slots: ["ears", "neck", "wrist"], color: 0xb9e3f7, accent: 0x1f6f9c, attendant: "Dona Lídia", emoji: "💎" },
  { id: "calcados", name: "Sapataria Passos", floor: 2, side: -1, x: 0, slots: ["shoes", "mantle"], color: 0xf7c9b0, accent: 0xb5532a, attendant: "Seu Tiago", emoji: "👠" },
  { id: "acessorios", name: "Acessórios do Reino", floor: 2, side: 1, x: 0, slots: ["hand"], color: 0xb8e6c4, accent: 0x2a8a4a, attendant: "Dona Noemi", emoji: "🪄" },
  { id: "ateliegala", name: "Ateliê de Gala", floor: 3, side: -1, x: 0, slots: ["tunic", "mantle"], color: 0xf6c4e0, accent: 0x9b2a82, attendant: "Dona Priscila", emoji: "✨" },
  { id: "sonhos", name: "Galeria dos Sonhos", floor: 3, side: 1, x: 0, slots: ["head", "hand"], color: 0xd2c4f7, accent: 0x4a35a0, attendant: "Seu Mateus", emoji: "🌟" },
];

/** Vitrines de enfeite (portas fechadas) para o shopping parecer cheio. */
const CLOSED_NAMES: [string, string][] = [
  ["Livraria Alfa e Ômega", "📚"],
  ["Doces da Vovó", "🍬"],
  ["Brinquedos Davi", "🧸"],
  ["Ótica Visão", "👓"],
  ["Perfumaria Nardo", "🧴"],
  ["Papelaria Pena", "✏️"],
  ["Relojoaria Tempo", "⏰"],
  ["Floricultura Lírio", "💐"],
];
export function closedStores(): StoreDef[] {
  const out: StoreDef[] = [];
  let k = 0;
  for (let f = 0; f < 4; f++) {
    for (const side of [-1, 1] as const) {
      for (const x of [-36, -18, 0, 18, 36]) {
        if (STORES.some((s) => s.floor === f && s.side === side && s.x === x)) continue;
        const [name, emoji] = CLOSED_NAMES[k++ % CLOSED_NAMES.length];
        out.push({ id: `c${f}${side > 0 ? "s" : "n"}${x}`, name, floor: f, side, x, slots: null, color: 0xe3dcd8, accent: 0x8a7f78, attendant: "", emoji });
      }
    }
  }
  return out;
}
export const CLOSED = closedStores();
export const storeById = (id: string): StoreDef | undefined => STORES.find((s) => s.id === id);
/** Onde a jogadora aparece ao sair da loja (de frente para a vitrine). */
export const doorSpawn = (s: StoreDef): { x: number; z: number } => ({ x: s.x, z: s.side * (floorHalfZ(s.floor) - 3.4) });
export const DOOR_RANGE = { dx: 3.4, dz: 2.6 };

// ------------------------------------------------------------------ pontos fixos
/** Cabine de bilhetes: no fim do térreo (ponta leste). */
export const BOOTH = { floor: 0, x: 55, z: 0, front: { x: 52, z: 0 } };
/** Balcão de informações do térreo (conta onde estão as peças raras do dia). */
export const INFO_DESK = { floor: 0, x: 0, z: 13, front: { x: 0, z: 10.4 } };

// ------------------------------------------------------------------ praça de alimentação
export type Food = { key: string; place: string; name: string; emoji: string; price: number; seconds: number };
/** O mesmo cardápio da tabela mall_foods (o preço de verdade vem do banco). */
export const FOODS: Food[] = [
  { key: "pao_manteiga", place: "padaria", name: "Pão com manteiga", emoji: "🥖", price: 3, seconds: 5 },
  { key: "pao_queijo", place: "padaria", name: "Pão de queijo", emoji: "🧀", price: 4, seconds: 5 },
  { key: "bolo_milho", place: "padaria", name: "Bolo de milho", emoji: "🍰", price: 6, seconds: 6 },
  { key: "suco_laranja", place: "padaria", name: "Suco de laranja", emoji: "🧃", price: 4, seconds: 5 },
  { key: "pizza_fatia", place: "pizzaria", name: "Fatia de pizza", emoji: "🍕", price: 10, seconds: 6 },
  { key: "calzone", place: "pizzaria", name: "Calzone", emoji: "🥟", price: 14, seconds: 7 },
  { key: "pizza_inteira", place: "pizzaria", name: "Pizza inteira", emoji: "🍕", price: 30, seconds: 9 },
  { key: "refri", place: "pizzaria", name: "Refrigerante", emoji: "🥤", price: 5, seconds: 5 },
  { key: "espetinho", place: "churrasco", name: "Espetinho", emoji: "🍢", price: 8, seconds: 6 },
  { key: "farofa", place: "churrasco", name: "Arroz, feijão e farofa", emoji: "🍛", price: 12, seconds: 7 },
  { key: "picanha", place: "churrasco", name: "Prato de picanha", emoji: "🥩", price: 35, seconds: 9 },
  { key: "guarana", place: "churrasco", name: "Guaraná", emoji: "🥤", price: 4, seconds: 5 },
  { key: "sorvete", place: "sorveteria", name: "Casquinha de sorvete", emoji: "🍦", price: 6, seconds: 6 },
  { key: "milkshake", place: "sorveteria", name: "Milkshake", emoji: "🥛", price: 10, seconds: 6 },
  { key: "acai", place: "sorveteria", name: "Açaí na tigela", emoji: "🍇", price: 12, seconds: 7 },
  { key: "picole", place: "sorveteria", name: "Picolé", emoji: "🍧", price: 5, seconds: 5 },
  { key: "cafe", place: "cafeteria", name: "Café", emoji: "☕", price: 3, seconds: 5 },
  { key: "cappuccino", place: "cafeteria", name: "Cappuccino", emoji: "☕", price: 6, seconds: 6 },
  { key: "torta", place: "cafeteria", name: "Fatia de torta", emoji: "🥧", price: 9, seconds: 6 },
  { key: "crepe", place: "cafeteria", name: "Crepe doce", emoji: "🥞", price: 12, seconds: 7 },
];
export const FOOD_BY_KEY = new Map(FOODS.map((f) => [f.key, f]));

export type Restaurant = { key: string; name: string; emoji: string; color: number; accent: number; zone: Rect; side: 1 | -1; cx: number; cook: string; line: string };
const ZX: [number, number][] = [
  [-58, -20],
  [-18, 18],
  [20, 58],
];
const band = (side: 1 | -1, i: number): { zone: Rect; cx: number } => {
  const [x0, x1] = ZX[i];
  return { zone: { x0, x1, z0: side < 0 ? -44 : 9, z1: side < 0 ? -9 : 44 }, cx: (x0 + x1) / 2 };
};
export const RESTAURANTS: Restaurant[] = [
  { key: "padaria", name: "Padaria Pão da Vida", emoji: "🥖", color: 0xf4c27a, accent: 0x9a5b17, side: -1, cook: "Dona Marta", line: "Pãozinho quentinho saindo agora!", ...band(-1, 0) },
  { key: "pizzaria", name: "Pizzaria Cinco Pães", emoji: "🍕", color: 0xf08a6b, accent: 0xa3301a, side: -1, cook: "Seu Gino", line: "Nossa pizza é de multiplicar!", ...band(-1, 1) },
  { key: "churrasco", name: "Churrascaria Caná", emoji: "🍖", color: 0xb9744f, accent: 0x5e2c14, side: -1, cook: "Seu Bento", line: "Hoje a picanha está no ponto!", ...band(-1, 2) },
  { key: "sorveteria", name: "Sorveteria Maná", emoji: "🍦", color: 0xf7b6d8, accent: 0xb3367f, side: 1, cook: "Dona Lia", line: "Um sorvete gelado do céu?", ...band(1, 0) },
  { key: "cafeteria", name: "Cafeteria Betânia", emoji: "☕", color: 0xd9b48c, accent: 0x6b4325, side: 1, cook: "Dona Sara", line: "Um cafezinho para começar bem!", ...band(1, 1) },
];
/** Praça de convivência (sem comida): sofás, palco e fonte. */
export const LOUNGE_ZONE = band(1, 2);
export const counterZ = (r: Restaurant): number => r.side * 40.5;
export const counterFront = (r: Restaurant): { x: number; z: number } => ({ x: r.cx, z: r.side * 36.4 });

export type Seat = { x: number; z: number; y: number; dir: 1 | -1 };
export type Table = { x: number; z: number };
/** Mesas de cada restaurante: 3 x 3, com duas cadeiras (leste e oeste) em cada uma. */
export function tablesOf(r: Restaurant): Table[] {
  const out: Table[] = [];
  for (const dx of [-10, 0, 10]) for (const k of [0, 1, 2]) out.push({ x: r.cx + dx, z: r.side * (15 + k * 7) });
  return out;
}
export function seatsOf(r: Restaurant): Seat[] {
  return tablesOf(r).flatMap((t) => [
    { x: t.x - 1.7, z: t.z, y: 0.5, dir: 1 as const },
    { x: t.x + 1.7, z: t.z, y: 0.5, dir: -1 as const },
  ]);
}

// ------------------------------------------------------------------ prateleiras das lojas (o salão tem o mesmo tamanho do salão de partidas)
export const STORE_HW = 15;
export const STORE_HL = 29;
export const SHELF_SPACING = 2.1;
export const SHELF_TIERS = 4;
const SLOT_LABEL: Record<Slot, string> = { tunic: "👗 Roupas", head: "👑 Cabeça", mantle: "🧣 Mantos", shoes: "👠 Calçados", hand: "🪄 Acessórios", ears: "💎 Brincos", neck: "📿 Colares", wrist: "⌚ Pulseiras" };

export type ShelfItem = { slot: Slot; family: string; base: string; item: DressItem; price: number; rarity: "epic" | "legend" };
export type ShelfUnit = { x: number; z: number; face: 1 | -1 };
export type ShelfSign = { text: string; x: number; z: number; face: 1 | -1 };
export type ShelfLayout = { placed: (ShelfItem & { x: number; y: number; z: number; face: 1 | -1 })[]; units: ShelfUnit[]; signs: ShelfSign[] };

/** Famílias à venda (épicas e lendárias) de cada espaço. */
export function sellableFamilies(slot: Slot): FamilyGroup[] {
  return familiesBySlot(slot).filter((f) => priceOf(f.family) > 0);
}
/** Cores/estilos de uma família espalhados pela prateleira (a primeira sempre entra). */
export function pickVariants(items: DressItem[], n: number): DressItem[] {
  if (items.length <= n) return items;
  const out: DressItem[] = [];
  for (let k = 0; k < n; k++) out.push(items[Math.floor((k * items.length) / n)]);
  return out;
}

/** Monta as prateleiras de uma loja: uma coluna de 4 prateleiras por unidade, alternando as duas paredes. */
export function storeShelves(slots: Slot[]): ShelfLayout {
  const fams = slots.flatMap((s) => sellableFamilies(s).map((f) => ({ slot: s, f })));
  const v = Math.max(1, Math.min(12, Math.floor(96 / Math.max(1, fams.length))));
  const list: ShelfItem[] = [];
  for (const { slot, f } of fams) for (const it of pickVariants(f.items, v)) list.push({ slot, family: f.family, base: f.base, item: it, price: priceOf(f.family), rarity: rarityOf(f.family) as "epic" | "legend" });
  const cols = Math.ceil(list.length / SHELF_TIERS);
  const perWall = Math.ceil(cols / 2);
  const startZ = -STORE_HL + 6;
  const out: ShelfLayout = { placed: [], units: [], signs: [] };
  const walls: { face: 1 | -1; from: number; to: number }[] = [
    { face: 1, from: 0, to: perWall },
    { face: -1, from: perWall, to: cols },
  ];
  for (const w of walls) {
    const firstOf = new Map<Slot, number>();
    const lastOf = new Map<Slot, number>();
    for (let c = w.from; c < w.to; c++) {
      const col = c - w.from;
      const uz = startZ + col * SHELF_SPACING + SHELF_SPACING / 2;
      out.units.push({ x: -w.face * (STORE_HW - 0.45), z: uz, face: w.face });
      for (let t = 0; t < SHELF_TIERS; t++) {
        const it = list[c * SHELF_TIERS + t];
        if (!it) continue;
        const slotKey = it.slot;
        if (!firstOf.has(slotKey)) firstOf.set(slotKey, uz);
        lastOf.set(slotKey, uz);
        const boardTop = 0.45 + t * 1.2;
        const hh = it.slot === "tunic" ? 1.05 : it.slot === "mantle" ? 1.0 : it.slot === "shoes" ? 0.55 : it.slot === "ears" || it.slot === "wrist" ? 0.5 : 0.85;
        out.placed.push({ ...it, x: -w.face * (STORE_HW - 0.95), y: boardTop + hh / 2 + 0.04, z: uz, face: w.face });
      }
    }
    for (const [slot, z0] of firstOf) out.signs.push({ text: SLOT_LABEL[slot], x: -w.face * (STORE_HW - 0.2), z: (z0 + (lastOf.get(slot) ?? z0)) / 2, face: w.face });
  }
  return out;
}
/** Espaço (slot) de cada item colocado e a altura/largura dele (o desenho mantém a proporção da janela de cada espaço). */
export const itemHeight = (slot: Slot): number => (slot === "tunic" ? 1.05 : slot === "mantle" ? 1.0 : slot === "shoes" ? 0.55 : slot === "ears" || slot === "wrist" ? 0.5 : 0.85);

// ------------------------------------------------------------------ ofertas raras (a conta é do banco; aqui o formato e os textos)
export type RareOffer = { id: number; family: string; price: number; stock: number; sold: number; left: number; ends_at: string; mine: boolean };
/** Primeiro item da família de uma oferta (as peças raras têm uma cor só). */
export const offerItem = (family: string): DressItem | undefined => ITEMS.find((i) => i.family === family);
/** Lojas que vendem o espaço da peça rara. */
export const storesSelling = (slot: Slot): StoreDef[] => STORES.filter((s) => s.slots?.includes(slot));

// ------------------------------------------------------------------ trajetos (para o botão "Ir para…")
export type Pt = { x: number; z: number };
const ATRIUM_BOX: Rect = { x0: ATRIUM.x0 - 3, x1: ATRIUM.x1 + 3, z0: ATRIUM.z0 - 3, z1: ATRIUM.z1 + 3 };
/** O segmento a→b corta o átrio (com folga)? */
function crossesAtrium(a: Pt, b: Pt): boolean {
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    if (inRect(ATRIUM_BOX, a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t)) return true;
  }
  return false;
}
/** Pontos para contornar o átrio (pela calçada norte ou sul, a mais perto de a) entre a e b, num andar que tem átrio. */
export function around(a: Pt, b: Pt, floor: number): Pt[] {
  if (floor <= 0 || !crossesAtrium(a, b)) return [];
  const zz = (a.z + b.z <= 0 ? -1 : 1) * 13;
  const sa = Math.abs(a.x) < 14 ? Math.sign(b.x || 1) : Math.sign(a.x);
  const sb = Math.abs(b.x) < 14 ? Math.sign(a.x || 1) : Math.sign(b.x);
  return [
    { x: sa * 18, z: zz },
    { x: sb * 18, z: zz },
  ];
}
/** Caminho de um ponto de um andar até outro (por escada rolante), contornando o átrio. */
export function routeBetween(fromFloor: number, toFloor: number, from: Pt, to: Pt): Pt[] {
  const path: Pt[] = [];
  let f = fromFloor;
  let cur = from;
  const go = (p: Pt, floor: number) => {
    path.push(...around(cur, p, floor), p);
    cur = p;
  };
  while (f !== toFloor) {
    const up = toFloor > f;
    const e = ESCALATORS.find((q) => q.from === (up ? f : f - 1) && q.up === up);
    if (!e) break;
    const lane = up ? (LANE_UP.z0 + LANE_UP.z1) / 2 : (LANE_DOWN.z0 + LANE_DOWN.z1) / 2;
    const entryX = up ? e.end * (ESC_X0 - 4) : e.end * (ESC_X1 + 3);
    const exitX = up ? e.end * (ESC_X1 + 3) : e.end * (ESC_X0 - 4);
    go({ x: entryX, z: lane }, f);
    go({ x: exitX, z: lane }, up ? f + 1 : f - 1);
    // ao sair por cima, afasta-se do poço antes de seguir (senão o caminho reto volta por cima da escada)
    if (up) {
      go({ x: e.end * 55, z: -9 }, f + 1);
      go({ x: e.end * 30, z: -9 }, f + 1);
    }
    f += up ? 1 : -1;
  }
  go(to, f);
  return path;
}
