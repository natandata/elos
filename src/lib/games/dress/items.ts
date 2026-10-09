// Catálogo de peças do "Vista o Herói" (client-safe): famílias de desenhos com variações de cor e estilo.
// O desenho de cada família está em components/games/dress (HeadArt, BodyArt, HandArt).
import { isLimited } from "./rarity";

export type Slot = "head" | "tunic" | "mantle" | "shoes" | "hand" | "ears" | "neck" | "wrist";
/** Os 5 espaços originais (são os únicos que a nota do júri antigo conhece). */
export type ScoredSlot = "head" | "tunic" | "mantle" | "shoes" | "hand";

export const SLOTS: { key: Slot; label: string; emoji: string }[] = [
  { key: "head", label: "Cabeça", emoji: "👑" },
  { key: "tunic", label: "Roupa", emoji: "👘" },
  { key: "mantle", label: "Manto e enfeites", emoji: "🧣" },
  { key: "shoes", label: "Calçado", emoji: "👡" },
  { key: "hand", label: "Na mão", emoji: "🪄" },
  { key: "ears", label: "Brincos", emoji: "💎" },
  { key: "neck", label: "Colares", emoji: "📿" },
  { key: "wrist", label: "Pulseiras", emoji: "⌚" },
];
export const SCORED_SLOTS: ScoredSlot[] = ["head", "tunic", "mantle", "shoes", "hand"];

/** Parâmetros de cor de um desenho: c = principal, c2 = secundária (pedra, detalhe, borda), c3 = terceira. */
export type Params = { c: string; c2?: string; c3?: string; /** tamanho: p/g (pequeno/grande) ou c/m (comprimento curto/midi) */ size?: string };

export type DressItem = {
  id: string;
  slot: Slot;
  name: string;
  /** desenho base (várias peças dividem a mesma família, mudando só a cor) */
  family: string;
  /** nome da família, sem a cor ("Coroa", "Sandálias") */
  base?: string;
  p: Params;
};

type Col = { hex: string; m: string; f: string };
const col = (hex: string, m: string, f = m): Col => ({ hex, m, f });

export const COLORS = {
  branco: col("#f4efe2", "branco", "branca"),
  creme: col("#e8d9b5", "creme"),
  areia: col("#d8c196", "areia"),
  ocre: col("#d9a21a", "ocre"),
  laranja: col("#d9662b", "laranja"),
  terracota: col("#b8553a", "terracota"),
  vermelho: col("#b83227", "vermelho", "vermelha"),
  carmim: col("#9b1c3a", "carmim"),
  rosa: col("#e8789a", "rosa"),
  rosaClaro: col("#f2b6c6", "rosa-claro", "rosa-clara"),
  lilas: col("#a98fd0", "lilás"),
  roxo: col("#6b2d8c", "roxo", "roxa"),
  violeta: col("#4b2c8c", "violeta"),
  marinho: col("#27407a", "azul-marinho"),
  azul: col("#2f5fb0", "azul"),
  azulClaro: col("#7fa8e0", "azul-claro", "azul-clara"),
  turquesa: col("#2aa7a0", "turquesa"),
  verde: col("#2f8a4f", "verde"),
  oliva: col("#6b7a3a", "verde-oliva"),
  musgo: col("#4f6b3a", "verde-musgo"),
  marrom: col("#7a5230", "marrom"),
  cinza: col("#8a8f99", "cinza"),
  preto: col("#2b2b33", "preto", "preta"),
  dourado: col("#f5c518", "dourado", "dourada"),
  prata: col("#c9ced6", "prateado", "prateada"),
  bronze: col("#b8832f", "bronze"),
  mostarda: col("#c9a227", "mostarda"),
  bordo: col("#6b1f2e", "bordô"),
  pessego: col("#f6b79a", "pêssego"),
  coral: col("#f0836a", "coral"),
  salmao: col("#f4a08a", "salmão"),
  fucsia: col("#d6336c", "fúcsia"),
  magenta: col("#b5179e", "magenta"),
  lavanda: col("#c7b8ea", "lavanda"),
  malva: col("#b58fb0", "malva"),
  indigo: col("#3f3d99", "índigo"),
  cobalto: col("#1f56c4", "azul-cobalto"),
  ceu: col("#a8d8f0", "azul-céu"),
  ciano: col("#22b8cf", "ciano"),
  aqua: col("#7fe0d4", "água-marinha"),
  menta: col("#a7e8c9", "menta"),
  limao: col("#d4e157", "limão"),
  lima: col("#9acd32", "verde-lima"),
  esmeralda: col("#12a05c", "esmeralda"),
  jade: col("#2d9d78", "jade"),
  floresta: col("#1f5c3a", "verde-floresta"),
  champanhe: col("#ead7a7", "champanhe"),
  nude: col("#e3bfa0", "nude"),
  caramelo: col("#b9772f", "caramelo"),
  chocolate: col("#4a2c18", "chocolate"),
  vinho: col("#5a1230", "vinho"),
  grafite: col("#3a3f48", "grafite"),
  rose: col("#e0a18f", "ouro rosé"),
  cobre: col("#b4602d", "cobre"),
  perola: col("#f2eee6", "pérola"),
  marfim: col("#fffdf4", "marfim"),
  amarelo: col("#f4d35e", "amarelo"),
  girassol: col("#f7b500", "girassol"),
  abobora: col("#e8731a", "abóbora"),
  ferrugem: col("#9c4a2a", "ferrugem"),
  azulBebe: col("#bfe0ff", "azul-bebê"),
  rosaBebe: col("#fbd1e0", "rosa-bebê"),
  lilasBebe: col("#e1d3f5", "lilás-bebê"),
  verdeAgua: col("#8fd3c0", "verde-água"),
  ameixa: col("#6a2f5a", "ameixa"),
  petroleo: col("#1d5a66", "azul-petróleo"),
  goiaba: col("#e56b84", "goiaba"),
  uva: col("#5e3a8c", "uva"),
  oceano: col("#1c6ea4", "azul-oceano"),
} as const;
export type ColorKey = keyof typeof COLORS;

type Variant = { id?: string; label: string; p: Params };

const items: DressItem[] = [];

