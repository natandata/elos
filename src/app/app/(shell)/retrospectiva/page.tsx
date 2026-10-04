import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { todayBR } from "@/lib/games/engine";
import { liveGameStreak } from "@/lib/games/status";
import { createClient } from "@/lib/supabase/server";
import { formatXp } from "@/lib/types";

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export default async function RetrospectivaPage() {
  const { profile } = await requireRole("cria", "leader");
  const supabase = await createClient();

  const today = todayBR();
  const monthStart = `${today.slice(0, 7)}-01`;
  const monthName = MONTHS[Number(today.slice(5, 7)) - 1];
  const sinceTs = `${monthStart}T03:00:00Z`; // 00:00 em Brasília

  const [xpRes, devoRes, postsRes, playsRes, cardsRes, badgesRes, rankRes] = await Promise.all([
    supabase.from("xp_transactions").select("amount").eq("user_id", profile.id).gte("created_at", sinceTs),
    supabase
      .from("devotional_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .gte("entry_date", monthStart),
    supabase
      .from("feed_posts")
      .select("id", { count: "exact", head: true })
      .eq("author_id", profile.id)
      .gte("created_at", sinceTs),
    supabase
      .from("game_plays")
      .select("game, score")
      .eq("user_id", profile.id)
      .eq("finished", true)
      .gte("play_date", monthStart)
      .neq("game", "chest"),
    supabase
      .from("user_cards")
      .select("card_key", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .gte("earned_at", sinceTs),
    supabase
      .from("user_achievements")
      .select("achievement_key", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .gte("earned_at", sinceTs),
    profile.elo_id
      ? supabase
          .from("profiles")
          .select("id, xp")
          .eq("elo_id", profile.elo_id)
          .in("role", ["cria", "leader"])
          .order("xp", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const xpMonth = ((xpRes.data ?? []) as { amount: number }[]).reduce((s, r) => s + r.amount, 0);
  const plays = (playsRes.data ?? []) as { game: string; score: number }[];
  const position = ((rankRes.data ?? []) as { id: string }[]).findIndex((r) => r.id === profile.id) + 1;

  const tiles = [
    { emoji: "⚡", value: `+${formatXp(xpMonth)}`, label: "XP ganho no mês", tone: "bg-amber-100 text-amber-900 border-amber-300" },
    { emoji: "📖", value: String(devoRes.count ?? 0), label: "dias de devocional", tone: "bg-sky-100 text-sky-900 border-sky-300" },
    { emoji: "📸", value: String(postsRes.count ?? 0), label: "posts no Explorar", tone: "bg-rose-100 text-rose-900 border-rose-300" },
    { emoji: "🎮", value: String(plays.length), label: "jogos concluídos", tone: "bg-violet-100 text-violet-900 border-violet-300" },
    { emoji: "🃏", value: String(cardsRes.count ?? 0), label: "cartas novas", tone: "bg-fuchsia-100 text-fuchsia-900 border-fuchsia-300" },
    { emoji: "🏅", value: String(badgesRes.count ?? 0), label: "selos novos", tone: "bg-emerald-100 text-emerald-900 border-emerald-300" },
  ];

  const streaks = [
    { label: "Devocional", value: profile.devotional_streak ?? 0, emoji: "📖" },
    { label: "Explorar", value: profile.feed_streak ?? 0, emoji: "📸" },
    { label: "Jogos", value: liveGameStreak(profile.game_streak ?? 0, profile.game_streak_date ?? null), emoji: "🎮" },
  ];

  return (
    <>
      <PageHeader title={`📅 Seu ${monthName}`} subtitle="Tudo o que você conquistou no ELOS neste mês." />

      <section className="mb-5 grid grid-cols-2 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className={`flex aspect-square flex-col justify-between rounded-2xl border-2 p-4 ${t.tone}`}>
            <span className="text-4xl" aria-hidden>
              {t.emoji}
            </span>
            <div>
              <p className="text-4xl font-black tabular-nums leading-none">{t.value}</p>
              <p className="mt-1 text-sm font-bold opacity-80">{t.label}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="mb-5 card p-4">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Ofensivas de agora</h2>
        <div className="grid grid-cols-3 gap-2 text-center">
          {streaks.map((s) => (
            <div key={s.label} className="rounded-xl bg-[var(--bg)] p-3">
              <p className="text-2xl" aria-hidden>
                {s.emoji}
              </p>
              <p className="text-2xl font-black tabular-nums">🔥 {s.value}</p>
              <p className="text-xs font-bold text-[var(--muted)]">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {position > 0 ? (
        <div className="card mb-5 p-4 text-center">
          <p className="text-3xl" aria-hidden>
            🏆
          </p>
          <p className="text-lg font-black">
            #{position} no ranking do seu Elo · {formatXp(profile.xp)} XP no total
          </p>
        </div>
      ) : null}

      <Link href="/app/jogos" className="btn btn-primary w-full !py-3 !text-base">
        🎮 Jogar agora e turbinar o próximo mês
      </Link>
    </>
  );
}
