import type { SaveData } from "../core/types";
import type { Result } from "../core/engine";

export type AchievementCtx = { save: SaveData; result?: Result; levelId?: string; bestStreak?: number; construction?: boolean };
export type Achievement = { id: string; emoji: string; name: string; desc: string; check: (c: AchievementCtx) => boolean; soon?: boolean };

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_mission", emoji: "🏁", name: "Primeira Missão", desc: "Complete sua primeira fase.", check: (c) => !!c.result?.won && c.result.mode === "campaign" },
  { id: "quick_hands", emoji: "⚡", name: "Mãos Rápidas", desc: "Atenda 20 pedidos seguidos sem perder nenhum.", check: (c) => c.save.serveStreak >= 20 },
  { id: "administrator", emoji: "📦", name: "Administrador", desc: "Termine uma fase com 90% de satisfação.", check: (c) => !!c.result?.won && c.result.mode === "campaign" && c.result.satisfaction >= 90 },
  { id: "hospitality", emoji: "🏕️", name: "Hospitalidade", desc: "Atenda 50 visitantes.", check: (c) => c.save.totalServed >= 50 },
  { id: "builder", emoji: "🧱", name: "Construtor", desc: "Complete uma fase de construção.", check: () => false, soon: true },
  { id: "perfect", emoji: "🌟", name: "Perfeito", desc: "Consiga 3 estrelas em uma fase.", check: (c) => (c.result?.stars ?? 0) >= 3 },
  { id: "no_waste", emoji: "♻️", name: "Sem Desperdício", desc: "Termine uma fase sem queimar nem jogar fora nenhum prato.", check: (c) => !!c.result?.won && c.result.mode === "campaign" && c.result.waste === 0 },
  { id: "management_master", emoji: "👑", name: "Mestre da Gestão", desc: "Consiga 3 estrelas em 10 fases.", check: (c) => Object.values(c.save.stars).filter((s) => s >= 3).length >= 10, soon: true },
];

export function newlyUnlocked(ctx: AchievementCtx): Achievement[] {
  return ACHIEVEMENTS.filter((a) => !ctx.save.achievements.includes(a.id) && a.check(ctx));
}
