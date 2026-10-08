import type { Request, SpeciesId } from "../core/types";
import { SPECIES, orderValue } from "../data/items";

/** Cria o pedido de um par: os pratos da espécie e a recompensa por entregar tudo. */
export function makeRequest(id: number, species: SpeciesId, now: number, guided = false): Request {
  const d = SPECIES[species];
  return { id, species, needs: [...d.feeds], want: [...d.feeds], patience: 1, reward: orderValue(species), restless: false, arrivedAt: now, guided };
}
