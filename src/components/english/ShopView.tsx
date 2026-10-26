"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buyBabelItem } from "@/lib/actions/babel";
import { MAX_HEARTS, SHOP, type ShopItem } from "@/lib/babel/economy";
import type { EnglishState } from "@/lib/english/data.server";
import { IcoBoost, IcoGem, IcoHeart, IcoSnow } from "./icons";

function fmt(ms: number) {
  const m = Math.max(0, Math.ceil(ms / 60000));
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
}

// Loja do Babel: congelar ofensiva, recarregar corações e XP em dobro, tudo com gemas.
export function ShopView({ state }: { state: EnglishState }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [now, setNow] = useState(0);
  const b = state.babel;
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const buy = (item: ShopItem) =>
    start(async () => {
      const r = await buyBabelItem(item);
      setMsg(r.error ? { ok: false, text: r.error } : { ok: true, text: "Comprado!" });
      router.refresh();
    });

  const rows: { item: ShopItem; icon: React.ReactNode; extra: string; disabled: boolean }[] = [
    { item: "freeze", icon: <IcoSnow className="h-12 w-12" />, extra: `Você tem ${b.freezes}/2`, disabled: b.freezes >= 2 },
    { item: "refill", icon: <IcoHeart className="h-12 w-12" />, extra: `${b.hearts}/${MAX_HEARTS} corações${b.nextHeartAt && now ? ` · +1 em ${fmt(b.nextHeartAt - now)}` : ""}`, disabled: b.hearts >= MAX_HEARTS },
    { item: "boost", icon: <IcoBoost className="h-12 w-12" />, extra: b.boostUntil && now && b.boostUntil > now ? `Ativo: faltam ${fmt(b.boostUntil - now)}` : "Dá para empilhar", disabled: false },
  ];

  return (
    <div className="mt-4">
      <h1 className="text-2xl font-extrabold">Loja</h1>
      <p className="mt-1 flex items-center gap-1 text-lg font-extrabold text-[var(--bb-blue)]">
        <IcoGem className="h-6 w-6" /> {b.gems} gemas
      </p>
      <p className="bb-sub mt-1">Ganhe gemas completando lições, missões, metas e marcos de ofensiva.</p>
      {msg ? <p className={`mt-3 rounded-2xl px-4 py-2 text-sm font-extrabold ${msg.ok ? "bg-[var(--bb-ok-bg)] text-[var(--bb-ok-ink)]" : "bg-[var(--bb-bad-bg)] text-[var(--bb-bad-ink)]"}`}>{msg.text}</p> : null}
      <div className="mt-4 grid gap-3">
        {rows.map(({ item, icon, extra, disabled }) => {
          const it = SHOP[item];
          const poor = b.gems < it.price;
          return (
            <div key={item} className="bb-card flex items-center gap-3 p-4">
              <span className="shrink-0">{icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-base font-extrabold">{it.title}</p>
                <p className="bb-sub text-xs">{it.desc}</p>
                <p className="mt-1 text-xs font-extrabold text-[var(--bb-mute)]">{extra}</p>
              </div>
              <button type="button" disabled={pending || disabled || poor} onClick={() => buy(item)} className="bb-btn bb-btn-sm flex shrink-0 items-center gap-1">
                <IcoGem className="h-5 w-5" />
                {it.price}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
