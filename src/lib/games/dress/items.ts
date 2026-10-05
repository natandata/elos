// Catálogo de peças do "Vista o Herói" (client-safe): famílias de desenhos com variações de cor e estilo.
// O desenho de cada família está em components/games/dress (HeadArt, BodyArt, HandArt).

export type Slot = "head" | "tunic" | "mantle" | "shoes" | "hand";

export const SLOTS: { key: Slot; label: string; emoji: string }[] = [
  { key: "head", label: "Cabeça", emoji: "👑" },
  { key: "tunic", label: "Roupa", emoji: "👘" },
  { key: "mantle", label: "Manto e enfeites", emoji: "🧣" },
  { key: "shoes", label: "Calçado", emoji: "👡" },
  { key: "hand", label: "Na mão", emoji: "🪄" },
];

/** Parâmetros de cor de um desenho: c = principal, c2 = secundária (pedra, detalhe, borda), c3 = terceira. */
export type Params = { c: string; c2?: string; c3?: string };

export type DressItem = {
  id: string;
  slot: Slot;
  name: string;
  /** desenho base (várias peças dividem a mesma família, mudando só a cor) */
  family: string;
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
} as const;
export type ColorKey = keyof typeof COLORS;

type Variant = { id?: string; label: string; p: Params };

const items: DressItem[] = [];

/** Uma família com uma peça por cor. `gender` concorda o nome da cor com o da peça. */
function byColor(slot: Slot, family: string, base: string, gender: "m" | "f", keys: ColorKey[], opts: { ids?: Partial<Record<ColorKey, string>>; p2?: (k: ColorKey) => Partial<Params> } = {}) {
  for (const k of keys) {
    const c = COLORS[k];
    const extra = opts.p2?.(k) ?? {};
    items.push({ id: opts.ids?.[k] ?? `${family}__${k}`, slot, name: `${base} ${gender === "f" ? c.f : c.m}`, family, p: { c: c.hex, ...extra } });
  }
}

/** Uma família com variantes escritas à mão (nome e cores). */
function custom(slot: Slot, family: string, base: string, variants: Variant[]) {
  variants.forEach((v, i) => items.push({ id: v.id ?? `${family}__${i}`, slot, name: v.label ? `${base} ${v.label}` : base, family, p: v.p }));
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

export const ITEMS: DressItem[] = items;
export const ITEM_BY_ID = new Map(ITEMS.map((i) => [i.id, i]));
export const ITEMS_BY_SLOT = (slot: Slot): DressItem[] => ITEMS.filter((i) => i.slot === slot);

export type Look = Partial<Record<Slot, string>>;
