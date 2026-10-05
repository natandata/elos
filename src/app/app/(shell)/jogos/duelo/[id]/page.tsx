import Link from "next/link";
import { notFound } from "next/navigation";
import { QuestionGame } from "@/components/games/QuestionGame";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { duelQuestions, toPublic } from "@/lib/games/engine";
import { createClient } from "@/lib/supabase/server";

export default async function DueloDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile } = await requireRole("cria", "leader", "admin");
  const supabase = await createClient();

  const { data: duel } = await supabase
    .from("game_duels")
    .select("id, challenger_id, opponent_id, challenger_score, opponent_score, winner_id, status")
    .eq("id", id)
    .maybeSingle<{
      id: string;
      challenger_id: string;
      opponent_id: string;
      challenger_score: number | null;
      opponent_score: number | null;
      winner_id: string | null;
      status: string;
    }>();
  if (!duel || (duel.challenger_id !== profile.id && duel.opponent_id !== profile.id)) notFound();

  const iAmChallenger = duel.challenger_id === profile.id;
  const otherId = iAmChallenger ? duel.opponent_id : duel.challenger_id;
  const mine = iAmChallenger ? duel.challenger_score : duel.opponent_score;
  const theirs = iAmChallenger ? duel.opponent_score : duel.challenger_score;

  const [otherRes, playRes] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", otherId).maybeSingle<{ full_name: string }>(),
    supabase
      .from("game_plays")
      .select("answers, score")
      .eq("user_id", profile.id)
      .eq("duel_id", id)
      .maybeSingle<{ answers: unknown[]; score: number }>(),
  ]);
  const otherName = otherRes.data?.full_name || "seu colega";

  return (
    <>
      <PageHeader title={`⚔️ Duelo vs ${otherName}`} subtitle="Mesmas 5 perguntas pra vocês dois." />
      {duel.status === "finished" || mine !== null ? (
        <div className="card p-6 text-center">
          <p className="text-6xl" aria-hidden>
            {duel.status !== "finished" ? "⏳" : duel.winner_id === null ? "🤝" : duel.winner_id === profile.id ? "🏆" : "😅"}
          </p>
          <h2 className="mt-2 text-2xl font-black">
            {duel.status !== "finished"
              ? "Esperando o colega jogar"
              : duel.winner_id === null
                ? "Empate!"
                : duel.winner_id === profile.id
                  ? "Você venceu!"
                  : `${otherName} venceu dessa vez`}
          </h2>
          <p className="mt-2 text-lg font-bold tabular-nums">
            Você {mine ?? 0} x {theirs ?? "?"} {otherName}
          </p>
          {duel.status !== "finished" ? (
            <p className="mt-1 text-sm text-[var(--muted)]">Você será avisado quando o resultado sair.</p>
          ) : null}
          <Link href="/app/jogos/duelo" className="btn btn-primary mt-5 w-full">
            Voltar aos duelos
          </Link>
        </div>
      ) : (
        <QuestionGame
          game="duel"
          duelId={id}
          questions={toPublic(duelQuestions(id))}
          startIdx={playRes.data?.answers?.length ?? 0}
          startScore={playRes.data?.score ?? 0}
          emoji="⚔️"
          title={`vs ${otherName}`}
          backHref="/app/jogos/duelo"
        />
      )}
    </>
  );
}
