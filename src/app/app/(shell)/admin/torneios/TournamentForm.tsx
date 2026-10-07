"use client";

import { useActionState, useState } from "react";
import { saveTournament } from "@/lib/actions/tournaments";
import { ARENAS } from "@/lib/arena/arenas";
import { ARENA_CARDS } from "@/lib/arena/cards";
import { normalizePrizes, type TPrize } from "@/lib/arena/tournament";

export type TournamentFormValue = {
  id: string;
  name: string;
  description: string;
  rules: string;
  format: "solo" | "duo";
  arena: number;
  max_entries: number | null;
  prizes: unknown;
  /** "YYYY-MM-DDTHH:mm" em horário de Brasília */
  startsLocal: string;
};

const field = "w-full rounded-xl border-2 border-[var(--line)] bg-[var(--card)] px-3 py-2.5 text-sm font-semibold";

function PrizeFields({ k, label, value }: { k: string; label: string; value: TPrize }) {
  return (
    <fieldset className="rounded-2xl border-2 border-[var(--line)] p-3">
      <legend className="px-1 text-sm font-black">{label}</legend>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs font-bold text-[var(--muted)]">
          ⭐ XP
          <input name={`${k}_xp`} type="number" min={0} max={500} defaultValue={value.xp} className={`${field} mt-1`} />
        </label>
        <label className="text-xs font-bold text-[var(--muted)]">
          🏆 Troféus
          <input name={`${k}_trophies`} type="number" min={0} max={1000} defaultValue={value.trophies} className={`${field} mt-1`} />
        </label>
        <label className="text-xs font-bold text-[var(--muted)]">
          🃏 Carta
          <select name={`${k}_card`} defaultValue={value.card ?? ""} className={`${field} mt-1`}>
            <option value="">Nenhuma</option>
            <option value="random">Sorteada (entre as liberadas)</option>
            {ARENA_CARDS.map((c) => (
              <option key={c.key} value={c.key}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold text-[var(--muted)]">
          Cópias da carta
          <input name={`${k}_copies`} type="number" min={0} max={5000} defaultValue={value.copies} className={`${field} mt-1`} />
        </label>
      </div>
    </fieldset>
  );
}

/** Criar ou editar um torneio (só enquanto as inscrições estão abertas). */
export function TournamentForm({ item }: { item?: TournamentFormValue }) {
  const [state, action, pending] = useActionState(saveTournament, null);
  const prizes = normalizePrizes(item?.prizes);
  const [places, setPlaces] = useState<number>(prizes.places);

  return (
    <form action={action} className="space-y-3">
      {item ? <input type="hidden" name="id" value={item.id} /> : null}
      <label className="block text-sm font-black">
        Nome do torneio
        <input name="name" required minLength={3} maxLength={80} defaultValue={item?.name ?? ""} placeholder="Ex.: Copa Elos de Páscoa" className={`${field} mt-1`} />
      </label>
      <label className="block text-sm font-black">
        Descrição (aparece pros jogadores)
        <textarea name="description" rows={2} maxLength={1000} defaultValue={item?.description ?? ""} className={`${field} mt-1`} />
      </label>
      <label className="block text-sm font-black">
        Regras
        <textarea name="rules" rows={4} maxLength={4000} defaultValue={item?.rules ?? ""} placeholder="Escreva as regras do torneio: horários, o que vale, o que é proibido…" className={`${field} mt-1`} />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-black">
          Formato
          <select name="format" defaultValue={item?.format ?? "solo"} className={`${field} mt-1`}>
            <option value="solo">1x1 (individual)</option>
            <option value="duo">Duplas (2x2, entre Elos)</option>
          </select>
        </label>
        <label className="block text-sm font-black">
          Arena
          <select name="arena" defaultValue={item?.arena ?? 0} className={`${field} mt-1`}>
            {ARENAS.map((a, i) => (
              <option key={a.key} value={i}>
                {a.emoji} {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-black">
          Máx. de inscritos
          <input name="max_entries" type="number" min={2} max={512} defaultValue={item?.max_entries ?? ""} placeholder="sem limite" className={`${field} mt-1`} />
        </label>
        <label className="block text-sm font-black">
          Início (Brasília)
          <input name="starts_at" type="datetime-local" defaultValue={item?.startsLocal ?? ""} className={`${field} mt-1`} />
        </label>
      </div>
      <p className="text-xs text-[var(--muted)]">A arena vale para todas as fases, menos a Final, que é sempre na Nova Jerusalém. Pode ser qualquer uma, mesmo que os jogadores ainda não a tenham liberado. Nas duplas, cada dupla é de um mesmo Elo e enfrenta duplas de outros Elos.</p>

      <div>
        <p className="mb-1 text-sm font-black">Quem ganha prêmio</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            [1, "Só o 1º"],
            [2, "1º e 2º"],
            [3, "1º, 2º e 3º"],
          ].map(([n, l]) => (
            <label key={n} className={`flex cursor-pointer items-center justify-center rounded-xl border-2 px-2 py-2 text-xs font-black ${places === n ? "border-amber-400 bg-amber-400/15" : "border-[var(--line)]"}`}>
              <input type="radio" name="places" value={n} checked={places === n} onChange={() => setPlaces(Number(n))} className="sr-only" />
              {l}
            </label>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <PrizeFields k="p1" label="🥇 1º lugar" value={prizes.p1} />
        {places >= 2 ? <PrizeFields k="p2" label="🥈 2º lugar" value={prizes.p2} /> : null}
        {places >= 3 ? <PrizeFields k="p3" label="🥉 3º lugar" value={prizes.p3} /> : null}
      </div>
      <p className="text-xs text-[var(--muted)]">Pode combinar XP, troféus e cartas. Nas duplas, cada jogador da dupla recebe o prêmio inteiro. Troféus e cartas entram na conta do jogador quando o torneio termina.</p>

      {state?.error ? <p className="text-sm font-semibold text-rose-600">{state.error}</p> : null}
      {state?.ok ? <p className="text-sm font-semibold text-emerald-600">Salvo!</p> : null}
      <button type="submit" disabled={pending} className="btn btn-primary w-full !py-3">
        {pending ? "Salvando…" : item ? "Salvar alterações" : "Criar torneio"}
      </button>
    </form>
  );
}
