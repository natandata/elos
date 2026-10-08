import type { GuestId, Request } from "../core/types";
import { GUESTS, orderValue } from "../data/items";

/** Cria o pedido de um par: os pratos do convidado e a recompensa por entregar tudo. */
export function makeRequest(id: number, guest: GuestId, now: number, guided = false): Request {
  const d = GUESTS[guest];
  return { id, guest, needs: [...d.feeds], want: [...d.feeds], patience: 1, reward: orderValue(guest), restless: false, arrivedAt: now, guided };
}
