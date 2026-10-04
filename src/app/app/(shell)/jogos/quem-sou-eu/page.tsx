import Link from "next/link";
import { WhoGame } from "@/components/games/WhoGame";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { dailyWho } from "@/lib/games/engine";
import { todaysPlays } from "@/lib/games/status";
import { createClient } from "@/lib/supabase/server";

export default async function QuemSouEuPage() {
  const { profile } = await requireRole("cria", "leader");
  const supabase = await createClient();
  const play = (await todaysPlays(supabase, profile.id)).get("who");
  const round = dailyWho();
  const guesses = ((play?.answers ?? []) as number[]).filter((n) => Number.isInteger(n));

  return (
    <>
      <PageHeader title="🕵️ Quem Sou Eu?" subtitle="Acertou cedo? +2 XP e a carta do personagem" />
      {play?.finished ? (
        <div className="card p-6 text-center">
          <p className="text-5xl" aria-hidden>
            {play.score > 0 ? "🎉" : "😅"}
          </p>
          <h2 className="mt-2 text-2xl font-black">Era {round.item.name}!</h2>
          {play.xp_awarded > 0 ? <p className="mt-1 font-bold text-[var(--accent-strong)]">+{play.xp_awarded} XP</p> : null}
          <p className="mt-2 text-sm text-[var(--muted)]">Um personagem novo chega amanhã.</p>
          <Link href="/app/jogos" className="btn btn-primary mt-5 w-full">
            Voltar aos jogos
          </Link>
        </div>
      ) : (
        <WhoGame
          options={round.options}
          initialHints={round.item.hints.slice(0, Math.min(guesses.length + 1, 4))}
          initialGuesses={guesses}
        />
      )}
    </>
  );
}
