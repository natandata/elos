import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { EnterCamarim } from "@/components/games/dress/DressActions";
import { DressCountdown } from "@/components/games/dress/DressTeaser";
import { HeroCover } from "@/components/games/dress/HeroCover";
import { StarsStatic } from "@/components/games/dress/Stars";
import { VhStage } from "@/components/games/dress/Vh";
import { requireRole } from "@/lib/auth";
import { todayBR } from "@/lib/games/engine";
import { gameOpenFor, getReleaseDates } from "@/lib/games/releaseServer";
import { juryStars } from "@/lib/games/dress/engine";
import { ticketTitle } from "@/lib/games/dress/ranks";
import { runwayTheme } from "@/lib/games/dress/runway";
import { DRESS_SECONDS, PUBLISH_TICKETS, RUNWAY_PRIZES } from "@/lib/games/dress/rules";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Banner do jogo: a ilustração de capa com o título, num fecho dourado. */
function Cover({ tall = false }: { tall?: boolean }) {
  return (
    <div className="relative mb-4 overflow-hidden rounded-3xl border-[3px] border-amber-300 shadow-[0_8px_24px_rgba(0,0,0,0.55)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/dress/capa.webp" alt="Vista o Herói: jogo de vestir feminino" className={`block w-full object-cover object-top ${tall ? "h-[430px]" : "h-[300px]"}`} draggable={false} />
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
          <p className="mt-2 text-sm text-purple-100">Um jogo novo chega no dia 09 de outubro. Vista a sua avatar como as heroínas da Bíblia, desfile na passarela e junte Bilhetes Dourados.</p>
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
  const admin = createAdminClient();
  const today = todayBR();
  const theme = runwayTheme(today);
  const [statsRes, rankRes, eloRes, mineRes] = await Promise.all([
    supabase.from("dress_stats").select("tickets, best, perfect_days").eq("user_id", profile.id).maybeSingle<{ tickets: number; best: number; perfect_days: number }>(),
    supabase.rpc("dress_ticket_ranking", { p_limit: 20 }),
    supabase.rpc("dress_elo_ranking"),
    admin ? admin.from("dress_runway_looks").select("id, fidelity").eq("user_id", profile.id).eq("theme_date", today).maybeSingle<{ id: string; fidelity: number }>() : Promise.resolve({ data: null }),
  ]);

  const tickets = statsRes.data?.tickets ?? 0;
  const t = ticketTitle(tickets);
  const ranking = (rankRes.data ?? []) as { user_id: string; full_name: string; avatar_url: string | null; elo_name: string | null; tickets: number }[];
  const elos = (eloRes.data ?? []) as { elo_id: string; elo_name: string; tickets: number; players: number }[];
  const myPos = ranking.findIndex((r) => r.user_id === profile.id) + 1;
  const mine = mineRes.data;

  return (
    <VhStage>
      <Cover />

      <section className="mb-5 grid grid-cols-2 gap-3">
        <div className="vh-panel text-center">
          <p className="text-4xl" aria-hidden>
            🎫
          </p>
          <p className="vh-title mt-1 text-4xl tabular-nums">{tickets}</p>
          <p className="mt-1 text-[11px] font-black uppercase tracking-wide text-amber-200">Bilhetes Dourados</p>
        </div>
        <div className="vh-panel text-center">
          <p className="text-4xl" aria-hidden>
            🏅
          </p>
          <p className="mt-1 text-lg font-black leading-tight text-amber-100">{t.title}</p>
          <p className="mt-1 text-[11px] font-bold text-purple-200">{t.next ? `${t.next.min - tickets} 🎫 pra ${t.next.title}` : "Topo da passarela!"}</p>
        </div>
      </section>

      <HeroCover ch={theme} label="Tema de hoje" />

      <section className="vh-panel mb-5">
        <h2 className="vh-h2">Rodada de hoje</h2>
        {mine ? (
          <>
            <p className="mt-1 text-sm text-purple-100">
              Seu look de hoje já está na passarela! O júri bíblico deu <StarsStatic value={juryStars(mine.fidelity)} className="align-middle" />. Agora é avaliar os looks das outras jogadoras.
            </p>
            <Link href="/app/jogos/vestir/passarela" className="vh-btn mt-4">
              📸 Ir para o desfile
            </Link>
          </>
        ) : (
          <>
            <ol className="mt-2 space-y-1.5 text-sm text-purple-100">
              <li>
                <b className="text-amber-200">1.</b> Entre no camarim: você tem {Math.floor(DRESS_SECONDS / 60)} minutos.
              </li>
              <li>
                <b className="text-amber-200">2.</b> Vista a sua avatar pro tema, escolhendo cabelo, roupa, cores e enfeites.
              </li>
              <li>
                <b className="text-amber-200">3.</b> Desfile na passarela e receba estrelas das colegas.
              </li>
            </ol>
            <p className="mt-2 text-xs text-purple-200">
              🎫 {PUBLISH_TICKETS} por participar + até 5 pela fidelidade à história · pódio do dia: {RUNWAY_PRIZES.join(", ")} 🎫
            </p>
            <div className="mt-4">
              <EnterCamarim seconds={DRESS_SECONDS} />
            </div>
          </>
        )}
        <Link href="/app/jogos/vestir/treino" className="vh-btn vh-btn-purple mt-3">
          🏋️ Treino · outro tema, sem bilhetes
        </Link>
      </section>

      {mine ? null : (
        <Link href="/app/jogos/vestir/passarela" className="vh-btn vh-btn-dark mb-5 !justify-start !gap-3 !rounded-3xl !py-3 !text-left">
          <span className="text-3xl" aria-hidden>
            📸
          </span>
          <span className="min-w-0 normal-case">
            <span className="block text-base leading-tight">Passarela</span>
            <span className="block text-[11px] font-bold leading-tight opacity-90">Avalie os looks das colegas · 1 🎫 por nota (até 5)</span>
          </span>
        </Link>
      )}

      <section className="vh-panel mb-5">
        <h2 className="vh-h2 mb-2">🏆 Ranking dos Bilhetes</h2>
        {ranking.length === 0 ? (
          <p className="p-2 text-sm text-purple-200">Ninguém pontuou ainda. Seja a primeira!</p>
        ) : (
          <ol className="space-y-1.5">
            {ranking.slice(0, 10).map((r, i) => (
              <li key={r.user_id} className="vh-row" data-me={r.user_id === profile.id}>
                <span className="w-7 text-center text-base font-black">{["🥇", "🥈", "🥉"][i] ?? i + 1}</span>
                <Avatar url={r.avatar_url} name={r.full_name} size={30} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-amber-50">{r.full_name}</span>
                  {r.elo_name ? <span className="block truncate text-[11px] text-purple-200">{r.elo_name}</span> : null}
                </span>
                <span className="text-sm font-black tabular-nums text-amber-200">{r.tickets} 🎫</span>
              </li>
            ))}
          </ol>
        )}
        {myPos > 10 ? <p className="mt-2 text-center text-xs font-bold text-purple-200">Você está em {myPos}º lugar</p> : null}
      </section>

      {elos.length > 0 ? (
        <section className="vh-panel mb-5">
          <h2 className="vh-h2 mb-2">Elo vs Elo</h2>
          <ol className="space-y-1.5">
            {elos.slice(0, 5).map((e, i) => (
              <li key={e.elo_id} className="vh-row">
                <span className="w-7 text-center font-black">{["🥇", "🥈", "🥉"][i] ?? i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-amber-50">{e.elo_name}</span>
                <span className="text-sm font-black tabular-nums text-amber-200">{e.tickets} 🎫</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <Link href="/app/jogos" className="vh-btn vh-btn-dark">
        ← Voltar aos jogos
      </Link>
    </VhStage>
  );
}
