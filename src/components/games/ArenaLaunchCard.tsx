import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { createClient } from "@/lib/supabase/server";

type Stats = { matches: number; minutes: number; players: number };
type Top = { full_name: string; avatar_url: string | null; trophies: number };

/** Card da tela inicial: balanço do primeiro dia da Arena dos Heróis, com a capa e atalho pro jogo. */
export async function ArenaLaunchCard() {
  const supabase = await createClient();
  const [statsRes, topRes] = await Promise.all([supabase.rpc("arena_launch_stats"), supabase.rpc("arena_trophy_ranking", { p_min: 30, p_limit: 1 })]);
  const stats = statsRes.data as Stats | null;
  const top = ((topRes.data ?? []) as Top[])[0];
  if (!stats || stats.matches < 1) return null;
  const fmt = (n: number) => Number(n).toLocaleString("pt-BR");

  return (
    <Link href="/app/jogos/arena" className="relative mb-5 block overflow-hidden rounded-2xl border-[3px] border-amber-400 bg-black shadow-lg transition active:scale-[0.99]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/arena/capa.webp" alt="Arena dos Heróis" className="block aspect-[16/9] w-full object-cover" draggable={false} />
      <span className="absolute left-3 top-3 rounded-full bg-amber-400 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-black shadow">🔥 Sucesso no 1º dia</span>
      <span className="absolute inset-x-0 bottom-0 block bg-gradient-to-t from-black/95 via-black/80 to-transparent px-4 pb-3 pt-14 text-white">
        <span className="grid grid-cols-2 gap-2 text-center">
          <span className="rounded-xl bg-white/10 px-2 py-2 backdrop-blur-sm">
            <b className="block text-2xl font-black tabular-nums leading-none text-amber-300">{fmt(stats.matches)}</b>
            <span className="text-[11px] font-bold">partidas jogadas</span>
          </span>
          <span className="rounded-xl bg-white/10 px-2 py-2 backdrop-blur-sm">
            <b className="block text-2xl font-black tabular-nums leading-none text-amber-300">{fmt(stats.minutes)}</b>
            <span className="text-[11px] font-bold">minutos jogados</span>
          </span>
        </span>
        {top ? (
          <span className="mt-2 flex items-center gap-2.5 rounded-xl bg-amber-400/15 px-3 py-2 ring-1 ring-amber-300/50">
            <span className="text-xl" aria-hidden>
              👑
            </span>
            <Avatar url={top.avatar_url} name={top.full_name || "Sem nome"} size={32} />
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-black uppercase tracking-wide text-amber-200">Top 1 em troféus</span>
              <span className="block truncate text-sm font-black">{top.full_name || "Sem nome"}</span>
            </span>
            <b className="text-lg font-black tabular-nums text-amber-300">🏆 {fmt(top.trophies)}</b>
          </span>
        ) : null}
        <span className="mt-2 flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-amber-100">{stats.players} jogadores já entraram na Arena</span>
          <span className="shrink-0 rounded-full bg-rose-600 px-3 py-1 text-xs font-black">▶ JOGAR</span>
        </span>
      </span>
    </Link>
  );
}
