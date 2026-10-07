"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { createClient } from "@/lib/supabase/client";
import { pickTopGame, WEEKLY_META, type TrophyLeader, type WeeklyGame } from "@/lib/games/weekly";

const fmt = (n: number) => Number(n).toLocaleString("pt-BR");
const REFRESH_MS = 15_000;

/** Card da tela inicial: o jogo mais jogado da semana (domingo a domingo), com partidas, minutos, top 3 de troféus e atalho pra jogar. Atualiza sozinho. */
export function WeeklyGameCard({ initial, initialTrophies, allowed, since }: { initial: WeeklyGame[]; initialTrophies: TrophyLeader[]; allowed: string[]; since: string }) {
  const [rows, setRows] = useState<WeeklyGame[]>(initial);
  const [trophies, setTrophies] = useState<TrophyLeader[]>(initialTrophies);

  useEffect(() => {
    const supabase = createClient();
    let alive = true;
    const load = async () => {
      if (document.visibilityState === "hidden") return;
      const [stats, tro] = await Promise.all([supabase.rpc("weekly_games_stats"), supabase.rpc("trophy_top3")]);
      if (alive && Array.isArray(stats.data)) setRows(stats.data as WeeklyGame[]);
      if (alive && Array.isArray(tro.data)) setTrophies(tro.data as TrophyLeader[]);
    };
    const id = window.setInterval(load, REFRESH_MS);
    document.addEventListener("visibilitychange", load);
    return () => {
      alive = false;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", load);
    };
  }, []);

  const top = pickTopGame(rows, allowed);
  if (!top) return null;
  const meta = WEEKLY_META[top.game];

  return (
    <Link href={meta.href} className="relative mb-5 block overflow-hidden rounded-2xl border-[3px] border-amber-400 bg-black shadow-lg transition active:scale-[0.99]">
      {meta.cover ? (
        <img src={meta.cover} alt={meta.title} className="block aspect-[16/9] w-full object-cover" draggable={false} />
      ) : (
        <span className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-1 text-white" style={{ background: meta.bg }}>
          <span className="text-6xl" aria-hidden>
            {meta.emoji}
          </span>
          <span className="px-4 text-center text-2xl font-black drop-shadow">{meta.title}</span>
        </span>
      )}
      <span className="absolute left-3 top-3 rounded-full bg-amber-400 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-black shadow">🔥 Mais jogado da semana</span>
      <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[10px] font-black uppercase text-white">
        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> ao vivo
      </span>
      <span className="block bg-gradient-to-b from-[#1b1208] to-black px-4 pb-3 pt-3 text-white">
        <span className="mb-2 block text-center text-[11px] font-bold text-amber-200">
          {meta.emoji} {meta.title} · desde domingo, {since}
        </span>
        <span className="grid grid-cols-2 gap-2 text-center">
          <span className="rounded-xl bg-white/10 px-2 py-2 backdrop-blur-sm">
            <b className="block text-2xl font-black tabular-nums leading-none text-amber-300">{fmt(top.matches)}</b>
            <span className="text-[11px] font-bold">partidas jogadas</span>
          </span>
          <span className="rounded-xl bg-white/10 px-2 py-2 backdrop-blur-sm">
            <b className="block text-2xl font-black tabular-nums leading-none text-amber-300">{fmt(top.minutes)}</b>
            <span className="text-[11px] font-bold">minutos jogados</span>
          </span>
        </span>
        {trophies.length > 0 ? (
          <span className="mt-2 block rounded-xl bg-amber-400/15 px-3 py-2 ring-1 ring-amber-300/50">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-amber-200">🏆 Top 3 em troféus</span>
            {trophies.slice(0, 3).map((t, i) => (
              <span key={i} className="flex items-center gap-2.5 py-1">
                <span className="w-6 text-center text-xl" aria-hidden>
                  {["🥇", "🥈", "🥉"][i]}
                </span>
                <Avatar url={t.avatar} name={t.name || "Sem nome"} size={28} />
                <span className="min-w-0 flex-1 truncate text-sm font-black">{t.name || "Sem nome"}</span>
                <b className="text-base font-black tabular-nums text-amber-300">🏆 {fmt(t.trophies)}</b>
              </span>
            ))}
          </span>
        ) : null}
        <span className="mt-2 flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-amber-100">{fmt(top.players)} jogadores esta semana</span>
          <span className="shrink-0 rounded-full bg-rose-600 px-3 py-1 text-xs font-black">▶ JOGAR</span>
        </span>
      </span>
    </Link>
  );
}