/** Uma família com uma peça por cor. `gender` concorda o nome da cor com o da peça. */
const ALL_COLORS = Object.keys(COLORS) as ColorKey[];
/** Uma família com uma peça por cor: as listadas primeiro (a ordem do armário) e, a menos que `only`, todas as outras do catálogo. */
function byColor(slot: Slot, family: string, base: string, gender: "m" | "f", keys: ColorKey[], opts: { ids?: Partial<Record<ColorKey, string>>; p2?: (k: ColorKey) => Partial<Params>; only?: boolean } = {}) {
  const list = opts.only ? keys : [...keys, ...ALL_COLORS.filter((k) => !keys.includes(k))];
  for (const k of list) {
    const c = COLORS[k];
    const extra = opts.p2?.(k) ?? {};
    items.push({ id: opts.ids?.[k] ?? `${family}__${k}`, slot, name: `${base} ${gender === "f" ? c.f : c.m}`, base, family, p: { c: c.hex, ...extra } });
  }
}

/** Uma família com variantes escritas à mão (nome e cores). */
function custom(slot: Slot, family: string, base: string, variants: Variant[]) {
  variants.forEach((v, i) => items.push({ id: v.id ?? `${family}__${i}`, slot, name: v.label ? `${base} ${v.label}` : base, base, family, p: v.p }));
}

const P = (c: ColorKey | string, c2?: ColorKey | string, c3?: ColorKey | string): Params => {
  const h = (k?: ColorKey | string) => (k === undefined ? undefined : k in COLORS ? COLORS[k as ColorKey].hex : k);
  return { c: h(c)!, c2: h(c2), c3: h(c3) };
};

// ============================================================ CABEÇA (75)
items.push({ id: "head_none", slot: "head", name: "Cabeça descoberta", family: "none", p: { c: "#000" } });
custom("head", "crown", "Coroa", [
  { id: "head_crown", label: "de ouro com rubis", p: P("dourado", "#e5484d") },
  { label: "de ouro com safiras", p: P("dourado", "#3b82f6") },
  { label: "de ouro com esmeraldas", p: P("dourado", "#2fbf71") },
  { label: "de prata com rubis", p: P("prata", "#e5484d") },
  { label: "de prata com safiras", p: P("prata", "#3b82f6") },
  { label: "de bronze com esmeraldas", p: P("bronze", "#2fbf71") },
]);
custom("head", "diadem", "Diadema", [
  { id: "head_diadem", label: "real de ouro com rubi", p: P("dourado", "#e5484d") },
  { label: "de ouro com safira", p: P("dourado", "#3b82f6") },
  { label: "de ouro com esmeralda", p: P("dourado", "#2fbf71") },
  { label: "de prata com rubi", p: P("prata", "#e5484d") },
  { label: "de prata com safira", p: P("prata", "#3b82f6") },
  { label: "de bronze com âmbar", p: P("bronze", "#f59e0b") },
]);
byColor("head", "turban", "Turbante", "m", ["branco", "creme", "areia", "ocre", "vermelho", "azul", "roxo", "verde"], { ids: { creme: "head_turban" } });
byColor("head", "veil", "Véu", "m", ["azulClaro", "branco", "creme", "rosaClaro", "lilas", "turquesa", "azul", "roxo", "vermelho", "preto"], { ids: { azulClaro: "head_veil" } });
byColor("head", "scarf", "Pano de cabeça", "m", ["creme", "branco", "areia", "ocre", "terracota", "vermelho", "rosa", "azul", "verde", "marrom"], { ids: { creme: "head_scarf" } });
custom("head", "helmet", "Capacete", [
  { id: "head_helmet", label: "de bronze", p: P("bronze", "#c43a3a") },
  { label: "de prata", p: P("prata", "#2f5fb0") },
  { label: "de ferro", p: P("cinza", "#2b2b33") },
]);
byColor("head", "cap", "Boné", "m", ["vermelho", "azul", "verde", "preto", "branco", "laranja"], { ids: { vermelho: "head_cap" } });
byColor("head", "hood", "Capuz", "m", ["marrom", "cinza", "preto", "musgo", "bordo", "marinho"]);
byColor("head", "flowers", "Coroa de flores", "f", ["rosa", "branco", "lilas", "ocre", "vermelho", "azulClaro"]);
byColor("head", "ribbon", "Fita com laço", "f", ["rosa", "vermelho", "azul", "roxo", "dourado", "branco"]);
byColor("head", "tiara", "Tiara de pérolas", "f", ["branco", "rosaClaro", "dourado", "prata"]);
custom("head", "laurel", "Coroa de louros", [
  { label: "verde", p: P("verde") },
  { label: "dourada", p: P("dourado") },
  { label: "de oliveira", p: P("oliva") },
]);

