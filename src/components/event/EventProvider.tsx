"use client";

import { createContext, useContext } from "react";
import type { EventState, TribeKey } from "@/lib/event/tribes";

type Ctx = { state: EventState; map: Record<string, TribeKey> };
const EventCtx = createContext<Ctx>({ state: { visible: false }, map: {} });

/** Leva o estado do evento e a lista "pessoa -> tribo" para qualquer tela (etiquetas, tema, faixa e card). */
export function EventProvider({ state, map, children }: { state: EventState; map: Record<string, TribeKey>; children: React.ReactNode }) {
  return <EventCtx.Provider value={{ state, map }}>{children}</EventCtx.Provider>;
}

export const useEvent = () => useContext(EventCtx);
export const useTribeOf = (userId?: string | null): TribeKey | null => {
  const { state, map } = useContext(EventCtx);
  return state.visible && userId ? (map[userId] ?? null) : null;
};
