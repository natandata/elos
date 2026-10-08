import { todayBrasilia } from "@/lib/birthday";

/** Desafio Maná Duplo: liberado a partir desta data (Brasília). */
export const MANA2_OPENS_ON = "2026-10-16";

export const mana2Locked = (today = todayBrasilia()): boolean => today < MANA2_OPENS_ON;
