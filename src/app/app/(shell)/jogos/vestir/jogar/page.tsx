import Link from "next/link";
import { redirect } from "next/navigation";
import { DressGame } from "@/components/games/dress/DressGame";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { todayBR } from "@/lib/games/engine";
import { gameOpenFor } from "@/lib/games/releaseServer";
import { MAX_SCORE, ROUNDS_PER_DAY, dailyCharacters, dressDrawDate, roundOptions } from "@/lib/games/dress/engine";
import { createClient } from "@/lib/supabase/server";

type PlayRow = { variant: number; answers: unknown[]; score: number; finished: boolean; tickets_awarded: number };

export default async function VestirJogarPage() {
  const { profile } = await requireRole("cria", "leader");
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
      <>
        <PageHeader title="👗 Vista o Herói" subtitle={practice ? "Treino concluído" : "Desafio de hoje concluído"} />
        <div className="card p-6 text-center">
          <p className="text-5xl" aria-hidden>
            {play.score >= MAX_SCORE ? "🏆" : "✅"}
          </p>
          <h2 className="mt-2 text-2xl font-black">
            {play.score}/{MAX_SCORE} pontos
          </h2>
          {practice ? (
            <p className="mt-2 text-sm text-[var(--muted)]">Treino não dá bilhetes. O desafio de hoje já valeu!</p>
          ) : (
            <p className="mt-2 font-black text-amber-600">+{play.tickets_awarded} 🎫 Bilhetes Dourados</p>
          )}
          <Link href="/app/jogos/vestir" className="btn btn-primary mt-5 w-full">
            Ver o ranking
          </Link>
        </div>
      </>
    );
  }

  const idx = play.answers.length;
  const drawDate = dressDrawDate(date, play.variant);
  const character = dailyCharacters(drawDate)[idx];
  if (!character) redirect("/app/jogos/vestir");

  return (
    <>
      <PageHeader title="👗 Vista o Herói" subtitle="Escolha a roupa mais fiel ao texto bíblico." />
      <DressGame key={`${play.variant}-${idx}`} characterId={character.id} options={roundOptions(character.id, drawDate)} index={idx} total={ROUNDS_PER_DAY} practice={practice} />
    </>
  );
}
