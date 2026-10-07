import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { ChestButton } from "@/components/games/ChestButton";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { CARDS } from "@/lib/games/cards";
import { difficultyChip } from "@/lib/games/difficulty";
import { liveGameStreak, playDifficulty, todaysPlays } from "@/lib/games/status";
import { createClient } from "@/lib/supabase/server";
import { ArenaCover } from "@/components/games/ArenaCover";
import { arenaAsleep } from "@/lib/games/curfew";
import { DressTeaserText } from "@/components/games/dress/DressTeaser";
import type { GameKey } from "@/lib/games/catalog";
import { GAME_TEASER, isReleased } from "@/lib/games/release";
import { lockedGames } from "@/lib/games/storeAccess";
import { StoreGallery } from "@/components/games/StoreGallery";
import { STORE_COLUMNS, type StoreItem } from "@/lib/games/store";
import { gameOpenFor, getVisibilities, isHiddenFor } from "@/lib/games/releaseServer";

type Tile = { href: string; game: string; emoji: string; title: string; hint: string; tone: string };

const TILES: Tile[] = [
  { href: "/app/jogos/quiz", game: "quiz", emoji: "🧠", title: "Quiz do Dia", hint: "até +3 XP", tone: "bg-violet-100 text-violet-900 border-violet-300" },
  { href: "/app/jogos/versiculo", game: "verse", emoji: "📖", title: "Complete o Versículo", hint: "até +3 XP", tone: "bg-sky-100 text-sky-900 border-sky-300" },
  { href: "/app/jogos/quem-sou-eu", game: "who", emoji: "🕵️", title: "Quem Sou Eu?", hint: "+ carta · até +3 XP", tone: "bg-amber-100 text-amber-900 border-amber-300" },
  { href: "/app/jogos/ordem", game: "order", emoji: "⏳", title: "Ordene os Fatos", hint: "até +2 XP", tone: "bg-emerald-100 text-emerald-900 border-emerald-300" },
];