// ============================================================ ROUPA (75)
byColor("tunic", "dress", "Túnica simples", "f", ["creme", "branco", "areia", "ocre", "terracota", "vermelho", "rosa", "lilas", "azul", "verde", "marrom", "cinza"], { ids: { creme: "tunic_simple", azul: "tunic_blue" } });
byColor("tunic", "embroidered", "Vestido bordado", "m", ["branco", "creme", "vermelho", "carmim", "rosa", "lilas", "azul", "marinho", "turquesa", "verde", "marrom", "preto"]);
byColor("tunic", "pleated", "Linho plissado", "m", ["branco", "creme", "areia", "rosaClaro", "azulClaro", "oliva", "cinza", "lilas"], { ids: { branco: "tunic_linen" } });
custom("tunic", "striped", "Túnica listrada", [
  { label: "azul e branca", p: P("azul", "branco") },
  { label: "vermelha e creme", p: P("vermelho", "creme") },
  { label: "verde e creme", p: P("verde", "creme") },
  { label: "marrom e areia", p: P("marrom", "areia") },
  { label: "roxa e rosa", p: P("roxo", "rosaClaro") },
  { label: "preta e dourada", p: P("preto", "dourado") },
]);
custom("tunic", "twotone", "Túnica de duas cores", [
  { label: "creme e azul", p: P("creme", "azul") },
  { label: "branca e vermelha", p: P("branco", "vermelho") },
  { label: "azul e dourada", p: P("azul", "dourado") },
  { label: "verde e creme", p: P("verde", "creme") },
  { label: "rosa e roxa", p: P("rosa", "roxo") },
  { label: "ocre e marrom", p: P("ocre", "marrom") },
  { label: "lilás e branca", p: P("lilas", "branco") },
  { label: "turquesa e branca", p: P("turquesa", "branco") },
  { label: "vermelha e dourada", p: P("vermelho", "dourado") },
  { label: "cinza e rosa", p: P("cinza", "rosaClaro") },
]);
custom("tunic", "patchwork", "Túnica de muitas cores", [
  { id: "tunic_colors", label: "", p: P("#b83227", "#2c6fa8", "#d9a21a") },
  { label: "em tons frios", p: P("#2c6fa8", "#2aa7a0", "#6d3a8c") },
  { label: "em tons quentes", p: P("#d9662b", "#b83227", "#d9a21a") },
  { label: "em tons de terra", p: P("#7a5230", "#b8553a", "#c9a227") },
  { label: "em tons de flores", p: P("#e8789a", "#a98fd0", "#f2b6c6") },
]);
custom("tunic", "fur", "Veste de pelos", [
  { id: "tunic_camel", label: "de camelo", p: P("#8a6a43") },
  { label: "de ovelha", p: P("#f2ead8") },
  { label: "de cabra escuro", p: P("#3a2c20") },
]);
custom("tunic", "skins", "Vestes de peles", [
  { id: "tunic_skins", label: "", p: P("#b98a55") },
  { label: "escuras", p: P("#6b4a2a") },
]);
custom("tunic", "sack", "Roupa de saco", [
  { id: "tunic_sack", label: "cinza", p: P("#7a6f5f") },
  { label: "marrom", p: P("#6b5236") },
]);
custom("tunic", "hoodie", "Moletom", [
  { id: "tunic_hoodie", label: "cinza", p: P("#6b7280") },
  { label: "preto", p: P("#2b2b33") },
  { label: "rosa", p: P("#e8789a") },
]);
custom("tunic", "armor", "Armadura", [
  { id: "tunic_armor", label: "de bronze", p: P("#b8832f") },
  { label: "de prata", p: P("#c9ced6") },
  { label: "dourada", p: P("#f5c518") },
]);
custom("tunic", "leaves", "Folhas", [
  { id: "tunic_leaves", label: "de figueira", p: P("#3fa34d", "#2e8b3d", "#f08aa8") },
  { label: "de outono", p: P("#d9a21a", "#b8553a", "#f5c518") },
  { label: "de samambaia", p: P("#52b95e", "#2f6f3a", "#fff") },
]);
byColor("tunic", "royal", "Veste real", "f", ["roxo", "carmim", "azul", "verde", "preto", "branco"], { ids: { roxo: "tunic_purple" } });

// ============================================================ MANTO E ENFEITES (75)
items.push({ id: "mantle_none", slot: "mantle", name: "Nada por cima", family: "none", p: { c: "#000" } });
byColor("mantle", "cape", "Manto", "m", ["vermelho", "azul", "branco", "carmim", "roxo", "violeta", "marinho", "azulClaro", "verde", "musgo", "turquesa", "bordo", "preto", "cinza", "creme", "rosa", "terracota", "mostarda"], {
  ids: { vermelho: "mantle_royal", azul: "mantle_blue", branco: "mantle_white" },
  p2: (k) => ({ c2: k === "azul" ? "#9db8e8" : k === "branco" ? "#cfd4dc" : k === "creme" || k === "rosa" || k === "azulClaro" ? "#c9a227" : "#f5c518" }),
});
custom("mantle", "caped", "Manto listrado", [
  { id: "mantle_striped", label: "de lã", p: P("#c7a46a", "#6b4a2a", "#3a2a1c") },
  { label: "azul e creme", p: P("#e8d9b5", "#2f5fb0", "#27407a") },
  { label: "vermelho e creme", p: P("#e8d9b5", "#b83227", "#7a1f1a") },
  { label: "verde e creme", p: P("#e8d9b5", "#2f8a4f", "#1f5a34") },
  { label: "roxo e rosa", p: P("#f2b6c6", "#6b2d8c", "#4b2c8c") },
  { label: "preto e dourado", p: P("#2b2b33", "#f5c518", "#8a6d1a") },
]);
byColor("mantle", "belt", "Cinto", "m", ["marrom", "preto", "dourado", "prata", "vermelho", "azul", "verde", "creme", "terracota", "roxo", "rosa", "bordo"], { ids: { marrom: "mantle_belt" } });
custom("mantle", "necklace", "Colar", [
  { id: "mantle_collar", label: "de ouro com safira", p: P("#f5c518", "#3b82f6") },
  { label: "de ouro com rubi", p: P("#f5c518", "#e5484d") },
  { label: "de ouro com esmeralda", p: P("#f5c518", "#2fbf71") },
  { label: "de prata com safira", p: P("#c9ced6", "#3b82f6") },
  { label: "de prata com rubi", p: P("#c9ced6", "#e5484d") },
  { label: "de prata com esmeralda", p: P("#c9ced6", "#2fbf71") },
  { label: "de pérolas", p: P("#f4efe2", "#fff") },
  { label: "de âmbar", p: P("#b8832f", "#f59e0b") },
  { label: "de turquesa", p: P("#b8832f", "#2aa7a0") },
  { label: "de coral", p: P("#c9ced6", "#f0836a") },
  { label: "de ametista", p: P("#f5c518", "#a855f7") },
  { label: "de contas de madeira", p: P("#7a5230", "#b8832f") },
]);
byColor("mantle", "sash", "Faixa", "f", ["vermelho", "azul", "verde", "roxo", "rosa", "dourado", "branco", "marinho", "turquesa", "laranja", "bordo", "preto"], { ids: { vermelho: "mantle_sash" } });
byColor("mantle", "shawl", "Xale", "m", ["creme", "branco", "rosaClaro", "lilas", "azulClaro", "turquesa", "verde", "mostarda", "terracota", "vermelho", "marrom", "preto"]);
custom("mantle", "sheep", "Pele de cabrito", [
  { id: "mantle_sheep", label: "clara", p: P("#f2ead8") },
  { label: "escura", p: P("#6b4a2a") },
]);

