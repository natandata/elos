// Passarela do "Vista o Herói" (SÓ SERVIDOR: usa as respostas certas pra nota de fidelidade).
import "server-only";
import { pickDaily } from "../engine";
import { DRESS_CHARACTERS, type DressCharacter } from "./characters";
import { ITEM_BY_ID, SLOTS, type Look, type Slot } from "./items";
import { SOLUTIONS } from "./solutions";

export const MAX_VOTES_PER_DAY = 5;
export const RUNWAY_PRIZES = [30, 20, 10] as const;

/** Tema (personagem) da Passarela de um dia: sorteio próprio, independente do desafio solo. */
export function runwayTheme(date: string): DressCharacter {
  return pickDaily(DRESS_CHARACTERS, 1, date, "runway")[0];
}

/** Dias em que dá pra votar: o de hoje e o de ontem. */
export function votingDates(today: string): [string, string] {
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return [today, d.toISOString().slice(0, 10)];
}

/** Valida um look livre (uma peça do catálogo certa pra cada espaço). */
export function cleanLook(raw: unknown): Look | null {
  if (!raw || typeof raw !== "object") return null;
  const out: Look = {};
  for (const s of SLOTS) {
    const id = (raw as Record<string, unknown>)[s.key];
    const item = typeof id === "string" ? ITEM_BY_ID.get(id) : undefined;
    if (!item || item.slot !== s.key) return null;
    out[s.key as Slot] = item.id;
  }
  return out;
}

/** Nota de fidelidade bíblica (0–10): só desempata a votação e aparece nos resultados. */
export function fidelityOf(characterId: string, look: Look): number {
  const sol = SOLUTIONS[characterId];
  if (!sol) return 0;
  let pts = 0;
  for (const s of SLOTS) {
    const x = sol[s.key];
    const id = look[s.key];
    pts += id === x.ideal ? 2 : id && x.ok.includes(id) ? 1 : 0;
  }
  return pts;
}
