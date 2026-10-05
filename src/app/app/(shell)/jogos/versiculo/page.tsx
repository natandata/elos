import Link from "next/link";
import { DifficultyPicker } from "@/components/games/DifficultyPicker";
import { QuestionGame } from "@/components/games/QuestionGame";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { dailyQuestions, practiceDate, todayBR, toPublic } from "@/lib/games/engine";
import { DIFFICULTY_INFO, difficultyChip, practiceTier, rules } from "@/lib/games/difficulty";
import { PracticeNote, ReplayButton } from "@/components/games/Practice";
import { activePlays, playDifficulty } from "@/lib/games/status";
import { createClient } from "@/lib/supabase/server";

export default async function VersiculoPage() {
  const { profile } = await requireRole("cria", "leader");
  const supabase = await createClient();
  const play = (await activePlays(supabase, profile.id)).get("verse");
  const date = practiceDate(todayBR(), play?.variant ?? 0);
  const diff = playDifficulty(play);
  const questions = diff ? toPublic(dailyQuestions("verse", diff, date)) : [];

  return (
    <>
      <PageHeader
        title="📖 Complete o Versículo"
        subtitle={diff ? `${difficultyChip(diff) ?? "🔥 Médio"} · ${DIFFICULTY_INFO.verse[rules(diff)]}` : "3 versículos por dia"}
      />
      {play?.finished ? (
        <div className="card p-6 text-center">
          <p className="text-5xl" aria-hidden>
            ✅
          </p>
          <h2 className="mt-2 text-2xl font-black">
            Você fez {play.score} de {questions.length} hoje!
          </h2>
          {play.xp_awarded > 0 ? <p className="mt-1 font-bold text-[var(--accent-strong)]">+{play.xp_awarded} XP</p> : null}
          {play.practice ? (
            <p className="mt-2 text-sm text-[var(--muted)]">Treino: sem XP desta vez, mas conta pra destravar a Arena.</p>
          ) : (
            <p className="mt-2 text-sm text-[var(--muted)]">Versículos novos chegam amanhã.</p>
          )}
          <Link href="/app/jogos" className="btn btn-primary mt-5 w-full">
            Voltar aos jogos
          </Link>
          <ReplayButton game="verse" />
        </div>
      ) : !diff ? (
        <DifficultyPicker game="verse" />
      ) : (
        <>
          {play?.practice ? <PracticeNote round={play.variant} game="verse" /> : null}
          <QuestionGame
          game="verse"
          questions={questions}
          startIdx={play?.answers?.length ?? 0}
          startScore={play?.score ?? 0}
          seconds={play?.practice ? practiceTier(play.variant).seconds : null}
          emoji="📖"
          title="Complete o Versículo"
          />
        </>
      )}
    </>
  );
}
