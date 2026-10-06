import type { FeedId, NeedItem, PenId, Request, SpeciesId } from "../core/types";
import { SPECIES } from "../data/items";

/** Cria o pedido de um par: alimentar (cada alimento) e levar ao cercado certo. */
export function makeRequest(id: number, species: SpeciesId, now: number, guided = false): Request {
  const d = SPECIES[species];
  const needs: NeedItem[] = [...d.feeds.map((f): NeedItem => ({ kind: "feed", id: f })), { kind: "place", id: d.pen }];
  return { id, species, needs, patience: 1, reward: d.reward, priority: 0, restless: false, arrivedAt: now, guided };
}

export const needsFeed = (r: Request, f: FeedId): boolean => r.needs.some((n) => n.kind === "feed" && n.id === f);
export const feedsLeft = (r: Request): number => r.needs.filter((n) => n.kind === "feed").length;
export const readyToPlace = (r: Request): boolean => feedsLeft(r) === 0 && r.needs.some((n) => n.kind === "place");
export const wantsPen = (r: Request): PenId | null => {
  const p = r.needs.find((n) => n.kind === "place");
  return p && p.kind === "place" ? p.id : null;
};

/** Qual pedido atender quando o jogador não escolheu um: o mais impaciente que precisa disso. */
export function mostUrgent(queue: Request[], pick: (r: Request) => boolean): Request | null {
  let best: Request | null = null;
  for (const r of queue) if (pick(r) && (!best || r.patience < best.patience)) best = r;
  return best;
}
