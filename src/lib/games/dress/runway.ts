// Passarela do "Vista o Herói" (SÓ SERVIDOR: usa as respostas certas pra nota do júri).
import "server-only";
import { pickDaily } from "../engine";
import { FEMALE_CHARACTERS, type DressCharacter } from "./characters";
import { ITEM_BY_ID, SLOTS, noneId, type Look, type Slot } from "./items";
import { scoreLook } from "./engine";

/** Tema (personagem) do desfile de um dia. */
export function runwayTheme(date: string): DressCharacter {
  // o jogo só tem personagens femininas
  return pickDaily(FEMALE_CHARACTERS, 1, date, "runway-f")[0];
}

/** Dias em que dá pra avaliar: o de hoje e o de ontem. */
export function votingDates(today: string): [string, string] {
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return [today, d.toISOString().slice(0, 10)];
}

/** Valida o look: cada peça tem que ser do espaço certo; sem peça vale "nada", menos a roupa (obrigatória). */
export function cleanLook(raw: unknown): Look | null {
  if (!raw || typeof raw !== "object") return null;
  const out: Look = {};
  for (const s of SLOTS) {
    const id = (raw as Record<string, unknown>)[s.key];
    if (id === undefined || id === null || id === "") {
      const none = noneId(s.key);
      if (!none) return null;
      out[s.key as Slot] = none;
      continue;
    }
    const item = typeof id === "string" ? ITEM_BY_ID.get(id) : undefined;
    if (!item || item.slot !== s.key) return null;
    out[s.key as Slot] = item.id;
  }
  return out;
}

/** Nota de fidelidade bíblica (0–10): desempata o desfile e vira as estrelas do júri. */
export function fidelityOf(characterId: string, look: Look): number {
  return scoreLook(characterId, look).score;
}
