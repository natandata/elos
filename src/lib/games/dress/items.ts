// Catálogo de peças do "Vista o Herói" (client-safe). O desenho de cada peça está em components/games/dress/ItemArt.tsx.

export type Slot = "head" | "tunic" | "mantle" | "shoes" | "hand";

export const SLOTS: { key: Slot; label: string; emoji: string }[] = [
  { key: "head", label: "Cabeça", emoji: "👑" },
  { key: "tunic", label: "Roupa", emoji: "👘" },
  { key: "mantle", label: "Manto e enfeites", emoji: "🧣" },
  { key: "shoes", label: "Calçado", emoji: "👡" },
  { key: "hand", label: "Na mão", emoji: "🪄" },
];

export type DressItem = { id: string; slot: Slot; name: string };

export const ITEMS: DressItem[] = [
  // cabeça
  { id: "head_none", slot: "head", name: "Cabeça descoberta" },
  { id: "head_crown", slot: "head", name: "Coroa de ouro" },
  { id: "head_diadem", slot: "head", name: "Diadema real" },
  { id: "head_turban", slot: "head", name: "Turbante de linho" },
  { id: "head_veil", slot: "head", name: "Véu" },
  { id: "head_helmet", slot: "head", name: "Capacete de bronze" },
  { id: "head_scarf", slot: "head", name: "Pano de cabeça" },
  { id: "head_cap", slot: "head", name: "Boné" },
  // roupa
  { id: "tunic_simple", slot: "tunic", name: "Túnica simples de linho" },
  { id: "tunic_camel", slot: "tunic", name: "Veste de pelo de camelo" },
  { id: "tunic_colors", slot: "tunic", name: "Túnica de muitas cores" },
  { id: "tunic_linen", slot: "tunic", name: "Linho finíssimo" },
  { id: "tunic_purple", slot: "tunic", name: "Veste de púrpura" },
  { id: "tunic_blue", slot: "tunic", name: "Túnica azul" },
  { id: "tunic_armor", slot: "tunic", name: "Armadura" },
  { id: "tunic_leaves", slot: "tunic", name: "Folhas de figueira" },
  { id: "tunic_skins", slot: "tunic", name: "Vestes de peles" },
  { id: "tunic_sack", slot: "tunic", name: "Roupa de saco" },
  { id: "tunic_hoodie", slot: "tunic", name: "Moletom" },
  // manto e enfeites
  { id: "mantle_none", slot: "mantle", name: "Nada por cima" },
  { id: "mantle_royal", slot: "mantle", name: "Manto real" },
  { id: "mantle_blue", slot: "mantle", name: "Manto azul" },
  { id: "mantle_striped", slot: "mantle", name: "Manto de lã listrado" },
  { id: "mantle_belt", slot: "mantle", name: "Cinto de couro" },
  { id: "mantle_collar", slot: "mantle", name: "Colar de ouro" },
  { id: "mantle_sash", slot: "mantle", name: "Faixa vermelha" },
  { id: "mantle_white", slot: "mantle", name: "Manto branco" },
  { id: "mantle_sheep", slot: "mantle", name: "Peles de cabrito" },
  // calçado
  { id: "shoes_none", slot: "shoes", name: "Descalço" },
  { id: "shoes_sandals", slot: "shoes", name: "Sandálias simples" },
  { id: "shoes_gold", slot: "shoes", name: "Sandálias douradas" },
  { id: "shoes_bronze", slot: "shoes", name: "Grevas de bronze" },
  { id: "shoes_sneakers", slot: "shoes", name: "Tênis" },
  { id: "shoes_boots", slot: "shoes", name: "Botas de couro" },
  // na mão
  { id: "hand_none", slot: "hand", name: "Mãos livres" },
  { id: "hand_staff", slot: "hand", name: "Cajado" },
  { id: "hand_sling", slot: "hand", name: "Funda" },
  { id: "hand_harp", slot: "hand", name: "Harpa" },
  { id: "hand_trumpet", slot: "hand", name: "Trombeta" },
  { id: "hand_sword", slot: "hand", name: "Espada" },
  { id: "hand_scroll", slot: "hand", name: "Rolo de pergaminho" },
  { id: "hand_jar", slot: "hand", name: "Jarro com tocha" },
  { id: "hand_scepter", slot: "hand", name: "Cetro real" },
  { id: "hand_olive", slot: "hand", name: "Ramo de oliveira" },
  { id: "hand_jawbone", slot: "hand", name: "Queixada de jumento" },
  { id: "hand_pitcher", slot: "hand", name: "Cântaro" },
  { id: "hand_phone", slot: "hand", name: "Celular" },
];

export const ITEM_BY_ID = new Map(ITEMS.map((i) => [i.id, i]));
export const ITEMS_BY_SLOT = (slot: Slot): DressItem[] => ITEMS.filter((i) => i.slot === slot);

export type Look = Partial<Record<Slot, string>>;
