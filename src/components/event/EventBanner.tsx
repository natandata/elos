"use client";

import { TRIBES } from "@/lib/event/tribes";
import { useEvent } from "./EventProvider";

/** Faixa do evento no topo das telas: brasão da tribo, nome do evento e quantos dias faltam. Só para quem tem tribo. */
export function EventBanner() {
  const { state } = useEvent();
  if (!state.visible || !state.me) return null;
  const t = TRIBES[state.me];
  const d = state.days_left ?? 0;
  return (
    <div className="mb-4 flex items-center gap-3 rounded-2xl px-3 py-2" style={{ background: t.base, color: t.dark }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={t.img} alt="" width={34} height={34} className="shrink-0" />
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-sm font-extrabold">{state.name ?? "Acampadentro"}</p>
        <p className="truncate text-xs font-semibold">Tribo {t.name}</p>
      </div>
      <div className="shrink-0 text-right leading-tight">
        <p className="text-lg font-black tabular-nums">{d}</p>
        <p className="text-[10px] font-bold uppercase">{d === 1 ? "dia" : "dias"}</p>
      </div>
    </div>
  );
}
