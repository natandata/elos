import Link from "next/link";
import { QuestionGame } from "@/components/games/QuestionGame";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { dailyQuestions, toPublic } from "@/lib/games/engine";
import { todaysPlays } from "@/lib/games/status";
import { createClient } from "@/lib/supabase/server";

export default async function VersiculoPage() {
  const { profile } = await requireRole("cria", "leader");
  const supabase = await createClient();
  const play = (await todaysPlays(supabase, profile.id)).get("verse");
  const questions = toPublic(dailyQuestions("verse"));

  return (
    <>
      <PageHeader title="📖 Complete o Versículo" subtitle="3 versículos · 2 acertos = +1 XP · 3 acertos = +2 XP" />
      {play?.finished ? (
        <div className="card p-6 text-center">
          <p className="text-5xl" aria-hidden>
            ✅
          </p>
          <h2 className="mt-2 text-2xl font-black">
            Você fez {play.score} de {questions.length} hoje!
          </h2>
          {play.xp_awarded > 0 ? <p className="mt-1 font-bold text-[var(--accent-strong)]">+{play.xp_awarded} XP</p> : null}
          <p className="mt-2 text-sm text-[var(--muted)]">Versículos novos chegam amanhã.</p>
          <Link href="/app/jogos" className="btn btn-primary mt-5 w-full">
            Voltar aos jogos
          </Link>
        </div>
      ) : (
        <QuestionGame
          game="verse"
          questions={questions}
          startIdx={play?.answers?.length ?? 0}
          startScore={play?.score ?? 0}
          emoji="📖"
          title="Complete o Versículo"
        />
      )}
    </>
  );
}
