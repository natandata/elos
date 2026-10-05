"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PaperDoll } from "./PaperDoll";
import { submitDressRound, type DressSubmit } from "@/lib/actions/dress";
import { DRESS_CHARACTER_BY_ID } from "@/lib/games/dress/characters";
import { ITEM_BY_ID, SLOTS, type Look, type Slot } from "@/lib/games/dress/items";

/** Uma rodada: vestir o personagem escolhendo uma peça por espaço. */
export function DressGame({
  characterId,
  options,
  index,
  total,
  practice,
}: {
  characterId: string;
  options: Record<Slot, string[]>;
  index: number;
  total: number;
  practice: boolean;
}) {
  const router = useRouter();
  const ch = DRESS_CHARACTER_BY_ID.get(characterId);
  const [look, setLook] = useState<Look>({});
  const [slot, setSlot] = useState<Slot>("head");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [res, setRes] = useState<DressSubmit | null>(null);

  if (!ch) return <p className="card p-5 text-center font-bold">Personagem não encontrado. Atualize a página.</p>;

  const filled = SLOTS.every((s) => look[s.key]);
  const nextEmpty = (from: Slot) => SLOTS.find((s) => !look[s.key] && s.key !== from)?.key;

  function pick(id: string) {
    if (res) return;
    setLook((l) => ({ ...l, [slot]: id }));
    const n = nextEmpty(slot);
    if (n) setTimeout(() => setSlot(n), 280);
  }

  async function check() {
    if (!filled || busy) return;
    setBusy(true);
    setError(null);
    const r = await submitDressRound(look as Record<string, string>).catch(() => ({ error: "Sem conexão. Tente de novo." }) as DressSubmit);
    setBusy(false);
    if (r.error) return setError(r.error);
    setRes(r);
  }

  const mark = (p: 0 | 1 | 2) => (p === 2 ? "✅" : p === 1 ? "🟡" : "❌");

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-xs font-black">
        <span className="rounded-full bg-[var(--card)] px-3 py-1 ring-1 ring-[var(--line)]">
          Personagem {index + 1} de {total}
        </span>
        {practice ? <span className="rounded-full bg-sky-100 px-3 py-1 text-sky-800">🏋️ Treino · sem bilhetes</span> : <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">🎫 Valendo bilhetes</span>}
      </div>

      <div className="card mb-3 p-4">
        <h2 className="text-xl font-black">{ch.name}</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">{ch.clue}</p>
        <p className="mt-1 text-xs font-bold text-[var(--accent-strong)]">📖 {ch.ref}</p>
      </div>

      <div className="mb-3 flex justify-center">
        <PaperDoll key={JSON.stringify(look)} base={ch.base} look={look} bg={ch.bg} title={ch.name} className="dress-pop h-[320px] w-auto" />
      </div>

      {!res ? (
        <>
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

          <div className="grid grid-cols-2 gap-2">
            {options[slot].map((id) => {
              const item = ITEM_BY_ID.get(id);
              const on = look[slot] === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => pick(id)}
                  className={`card flex flex-col items-center p-2 text-center transition active:scale-[0.97] ${on ? "!border-[var(--accent)] ring-2 ring-[var(--accent)]" : ""}`}
                >
                  <PaperDoll base={ch.base} look={{ [slot]: id }} only={slot} className="h-24 w-full" title={item?.name} />
                  <span className="mt-1 text-xs font-bold leading-tight">{item?.name}</span>
                </button>
              );
            })}
          </div>

          <button type="button" disabled={!filled || busy} onClick={check} className="btn btn-primary mt-4 w-full !py-3 disabled:opacity-50">
            {busy ? "..." : filled ? "✨ Conferir meu look" : `Faltam ${SLOTS.filter((s) => !look[s.key]).length} peça(s)`}
          </button>
          {error ? <p className="mt-2 text-sm font-semibold text-rose-600">{error}</p> : null}
        </>
      ) : (
        <div>
          <div className="card mb-3 p-4 text-center">
            <p className="text-3xl font-black tabular-nums">
              {res.roundScore}/{SLOTS.length * 2} pontos
            </p>
          </div>
          <ul className="space-y-2">
            {res.slots?.map((r) => (
              <li key={r.slot} className="card p-3 text-sm">
                <p className="font-black">
                  {mark(r.points)} {SLOTS.find((s) => s.key === r.slot)?.label}: {ITEM_BY_ID.get(r.picked)?.name}
                  <span className="float-right text-xs text-[var(--muted)]">+{r.points}</span>
                </p>
                {r.points < 2 ? <p className="mt-0.5 text-xs font-bold text-emerald-700">Mais fiel: {ITEM_BY_ID.get(r.ideal)?.name}</p> : null}
                <p className="mt-0.5 text-xs text-[var(--muted)]">{r.note}</p>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => router.refresh()} className="btn btn-primary mt-4 w-full !py-3">
            {res.finished ? "Ver o resultado do dia" : "Próximo personagem →"}
          </button>
        </div>
      )}
    </div>
  );
}
