// Clash of Tribos: catálogo da loja (client-safe). Construções vêm de data.ts; aqui ficam tropas, heróis, feras da Bíblia e bolsas.
// Tropas, heróis e feras chegam com o Exército (fase 2): por enquanto aparecem na vitrine com preço e o selo "Em breve".

import type { Res } from "./data";

export type ShopTab = "construcoes" | "tropas" | "herois" | "feras" | "bolsas";

export const SHOP_TABS: { key: ShopTab; label: string; icon: string }[] = [
  { key: "construcoes", label: "Construções", icon: "casa" },
  { key: "tropas", label: "Tropas", icon: "espadas" },
  { key: "herois", label: "Heróis", icon: "coroa" },
  { key: "feras", label: "Feras", icon: "pomba" },
  { key: "bolsas", label: "Bolsas", icon: "bolsa" },
];

export type ShopUnit = { id: string; name: string; role: string; art: string; res: Res; price: number; stat: string };

const H = (n: string) => `/tribos/herois/${n}.webp`;

export const TROOPS: ShopUnit[] = [
  { id: "davi", name: "Davi", role: "Fundeiro", art: H("davi"), res: "mana", price: 25, stat: "Ataca de longe" },
  { id: "golias", name: "Golias", role: "Gigante", art: H("golias"), res: "mana", price: 300, stat: "Muita vida, golpe pesado" },
  { id: "sansao", name: "Sansão", role: "Brutamontes", art: H("sansao"), res: "mana", price: 150, stat: "Derruba muros" },
  { id: "josue", name: "Josué", role: "Trombeteiro", art: H("josue"), res: "mana", price: 100, stat: "Abala as defesas" },
  { id: "gideao", name: "Gideão", role: "Tocheiro", art: H("gideao"), res: "mana", price: 80, stat: "Fogo em área" },
  { id: "debora", name: "Débora", role: "Guerreira", art: H("debora"), res: "mana", price: 60, stat: "Rápida, duas espadas" },
  { id: "pedro", name: "Pedro", role: "Pescador", art: H("pedro"), res: "gold", price: 40, stat: "Rede que prende" },
  { id: "joao", name: "João Batista", role: "Pregador", art: H("joao"), res: "gold", price: 50, stat: "Anima os aliados" },
];

export const HEROES: ShopUnit[] = [
  { id: "moises", name: "Moisés", role: "Líder do povo", art: H("moises"), res: "gems", price: 1500, stat: "Abre caminho nas muralhas" },
  { id: "salomao", name: "Salomão", role: "Rei sábio", art: H("salomao"), res: "gems", price: 1800, stat: "Enfraquece os defensores" },
  { id: "miguel", name: "Miguel", role: "Arcanjo", art: H("miguel"), res: "gems", price: 2500, stat: "Voa e ataca do alto" },
  { id: "ester", name: "Ester", role: "Rainha", art: H("ester"), res: "gems", price: 1400, stat: "Protege e cura o grupo" },
  { id: "daniel", name: "Daniel", role: "Profeta", art: H("daniel"), res: "gems", price: 1600, stat: "Vem com o leão" },
  { id: "elias", name: "Elias", role: "Profeta de fogo", art: H("elias"), res: "gems", price: 1700, stat: "Chamas do alto" },
];

export const BEASTS: ShopUnit[] = [
  { id: "leao", name: "Leão de Daniel", role: "Fera", art: "/arena/campo/leao.webp", res: "gems", price: 900, stat: "Ruge e apavora" },
  { id: "serpente", name: "Serpente do Éden", role: "Fera", art: "/arena/campo/cobra.webp", res: "gems", price: 700, stat: "Veneno com o tempo" },
  { id: "cordeiro", name: "Cordeiro", role: "Fera", art: "/arena/campo/cordeiro.webp", res: "gems", price: 500, stat: "Cura quem está perto" },
  { id: "cervo", name: "Cervo", role: "Fera", art: "/arena/campo/cervo.webp", res: "gems", price: 600, stat: "Corre mais que todos" },
  { id: "pomba", name: "Pomba", role: "Fera", art: "/arena/icones/pomba.webp", res: "gems", price: 800, stat: "Leva a paz e voa" },
];

export type BagRes = "gold" | "mana" | "stone" | "crystal";
export const BAGS: { res: BagRes; name: string; sub: string; art: string; live: boolean }[] = [
  { res: "gold", name: "Bolsa de Ouro", sub: "Enche o cofre de ouro", art: "/arena/icones/bolsa.webp", live: true },
  { res: "mana", name: "Bolsa de Água", sub: "Enche o reservatório de maná", art: "/arena/icones/gota.webp", live: true },
  { res: "stone", name: "Bolsa de Pedras", sub: "Pedras para muros e defesas", art: "/arena/icones/pedra.webp", live: false },
  { res: "crystal", name: "Bolsa de Cristais", sub: "Cristais para os heróis", art: "/arena/icones/diamante.webp", live: false },
];

/** Tamanhos da bolsa, como parte da capacidade do cofre. */
export const BAG_SIZES: { pct: 25 | 50 | 100; label: string }[] = [
  { pct: 25, label: "Pequena" },
  { pct: 50, label: "Média" },
  { pct: 100, label: "Cheia" },
];
