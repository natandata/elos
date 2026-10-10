import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { DressCountdown } from "@/components/games/dress/DressTeaser";
import { DressExchange } from "@/components/games/dress/DressExchange";
import {
  DressRankTabs,
  DressShop,
  DressTrophies,
} from "@/components/games/dress/DressHubExtras";
import { DressMissions } from "@/components/games/dress/DressMissions";
import { ST } from "@/components/games/dress/ShopIcons";
import { ImmersiveLink } from "@/components/games/dress/ImmersiveLink";
import { LandscapeShell, RotateToggle } from "@/components/games/dress/LandscapeShell";
import { MegaCard } from "@/components/games/dress/MegaCard";
import { VhStage } from "@/components/games/dress/Vh";
import { requireRole } from "@/lib/auth";
import { gameOpenFor, getReleaseDates } from "@/lib/games/releaseServer";
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  PLACE_TICKETS,
} from "@/lib/games/dress/economy";
import { ticketTitle } from "@/lib/games/dress/ranks";
import { createClient } from "@/lib/supabase/server";

/** Banner do jogo: a ilustração de capa com o título, num fecho dourado. */
function Cover({ tall = false }: { tall?: boolean }) {
  return (
    <div className="relative mb-4 overflow-hidden rounded-3xl border-[3px] border-amber-300 shadow-[0_8px_24px_rgba(0,0,0,0.55)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/dress/capa.webp"
        alt="Vista o Herói: jogo de vestir feminino"
        className={`block w-full object-cover object-top ${tall ? "h-[430px]" : "h-[300px]"}`}
        draggable={false}
      />
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#34104f] to-transparent" />
    </div>
  );
}

