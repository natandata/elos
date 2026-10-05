import Link from "next/link";
import { DifficultyPicker } from "@/components/games/DifficultyPicker";
import { QuestionGame } from "@/components/games/QuestionGame";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { dailyQuestions, toPublic } from "@/lib/games/engine";
import { DIFFICULTY_INFO, difficultyChip, rules } from "@/lib/games/difficulty";
import { playDifficulty, todaysPlays } from "@/lib/games/status";
import { createClient } from "@/lib/supabase/server";

export default async function QuizPage() {
  const { profile } = await requireRole("cria", "leader");
  const supabase = await createClient();
  const play = (await todaysPlays(supabase, profile.id)).get("quiz");
  const diff = playDifficulty(play);
  const questions = diff ? toPublic(dailyQuestions("quiz", diff)) : [];

  return (
    <>
      <PageHeader
        title="🧠 Quiz do Dia"
        subtitle={diff ? `${difficultyChip(diff) ?? "🔥 Médio"} · ${DIFFICULTY_INFO.quiz[rules(diff)]}` : "5 perguntas por dia"}
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
          <p className="mt-2 text-sm text-[var(--muted)]">Um quiz novo chega amanhã.</p>
          <Link href="/app/jogos" className="btn btn-primary mt-5 w-full">
            Voltar aos jogos
          </Link>
        </div>
      ) : !diff ? (
        <DifficultyPicker game="quiz" />
      ) : (
        <QuestionGame
          game="quiz"
          questions={questions}
          startIdx={play?.answers?.length ?? 0}
          startScore={play?.score ?? 0}
          emoji="🧠"
          title="Quiz do Dia"
        />
      )}
    </>
  );
}