// ============================================================ CALÇADO (75)
items.push({ id: "shoes_none", slot: "shoes", name: "Descalça", family: "none", p: { c: "#000" } });
byColor("shoes", "sandals", "Sandálias", "f", ["areia", "marrom", "preto", "branco", "vermelho", "azul", "verde", "rosa", "ocre", "terracota", "creme", "cinza"], { ids: { areia: "shoes_sandals" } });
byColor("shoes", "gladiator", "Sandálias de tiras", "f", ["marrom", "preto", "areia", "branco", "vermelho", "azul", "verde", "rosa", "dourado", "bronze"]);
byColor("shoes", "slipper", "Sapatilhas", "f", ["creme", "branco", "rosa", "vermelho", "azul", "verde", "lilas", "marrom", "preto", "turquesa", "ocre", "bordo"]);
byColor("shoes", "boots", "Botas", "f", ["marrom", "preto", "areia", "cinza", "vermelho", "azul", "verde", "bordo", "terracota", "creme", "musgo", "branco"], { ids: { marrom: "shoes_boots" } });
byColor("shoes", "sneakers", "Tênis", "m", ["branco", "preto", "vermelho", "azul", "rosa", "verde", "cinza", "laranja"], { ids: { branco: "shoes_sneakers" } });
custom("shoes", "metal", "Calçado", [
  { id: "shoes_gold", label: "dourado de gala", p: P("#f5c518", "#e5484d") },
  { id: "shoes_bronze", label: "com grevas de bronze", p: P("#b8832f") },
  { label: "com grevas de prata", p: P("#c9ced6") },
  { label: "prateado de gala", p: P("#c9ced6", "#3b82f6") },
  { label: "de bronze de gala", p: P("#b8832f", "#2fbf71") },
  { label: "de ouro com esmeraldas", p: P("#f5c518", "#2fbf71") },
]);
byColor("shoes", "heels", "Sapatos de salto", "m", ["preto", "vermelho", "rosa", "branco", "dourado", "prata", "azul", "bordo", "creme", "lilas", "verde", "marrom"]);
byColor("shoes", "platform", "Sapatos plataforma", "m", ["preto", "branco", "rosa", "lilas", "azulClaro", "vermelho", "dourado", "prata", "marrom", "turquesa"]);
byColor("shoes", "loafer", "Mocassins", "m", ["marrom", "preto", "bordo", "creme", "marinho", "areia", "cinza", "branco"]);
byColor("shoes", "tallboots", "Botas de cano alto", "f", ["preto", "marrom", "bordo", "creme", "cinza", "vermelho", "marinho", "branco", "musgo", "rosa"]);
byColor("shoes", "hightop", "Tênis de cano alto", "m", ["vermelho", "preto", "azul", "rosa", "verde", "laranja", "roxo", "dourado"]);
byColor("shoes", "flipflop", "Chinelos", "m", ["azul", "preto", "vermelho", "rosa", "verde", "laranja", "branco", "turquesa"]);
byColor("shoes", "anklet", "Tornozeleira", "f", ["dourado", "prata", "bronze", "rosa", "turquesa", "vermelho", "azul", "verde"]);
custom("shoes", "jeweled", "Sandálias de joias", [
  { label: "com rubis", p: P("#f5c518", "#e5484d") },
  { label: "com safiras", p: P("#f5c518", "#3b82f6") },
  { label: "com esmeraldas", p: P("#f5c518", "#2fbf71") },
  { label: "de prata com rubis", p: P("#c9ced6", "#e5484d") },
  { label: "de prata com safiras", p: P("#c9ced6", "#3b82f6") },
  { label: "de prata com ametistas", p: P("#c9ced6", "#a855f7") },
]);

// ============================================================ NA MÃO (75+)
items.push({ id: "hand_none", slot: "hand", name: "Mãos livres", family: "none", p: { c: "#000" } });
custom("hand", "staff", "Cajado", [
  { id: "hand_staff", label: "de madeira", p: P("#8c5e36") },
  { label: "de madeira escura", p: P("#5a3a22") },
  { label: "de oliveira", p: P("#a8895a") },
  { label: "dourado", p: P("#f5c518") },
  { label: "de ébano", p: P("#2b2b33") },
]);
custom("hand", "sling", "Funda", [
  { id: "hand_sling", label: "de couro", p: P("#8c5e36") },
  { label: "de lã", p: P("#e8d9b5") },
]);
custom("hand", "harp", "Harpa", [
  { id: "hand_harp", label: "dourada", p: P("#d9a21a") },
  { label: "de madeira", p: P("#8c5e36") },
  { label: "prateada", p: P("#c9ced6") },
]);
custom("hand", "trumpet", "Trombeta", [
  { id: "hand_trumpet", label: "de ouro", p: P("#f5c518") },
  { label: "de prata", p: P("#c9ced6") },
  { label: "de cobre", p: P("#b8553a") },
]);
custom("hand", "sword", "Espada", [
  { id: "hand_sword", label: "de ferro", p: P("#cfd5de", "#b8832f") },
  { label: "de bronze", p: P("#d9a05a", "#7a5230") },
  { label: "dourada", p: P("#f5c518", "#e5484d") },
]);
custom("hand", "scroll", "Rolo de pergaminho", [
  { id: "hand_scroll", label: "creme", p: P("#f4e6c4", "#c9a266") },
  { label: "branco", p: P("#fbfbfb", "#c9ced6") },
  { label: "amarelado", p: P("#e8cf8a", "#8c5e36") },
  { label: "com fita vermelha", p: P("#f4e6c4", "#b83227") },
  { label: "com fita azul", p: P("#f4e6c4", "#2f5fb0") },
  { label: "com fita dourada", p: P("#f4e6c4", "#f5c518") },
]);
custom("hand", "jar", "Jarro com tocha", [
  { id: "hand_jar", label: "de barro", p: P("#c1713a") },
  { label: "cinza", p: P("#8a8f99") },
  { label: "escuro", p: P("#5a3a22") },
  { label: "de bronze", p: P("#b8832f") },
]);
custom("hand", "scepter", "Cetro", [
  { id: "hand_scepter", label: "real de ouro", p: P("#f5c518", "#e5484d") },
  { label: "de ouro com safira", p: P("#f5c518", "#3b82f6") },
  { label: "de prata com esmeralda", p: P("#c9ced6", "#2fbf71") },
  { label: "de bronze com rubi", p: P("#b8832f", "#e5484d") },
]);
custom("hand", "olive", "Ramo", [
  { id: "hand_olive", label: "de oliveira", p: P("#7bb661") },
  { label: "de louro", p: P("#3f8a4a") },
]);
items.push({ id: "hand_jawbone", slot: "hand", name: "Queixada de jumento", family: "jawbone", p: { c: "#f1ead6" } });
custom("hand", "pitcher", "Cântaro", [
  { id: "hand_pitcher", label: "de barro", p: P("#b8642f") },
  { label: "claro", p: P("#d9b27a") },
  { label: "escuro", p: P("#5a3a22") },
  { label: "azul", p: P("#2f5fb0") },
  { label: "verde", p: P("#2f8a4f") },
  { label: "branco", p: P("#f4efe2") },
]);
custom("hand", "phone", "Celular", [
  { id: "hand_phone", label: "azul", p: P("#60a5fa") },
  { label: "rosa", p: P("#f472b6") },
  { label: "verde", p: P("#4ade80") },
]);
custom("hand", "sheaf", "Feixe de espigas", [
  { id: "hand_sheaf", label: "de trigo", p: P("#e3b941") },
  { label: "de cevada", p: P("#d9c27a") },
]);
custom("hand", "tambourine", "Pandeiro", [
  { id: "hand_tambourine", label: "de barro", p: P("#b8642f") },
  { label: "claro", p: P("#d9b27a") },
  { label: "azul", p: P("#2f5fb0") },
  { label: "vermelho", p: P("#b83227") },
]);
items.push({ id: "hand_tentpeg", slot: "hand", name: "Estaca de tenda e martelo", family: "tentpeg", p: { c: "#8c5e36" } });
custom("hand", "alabaster", "Vaso de alabastro", [
  { id: "hand_alabaster", label: "", p: P("#f7f1e2") },
  { label: "rosado", p: P("#f2c6cf") },
  { label: "azulado", p: P("#cfe0f5") },
  { label: "dourado", p: P("#f5e3a1") },
]);
byColor("hand", "cloth", "Tecido dobrado", "m", ["roxo", "rosa", "azul", "vermelho", "verde", "branco", "creme", "ocre", "turquesa", "marinho"], { ids: { rosa: "hand_cloth" }, p2: () => ({}) });
byColor("hand", "bouquet", "Ramo de flores", "m", ["rosa", "branco", "lilas", "vermelho", "ocre", "azulClaro"]);
byColor("hand", "lamp", "Lamparina", "f", ["bronze", "dourado", "marrom", "cinza"]);
byColor("hand", "basket", "Cesta", "f", ["marrom", "areia", "ocre", "terracota"]);
byColor("hand", "bread", "Pães", "m", ["areia", "ocre"]);
byColor("hand", "apple", "Maçã", "f", ["vermelho", "verde"]);


