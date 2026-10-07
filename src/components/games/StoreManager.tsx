"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteStoreItem, saveStoreItem, type StoreInput } from "@/lib/actions/store";
import { GAME_CATALOG } from "@/lib/games/catalog";
import { COIN } from "@/lib/games/coins";
import type { StoreItem } from "@/lib/games/store";

/** ISO (UTC) -> "AAAA-MM-DDTHH:mm" no horário de Brasília. */
const toLocal = (iso: string | null): string => (iso ? new Date(new Date(iso).getTime() - 3 * 3600_000).toISOString().slice(0, 16) : "");

const blank = (sort: number): StoreInput => ({ title: "", emoji: "🎮", blurb: "", cover: "", href: "", gameKey: "", status: "dev", releaseLocal: "", price: "", active: true, sort });

function Editor({ initial, id, isNew, onDone }: { initial: StoreInput; id?: string; isNew?: boolean; onDone?: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [f, setF] = useState<StoreInput>(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const set = <K extends keyof StoreInput>(k: K, v: StoreInput[K]) => {
    setMsg(null);
    setF((p) => ({ ...p, [k]: v }));
  };

  function save() {
    start(async () => {
      const r = await saveStoreItem({ ...f, id });
      if (r.error) setMsg({ ok: false, text: r.error });
      else {
        setMsg({ ok: true, text: "Salvo!" });
        if (isNew) setF(blank(f.sort + 1));
        router.refresh();
        onDone?.();
      }
    });
  }
  function remove() {
    if (!id || !window.confirm(`Apagar "${f.title}" da Loja?`)) return;
    start(async () => {
      const r = await deleteStoreItem(id);
      if (r.error) setMsg({ ok: false, text: r.error });
      else router.refresh();
    });
  }

  return (
    <div className="card space-y-2 p-3">
      <div className="flex gap-2">
        <input className="input !w-16 text-center text-xl" value={f.emoji} onChange={(e) => set("emoji", e.target.value)} aria-label="Emoji" maxLength={8} />
        <input className="input flex-1" value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="Nome do jogo" aria-label="Nome do jogo" maxLength={80} />
      </div>
      <textarea className="input min-h-16" value={f.blurb} onChange={(e) => set("blurb", e.target.value)} placeholder="Descrição curta (aparece no cartão)" aria-label="Descrição" maxLength={200} />
      <div className="flex gap-2">
        {(
          [
            ["scheduled", "🔒 Com data de lançamento"],
            ["dev", "🛠 Em produção"],
          ] as const
        ).map(([v, label]) => (
          <button key={v} type="button" onClick={() => set("status", v)} className={`flex-1 rounded-xl px-2 py-2 text-xs font-black ${f.status === v ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "bg-[var(--line)] text-[var(--muted)]"}`}>
            {label}
          </button>
        ))}
      </div>
      {f.status === "scheduled" ? (
        <label className="block text-xs font-bold text-[var(--muted)]">
          Abre em (horário de Brasília)
          <input type="datetime-local" className="input mt-1" value={f.releaseLocal} onChange={(e) => set("releaseLocal", e.target.value)} />
        </label>
      ) : null}
      <label className="block text-xs font-bold text-[var(--muted)]">
        Preço em {COIN.name.toLowerCase()} {COIN.emoji} (vazio = sem preço, ainda não está à venda)
        <input type="number" min={0} step={1} className="input mt-1" value={f.price} onChange={(e) => set("price", e.target.value)} placeholder="Ex.: 500" />
      </label>
      <input className="input" value={f.cover} onChange={(e) => set("cover", e.target.value)} placeholder="Capa (opcional): /dress/capa.webp ou https://…" aria-label="Capa" />
      <input className="input" value={f.href} onChange={(e) => set("href", e.target.value)} placeholder="Link do jogo (opcional): /app/jogos/vestir" aria-label="Link do jogo" />
      <label className="block text-xs font-bold text-[var(--muted)]">
        Jogo que a compra libera (com preço, só quem comprou joga)
        <select className="input mt-1" value={f.gameKey} onChange={(e) => set("gameKey", e.target.value)}>
          <option value="">Nenhum (só vitrine)</option>
          {GAME_CATALOG.map((g) => (
            <option key={g.key} value={g.key}>
              {g.emoji} {g.title}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm font-bold">
          <input type="checkbox" checked={f.active} onChange={(e) => set("active", e.target.checked)} /> Visível na Loja
        </label>
        <label className="ml-auto flex items-center gap-2 text-xs font-bold text-[var(--muted)]">
          Ordem
          <input type="number" className="input !w-16" value={f.sort} onChange={(e) => set("sort", Number(e.target.value))} />
        </label>
      </div>
      <div className="flex gap-2">
        <button type="button" disabled={pending} onClick={save} className="btn btn-primary flex-1">
          {pending ? "Salvando…" : isNew ? "Adicionar à Loja" : "Salvar"}
        </button>
        {id ? (
          <button type="button" disabled={pending} onClick={remove} className="rounded-xl bg-rose-100 px-3 text-sm font-black text-rose-700">
            Apagar
          </button>
        ) : null}
      </div>
      {msg ? <p className={`text-sm font-semibold ${msg.ok ? "text-emerald-600" : "text-rose-600"}`}>{msg.text}</p> : null}
    </div>
  );
}

/** Admin: monta a vitrine da Loja (jogos com data de lançamento e jogos em produção). */
export function StoreManager({ items }: { items: StoreItem[] }) {
  const next = items.reduce((m, i) => Math.max(m, i.sort), 0) + 1;
  return (
    <div className="space-y-3">
      {items.map((it) => (
        <Editor
          key={`${it.id}-${it.release_at}-${it.status}-${it.active}`}
          id={it.id}
          initial={{ title: it.title, emoji: it.emoji, blurb: it.blurb, cover: it.cover ?? "", href: it.href ?? "", gameKey: it.game_key ?? "", status: it.status, releaseLocal: toLocal(it.release_at), price: it.price_coins === null ? "" : String(it.price_coins), active: it.active, sort: it.sort }}
        />
      ))}
      <h2 className="pt-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Novo jogo na Loja</h2>
      <Editor isNew initial={blank(next)} />
    </div>
  );
}