export default async function JogosPage() {
  const { profile } = await requireRole("cria", "leader", "admin");
  const supabase = await createClient();

  const [plays, cardsRes, duelsRes, weekRes, boardRes, storeRes, walletRes, ownedRes] = await Promise.all([
    todaysPlays(supabase, profile.id),
    supabase.from("user_cards").select("card_key", { count: "exact", head: true }).eq("user_id", profile.id),
    supabase
      .from("game_duels")
      .select("id, challenger_id, opponent_id, challenger_score, opponent_score, status, created_at")
      .gte("created_at", new Date(Date.now() - 7 * 86_400_000).toISOString())
      .order("created_at", { ascending: false })
      .limit(10),
    supabase.rpc("game_week_ranking"),
    supabase.rpc("game_elo_board"),
    supabase.from("store_items").select(STORE_COLUMNS).eq("active", true).order("sort").order("created_at"),
    supabase.from("coin_wallets").select("balance").eq("user_id", profile.id).maybeSingle<{ balance: number }>(),
    supabase.from("game_purchases").select("item_id").eq("user_id", profile.id),
  ]);
  const coinBalance = walletRes.data?.balance ?? 0;
  const ownedIds = ((ownedRes.data ?? []) as { item_id: string }[]).map((o) => o.item_id);
  const storeItems = (storeRes.data ?? []) as StoreItem[];

  const [dressOpen, mineOpen, rushOpen, vis] = await Promise.all([gameOpenFor("dress", profile.id), gameOpenFor("minearena", profile.id), gameOpenFor("biblerush", profile.id), getVisibilities()]);
  const locked = await lockedGames(supabase, profile.id, profile.role);
  const hide = (k: GameKey) => isHiddenFor(vis[k], profile.role) || locked.has(k);
  const showTile = (t: Tile) => !hide(t.game === "verse" ? "verse" : (t.game as GameKey));
  const tiles = TILES.filter(showTile);
  const streak = liveGameStreak(profile.game_streak ?? 0, profile.game_streak_date ?? null);
  const doneCount = tiles.filter((t) => plays.get(t.game)?.finished).length;
  const chestOpened = plays.get("chest")?.finished === true;

  const duels = (duelsRes.data ?? []) as {
    id: string;
    challenger_id: string;
    opponent_id: string;
    challenger_score: number | null;
    opponent_score: number | null;
    status: string;
  }[];
  const myTurn = duels.filter((d) => {
    if (d.status !== "open") return false;
    return d.challenger_id === profile.id ? d.challenger_score === null : d.opponent_score === null;
  });

  const week = ((weekRes.data ?? []) as { elo_id: string; elo_name: string; points: number; players: number }[]).filter(
    (w) => Number(w.points) > 0 || w.elo_id === profile.elo_id,
  );
  const board = (boardRes.data ?? []) as {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
    today_done: number;
    week_points: number;
  }[];

  return (
    <>
      <PageHeader title="🎮 Jogos" subtitle="Aprenda a Bíblia jogando, ganhe XP e junte cartas." />

      {hide("arena") ? null : <ArenaCover asleep={arenaAsleep() && profile.role !== "admin"} />}

      {hide("memory") ? null : (
      <Link href="/app/jogos/memoria" className="relative mb-5 block overflow-hidden rounded-2xl border-[3px] border-amber-400 bg-[#2a2a3a] shadow-lg transition active:scale-[0.99]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/memoria/capa.webp" alt="Memória dos Heróis" className="block aspect-[4/3] w-full object-cover" draggable={false} />
        <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/85 to-transparent px-4 pb-2.5 pt-8">
          <span className="text-xs font-bold text-amber-100">Ache os pares das cartas da Arena · desafie um colega</span>
          <span className="shrink-0 rounded-full bg-rose-600 px-2.5 py-0.5 text-[11px] font-black text-white">▶ JOGAR</span>
        </span>
      </Link>
      )}

      {hide("dress") ? null : dressOpen ? (
        <Link href="/app/jogos/vestir" className="relative mb-5 block overflow-hidden rounded-2xl border-[3px] border-amber-300 bg-[#34104f] shadow-lg transition active:scale-[0.99]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/dress/capa.webp" alt="Vista o Herói" className="block aspect-[16/8] w-full object-cover object-top" draggable={false} />
          <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/85 to-transparent px-4 pb-2.5 pt-8">
            <span className="text-xs font-bold text-amber-100">Jogo de vestir bíblico · ganhe Bilhetes Dourados 🎫</span>
            <span className="shrink-0 rounded-full bg-rose-600 px-2.5 py-0.5 text-[11px] font-black text-white">NOVO</span>
          </span>
        </Link>
      ) : !GAME_TEASER.dress ? null : (
        <Link href="/app/jogos/vestir" className="relative mb-5 block overflow-hidden rounded-2xl border-[3px] border-amber-300 bg-[#34104f] shadow-lg transition active:scale-[0.99]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/dress/capa.webp" alt="Vista o Herói em breve" className="block aspect-[16/8] w-full object-cover object-top brightness-50" draggable={false} />
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center text-white">
            <span className="text-3xl" aria-hidden>
              🔒
            </span>
            <span className="text-lg font-black [text-shadow:0_2px_6px_#000]">Vista o Herói · em breve</span>
            <span className="rounded-full bg-black/60 px-3 py-0.5 text-xs font-black text-amber-200">
              Abre em <DressTeaserText />
            </span>
          </span>
        </Link>
      )}

      {hide("minearena") ? null : mineOpen ? (
        <Link href="/app/jogos/minearena" className="relative mb-5 block overflow-hidden rounded-2xl border-[3px] border-amber-400 bg-[#14213f] shadow-lg transition active:scale-[0.99]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/minearena/capa.webp" alt="MineArena" className="block aspect-[3/2] w-full object-cover" draggable={false} />
          <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/85 to-transparent px-4 pb-2.5 pt-8">
            <span className="text-xs font-bold text-amber-100">Sandbox 3D · construa, explore e enfrente</span>
            <span className="shrink-0 rounded-full bg-rose-600 px-2.5 py-0.5 text-[11px] font-black text-white">NOVO</span>
          </span>
        </Link>
      ) : !GAME_TEASER.minearena ? null : (
        <Link href="/app/jogos/minearena" className="relative mb-5 block overflow-hidden rounded-2xl border-[3px] border-amber-400 bg-[#14213f] shadow-lg transition active:scale-[0.99]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/minearena/capa.webp" alt="MineArena em breve" className="block aspect-[3/2] w-full object-cover brightness-50" draggable={false} />
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center text-white">
            <span className="text-3xl" aria-hidden>
              🔒
            </span>
            <span className="text-lg font-black [text-shadow:0_2px_6px_#000]">MineArena · em breve</span>
            <span className="rounded-full bg-black/60 px-3 py-0.5 text-xs font-black text-amber-200">
              Abre em <DressTeaserText game="minearena" />
            </span>
          </span>
        </Link>
      )}

      <StoreGallery items={storeItems} balance={coinBalance} ownedIds={ownedIds} />

      {hide("biblerush") || !rushOpen ? null : (
        <Link href="/app/jogos/biblerush" className="relative mb-5 block overflow-hidden rounded-2xl border-[3px] border-amber-400 bg-gradient-to-br from-[#1f3a5f] via-[#2e5a7a] to-[#c9a15a] p-4 shadow-lg transition active:scale-[0.99]">
          <span className="absolute -right-2 -top-3 text-7xl opacity-30" aria-hidden>
            🛶
          </span>
          <p className="text-2xl font-black tracking-wide text-amber-100 [text-shadow:0_2px_0_#3a2208]">BIBLE RUSH</p>
          <p className="mt-0.5 text-sm font-bold text-white/90">Histórias da Bíblia, uma missão de cada vez.</p>
          <span className="mt-3 inline-block rounded-full bg-rose-600 px-3 py-0.5 text-[11px] font-black text-white">{isReleased("biblerush") ? "NOVO" : "SÓ ADMIN"}</span>
        </Link>
      )}

      <section className="mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-[var(--accent)] p-4 text-[var(--accent-ink)]">
          <p className="text-3xl" aria-hidden>
            🔥
          </p>
          <p className="mt-1 text-3xl font-black tabular-nums leading-none">{streak}</p>
          <p className="mt-1 text-xs font-bold opacity-90">{streak === 1 ? "dia seguido" : "dias seguidos"} jogando</p>
        </div>
        <div className="card p-4">
          <p className="text-3xl" aria-hidden>
            ✅
          </p>
          <p className="mt-1 text-3xl font-black tabular-nums leading-none">
            {doneCount}/{tiles.length}
          </p>
          <p className="mt-1 text-xs font-bold text-[var(--muted)]">jogos feitos hoje</p>
        </div>
      </section>

      <section className="mb-5 grid grid-cols-2 gap-3">
        {tiles.map((t) => {
          const play = plays.get(t.game);
          const done = play?.finished === true;
          const started = !done && (play?.answers?.length ?? 0) > 0;
          return (
            <Link
              key={t.game}
              href={t.href}
              className={`relative flex aspect-square flex-col justify-between rounded-2xl border-2 p-4 transition active:scale-[0.98] ${t.tone} ${done ? "opacity-80" : ""}`}
            >
              <span className="text-5xl" aria-hidden>
                {t.emoji}
              </span>
              <div>
                <p className="text-lg font-black leading-tight">{t.title}</p>
                <p className="mt-1 text-xs font-bold opacity-80">
                  {done ? `✔ Feito · ${play?.score ?? 0} pts · de novo sem XP` : started ? "Continuar →" : t.hint}
                </p>
                <p className="mt-0.5 text-[11px] font-black uppercase tracking-wide opacity-70">
                  {difficultyChip(playDifficulty(play)) ?? "Escolha a dificuldade"}
                </p>
              </div>
            </Link>
          );
        })}
      </section>

      <section className="mb-5 grid grid-cols-2 gap-3">
        {hide("duel") ? null : (
        <Link
          href="/app/jogos/duelo"
          className="relative flex aspect-square flex-col justify-between rounded-2xl border-2 border-rose-300 bg-rose-100 p-4 text-rose-900 transition active:scale-[0.98]"
        >
          {myTurn.length > 0 ? (
            <span className="absolute right-3 top-3 rounded-full bg-rose-600 px-2.5 py-0.5 text-xs font-black text-white">
              {myTurn.length} pra jogar
            </span>
          ) : null}
          <span className="text-5xl" aria-hidden>
            ⚔️
          </span>
          <div>
            <p className="text-lg font-black leading-tight">Duelo 1x1</p>
            <p className="mt-1 text-xs font-bold opacity-80">Desafie um colega do Elo · até +2 XP/dia</p>
          </div>
        </Link>
        )}
        {hide("collection") ? null : (
        <Link
          href="/app/jogos/colecao"
          className="flex aspect-square flex-col justify-between rounded-2xl border-2 border-fuchsia-300 bg-fuchsia-100 p-4 text-fuchsia-900 transition active:scale-[0.98]"
        >
          <span className="text-5xl" aria-hidden>
            🃏
          </span>
          <div>
            <p className="text-lg font-black leading-tight">Minha coleção</p>
            <p className="mt-1 text-xs font-bold opacity-80">
              {cardsRes.count ?? 0}/{CARDS.length} cartas
            </p>
          </div>
        </Link>
        )}
      </section>

      <section className="mb-5">
        <ChestButton opened={chestOpened} />
      </section>

      <section className="mb-5">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">🏆 Elo vs Elo — semana</h2>
        <div className="card p-3">
          {week.length === 0 ? (
            <p className="p-2 text-sm text-[var(--muted)]">Ninguém jogou ainda essa semana. Seja o primeiro!</p>
          ) : (
            <ol className="space-y-1">
              {week.slice(0, 5).map((w, i) => (
                <li
                  key={w.elo_id}
                  className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${
                    w.elo_id === profile.elo_id ? "bg-[var(--accent-soft)] font-black text-[var(--accent-strong)]" : "font-semibold"
                  }`}
                >
                  <span className="truncate">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}º`} {w.elo_name}
                  </span>
                  <span className="tabular-nums">{Number(w.points)} pts</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      {board.length > 0 ? (
        <section className="mb-5">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Quem já jogou hoje no seu Elo</h2>
          <div className="card divide-y divide-[var(--line)] p-1">
            {board.map((b) => (
              <div key={b.user_id} className="flex items-center gap-3 px-3 py-2">
                <Avatar url={b.avatar_url} name={b.full_name || "Sem nome"} size={32} />
                <span className="min-w-0 flex-1 truncate text-sm font-bold">
                  {b.user_id === profile.id ? "Você" : b.full_name || "Sem nome"}
                </span>
                <span className="text-xs font-bold text-[var(--muted)]">
                  {b.today_done > 0 ? `✅ ${b.today_done} hoje` : "ainda não jogou"}
                </span>
                <span className="w-14 text-right text-sm font-black tabular-nums">{Number(b.week_points)} pts</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <Link href="/app/retrospectiva" className="card mb-5 block p-4 text-center">
        <p className="text-base font-black">📅 Sua retrospectiva do mês</p>
        <p className="text-sm font-semibold text-[var(--muted)]">Veja tudo o que você conquistou no ELOS →</p>
      </Link>
    </>
  );
}
