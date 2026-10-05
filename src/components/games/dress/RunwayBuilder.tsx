"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PaperDoll } from "./PaperDoll";
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
      <div className="mb-3 flex justify-center">
        <PaperDoll key={JSON.stringify(look)} base={ch.base} look={look} bg={ch.bg} title={ch.name} className="dress-pop h-[300px] w-auto" />
      </div>

      <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
        {SLOTS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setSlot(s.key)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black ${slot === s.key ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "bg-[var(--card)] ring-1 ring-[var(--line)]"}`}
          >
            {s.emoji} {s.label} {look[s.key] ? "✓" : ""}
          </button>
        ))}
      </div>

      <p className="mb-1 text-[11px] font-bold text-[var(--muted)]">{ITEMS_BY_SLOT(slot).length} peças · role a lista</p>
      <div className="grid max-h-[420px] grid-cols-3 gap-2 overflow-y-auto pr-1">
        {ITEMS_BY_SLOT(slot).map((item) => {
          const on = look[slot] === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setLook((l) => ({ ...l, [slot]: item.id }))}
              className={`card flex flex-col items-center p-1.5 text-center transition active:scale-[0.97] ${on ? "!border-[var(--accent)] ring-2 ring-[var(--accent)]" : ""}`}
            >
              <PaperDoll base={ch.base} look={{ [slot]: item.id }} only={slot} className="h-16 w-full" title={item.name} />
              <span className="mt-0.5 text-[10px] font-bold leading-tight">{item.name}</span>
            </button>
          );
        })}
      </div>

      <button type="button" disabled={!filled || busy} onClick={publish} className="btn btn-primary mt-4 w-full !py-3 disabled:opacity-50">
        {busy ? "..." : filled ? "📸 Publicar na Passarela" : `Faltam ${SLOTS.filter((s) => !look[s.key]).length} peça(s)`}
      </button>
      <p className="mt-2 text-center text-xs text-[var(--muted)]">Você publica um look por dia e não dá pra trocar depois.</p>
      {error ? <p className="mt-2 text-sm font-semibold text-rose-600">{error}</p> : null}
    </div>
  );
}
