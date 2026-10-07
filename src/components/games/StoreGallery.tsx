"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { buyStoreItem } from "@/lib/actions/store";
import { COIN, fmtCoins } from "@/lib/games/coins";
import type { StoreItem } from "@/lib/games/store";

function parts(ms: number) {
  const s = Math.floor(ms / 1000);
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

/** Quanto falta para a data (ms), atualizando a cada segundo; recarrega a página quando chega a zero. */
function useLeft(at: string | null): number | null {
  const router = useRouter();
  const target = at ? new Date(at).getTime() : null;
  const [left, setLeft] = useState<number | null>(() => (target === null ? null : Math.max(0, target - Date.now())));
  useEffect(() => {
    if (target === null) return;
    const t = setInterval(() => {
      const l = Math.max(0, target - Date.now());
      setLeft(l);
      if (l === 0) {
        clearInterval(t);
        router.refresh();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [target, router]);
  return left;
}

function Card({ item, owned, balance }: { item: StoreItem; owned: boolean; balance: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const left = useLeft(item.status === "scheduled" ? item.release_at : null);
  const scheduled = item.status === "scheduled" && item.release_at !== null;
  const released = scheduled && left === 0;
  const p = left ? parts(left) : null;
  const forSale = item.price_coins !== null && (scheduled || !!item.game_key);
  const needsBuy = forSale && !owned;
  // jogo com data de lançamento só pode ser comprado a partir dela
  const buyOpen = !scheduled || released;
  const open = released && !!item.href && !needsBuy;
  const price = item.price_coins ?? 0;

  function buy() {
    if (!window.confirm(price === 0 ? `Pegar "${item.title}" de graça?` : `Comprar "${item.title}" por ${price.toLocaleString("pt-BR")} ${COIN.name.toLowerCase()}?`)) return;
    setErr(null);
    start(async () => {
      const r = await buyStoreItem(item.id);
      if (r.error) setErr(r.error);
      else router.refresh();
    });
  }

  const body = (
    <>
      <span className="relative block aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-[#2a1d4f] to-[#14213f]">
        {item.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.cover} alt={item.title} className={`h-full w-full object-cover ${open ? "" : "brightness-50"}`} draggable={false} />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-6xl opacity-80" aria-hidden>
            {item.emoji}
          </span>
        )}
        <span className="absolute left-2 top-2 rounded-full bg-black/65 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-200">
          {released ? "🎉 Lançado" : scheduled ? "🔒 Em breve" : "🛠 Em produção"}
        </span>
        {!released && scheduled && p ? (
          <span className="absolute inset-x-2 bottom-2 rounded-xl bg-black/65 px-2 py-1 text-center text-xs font-black tabular-nums text-amber-200">
            Abre em {p.d > 0 ? `${p.d}d ` : ""}
            {String(p.h).padStart(2, "0")}h {String(p.m).padStart(2, "0")}m {String(p.s).padStart(2, "0")}s
          </span>
        ) : null}
      </span>
      <span className="block px-3 pb-3 pt-2">
        <span className="block text-sm font-black leading-tight">
          {item.emoji} {item.title}
        </span>
        {item.blurb ? <span className="mt-0.5 block text-xs text-[var(--muted)]">{item.blurb}</span> : null}
        {item.price_coins !== null && !owned ? (
          <span className="mt-2 mr-2 inline-block rounded-full bg-amber-100 px-3 py-0.5 text-[11px] font-black text-amber-900">{item.price_coins === 0 ? "Grátis" : fmtCoins(item.price_coins)}</span>
        ) : null}
        {owned && forSale ? <span className="mt-2 mr-2 inline-block rounded-full bg-emerald-100 px-3 py-0.5 text-[11px] font-black text-emerald-800">✅ Comprado</span> : null}
        {needsBuy && !buyOpen ? <span className="mt-2 inline-block rounded-full bg-[var(--line)] px-3 py-0.5 text-[11px] font-black text-[var(--muted)]">Compra abre na data de lançamento</span> : null}
        {needsBuy && buyOpen ? (
          <button type="button" disabled={pending || balance < price} onClick={buy} className="mt-2 inline-block rounded-full bg-emerald-600 px-3 py-0.5 text-[11px] font-black text-white disabled:opacity-50">
            {pending ? "Comprando…" : price === 0 ? "Pegar grátis" : balance < price ? `Faltam ${(price - balance).toLocaleString("pt-BR")} ${COIN.emoji}` : "🛒 Comprar"}
          </button>
        ) : null}
        {open ? <span className="mt-2 inline-block rounded-full bg-rose-600 px-3 py-0.5 text-[11px] font-black text-white">▶ JOGAR</span> : null}
        {err ? <span className="mt-1 block text-[11px] font-bold text-rose-600">{err}</span> : null}
        {!scheduled && !forSale ? <span className="mt-2 inline-block rounded-full bg-[var(--line)] px-3 py-0.5 text-[11px] font-black text-[var(--muted)]">Estamos construindo</span> : null}
      </span>
    </>
  );

  const cls = "card block w-64 shrink-0 snap-start overflow-hidden p-0 text-left";
  return open ? (
    <Link href={item.href!} className={`${cls} transition active:scale-[0.99]`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Galeria "Loja" da Sala de Jogos: jogos com data marcada (contagem regressiva) e jogos em produção. */
export function StoreGallery({ items, balance, ownedIds }: { items: StoreItem[]; balance: number; ownedIds: string[] }) {
  if (items.length === 0) return null;
  return (
    <section className="mb-5" aria-label="Loja">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="text-lg font-black">🛍️ Loja</h2>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900" title="Seu saldo de denários">
          Seu saldo: {fmtCoins(balance)}
        </span>
      </div>
      <p className="mb-2 text-xs text-[var(--muted)]">Compre jogos com denários. Jogo comprado fica liberado para você jogar. Em breve você poderá trocar XP por denários.</p>
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
        {items.map((it) => (
          <Card key={it.id} item={it} owned={ownedIds.includes(it.id)} balance={balance} />
        ))}
      </div>
    </section>
  );
}
