"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { HeroCover } from "./HeroCover";
import { PaperDoll } from "./PaperDoll";
import { RARITY_ICON, SparkleBurst, VhStage, rarityOf } from "./Vh";
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
  const [burst, setBurst] = useState(0);

  if (!ch) return <p className="card p-5 text-center font-bold">Personagem não encontrado. Atualize a página.</p>;

  const filled = SLOTS.every((s) => look[s.key]);
  const nextEmpty = (from: Slot) => SLOTS.find((s) => !look[s.key] && s.key !== from)?.key;

  function pick(id: string) {
    if (res) return;
    setLook((l) => ({ ...l, [slot]: id }));
    setBurst((b) => b + 1);
    const n = nextEmpty(slot);
    if (n) setTimeout(() => setSlot(n), 380);
  }

  async function check() {
    if (!filled || busy) return;
    setBusy(true);
    setError(null);
    const r = await submitDressRound(look as Record<string, string>).catch(() => ({ error: "Sem conexão. Tente de novo." }) as DressSubmit);
    setBusy(false);
    if (r.error) return setError(r.error);
    setRes(r);
    setBurst((b) => b + 1);
  }

  const mark = (p: 0 | 1 | 2) => (p === 2 ? "✅" : p === 1 ? "🟡" : "❌");
  const perfect = !!res && (res.roundScore ?? 0) >= SLOTS.length * 2;

  return (
    <VhStage>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="vh-ribbon">
          Personagem {index + 1} de {total}
        </span>
        {practice ? <span className="rounded-full border-2 border-sky-300 bg-sky-900/60 px-3 py-1 text-[11px] font-black text-sky-100">🏋️ Treino · sem bilhetes</span> : <span className="rounded-full border-2 border-amber-300 bg-amber-900/50 px-3 py-1 text-[11px] font-black text-amber-100">🎫 Valendo bilhetes</span>}
      </div>

      <HeroCover ch={ch} />

      <div className="vh-scene pb-9 pt-4">
        <div className="vh-arch" />
        <div className="vh-pedestal" />
        <PaperDoll key={JSON.stringify(look)} base={ch.base} look={look} title={ch.name} className="vh-doll h-[320px] w-auto" />
        {burst > 0 ? <SparkleBurst key={burst} n={perfect ? 22 : 12} /> : null}
        {perfect ? <p className="vh-pop absolute inset-x-0 top-2 z-10 text-center text-lg font-black text-amber-200 [text-shadow:0_2px_6px_#000]">✨ Look perfeito! ✨</p> : null}
      </div>

      {!res ? (
        <>
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

          <div className="grid grid-cols-2 gap-3">
            {options[slot].map((id) => {
              const item = ITEM_BY_ID.get(id);
              const on = look[slot] === id;
              const rare = rarityOf(item?.family ?? "");
              return (
                <button key={id} type="button" onClick={() => pick(id)} className="vh-card" data-on={on} data-rare={rare === "common" ? undefined : rare}>
                  {rare !== "common" ? <span className="vh-rarity">{RARITY_ICON[rare]}</span> : null}
                  <PaperDoll base={ch.base} look={{ [slot]: id }} only={slot} className="h-24 w-full" title={item?.name} />
                  <span className="vh-card-name block">{item?.name}</span>
                </button>
              );
            })}
          </div>

          <button type="button" disabled={!filled || busy} onClick={check} className="vh-btn vh-btn-gold mt-5">
            {busy ? "..." : filled ? "✨ Conferir meu look" : `Faltam ${SLOTS.filter((s) => !look[s.key]).length} peça(s)`}
          </button>
          {error ? <p className="mt-2 rounded-xl bg-rose-900/70 px-3 py-2 text-sm font-bold text-rose-100">{error}</p> : null}
        </>
      ) : (
        <div>
          <div className="vh-panel vh-pop mb-4 text-center">
            <p className="vh-h2">Sua pontuação</p>
            <p className="vh-title mt-1 text-5xl tabular-nums">
              {res.roundScore}/{SLOTS.length * 2}
            </p>
          </div>
          <ul className="space-y-2">
            {res.slots?.map((r, i) => (
              <li key={r.slot} className="vh-panel vh-pop !p-3 text-sm" style={{ animationDelay: `${i * 0.08}s` }}>
                <p className="font-black text-amber-100">
                  {mark(r.points)} {SLOTS.find((s) => s.key === r.slot)?.label}: {ITEM_BY_ID.get(r.picked)?.name}
                  <span className="float-right text-xs text-amber-300">+{r.points}</span>
                </p>
                {r.points < 2 ? <p className="mt-0.5 text-xs font-bold text-emerald-300">Mais fiel: {ITEM_BY_ID.get(r.ideal)?.name}</p> : null}
                <p className="mt-0.5 text-xs text-purple-100/90">{r.note}</p>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => router.refresh()} className="vh-btn mt-5">
            {res.finished ? "Ver o resultado do dia" : "Próximo personagem →"}
          </button>
        </div>
      )}
    </VhStage>
  );
}
