import Link from "next/link";
import { DifficultyPicker } from "@/components/games/DifficultyPicker";
import { OrderGame } from "@/components/games/OrderGame";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { DIFFICULTY_INFO, difficultyChip, ORDER_ATTEMPTS, rules } from "@/lib/games/difficulty";
import { dailyOrder, practiceDate, todayBR } from "@/lib/games/engine";
import { PracticeNote, ReplayButton } from "@/components/games/Practice";
import { activePlays, playDifficulty } from "@/lib/games/status";
import { createClient } from "@/lib/supabase/server";

export default async function OrdemPage() {
  const { profile } = await requireRole("cria", "leader");
  const supabase = await createClient();
  const play = (await activePlays(supabase, profile.id)).get("order");
  const diff = playDifficulty(play);
  const round = diff ? dailyOrder(diff, practiceDate(todayBR(), play?.variant ?? 0)) : null;
  const attemptsUsed = play?.answers?.length ?? 0;

  return (
    <>
      <PageHeader
        title="⏳ Ordene os Fatos"
        subtitle={
          diff && round
            ? `${round.set.title} · ${difficultyChip(diff) ?? "🔥 Médio"} · ${DIFFICULTY_INFO.order[rules(diff)]}`
            : "Coloque os fatos bíblicos na ordem certa"
        }
      />
      {play?.finished && round ? (
        <div className="card p-6">
          <p className="text-center text-5xl" aria-hidden>
            {play.score > 0 ? "🎉" : "😅"}
          </p>
          <h2 className="mt-2 text-center text-2xl font-black">
            {play.score > 0 ? "Você acertou a ordem!" : "Hoje não deu"}
          </h2>
          <ol className="mt-4 space-y-2">
            {round.set.events.map((e, i) => (
              <li key={i} className="flex items-center gap-3 rounded-2xl border-2 border-emerald-300 bg-emerald-50 px-4 py-3 text-base font-bold text-emerald-900">
                <span className="text-lg font-black">{i + 1}º</span> {e}
              </li>
            ))}
          </ol>
          {play.practice ? (
            <p className="mt-3 text-center text-sm text-[var(--muted)]">Treino: sem XP desta vez, mas conta pra destravar a Arena.</p>
          ) : (
            <p className="mt-3 text-center text-sm text-[var(--muted)]">Uma nova linha do tempo chega amanhã.</p>
          )}
          <Link href="/app/jogos" className="btn btn-primary mt-4 w-full">
            Voltar aos jogos
          </Link>
          <ReplayButton game="order" />
        </div>
      ) : !round || !diff ? (
        <DifficultyPicker game="order" />
      ) : (
        <>
          {play?.practice ? <PracticeNote /> : null}
          <OrderGame items={round.shuffled} attemptsLeft={ORDER_ATTEMPTS[rules(diff)] - attemptsUsed} />
        </>
      )}
    </>
  );
}
