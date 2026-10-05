import Link from "next/link";
import { redirect } from "next/navigation";
import { HeroCover } from "@/components/games/dress/HeroCover";
import { PaperDoll } from "@/components/games/dress/PaperDoll";
import { RunwayBuilder } from "@/components/games/dress/RunwayBuilder";
import { RunwayVote, type RunwayLookCard } from "@/components/games/dress/RunwayVote";
import { VhStage, VhTitle } from "@/components/games/dress/Vh";
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
    <VhStage>
      <div className="mb-4 text-center">
        <VhTitle className="text-4xl">Passarela</VhTitle>
        <p className="mt-2 text-sm text-purple-100">Monte o look do dia, vote nos looks das colegas e ganhe Bilhetes Dourados.</p>
      </div>

      <HeroCover ch={theme} label="Tema de hoje" />
      <section className="vh-panel mb-5">
        <p className="text-xs text-purple-100">
          🎫 1º lugar {RUNWAY_PRIZES[0]}, 2º {RUNWAY_PRIZES[1]}, 3º {RUNWAY_PRIZES[2]} · quem vota ganha 1 🎫 por voto (até {MAX_VOTES_PER_DAY}). A votação de cada dia fica aberta hoje e amanhã. Empate: vence o look mais fiel à Bíblia.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="vh-h2 mb-2">Seu look de hoje</h2>
        {mineToday ? (
          <div>
            {DRESS_CHARACTER_BY_ID.get(mineToday.theme_character) ? (
              <div className="vh-scene pb-9 pt-4">
                <div className="vh-arch" />
                <div className="vh-pedestal" />
                <PaperDoll base={DRESS_CHARACTER_BY_ID.get(mineToday.theme_character)!.base} look={mineToday.items} className="vh-doll h-[280px] w-auto" title="Seu look" />
              </div>
            ) : null}
            <p className="text-center text-sm font-black text-amber-200">✅ Publicado! As colegas já podem votar.</p>
          </div>
        ) : (
          <RunwayBuilder characterId={theme.id} />
        )}
      </section>

      {days.map((d) => (
        <section key={d} className="mb-6">
          <h2 className="vh-h2 mb-2">
            Votar · looks de {dayLabel(d, today)} ({DRESS_CHARACTER_BY_ID.get(runwayTheme(d).id)?.name})
          </h2>
          <RunwayVote looks={cardsFor(d)} votesLeft={votesLeft(d)} />
        </section>
      ))}

      {results.length > 0 ? (
        <section className="mb-6">
          <h2 className="vh-h2 mb-2">🏆 Últimos vencedores</h2>
          <div className="grid grid-cols-3 gap-2">
            {results.map((l) => {
              const ch = DRESS_CHARACTER_BY_ID.get(l.theme_character);
              return (
                <div key={l.id} className="vh-card !cursor-default !px-1 !pb-2" data-rare={l.place === 1 ? "legend" : "epic"}>
                  {ch ? (
                    <div className="rounded-lg py-0.5" style={{ background: `linear-gradient(180deg, ${ch.bg[0]}, ${ch.bg[1]})` }}>
                      <PaperDoll base={ch.base} look={l.items} className="mx-auto h-28 w-auto" title={`Look de ${l.profiles?.full_name}`} />
                    </div>
                  ) : null}
                  <p className="mt-1 text-base font-black">{["🥇", "🥈", "🥉"][(l.place ?? 1) - 1]}</p>
                  <p className="truncate text-[11px] font-black">{l.profiles?.full_name}</p>
                  <p className="text-[10px] font-bold text-amber-900/70">{ch?.name}</p>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <Link href="/app/jogos/vestir" className="vh-btn vh-btn-dark">
        ← Voltar ao Vista o Herói
      </Link>
    </VhStage>
  );
}
