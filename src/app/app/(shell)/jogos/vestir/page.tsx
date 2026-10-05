import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { DressActions } from "@/components/games/dress/DressActions";
import { DressCountdown } from "@/components/games/dress/DressTeaser";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { todayBR } from "@/lib/games/engine";
import { gameOpenFor } from "@/lib/games/releaseServer";
import { ticketTitle } from "@/lib/games/dress/ranks";
import { createClient } from "@/lib/supabase/server";

type PlayRow = { variant: number; finished: boolean; score: number; tickets_awarded: number };

export default async function VestirPage() {
  const { profile } = await requireRole("cria", "leader");

  if (!(await gameOpenFor("dress", profile.id))) {
    return (
      <>
        <PageHeader title="👗 Vista o Herói" subtitle="Dress to Impress bíblico: vista os personagens da Bíblia do jeito certo." />
        <div className="card bg-gradient-to-br from-fuchsia-50 to-violet-100 p-6 text-center">
          <p className="text-5xl" aria-hidden>
            🎟️
          </p>
          <h2 className="mt-2 text-2xl font-black">Em breve!</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Um jogo novo chega no dia 09 de outubro. Vista heróis da Bíblia, descubra as roupas certas e junte Bilhetes Dourados.</p>
          <div className="mt-5">
            <DressCountdown />
          </div>
        </div>
        <Link href="/app/jogos" className="btn btn-ghost mt-4 w-full">
          ← Voltar aos jogos
        </Link>
      </>
    );
  }

  const supabase = await createClient();
  const [playsRes, statsRes, rankRes, eloRes] = await Promise.all([
    supabase.from("dress_plays").select("variant, finished, score, tickets_awarded").eq("user_id", profile.id).eq("play_date", todayBR()).order("variant", { ascending: true }),
    supabase.from("dress_stats").select("tickets, best, perfect_days").eq("user_id", profile.id).maybeSingle<{ tickets: number; best: number; perfect_days: number }>(),
    supabase.rpc("dress_ticket_ranking", { p_limit: 20 }),
    supabase.rpc("dress_elo_ranking"),
  ]);

  const plays = (playsRes.data ?? []) as PlayRow[];
  const daily = plays.find((p) => p.variant === 0);
  const latest = plays[plays.length - 1];
  const state: "new" | "playing" | "done" | "practicing" = !daily ? "new" : latest && !latest.finished ? (latest.variant === 0 ? "playing" : "practicing") : "done";

  const tickets = statsRes.data?.tickets ?? 0;
  const t = ticketTitle(tickets);
  const ranking = (rankRes.data ?? []) as { user_id: string; full_name: string; avatar_url: string | null; elo_name: string | null; tickets: number }[];
  const elos = (eloRes.data ?? []) as { elo_id: string; elo_name: string; tickets: number; players: number }[];
  const myPos = ranking.findIndex((r) => r.user_id === profile.id) + 1;

  return (
    <>
      <PageHeader title="👗 Vista o Herói" subtitle="Dress to Impress bíblico: vista os personagens da Bíblia do jeito certo e junte Bilhetes Dourados." />

      <section className="mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-gradient-to-br from-amber-300 to-yellow-400 p-4 text-amber-950">
          <p className="text-3xl" aria-hidden>
            🎫
          </p>
          <p className="mt-1 text-3xl font-black tabular-nums leading-none">{tickets}</p>
          <p className="mt-1 text-xs font-bold opacity-80">Bilhetes Dourados</p>
        </div>
        <div className="card p-4">
          <p className="text-3xl" aria-hidden>
            🏅
          </p>
          <p className="mt-1 text-lg font-black leading-tight">{t.title}</p>
          <p className="mt-1 text-xs font-bold text-[var(--muted)]">{t.next ? `${t.next.min - tickets} 🎫 pra ${t.next.title}` : "Topo da passarela!"}</p>
        </div>
      </section>

      <section className="card mb-5 p-4">
        <h2 className="text-lg font-black">Desafio de hoje</h2>
        {daily?.finished ? (
          <p className="mt-1 text-sm text-[var(--muted)]">
            Você fez <b>{daily.score}/30</b> pontos e ganhou <b>{daily.tickets_awarded} 🎫</b>. Volte amanhã para novos personagens!
          </p>
        ) : (
          <p className="mt-1 text-sm text-[var(--muted)]">3 personagens da Bíblia. Escolha a roupa mais fiel ao texto em cada espaço. 1 🎫 por ponto (máx. 30) + 10 🎫 se acertar tudo.</p>
        )}
        <div className="mt-3">
          <DressActions state={state} />
        </div>
      </section>

      <section className="mb-5">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">🏆 Ranking dos Bilhetes</h2>
        <div className="card p-3">
          {ranking.length === 0 ? (
            <p className="p-2 text-sm text-[var(--muted)]">Ninguém pontuou ainda. Seja o primeiro!</p>
          ) : (
            <ol className="space-y-1.5">
              {ranking.slice(0, 10).map((r, i) => (
                <li key={r.user_id} className={`flex items-center gap-2 rounded-xl px-2 py-1.5 ${r.user_id === profile.id ? "bg-[var(--accent-soft)]" : ""}`}>
                  <span className="w-6 text-center text-sm font-black">{["🥇", "🥈", "🥉"][i] ?? i + 1}</span>
                  <Avatar url={r.avatar_url} name={r.full_name} size={30} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{r.full_name}</span>
                    {r.elo_name ? <span className="block truncate text-[11px] text-[var(--muted)]">{r.elo_name}</span> : null}
                  </span>
                  <span className="text-sm font-black tabular-nums">{r.tickets} 🎫</span>
                </li>
              ))}
            </ol>
          )}
          {myPos > 10 ? <p className="mt-2 text-center text-xs font-bold text-[var(--muted)]">Você está em {myPos}º lugar</p> : null}
        </div>
      </section>

      {elos.length > 0 ? (
        <section className="mb-5">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Elo vs Elo</h2>
          <div className="card p-3">
            <ol className="space-y-1">
              {elos.slice(0, 5).map((e, i) => (
                <li key={e.elo_id} className="flex items-center gap-2 text-sm">
                  <span className="w-6 text-center font-black">{["🥇", "🥈", "🥉"][i] ?? i + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-bold">{e.elo_name}</span>
                  <span className="font-black tabular-nums">{e.tickets} 🎫</span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : null}

      <Link href="/app/jogos" className="btn btn-ghost w-full">
        ← Voltar aos jogos
      </Link>
    </>
  );
}
