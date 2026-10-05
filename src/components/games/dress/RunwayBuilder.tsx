"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PaperDoll } from "./PaperDoll";
import { RARITY_ICON, SparkleBurst, rarityOf } from "./Vh";
import { submitRunwayLook } from "@/lib/actions/runway";
import { DRESS_CHARACTER_BY_ID } from "@/lib/games/dress/characters";
import { ITEMS_BY_SLOT, SLOTS, type Look, type Slot } from "@/lib/games/dress/items";

/** Monta o look livre do dia (todas as peças do catálogo) e publica na Passarela. */
export function RunwayBuilder({ characterId }: { characterId: string }) {
  const router = useRouter();
  const ch = DRESS_CHARACTER_BY_ID.get(characterId);
  const [look, setLook] = useState<Look>({});
  const [slot, setSlot] = useState<Slot>("head");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);
  if (!ch) return null;

  const filled = SLOTS.every((s) => look[s.key]);

  async function publish() {
    if (!filled || busy) return;
    setBusy(true);
    setError(null);
    const r = await submitRunwayLook(look).catch(() => ({ error: "Sem conexão. Tente de novo." }) as { error?: string });
    setBusy(false);
    if (r.error) return setError(r.error);
    router.refresh();
  }

  return (
    <div>
      <div className="vh-scene pb-9 pt-4">
        <div className="vh-arch" />
        <div className="vh-pedestal" />
        <PaperDoll key={JSON.stringify(look)} base={ch.base} look={look} title={ch.name} className="vh-doll h-[300px] w-auto" />
        {burst > 0 ? <SparkleBurst key={burst} /> : null}
      </div>

      <div className="mb-3 flex justify-between gap-1 px-1">
        {SLOTS.map((s) => (
          <div key={s.key} className="flex w-[19%] flex-col items-center">
            <button type="button" aria-label={s.label} onClick={() => setSlot(s.key)} className="vh-medal" data-on={slot === s.key} data-done={!!look[s.key]}>
              {s.emoji}
            </button>
            <span className="vh-medal-label">{s.label}</span>
          </div>
        ))}
      </div>

      <p className="mb-1 text-[11px] font-bold text-amber-200">{ITEMS_BY_SLOT(slot).length} peças · role a lista</p>
      <div className="grid max-h-[420px] grid-cols-3 gap-2.5 overflow-y-auto p-1 pr-1.5">
        {ITEMS_BY_SLOT(slot).map((item) => {
          const on = look[slot] === item.id;
          const rare = rarityOf(item.family);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setLook((l) => ({ ...l, [slot]: item.id }));
                setBurst((b) => b + 1);
              }}
              className="vh-card !px-1"
              data-on={on}
              data-rare={rare === "common" ? undefined : rare}
            >
              {rare !== "common" ? <span className="vh-rarity">{RARITY_ICON[rare]}</span> : null}
              <PaperDoll base={ch.base} look={{ [slot]: item.id }} only={slot} className="h-16 w-full" title={item.name} />
              <span className="vh-card-name block !text-[10px]">{item.name}</span>
            </button>
          );
        })}
      </div>

      <button type="button" disabled={!filled || busy} onClick={publish} className="vh-btn vh-btn-gold mt-5">
        {busy ? "..." : filled ? "📸 Publicar na Passarela" : `Faltam ${SLOTS.filter((s) => !look[s.key]).length} peça(s)`}
      </button>
      <p className="mt-2 text-center text-xs text-purple-200">Você publica um look por dia e não dá pra trocar depois.</p>
      {error ? <p className="mt-2 rounded-xl bg-rose-900/70 px-3 py-2 text-sm font-bold text-rose-100">{error}</p> : null}
    </div>
  );
}
