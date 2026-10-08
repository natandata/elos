import Link from "next/link";
import { redirect } from "next/navigation";
import { PaperDoll } from "@/components/games/dress/PaperDoll";
import { RunwayShow, type ShowLook } from "@/components/games/dress/RunwayShow";
import { RunwayWalk } from "@/components/games/dress/RunwayWalk";
import { StarsStatic } from "@/components/games/dress/Stars";
import { VhStage, VhTitle } from "@/components/games/dress/Vh";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayBR } from "@/lib/games/engine";
import { gameOpenFor } from "@/lib/games/releaseServer";
import { baseFromBeauty, cleanBeauty } from "@/lib/games/dress/beauty";
import { DRESS_CHARACTER_BY_ID } from "@/lib/games/dress/characters";
import { juryStars } from "@/lib/games/dress/engine";
import type { Look } from "@/lib/games/dress/items";
import { runwayTheme, votingDates } from "@/lib/games/dress/runway";
import { MAX_RATING_TICKETS, RUNWAY_PRIZES } from "@/lib/games/dress/rules";

type LookRow = {
  id: string;
  user_id: string;
  theme_date: string;
  theme_character: string;
  items: Look;
  beauty: unknown;
  fidelity: number;
  place: number | null;
  prize: number;
  profiles: { full_name: string; elos: { name: string } | null } | null;
};

const SELECT = "id, user_id, theme_date, theme_character, items, beauty, fidelity, place, prize, profiles(full_name, elos(name))";
const dayLabel = (date: string, today: string) => (date === today ? "hoje" : "ontem");

export default async function PassarelaPage() {
  const { profile } = await requireRole("cria", "leader", "admin");
  if (!(await gameOpenFor("dress", profile.id))) redirect("/app/jogos/vestir");
  const admin = createAdminClient();
  if (!admin) redirect("/app/jogos/vestir");

  const today = todayBR();
  const days = votingDates(today);
  const theme = runwayTheme(today);

  const [looksRes, resultsRes] = await Promise.all([
    admin.from("dress_runway_looks").select(SELECT).in("theme_date", days).eq("hidden", false).order("created_at", { ascending: true }).returns<LookRow[]>(),
    admin.from("dress_runway_looks").select(SELECT).not("place", "is", null).eq("hidden", false).order("theme_date", { ascending: false }).order("place", { ascending: true }).limit(9).returns<LookRow[]>(),
  ]);
  const looks = looksRes.data ?? [];
  const votesRes = looks.length ? await admin.from("dress_runway_votes").select("look_id, voter_id, stars").in("look_id", looks.map((l) => l.id)) : { data: [] };
  const votes = (votesRes.data ?? []) as { look_id: string; voter_id: string; stars: number }[];

  const ratedByMe = new Set(votes.filter((v) => v.voter_id === profile.id).map((v) => v.look_id));
  const statsOf = (id: string) => {
    const vs = votes.filter((v) => v.look_id === id);
    return { count: vs.length, avg: vs.length ? vs.reduce((a, v) => a + v.stars, 0) / vs.length : 0 };
  };

  const mineToday = looks.find((l) => l.user_id === profile.id && l.theme_date === today);
  const pending: ShowLook[] = looks
    .filter((l) => l.user_id !== profile.id && !ratedByMe.has(l.id))
    .map((l) => ({
      id: l.id,
      name: l.profiles?.full_name || "Sem nome",
      elo: l.profiles?.elos?.name ?? null,
      theme: DRESS_CHARACTER_BY_ID.get(l.theme_character)?.name ?? "",
      day: dayLabel(l.theme_date, today),
      items: l.items,
      beauty: l.beauty,
    }));
  const results = resultsRes.data ?? [];
  const mine = mineToday ? statsOf(mineToday.id) : null;

  return (
    <VhStage>
      <div className="mb-4 text-center">
        <VhTitle className="text-4xl">Passarela</VhTitle>
        <p className="mt-2 text-sm text-purple-100">
          Tema de hoje: <b className="text-amber-200">{theme.name}</b>. Veja os looks desfilarem e dê de 1 a 5 estrelas.
        </p>
      </div>

      <section className="vh-panel mb-5">
        <p className="text-xs text-purple-100">
          🎫 Pódio do dia: 1º {RUNWAY_PRIZES[0]}, 2º {RUNWAY_PRIZES[1]}, 3º {RUNWAY_PRIZES[2]} (vence a maior média de estrelas) · quem avalia ganha 1 🎫 por nota (até {MAX_RATING_TICKETS}). Cada dia fica aberto pra notas hoje e amanhã. Empate: vence o look mais fiel à Bíblia.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="vh-h2 mb-2">Seu look de hoje</h2>
        {mineToday && mine ? (
          <div>
            <RunwayWalk base={baseFromBeauty(cleanBeauty(mineToday.beauty))} look={mineToday.items} name="você" still />
            <div className="vh-panel mx-auto mt-3 max-w-[400px] text-center">
              <p className="text-xs font-bold text-purple-200">Júri bíblico</p>
              <StarsStatic value={juryStars(mineToday.fidelity)} className="!text-2xl" />
              <p className="mt-2 text-xs font-bold text-purple-200">Nota das colegas</p>
              {mine.count > 0 ? (
                <>
                  <StarsStatic value={mine.avg} className="!text-2xl" />
                  <p className="text-xs text-amber-200">
                    {mine.avg.toFixed(1)} · {mine.count} avaliaç{mine.count === 1 ? "ão" : "ões"}
                  </p>
                </>
              ) : (
                <p className="text-sm text-purple-100">Ainda ninguém avaliou. Volte mais tarde!</p>
              )}
            </div>
          </div>
        ) : (
          <div className="vh-panel text-center">
            <p className="text-sm text-purple-100">Você ainda não montou o look de hoje. Entre no camarim e desfile também!</p>
            <Link href="/app/jogos/vestir" className="vh-btn mt-3">
              👗 Ir ao camarim
            </Link>
          </div>
        )}
      </section>

      <section className="mb-6">
        <h2 className="vh-h2 mb-2">✨ O desfile</h2>
        <RunwayShow looks={pending} />
      </section>

      {results.length > 0 ? (
        <section className="mb-6">
          <h2 className="vh-h2 mb-2">🏆 Últimos vencedores</h2>
          <div className="grid grid-cols-3 gap-2">
            {results.map((l) => {
              const ch = DRESS_CHARACTER_BY_ID.get(l.theme_character);
              return (
                <div key={l.id} className="vh-card !cursor-default !px-1 !pb-2" data-rare={l.place === 1 ? "legend" : "epic"}>
                  <div className="rounded-lg bg-gradient-to-b from-[#5a1238] to-[#2d104b] py-0.5">
                    <PaperDoll base={baseFromBeauty(cleanBeauty(l.beauty))} look={l.items} className="mx-auto h-28 w-auto" title={`Look de ${l.profiles?.full_name}`} />
                  </div>
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