export default async function VestirPage() {
  const { profile } = await requireRole("cria", "leader", "admin");

  if (!(await gameOpenFor("dress", profile.id))) {
    return (
      <VhStage>
        <Cover tall />
        <div className="vh-panel text-center">
          <p className="vh-title text-3xl">Em breve!</p>
          <p className="mt-2 text-sm text-purple-100">
            Um jogo novo chega no dia 09 de outubro. Vista a sua avatar como as
            heroínas da Bíblia, desfile na passarela e junte Bilhetes Dourados.
          </p>
          <div className="mt-4">
            <DressCountdown at={(await getReleaseDates()).dress} />
          </div>
        </div>
        <Link href="/app/jogos" className="vh-btn vh-btn-dark mt-4">
          ← Voltar aos jogos
        </Link>
      </VhStage>
    );
  }

  const supabase = await createClient();
  const [statsRes, rankRes, eloRes, tutRes] = await Promise.all([
    supabase
      .from("dress_stats")
      .select("tickets, best, perfect_days")
      .eq("user_id", profile.id)
      .maybeSingle<{ tickets: number; best: number; perfect_days: number }>(),
    supabase.rpc("dress_ticket_ranking", { p_limit: 20 }),
    supabase.rpc("dress_elo_ranking"),
    supabase
      .from("dress_mission_claims")
      .select("mission")
      .eq("user_id", profile.id)
      .eq("mission", "o_tutorial")
      .maybeSingle<{ mission: string }>(),
  ]);

  const tickets = statsRes.data?.tickets ?? 0;
  const t = ticketTitle(tickets);
  const ranking = (rankRes.data ?? []) as {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
    elo_name: string | null;
    tickets: number;
  }[];
  const elos = (eloRes.data ?? []) as {
    elo_id: string;
    elo_name: string;
    tickets: number;
    players: number;
  }[];
  const myPos = ranking.findIndex((r) => r.user_id === profile.id) + 1;
  const tutorialDone = !!tutRes.data;
  const shoppingOpen = await gameOpenFor("madureira", profile.id);

  return (
    <LandscapeShell rotate={false}>
      <VhStage>
        <Cover />

        <section className="mb-5 grid grid-cols-2 gap-3">
          <div className="vh-panel text-center">
            <p className="text-4xl" aria-hidden>
              🎫
            </p>
            <p className="vh-title mt-1 text-4xl tabular-nums">{tickets}</p>
            <p className="mt-1 text-[11px] font-black uppercase tracking-wide text-amber-200">
              Bilhetes Dourados
            </p>
          </div>
          <div className="vh-panel text-center">
            <p className="text-4xl" aria-hidden>
              🏅
            </p>
            <p className="mt-1 text-lg font-black leading-tight text-amber-100">
              {t.title}
            </p>
            <p className="mt-1 text-[11px] font-bold text-purple-200">
              {t.next
                ? `${t.next.min - tickets} 🎫 pra ${t.next.title}`
                : "Topo da passarela!"}
            </p>
          </div>
        </section>

        <section className="vh-panel mb-5">
          <h2 className="vh-h2">Como jogar</h2>
          <p className="mt-1 text-sm text-purple-100">
            O Vista o Herói é jogado{" "}
            <b className="text-amber-200">com as amigas, online</b>: de{" "}
            {MIN_PLAYERS} a {MAX_PLAYERS} jogadoras por partida. Todas recebem o
            mesmo tema bíblico, vestem a sua modelo no salão, desfilam e dão
            estrelas umas às outras.
          </p>
          <p className="mt-2 rounded-xl bg-black/25 px-3 py-2 text-center text-sm font-black text-amber-100">
            🥇 {PLACE_TICKETS[0]} · 🥈 {PLACE_TICKETS[1]} · 🥉{" "}
            {PLACE_TICKETS[2]} 🎫 · 1ª vitória do dia = 1 XP
          </p>
          <ImmersiveLink href="/app/jogos/vestir/sala" className="vh-btn mt-4">
            🎭 JOGAR COM AS AMIGAS
          </ImmersiveLink>
          <ImmersiveLink
            href="/app/jogos/vestir/tutorial"
            className={`vh-btn mt-3 ${tutorialDone ? "vh-btn-dark" : "vh-btn-purple"}`}
          >
            {tutorialDone
              ? "🎓 Rever o tutorial"
              : "🎓 Aprender a jogar · +10 🎫"}
          </ImmersiveLink>
          <p className="mt-2 text-center text-[11px] text-purple-200">
            No celular, o jogo vira de lado sozinho. 📱↔️
          </p>
        </section>

        <section className="vh-panel mb-5">
          <h2 className="vh-h2">
            <ST>🛍 Shopping Elos</ST>
            {shoppingOpen ? null : <span className="ml-2 rounded-full bg-amber-300 px-2 py-0.5 align-middle text-[10px] font-black uppercase tracking-wide text-purple-900">Em breve</span>}
          </h2>
          <p className="mt-1 text-sm text-purple-100">
            Um shopping de 3 andares, online, onde todas as jogadoras passeiam juntas: lojas, escadas rolantes, praça de alimentação e a cabine de
            bilhetes. Use os seus <ST>🎫</ST> para comprar peças raras.
          </p>
          <ImmersiveLink href="/app/jogos/vestir/shopping" className={`vh-btn mt-3 ${shoppingOpen ? "vh-btn-purple" : "vh-btn-dark"}`}>
            {shoppingOpen ? <ST>🛍 ENTRAR NO SHOPPING</ST> : "Saiba mais"}
          </ImmersiveLink>
        </section>

        <MegaCard />

        <DressMissions />

        <DressExchange tickets={tickets} />

        <DressShop tickets={tickets} />

        <DressTrophies />

        <DressRankTabs />

        <section className="vh-panel mb-5">
          <h2 className="vh-h2 mb-2">🏆 Ranking dos Bilhetes</h2>
          {ranking.length === 0 ? (
            <p className="p-2 text-sm text-purple-200">
              Ninguém pontuou ainda. Seja a primeira!
            </p>
          ) : (
            <ol className="space-y-1.5">
              {ranking.slice(0, 10).map((r, i) => (
                <li
                  key={r.user_id}
                  className="vh-row"
                  data-me={r.user_id === profile.id}
                >
                  <span className="w-7 text-center text-base font-black">
                    {["🥇", "🥈", "🥉"][i] ?? i + 1}
                  </span>
                  <Avatar url={r.avatar_url} name={r.full_name} size={30} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-amber-50">
                      {r.full_name}
                    </span>
                    {r.elo_name ? (
                      <span className="block truncate text-[11px] text-purple-200">
                        {r.elo_name}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-sm font-black tabular-nums text-amber-200">
                    {r.tickets} 🎫
                  </span>
                </li>
              ))}
            </ol>
          )}
          {myPos > 10 ? (
            <p className="mt-2 text-center text-xs font-bold text-purple-200">
              Você está em {myPos}º lugar
            </p>
          ) : null}
        </section>

        {elos.length > 0 ? (
          <section className="vh-panel mb-5">
            <h2 className="vh-h2 mb-2">Elo vs Elo</h2>
            <ol className="space-y-1.5">
              {elos.slice(0, 5).map((e, i) => (
                <li key={e.elo_id} className="vh-row">
                  <span className="w-7 text-center font-black">
                    {["🥇", "🥈", "🥉"][i] ?? i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-bold text-amber-50">
                    {e.elo_name}
                  </span>
                  <span className="text-sm font-black tabular-nums text-amber-200">
                    {e.tickets} 🎫
                  </span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <Link href="/app/jogos" className="vh-btn vh-btn-dark">
          ← Voltar aos jogos
        </Link>
        <div className="mt-3 flex justify-center">
          <RotateToggle />
        </div>
      </VhStage>
    </LandscapeShell>
  );
}