// ============================================================ MUITO MAIS OPÇÕES
const METALS: [string, string, string][] = [
  ["ouro", "#f5c518", "de ouro"],
  ["prata", "#c9ced6", "de prata"],
  ["bronze", "#b8832f", "de bronze"],
  ["rose", "#e0a18f", "de ouro rosé"],
  ["cobre", "#b4602d", "de cobre"],
];
const GEMS: [string, string, string][] = [
  ["rubi", "#e5484d", "rubi"],
  ["safira", "#3b82f6", "safira"],
  ["esmeralda", "#2fbf71", "esmeralda"],
  ["ametista", "#a855f7", "ametista"],
  ["topazio", "#f59e0b", "topázio"],
  ["diamante", "#e8f4ff", "diamante"],
  ["turquesa", "#2aa7a0", "turquesa"],
  ["quartzo", "#f5a3c7", "quartzo-rosa"],
  ["citrino", "#f4d35e", "citrino"],
  ["opala", "#cfe0f5", "opala"],
];
/** Joias: toda combinação de metal e pedra (as combinações que já existiam ficam como estavam). */
function jewels(slot: Slot, family: string, base: string, skip: string[] = []) {
  for (const [mk, mc, ml] of METALS)
    for (const [gk, gc, gl] of GEMS) {
      if (skip.includes(`${mk}:${gk}`)) continue;
      items.push({ id: `${family}__${mk}_${gk}`, slot, name: `${base} ${ml} com ${gl}`, base, family, p: { c: mc, c2: gc } });
    }
}
const EXISTING = ["ouro:rubi", "ouro:safira", "ouro:esmeralda", "prata:rubi", "prata:safira", "bronze:esmeralda", "prata:ametista"];
jewels("head", "crown", "Coroa", EXISTING);
jewels("head", "diadem", "Diadema", [...EXISTING, "bronze:topazio"]);
jewels("mantle", "necklace", "Colar", EXISTING);
jewels("hand", "scepter", "Cetro", EXISTING);
jewels("shoes", "jeweled", "Sandálias de joias", EXISTING);
const METAL_ONLY: ColorKey[] = ["dourado", "prata", "bronze", "rose", "cobre", "perola"];

