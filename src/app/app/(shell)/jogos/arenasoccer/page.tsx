import Link from "next/link";
import { ArenaSoccerClient, type SoccerStats } from "@/components/arenasoccer/ArenaSoccerClient";
import { DressCountdown } from "@/components/games/dress/DressTeaser";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { GAME_RELEASES } from "@/lib/games/release";
import { gameOpenFor } from "@/lib/games/releaseServer";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "ArenaSoccer" };

export default async function ArenaSoccerPage() {
  const { profile } = await requireRole("cria", "leader", "admin");

  if (!(await gameOpenFor("arenasoccer", profile.id))) {
    const day = new Date(GAME_RELEASES.arenasoccer).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", timeZone: "America/Sao_Paulo" });
    return (
      <>
        <PageHeader title="⚽ ArenaSoccer" subtitle="Futebol arcade de física." />
        <section className="card mb-5 p-4 text-center">
          <p className="text-2xl font-black">Em breve!</p>
          <p className="mt-2 text-sm text-[var(--muted)]">Chega à Loja dia {day}. Compre com denários e jogue.</p>
          <div className="mt-4">
            <DressCountdown game="arenasoccer" />
          </div>
        </section>
        <Link href="/app/jogos" className="btn btn-ghost w-full">
          ← Voltar aos jogos
        </Link>
      </>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase.rpc("soccer_my_stats");
  const stats = (data ?? { matches: 0, wins: 0, losses: 0, draws: 0, goals: 0, minutes: 0 }) as SoccerStats;
  return (
    <>
      <PageHeader title="⚽ ArenaSoccer" subtitle="Um disco, uma bola e um botão de chute." />
      <ArenaSoccerClient stats={stats} />
    </>
  );
}
