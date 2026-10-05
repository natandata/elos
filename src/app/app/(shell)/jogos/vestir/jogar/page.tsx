import Link from "next/link";
import { redirect } from "next/navigation";
import { DressGame } from "@/components/games/dress/DressGame";
import { VhStage } from "@/components/games/dress/Vh";
import { requireRole } from "@/lib/auth";
import { todayBR } from "@/lib/games/engine";
import { gameOpenFor } from "@/lib/games/releaseServer";
import { MAX_SCORE, ROUNDS_PER_DAY, dailyCharacters, dressDrawDate, roundOptions } from "@/lib/games/dress/engine";
import { createClient } from "@/lib/supabase/server";

type PlayRow = { variant: number; answers: unknown[]; score: number; finished: boolean; tickets_awarded: number };

export default async function VestirJogarPage() {
  const { profile } = await requireRole("cria", "leader", "admin");
  if (!(await gameOpenFor("dress", profile.id))) redirect("/app/jogos/vestir");

  const supabase = await createClient();
  const date = todayBR();
  const { data } = await supabase
    .from("dress_plays")
    .select("variant, answers, score, finished, tickets_awarded")
    .eq("user_id", profile.id)
    .eq("play_date", date)
    .order("variant", { ascending: false })
    .limit(1)
    .returns<PlayRow[]>();
  const play = data?.[0];
  if (!play) redirect("/app/jogos/vestir");

  const practice = play.variant > 0;

  if (play.finished) {
    return (
      <VhStage>
        <div className="vh-panel vh-pop text-center">
          <p className="text-6xl" aria-hidden>
            {play.score >= MAX_SCORE ? "🏆" : "✅"}
          </p>
          <p className="vh-h2 mt-1">{practice ? "Treino concluído" : "Desafio de hoje concluído"}</p>
          <p className="vh-title mt-1 text-5xl tabular-nums">
            {play.score}/{MAX_SCORE}
          </p>
          {practice ? (
            <p className="mt-2 text-sm text-purple-100">Treino não dá bilhetes. O desafio de hoje já valeu!</p>
          ) : (
            <p className="mt-2 text-lg font-black text-amber-200">+{play.tickets_awarded} 🎫 Bilhetes Dourados</p>
          )}
          <Link href="/app/jogos/vestir" className="vh-btn vh-btn-gold mt-5">
            Ver o ranking
          </Link>
        </div>
      </VhStage>
    );
  }

  const idx = play.answers.length;
  const drawDate = dressDrawDate(date, play.variant);
  const character = dailyCharacters(drawDate)[idx];
  if (!character) redirect("/app/jogos/vestir");

  return (
    <>
      <DressGame key={`${play.variant}-${idx}`} characterId={character.id} options={roundOptions(character.id, drawDate)} index={idx} total={ROUNDS_PER_DAY} practice={practice} />
    </>
  );
}