type ByColorOpts = { ids?: Partial<Record<ColorKey, string>>; p2?: (k: ColorKey) => Partial<Params>; only?: boolean };
const T = (family: string, base: string, g: "m" | "f", keys: ColorKey[], opts: ByColorOpts = {}) => byColor("tunic", family, base, g, keys, opts);
const TOP12: ColorKey[] = ["rosa", "azul", "vermelho", "branco", "preto", "lilas", "verde", "creme", "turquesa", "carmim", "marinho", "rosaClaro"];
// ---- roupas
T("gown", "Vestido de baile", "m", ["vermelho", "rosa", "azul", "roxo", "branco", "preto", "dourado", "lilas", "turquesa", "verde", "carmim", "marinho"]);
T("mermaid", "Vestido sereia", "m", ["turquesa", "preto", "vermelho", "dourado", "prata", "azul", "rosa", "roxo", "branco", "verde", "carmim", "marinho"]);
T("mini", "Vestido curto", "m", TOP12);
T("pencil", "Vestido justo", "m", ["preto", "vermelho", "marinho", "branco", "cinza", "carmim", "verde", "rosa", "creme", "lilas", "azul", "marrom"]);
T("sleeveless", "Vestido sem manga", "m", TOP12);
T("longsleeve", "Vestido manga longa", "m", ["creme", "branco", "vermelho", "azul", "verde", "marrom", "preto", "lilas", "rosa", "cinza", "marinho", "bordo"]);
T("puff", "Vestido manga bufante", "m", ["rosaClaro", "branco", "lilas", "azulClaro", "creme", "rosa", "verde", "amarelo", "vermelho", "turquesa", "lavanda", "pessego"]);
T("twopiece", "Conjunto de saia", "m", TOP12);
T("pants", "Conjunto de calça", "m", ["branco", "preto", "creme", "azul", "rosa", "vermelho", "verde", "lilas", "marrom", "marinho", "turquesa", "cinza"]);
T("jumpsuit", "Macacão", "m", ["preto", "branco", "vermelho", "azul", "rosa", "verde", "creme", "lilas", "marinho", "turquesa", "carmim", "marrom"]);
T("toga", "Vestido de um ombro só", "m", ["branco", "creme", "dourado", "azul", "vermelho", "roxo", "rosa", "verde", "preto", "turquesa", "lilas", "carmim"]);
T("kaftan", "Cafetã", "m", ["branco", "turquesa", "creme", "rosa", "azul", "vermelho", "verde", "roxo", "ocre", "lilas", "terracota", "marinho"]);
T("ruffle", "Vestido de babados", "m", TOP12);
T("wrap", "Vestido envelope", "m", ["vermelho", "verde", "azul", "rosa", "preto", "creme", "lilas", "turquesa", "carmim", "marinho", "branco", "terracota"]);
T("flower", "Vestido florido", "m", ["branco", "creme", "azulClaro", "rosaClaro", "verde", "amarelo", "lilas", "azul", "vermelho", "preto", "turquesa", "pessego"]);
T("polka", "Vestido de bolinhas", "m", ["vermelho", "azul", "preto", "rosa", "verde", "creme", "marinho", "lilas", "turquesa", "carmim", "amarelo", "branco"]);
T("plaid", "Vestido xadrez", "m", ["vermelho", "azul", "verde", "preto", "marrom", "rosa", "marinho", "creme", "lilas", "carmim", "cinza", "turquesa"]);

// ---- cabeça
const Hd = (family: string, base: string, g: "m" | "f", keys: ColorKey[], opts: ByColorOpts = {}) => byColor("head", family, base, g, keys, opts);
Hd("bow", "Laço grande", "m", ["rosa", "vermelho", "azul", "branco", "preto", "lilas", "verde", "dourado", "rosaClaro", "turquesa", "carmim", "marinho"]);
Hd("headband", "Arco de cabelo", "m", ["rosa", "preto", "branco", "azul", "vermelho", "lilas", "dourado", "creme", "verde", "marrom", "marinho", "turquesa"]);
Hd("hairclip", "Presilha de borboleta", "f", ["rosa", "azul", "lilas", "dourado", "turquesa", "vermelho", "laranja", "verde", "branco", "magenta", "ceu", "amarelo"]);
Hd("sunhat", "Chapéu de palha", "m", ["rosa", "azul", "vermelho", "branco", "preto", "verde", "lilas", "amarelo", "turquesa", "creme", "laranja", "marinho"]);
Hd("beret", "Boina", "f", ["vermelho", "preto", "rosa", "azul", "creme", "verde", "marrom", "lilas", "marinho", "bordo", "branco", "turquesa"]);
Hd("stars", "Coroa de estrelas", "f", METAL_ONLY, { only: true });
Hd("halo", "Auréola", "f", METAL_ONLY, { only: true });
Hd("pearlband", "Faixa de pérolas", "f", ["branco", "rosaClaro", "creme", "lilas", "azulClaro", "dourado", "perola", "champanhe", "menta", "pessego", "marfim", "lavanda"], { only: true });
Hd("feather", "Faixa com pluma", "f", ["rosa", "azul", "vermelho", "branco", "preto", "lilas", "verde", "dourado", "turquesa", "laranja", "creme", "carmim"]);
Hd("fascinator", "Chapéu de festa", "m", ["rosa", "vermelho", "azul", "branco", "preto", "lilas", "verde", "dourado", "creme", "turquesa", "carmim", "marinho"]);

// ---- manto e enfeites
const Mn = (family: string, base: string, g: "m" | "f", keys: ColorKey[], opts: ByColorOpts = {}) => byColor("mantle", family, base, g, keys, opts);
Mn("bolero", "Bolero", "m", ["branco", "rosa", "preto", "vermelho", "azul", "creme", "lilas", "verde", "marinho", "carmim", "turquesa", "cinza"]);
Mn("cardigan", "Casaco longo", "m", ["creme", "cinza", "marrom", "preto", "azul", "rosa", "verde", "vermelho", "branco", "lilas", "marinho", "bordo"]);
Mn("apron", "Avental", "m", ["branco", "creme", "rosa", "azul", "vermelho", "verde", "lilas", "amarelo", "preto", "turquesa", "marrom", "marinho"]);
Mn("wings", "Asas", "f", ["branco", "rosaClaro", "lilas", "azulClaro", "dourado", "preto", "prata", "turquesa", "rosa", "verde", "lavanda", "pessego"]);
Mn("scarfwrap", "Cachecol", "m", ["vermelho", "creme", "cinza", "azul", "rosa", "verde", "marrom", "preto", "lilas", "mostarda", "marinho", "branco"]);
Mn("poncho", "Poncho", "m", ["terracota", "creme", "azul", "vermelho", "verde", "cinza", "mostarda", "rosa", "marrom", "lilas", "turquesa", "marinho"]);

