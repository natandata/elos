import Link from "next/link";
import { redirect } from "next/navigation";
import { PaperDoll } from "@/components/games/dress/PaperDoll";
import { RunwayBuilder } from "@/components/games/dress/RunwayBuilder";
import { RunwayVote, type RunwayLookCard } from "@/components/games/dress/RunwayVote";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayBR } from "@/lib/games/engine";
import { gameOpenFor } from "@/lib/games/releaseServer";
import { DRESS_CHARACTER_BY_ID } from "@/lib/games/dress/characters";
import type { Look } from "@/lib/games/dress/items";
import { MAX_VOTES_PER_DAY, RUNWAY_PRIZES, runwayTheme, votingDates } from "@/lib/games/dress/runway";

type LookRow = {
  id: string;
  user_id: string;
  theme_date: string;
  theme_character: string;
  items: Look;
  fidelity: number;
  place: number | null;
  prize: number;
  profiles: { full_name: string; elos: { name: string } | null } | null;
};

const dayLabel = (date: string, today: string) => (date === today ? "hoje" : "ontem");

export default async function PassarelaPage() {
  const { profile } = await requireRole("cria", "leader", "admin");
  if (!(await gameOpenFor("dress", profile.id))) redirect("/app/jogos/vestir");
  const admin = createAdminClient();
  if (!admin) redirect("/app/jogos/vestir");

  const today = todayBR();
  const days = votingDates(today);
  const theme = runwayTheme(today);

  const [looksRes, myVotesRes, resultsRes] = await Promise.all([
    admin
      .from("dress_runway_looks")
      .select("id, user_id, theme_date, theme_character, items, fidelity, place, prize, profiles(full_name, elos(name))")
      .in("theme_date", days)
      .eq("hidden", false)
      .order("created_at", { ascending: true })
      .returns<LookRow[]>(),
    admin.from("dress_runway_votes").select("look_id, theme_date").eq("voter_id", profile.id).in("theme_date", days),
    admin
      .from("dress_runway_looks")
      .select("id, user_id, theme_date, theme_character, items, fidelity, place, prize, profiles(full_name, elos(name))")
      .not("place", "is", null)
      .eq("hidden", false)
      .order("theme_date", { ascending: false })
      .order("place", { ascending: true })
      .limit(9)
      .returns<LookRow[]>(),
  ]);

  const looks = looksRes.data ?? [];
  const myVotes = (myVotesRes.data ?? []) as { look_id: string; theme_date: string }[];
  const votedIds = new Set(myVotes.map((v) => v.look_id));
  const mineToday = looks.find((l) => l.user_id === profile.id && l.theme_date === today);

  const cardsFor = (date: string): RunwayLookCard[] =>
    looks
      .filter((l) => l.theme_date === date && l.user_id !== profile.id)
      .map((l) => ({ id: l.id, name: l.profiles?.full_name || "Sem nome", elo: l.profiles?.elos?.name ?? null, characterId: l.theme_character, items: l.items, voted: votedIds.has(l.id) }));
  const votesLeft = (date: string) => Math.max(0, MAX_VOTES_PER_DAY - myVotes.filter((v) => v.theme_date === date).length);
  const results = resultsRes.data ?? [];

  return (
    <>
      <PageHeader title="📸 Passarela" subtitle="Monte o look do dia, vote nos looks dos colegas e ganhe Bilhetes Dourados." />

      <section className="card mb-5 bg-gradient-to-br from-fuchsia-50 to-violet-100 p-4">
        <p className="text-xs font-black uppercase tracking-wide text-fuchsia-600">Tema de hoje</p>
        <h2 className="text-xl font-black">{theme.name}</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">{theme.clue}</p>
        <p className="mt-1 text-xs font-bold text-[var(--accent-strong)]">📖 {theme.ref}</p>
        <p className="mt-2 text-xs text-[var(--muted)]">
          🎫 1º lugar {RUNWAY_PRIZES[0]}, 2º {RUNWAY_PRIZES[1]}, 3º {RUNWAY_PRIZES[2]} · quem vota ganha 1 🎫 por voto (até {MAX_VOTES_PER_DAY}). A votação de cada dia fica aberta hoje e amanhã. Empate: vence o look mais fiel à Bíblia.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Seu look de hoje</h2>
        {mineToday ? (
          <div className="card p-3 text-center">
            {DRESS_CHARACTER_BY_ID.get(mineToday.theme_character) ? (
              <PaperDoll base={DRESS_CHARACTER_BY_ID.get(mineToday.theme_character)!.base} look={mineToday.items} bg={DRESS_CHARACTER_BY_ID.get(mineToday.theme_character)!.bg} className="mx-auto h-56 w-auto" title="Seu look" />
            ) : null}
            <p className="mt-2 text-sm font-bold">✅ Publicado! Os colegas já podem votar.</p>
          </div>
        ) : (
          <RunwayBuilder characterId={theme.id} />
        )}
      </section>

      {days.map((d) => (
        <section key={d} className="mb-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
            Votar · looks de {dayLabel(d, today)} ({DRESS_CHARACTER_BY_ID.get(runwayTheme(d).id)?.name})
          </h2>
          <RunwayVote looks={cardsFor(d)} votesLeft={votesLeft(d)} />
        </section>
      ))}

      {results.length > 0 ? (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">🏆 Últimos vencedores</h2>
          <div className="grid grid-cols-3 gap-2">
            {results.map((l) => {
              const ch = DRESS_CHARACTER_BY_ID.get(l.theme_character);
              return (
                <div key={l.id} className="card p-1.5 text-center">
                  {ch ? <PaperDoll base={ch.base} look={l.items} bg={ch.bg} className="mx-auto h-28 w-auto" title={`Look de ${l.profiles?.full_name}`} /> : null}
                  <p className="mt-1 text-sm font-black">{["🥇", "🥈", "🥉"][(l.place ?? 1) - 1]}</p>
                  <p className="truncate text-[11px] font-bold">{l.profiles?.full_name}</p>
                  <p className="text-[10px] text-[var(--muted)]">{ch?.name}</p>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <Link href="/app/jogos/vestir" className="btn btn-ghost w-full">
        ← Voltar ao Vista o Herói
      </Link>
    </>
  );
}
