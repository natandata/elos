import Link from "next/link";
import { DifficultyPicker } from "@/components/games/DifficultyPicker";
import { WhoGame } from "@/components/games/WhoGame";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { DIFFICULTY_INFO, difficultyChip, rules } from "@/lib/games/difficulty";
import { dailyWho, practiceDate, todayBR } from "@/lib/games/engine";
import { PracticeNote, ReplayButton } from "@/components/games/Practice";
import { activePlays, playDifficulty } from "@/lib/games/status";
import { createClient } from "@/lib/supabase/server";

export default async function QuemSouEuPage() {
  const { profile } = await requireRole("cria", "leader");
  const supabase = await createClient();
  const play = (await activePlays(supabase, profile.id)).get("who");
  const diff = playDifficulty(play);
  const round = diff ? dailyWho(diff, practiceDate(todayBR(), play?.variant ?? 0)) : null;
  const guesses = ((play?.answers ?? []) as number[]).filter((n) => Number.isInteger(n));

  return (
    <>
      <PageHeader
        title="🕵️ Quem Sou Eu?"
        subtitle={
          diff
            ? `${difficultyChip(diff) ?? "🔥 Médio"} · ${DIFFICULTY_INFO.who[rules(diff)]}`
            : "Descubra o personagem bíblico pelas dicas"
        }
      />
      {play?.finished && round ? (
        <div className="card p-6 text-center">
          <p className="text-5xl" aria-hidden>
            {play.score > 0 ? "🎉" : "😅"}
          </p>
          <h2 className="mt-2 text-2xl font-black">Era {round.item.name}!</h2>
          {play.xp_awarded > 0 ? <p className="mt-1 font-bold text-[var(--accent-strong)]">+{play.xp_awarded} XP</p> : null}
          {play.practice ? (
            <p className="mt-2 text-sm text-[var(--muted)]">Treino: sem XP desta vez, mas conta pra destravar a Arena.</p>
          ) : (
            <p className="mt-2 text-sm text-[var(--muted)]">Um personagem novo chega amanhã.</p>
          )}
          <Link href="/app/jogos" className="btn btn-primary mt-5 w-full">
            Voltar aos jogos
          </Link>
          <ReplayButton game="who" />
        </div>
      ) : !round ? (
        <DifficultyPicker game="who" />
      ) : (
        <>
          {play?.practice ? <PracticeNote /> : null}
          <WhoGame
            options={round.options}
            initialHints={round.item.hints.slice(0, Math.min(round.startHints + guesses.length, 4))}
            initialGuesses={guesses}
            reference={round.item.ref}
          />
        </>
      )}
    </>
  );
}