// ---- calçados
const Sh = (family: string, base: string, g: "m" | "f", keys: ColorKey[], opts: ByColorOpts = {}) => byColor("shoes", family, base, g, keys, opts);
Sh("mary", "Sapato boneca", "m", ["preto", "vermelho", "rosa", "branco", "azul", "marrom", "creme", "lilas", "verde", "bordo", "marinho", "dourado"]);
Sh("peep", "Sapato peep toe", "m", ["vermelho", "preto", "rosa", "nude", "dourado", "prata", "azul", "branco", "lilas", "bordo", "verde", "turquesa"]);
Sh("wedge", "Anabela", "f", ["creme", "preto", "branco", "rosa", "azul", "vermelho", "marrom", "dourado", "lilas", "verde", "turquesa", "terracota"]);
Sh("bootie", "Botinha", "f", ["preto", "marrom", "creme", "cinza", "vermelho", "bordo", "azul", "branco", "rosa", "verde", "marinho", "caramelo"]);
Sh("bowflat", "Sapatilha de laço", "f", ["rosa", "preto", "branco", "vermelho", "azul", "creme", "lilas", "dourado", "verde", "turquesa", "carmim", "marinho"]);
Sh("kitten", "Sapato salto gatinho", "m", ["preto", "nude", "vermelho", "rosa", "branco", "azul", "dourado", "prata", "lilas", "bordo", "verde", "marrom"]);
Sh("lace", "Sapatilha de fitas", "f", ["rosa", "branco", "creme", "preto", "lilas", "azulClaro", "vermelho", "dourado", "verde", "turquesa", "rosaClaro", "marinho"]);

// ---- na mão
const Hn = (family: string, base: string, g: "m" | "f", keys: ColorKey[], opts: ByColorOpts = {}) => byColor("hand", family, base, g, keys, opts);
Hn("bag", "Bolsa", "f", ["preto", "vermelho", "rosa", "marrom", "branco", "azul", "creme", "lilas", "verde", "dourado", "turquesa", "caramelo"]);
Hn("clutch", "Carteira de mão", "f", ["dourado", "prata", "preto", "vermelho", "rosa", "branco", "azul", "lilas", "verde", "bordo", "turquesa", "creme"]);
Hn("fan", "Leque", "m", ["vermelho", "rosa", "azul", "branco", "preto", "dourado", "lilas", "verde", "turquesa", "creme", "carmim", "marinho"]);
Hn("parasol", "Sombrinha", "f", ["rosa", "branco", "vermelho", "azul", "lilas", "creme", "verde", "amarelo", "turquesa", "preto", "pessego", "azulClaro"]);
Hn("mirror", "Espelho de mão", "m", ["dourado", "prata", "rosa", "bronze", "branco", "lilas", "turquesa", "vermelho", "preto", "rose", "azul", "verde"]);
Hn("candle", "Vela", "f", ["creme", "branco", "rosa", "vermelho", "azul", "lilas", "verde", "dourado", "marfim", "amarelo", "turquesa", "laranja"]);
Hn("book", "Livro", "m", ["vermelho", "azul", "marrom", "preto", "verde", "roxo", "bordo", "dourado", "rosa", "marinho", "creme", "turquesa"]);
Hn("balloon", "Balão de coração", "m", ["vermelho", "rosa", "azul", "lilas", "dourado", "verde", "turquesa", "laranja", "amarelo", "branco", "magenta", "ceu"]);
Hn("wand", "Varinha", "f", ["dourado", "rosa", "prata", "lilas", "azul", "turquesa", "vermelho", "branco", "verde", "rose", "bronze", "preto"]);
Hn("teacup", "Xícara de chá", "f", ["rosa", "azul", "vermelho", "verde", "lilas", "dourado", "preto", "turquesa", "amarelo", "marrom", "creme", "marinho"]);

// ---- brincos, colares e pulseiras
items.push({ id: "ears_none", slot: "ears", name: "Sem brincos", family: "none", p: { c: "#000" } });
items.push({ id: "neck_none", slot: "neck", name: "Sem colar", family: "none", p: { c: "#000" } });
items.push({ id: "wrist_none", slot: "wrist", name: "Sem pulseira", family: "none", p: { c: "#000" } });
const METAL_KEYS = new Set<ColorKey>(["dourado", "prata", "bronze", "rose", "cobre"]);
const J = (slot: Slot, family: string, base: string, g: "m" | "f", keys: ColorKey[], gem = false) => byColor(slot, family, base, g, keys, { only: true, p2: (k) => (gem && METAL_KEYS.has(k) ? { c2: "#e5484d" } : {}) });
const MET: ColorKey[] = ["dourado", "prata", "bronze", "rose", "cobre", "perola", "branco", "preto", "rosa", "azul", "vermelho", "turquesa", "lilas", "verde", "ceu", "coral"];
J("ears", "studs", "Brincos de bolinha", "m", MET);
J("ears", "hoops", "Argolas", "f", MET);
J("ears", "drops", "Brincos pendentes", "m", MET);
J("ears", "chandelier", "Brincos de lustre", "m", MET);
J("ears", "earflowers", "Brincos de flor", "m", ["rosa", "branco", "lilas", "vermelho", "azul", "amarelo", "coral", "turquesa", "lavanda", "pessego", "fucsia", "ceu"]);
J("ears", "earstars", "Brincos de estrela", "m", MET);
J("neck", "choker", "Gargantilha", "f", MET);
J("neck", "pendant", "Pingente", "m", MET);
J("neck", "pearls", "Colar de pérolas", "m", ["perola", "branco", "rosaClaro", "preto", "creme", "lavanda", "azulClaro", "champanhe", "menta", "pessego", "dourado", "prata"]);
J("neck", "scarfneck", "Lenço no pescoço", "m", ["vermelho", "azul", "rosa", "branco", "preto", "verde", "amarelo", "lilas", "turquesa", "laranja", "creme", "marinho"]);
J("neck", "bowtie", "Laço no pescoço", "m", ["vermelho", "preto", "rosa", "azul", "branco", "verde", "lilas", "dourado", "turquesa", "carmim", "marinho", "creme"]);
J("neck", "medallion", "Medalhão", "m", METAL_ONLY, true);
J("neck", "layered", "Colar em camadas", "m", METAL_ONLY, true);
J("wrist", "bangle", "Pulseira rígida", "f", MET);
J("wrist", "beads", "Pulseira de contas", "f", ["rosa", "azul", "vermelho", "turquesa", "lilas", "verde", "dourado", "branco", "preto", "coral", "amarelo", "ceu"]);
J("wrist", "watch", "Relógio", "m", METAL_ONLY, true);
J("wrist", "charm", "Pulseira de pingentes", "f", METAL_ONLY, true);
J("wrist", "cuff", "Bracelete largo", "m", MET);
J("wrist", "ribbonw", "Fita no pulso", "f", ["rosa", "vermelho", "azul", "branco", "preto", "lilas", "verde", "dourado", "turquesa", "creme", "coral", "amarelo"]);

