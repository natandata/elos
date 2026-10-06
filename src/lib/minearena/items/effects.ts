// Efeitos de poção (bons e maus) que duram alguns segundos.
export type EffectKind = "poison" | "slow" | "regen" | "strength" | "swift" | "resist";

export const EFFECTS: Record<EffectKind, { name: string; icon: string; bad: boolean }> = {
  poison: { name: "Veneno", icon: "🤢", bad: true },
  slow: { name: "Lentidão", icon: "🐌", bad: true },
  regen: { name: "Regeneração", icon: "💚", bad: false },
  strength: { name: "Força", icon: "💪", bad: false },
  swift: { name: "Pés de gazela", icon: "🦌", bad: false },
  resist: { name: "Proteção", icon: "🛡️", bad: false },
};
