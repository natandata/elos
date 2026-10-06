import type { AchievementDef } from "../types";

export const STORY_ACHIEVEMENTS: AchievementDef[] = [
  { id: "o_comeco", name: "O Começo", desc: "Complete o Éden.", emoji: "🌱" },
  { id: "construtor_arca", name: "Construtor da Arca", desc: "Ajude Noé a construir a arca.", emoji: "🛶" },
  { id: "atraves_aguas", name: "Através das Águas", desc: "Atravesse o Mar Vermelho.", emoji: "🌊" },
  { id: "muralhas_cairam", name: "As Muralhas Caíram", desc: "Complete Jericó.", emoji: "🧱" },
  { id: "o_gigante", name: "O Gigante", desc: "Derrote Golias.", emoji: "🪨" },
  { id: "pedido_sabedoria", name: "Pedido de Sabedoria", desc: "Complete o capítulo de Salomão.", emoji: "👑" },
  { id: "fogo_ceu", name: "Fogo do Céu", desc: "Complete o monte Carmelo.", emoji: "🔥" },
  { id: "na_fornalha", name: "Na Fornalha", desc: "Complete Daniel 3.", emoji: "🔥" },
  { id: "na_cova", name: "Na Cova", desc: "Complete Daniel 6.", emoji: "🦁" },
  { id: "a_jornada", name: "A Jornada", desc: "Complete o Antigo Testamento.", emoji: "📜" },
];
export const ACH_BY_ID = new Map(STORY_ACHIEVEMENTS.map((a) => [a.id, a]));
