"use client";

import { useEffect, useMemo, useState } from "react";
import { PaperDoll } from "./PaperDoll";
import { DEFAULT_BEAUTY, baseFromBeauty } from "@/lib/games/dress/beauty";
import { SLOTS, familiesBySlot } from "@/lib/games/dress/items";
import { RARITY_ICON, priceOf, rarityOf } from "@/lib/games/dress/rarity";
import { TROPHIES, type Counts } from "@/lib/games/dress/titles";
import { createClient } from "@/lib/supabase/client";

const BASE = baseFromBeauty(DEFAULT_BEAUTY);

/** Loja de peças raras: bilhetes dourados viram peças que ficam para sempre no guarda-roupa. */
export function DressShop({ tickets }: { tickets: number }) {
  const sb = useMemo(() => createClient(), []);
  const [have, setHave] = useState(tickets);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [slot, setSlot] = useState(SLOTS[0].key);

  useEffect(() => {
    void sb.rpc("dress_my_inventory").then(({ data }) => {
      const d = (data ?? {}) as { families?: string[]; tickets?: number };
      setOwned(new Set(d.families ?? []));
      if (typeof d.tickets === "number") setHave(d.tickets);
    });
  }, [sb]);

  const fams = familiesBySlot(slot).filter((f) => priceOf(f.family) > 0);

  async function buy(family: string) {
    if (busy) return;
    setBusy(family);
    setMsg(null);
    const { data, error } = await sb.rpc("dress_buy_family", { p_family: family });
    setBusy(null);
    const r = (data ?? {}) as { error?: string; tickets?: number };
    if (error || r.error) return setMsg(r.error ?? "Não deu para comprar agora.");
    setOwned((o) => new Set(o).add(family));
    if (typeof r.tickets === "number") setHave(r.tickets);
    setMsg("Peça nova no seu guarda-roupa! ✨");
  }

  return (
    <section className="vh-panel mb-5">
      <h2 className="vh-h2 mb-1">🛍️ Loja de peças raras</h2>
      <p className="text-sm text-purple-100">
        Você tem <b className="text-amber-200">{have} 🎫</b>. 💜 épicas custam 60 · ⭐ lendárias custam 150. Comprou, é sua para sempre.
      </p>
      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
        {SLOTS.map((s) => (
          <button key={s.key} type="button" className="vh-chip !px-3 !py-1 !text-[11px]" data-on={slot === s.key} onClick={() => setSlot(s.key)}>
            {s.emoji} {s.label}
          </button>
        ))}
      </div>
      {fams.length === 0 ? <p className="mt-3 text-center text-sm text-purple-200">Nada raro aqui — tudo de graça!</p> : null}
      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {fams.map((f) => {
          const mine = owned.has(f.family);
          const price = priceOf(f.family);
          return (
            <div key={f.family} className="vh-tile !cursor-default" data-rare={rarityOf(f.family)} data-on={mine}>
              <em className="vh-tile-x not-italic">{RARITY_ICON[rarityOf(f.family)]}</em>
              <PaperDoll base={BASE} look={{ [slot]: f.items[0].id }} only={slot} className="h-14 w-full" title={f.base} />
              <span>{f.base}</span>
              {mine ? (
                <b className="text-[10px] text-emerald-700">✓ Sua</b>
              ) : (
                <button type="button" className="rounded-full bg-purple-700 px-2 py-0.5 text-[10px] font-black text-amber-100 disabled:opacity-40" disabled={!!busy || have < price} onClick={() => void buy(f.family)}>
                  {busy === f.family ? "..." : `${price} 🎫`}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {msg ? (
        <p className="mt-2 rounded-xl bg-purple-900/70 px-3 py-2 text-center text-sm font-bold text-amber-100" role="status">
          {msg}
        </p>
      ) : null}
    </section>
  );
}

/** Troféus e títulos: o título escolhido aparece no pódio. */
export function DressTrophies() {
  const sb = useMemo(() => createClient(), []);
  const [c, setC] = useState<(Counts & { title: string | null }) | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void sb.rpc("dress_achievements").then(({ data }) => setC((data ?? null) as (Counts & { title: string | null }) | null));
  }, [sb]);

  async function pick(title: string) {
    if (saving || !c) return;
    setSaving(true);
    const next = c.title === title ? "" : title;
    await sb.rpc("dress_set_title", { p_title: next });
    setC({ ...c, title: next || null });
    setSaving(false);
  }

  if (!c) return null;
  const got = TROPHIES.filter((t) => t.got(c)).length;
  return (
    <section className="vh-panel mb-5">
      <h2 className="vh-h2 mb-1">🏆 Troféus ({got}/{TROPHIES.length})</h2>
      <p className="mb-2 text-xs text-purple-200">Toque num troféu conquistado para usar o título dele no seu perfil.</p>
      <ul className="grid grid-cols-2 gap-2">
        {TROPHIES.map((t) => {
          const ok = t.got(c);
          const on = c.title === t.title;
          return (
            <li key={t.key}>
              <button type="button" disabled={!ok} onClick={() => void pick(t.title)} data-on={on} className="vh-row !w-full !items-start text-left disabled:opacity-45" aria-pressed={on}>
                <span className="text-2xl" aria-hidden>
                  {ok ? t.icon : "🔒"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-black text-amber-50">{t.title}</span>
                  <span className="block text-[10px] text-purple-200">{ok ? (on ? "Título em uso ✓" : "Conquistado") : `${t.hint} · ${Math.min(t.have(c), t.need)}/${t.need}`}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

type Row = { id: string; name: string; games: number; wins: number; podiums: number; pts: number; me: boolean };

/** Rankings da semana e do Mega (o geral continua sendo o dos Bilhetes). */
export function DressRankTabs() {
  const sb = useMemo(() => createClient(), []);
  const [kind, setKind] = useState<"week" | "mega">("week");
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    let alive = true;
    void sb.rpc("dress_rank_period", { p_kind: kind }).then(({ data }) => {
      if (alive) setRows((data ?? []) as Row[]);
    });
    return () => {
      alive = false;
    };
  }, [sb, kind]);

  return (
    <section className="vh-panel mb-5">
      <h2 className="vh-h2 mb-2">📅 Rankings</h2>
      <div className="mb-2 flex gap-2">
        {(
          [
            ["week", "Da semana"],
            ["mega", "Mega Desfile"],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            type="button"
            className="vh-chip !px-3 !py-1 !text-[11px]"
            data-on={kind === k}
            onClick={() => {
              setRows(null);
              setKind(k);
            }}
          >
            {l}
          </button>
        ))}
      </div>
      {rows === null ? (
        <p className="p-2 text-sm text-purple-200">Carregando…</p>
      ) : rows.length === 0 ? (
        <p className="p-2 text-sm text-purple-200">{kind === "week" ? "Ninguém jogou nesta semana ainda." : "Ainda não teve Mega Desfile com resultado."}</p>
      ) : (
        <ol className="space-y-1.5">
          {rows.slice(0, 10).map((r, i) => (
            <li key={r.id} className="vh-row" data-me={r.me}>
              <span className="w-7 text-center text-base font-black">{["🥇", "🥈", "🥉"][i] ?? i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-amber-50">{r.name}</span>
                <span className="block text-[11px] text-purple-200">
                  {r.wins} vitória{r.wins === 1 ? "" : "s"} · {r.games} partida{r.games === 1 ? "" : "s"}
                </span>
              </span>
              <span className="text-sm font-black tabular-nums text-amber-200">{r.pts} pts</span>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-2 text-center text-[10px] text-purple-300">1º = 5 pts · 2º = 3 · 3º = 2 · jogar = 1</p>
    </section>
  );
}
