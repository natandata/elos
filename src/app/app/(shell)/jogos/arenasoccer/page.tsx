import Link from "next/link";
import { ArenaSoccerClient, type SoccerStats } from "@/components/arenasoccer/ArenaSoccerClient";
import { DressCountdown } from "@/components/games/dress/DressTeaser";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { gameOpenFor, getReleaseDates } from "@/lib/games/releaseServer";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "ArenaSoccer" };

export default async function ArenaSoccerPage() {
  const { profile } = await requireRole("cria", "leader", "admin");

  if (!(await gameOpenFor("arenasoccer", profile.id))) {
    const dates = await getReleaseDates();
    const day = new Date(dates.arenasoccer).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", timeZone: "America/Sao_Paulo" });
    return (
      <>
        <PageHeader title="⚽ ArenaSoccer" subtitle="Futebol arcade de física." />
        <div className="relative mb-5 overflow-hidden rounded-2xl border-[3px] border-emerald-400 bg-[#0d3b22] shadow-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/arenasoccer/capa.webp" alt="ArenaSoccer" className="block aspect-[4/3] w-full object-cover" draggable={false} />
        </div>
        <section className="card mb-5 p-4 text-center">
          <p className="text-2xl font-black">Em breve!</p>
          <p className="mt-2 text-sm text-[var(--muted)]">Chega à Loja dia {day}. Compre com denários e jogue.</p>
          <div className="mt-4">
            <DressCountdown game="arenasoccer" at={dates.arenasoccer} />
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
      <div className="relative mb-5 overflow-hidden rounded-2xl border-[3px] border-emerald-400 bg-[#0d3b22] shadow-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/arenasoccer/capa.webp" alt="ArenaSoccer" className="block aspect-[4/3] w-full object-cover" draggable={false} />
      </div>
      <ArenaSoccerClient stats={stats} myName={(profile.full_name || "Jogador").split(" ")[0]} myId={profile.id} />
    </>
  );
}