// ============================================================ EDIÇÃO LIMITADA (só nas ofertas raras do Madureira Shopping)
custom("head", "madcrown", "Coroa Madureira", [{ id: "head_madcrown", label: "", p: P("#ffd34d", "#ff4fa3", "#7cf0ff") }]);
custom("head", "aurora", "Tiara Aurora", [{ id: "head_aurora", label: "", p: P("#f3e6ff", "#7cf0ff", "#ff9ad5") }]);
custom("tunic", "galadress", "Vestido Gala Madureira", [{ id: "tunic_galadress", label: "", p: P("#ffc4de", "#ffd34d", "#fff2a8") }]);
custom("tunic", "starmaid", "Sereia Estelar", [{ id: "tunic_starmaid", label: "", p: P("#4fd6ff", "#a78bfa", "#ffd34d") }]);
custom("mantle", "starcape", "Capa Estrelada", [{ id: "mantle_starcape", label: "", p: P("#3a1d6e", "#ffd34d", "#7cf0ff") }]);
custom("shoes", "crystal", "Sapatos de Cristal", [{ id: "shoes_crystal", label: "", p: P("#cfeaff", "#7cf0ff", "#ffffff") }]);
custom("hand", "starwand", "Varinha Cometa", [{ id: "hand_starwand", label: "", p: P("#ffd34d", "#ff4fa3", "#7cf0ff") }]);
custom("ears", "comet", "Brincos Cometa", [{ id: "ears_comet", label: "", p: P("#ffd34d", "#7cf0ff", "#ffffff") }]);
custom("neck", "constel", "Colar Constelação", [{ id: "neck_constel", label: "", p: P("#ffd34d", "#a78bfa", "#7cf0ff") }]);
custom("wrist", "auroracuff", "Bracelete Aurora", [{ id: "wrist_auroracuff", label: "", p: P("#f3e6ff", "#ff9ad5", "#7cf0ff") }]);

for (const i of items) i.base ??= i.name;

export const ITEMS: DressItem[] = items;
/** Peças com tamanho: o id da peça base + "~p"/"~g" (pequeno/grande) ou "~c"/"~m" (curto/midi). São criadas sob demanda. */
class ItemMap extends Map<string, DressItem> {
  override get(id: string): DressItem | undefined {
    const hit = super.get(id);
    if (hit || !id.includes("~")) return hit;
    const [base, size] = id.split("~");
    const it = super.get(base);
    if (!it || !size || !sizeOptions(it.slot, it.family)?.some((o) => o.key === size)) return undefined;
    const sized: DressItem = { ...it, id, name: `${it.name} (${SIZE_LABEL[size] ?? size})`, p: { ...it.p, size } };
    super.set(id, sized);
    return sized;
  }
  override has(id: string): boolean {
    return this.get(id) !== undefined;
  }
}
export const ITEM_BY_ID: Map<string, DressItem> = new ItemMap(ITEMS.map((i) => [i.id, i] as [string, DressItem]));

const SIZE_LABEL: Record<string, string> = { p: "pequeno", g: "grande", c: "curto", m: "midi" };
export type SizeOption = { key: string | null; label: string };
const LENGTHS: SizeOption[] = [
  { key: "c", label: "Curto" },
  { key: "m", label: "Midi" },
  { key: null, label: "Longo" },
];
const NO_LENGTH = new Set(["mini", "armor", "leaves", "hoodie"]);
/** Tamanhos que a peça aceita (null = a peça não tem tamanho). `key: null` é o tamanho padrão. */
export function sizeOptions(slot: Slot, family: string): SizeOption[] | null {
  if (family === "none") return null;
  if (slot === "tunic") return NO_LENGTH.has(family) ? null : LENGTHS;
  if (slot === "mantle") return ["cape", "caped", "cardigan", "poncho"].includes(family) ? LENGTHS : null;
  if (slot === "shoes") return null;
  return [
    { key: "p", label: "Pequeno" },
    { key: null, label: "Médio" },
    { key: "g", label: "Grande" },
  ];
}
/** Id da mesma peça no tamanho pedido (null = padrão). */
export const withSize = (id: string, size: string | null): string => {
  const base = id.split("~")[0];
  return size ? `${base}~${size}` : base;
};
/** Tamanho que o id carrega (ou null). */
export const sizeOf = (id: string | undefined): string | null => (id && id.includes("~") ? id.split("~")[1] : null);
export const ITEMS_BY_SLOT = (slot: Slot): DressItem[] => ITEMS.filter((i) => i.slot === slot);

export type Look = Partial<Record<Slot, string>>;

export type FamilyGroup = { family: string; base: string; items: DressItem[] };

/** Famílias modernas: continuam desenhando nos looks antigos, mas não aparecem mais no armário bíblico. */
export const MODERN_FAMILIES = new Set(["cap", "hoodie", "phone", "sneakers"]);

const GROUPS = new Map<Slot, FamilyGroup[]>();
/** Peças do espaço agrupadas por família (o desenho), cada uma com as suas variações de cor. Sem a opção "nada". */
export function familiesBySlot(slot: Slot): FamilyGroup[] {
  const cached = GROUPS.get(slot);
  if (cached) return cached;
  const out: FamilyGroup[] = [];
  for (const i of ITEMS_BY_SLOT(slot)) {
    if (i.family === "none" || MODERN_FAMILIES.has(i.family) || isLimited(i.family)) continue;
    let g = out.find((x) => x.family === i.family);
    if (!g) out.push((g = { family: i.family, base: i.base ?? i.name, items: [] }));
    g.items.push(i);
  }
  GROUPS.set(slot, out);
  return out;
}

/** Famílias de edição limitada do espaço (fora do armário normal). */
export function limitedBySlot(slot: Slot): FamilyGroup[] {
  const out: FamilyGroup[] = [];
  for (const i of ITEMS_BY_SLOT(slot)) {
    if (!isLimited(i.family)) continue;
    let g = out.find((x) => x.family === i.family);
    if (!g) out.push((g = { family: i.family, base: i.base ?? i.name, items: [] }));
    g.items.push(i);
  }
  return out;
}

/** Id da opção "nada" de um espaço (a roupa não tem: é obrigatória). */
export const noneId = (slot: Slot): string | undefined => (ITEM_BY_ID.has(`${slot}_none`) ? `${slot}_none` : undefined);
