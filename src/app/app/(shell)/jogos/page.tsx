import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { ChestButton } from "@/components/games/ChestButton";
import { requireRole } from "@/lib/auth";
import { CARDS } from "@/lib/games/cards";
import { difficultyChip } from "@/lib/games/difficulty";
import { liveGameStreak, playDifficulty, todaysPlays } from "@/lib/games/status";
import { createClient } from "@/lib/supabase/server";
import { ArenaCover } from "@/components/games/ArenaCover";
import { arenaClosedFor } from "@/lib/games/curfew";
import { DressTeaserText } from "@/components/games/dress/DressTeaser";
import type { GameKey } from "@/lib/games/catalog";
import { GAME_TEASER, gameCoverOrder, releasedNow } from "@/lib/games/release";
import { getReleaseDates } from "@/lib/games/releaseServer";
import { lockedGames } from "@/lib/games/storeAccess";
import { XpExchange } from "@/components/games/XpExchange";
import { StoreGallery } from "@/components/games/StoreGallery";
import { STORE_COLUMNS, type StoreItem } from "@/lib/games/store";
import { gameOpenFor, getEarlyAccess, getVisibilities, isHiddenFor } from "@/lib/games/releaseServer";
import { bibleGateFor, todayBR } from "@/lib/games/bibleGate";
import { BibleGameLock } from "@/components/games/BibleGameLock";
import { RoomBackdrop } from "@/components/games/room/RoomBackdrop";
import { CategoryBar, CategoryCards, RoomHero } from "@/components/games/room/RoomParts";

type Tile = { href: string; game: string; emoji: string; title: string; hint: string; tone: string };

const TILES: Tile[] = [
  { href: "/app/jogos/quiz", game: "quiz", emoji: "🧠", title: "Quiz do Dia", hint: "até +3 XP", tone: "bg-violet-100 text-violet-900 border-violet-300" },
  { href: "/app/jogos/versiculo", game: "verse", emoji: "📖", title: "Complete o Versículo", hint: "até +3 XP", tone: "bg-sky-100 text-sky-900 border-sky-300" },
  { href: "/app/jogos/quem-sou-eu", game: "who", emoji: "🕵️", title: "Quem Sou Eu?", hint: "+ carta · até +3 XP", tone: "bg-amber-100 text-amber-900 border-amber-300" },
  { href: "/app/jogos/ordem", game: "order", emoji: "⏳", title: "Ordene os Fatos", hint: "até +2 XP", tone: "bg-emerald-100 text-emerald-900 border-emerald-300" },
];

export default async function JogosPage({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const { profile } = await requireRole("cria", "leader", "admin");
  const { cat: catParam } = await searchParams;
  const cat = catParam === "divertidos" || catParam === "educativos" ? catParam : null;
  const supabase = await createClient();
  // trava do dia: cria só entra na Sala de Jogos depois de ler a Bíblia 5 minutos
  const gate = await bibleGateFor(supabase, profile);
  if (gate.locked) {
    return (
      <RoomBackdrop>
        <BibleGameLock seconds={gate.seconds} />
      </RoomBackdrop>
    );
  }

  const [plays, cardsRes, duelsRes, weekRes, boardRes, storeRes, walletRes, ownedRes, xpRes, rateRes] = await Promise.all([
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
    supabase.from("profiles").select("xp").eq("id", profile.id).maybeSingle<{ xp: number | null }>(),
    supabase.from("coin_settings").select("coins_per_xp").eq("id", 1).maybeSingle<{ coins_per_xp: number }>(),
  ]);
  const availableXp = Math.max(0, xpRes.data?.xp ?? 0);
  const xpRate = rateRes.data?.coins_per_xp ?? 5;
  const earlyExchange = profile.role === "admin" || (profile as { is_test_account?: boolean }).is_test_account === true;
  const coinBalance = walletRes.data?.balance ?? 0;
  const ownedIds = ((ownedRes.data ?? []) as { item_id: string }[]).map((o) => o.item_id);
  const storeItems = (storeRes.data ?? []) as StoreItem[];

  const dates = await getReleaseDates();
  const [dressOpen, mineOpen, rushOpen, soccerOpen, triboOpen, qdOpen, missaoOpen, englishOpen, tribosOpen, vis] = await Promise.all([gameOpenFor("dress", profile.id), gameOpenFor("minearena", profile.id), gameOpenFor("biblerush", profile.id), gameOpenFor("arenasoccer", profile.id), gameOpenFor("ultimatribo", profile.id), gameOpenFor("quemdesenha", profile.id), gameOpenFor("missao", profile.id), gameOpenFor("english", profile.id), gameOpenFor("tribos", profile.id), getVisibilities()]);
  const locked = await lockedGames(supabase, profile.id, profile.role);
  const early = await getEarlyAccess(profile.id);
  // quem tem acesso antecipado recebe o jogo da Loja de graça: aparece como já adquirido
  const ownedAll = [...ownedIds, ...storeItems.filter((i) => i.game_key && early.has(i.game_key)).map((i) => i.id)];
  const hide = (k: GameKey) => isHiddenFor(vis[k], profile.role, early.has(k)) || locked.has(k);
  const showTile = (t: Tile) => !hide(t.game === "verse" ? "verse" : (t.game as GameKey));
  const tiles = TILES.filter(showTile);
  // O lançamento mais recente fica no topo: já abertos por data (mais novo primeiro), depois os que abrem em breve
  // (o mais próximo primeiro), depois os sem data (em construção) e, por fim, os clássicos.
  // quantos jogos divertidos aparecem para esta pessoa (o mesmo critério das capas abaixo)
  const funCount = [
    !hide("arena"),
    !hide("memory"),
    !hide("dress") && (dressOpen || !!GAME_TEASER.dress),
    !hide("minearena") && (mineOpen || !!GAME_TEASER.minearena),
    !hide("arenasoccer") && soccerOpen,
    !hide("biblerush") && rushOpen,
    !hide("missao") && missaoOpen,
    !hide("ultimatribo") && triboOpen,
    !hide("quemdesenha") && qdOpen,
    !hide("tribos") && tribosOpen,
  ].filter(Boolean).length;
  const order = gameCoverOrder(dates);
  const streak = liveGameStreak(profile.game_streak ?? 0, profile.game_streak_date ?? null);
  // Inglês de CRIA (educativo): aparece quando aberto para esta pessoa; "feito hoje" = completou lição ou conversa hoje
  const englishVisible = englishOpen && !hide("english");
  const engProf = englishVisible ? (await supabase.from("english_profile").select("last_done_date").eq("user_id", profile.id).maybeSingle<{ last_done_date: string | null }>()).data : null;
  const englishDone = englishVisible && engProf?.last_done_date === todayBR();
  const eduTotal = tiles.length + (englishVisible ? 1 : 0);
  const doneCount = tiles.filter((t) => plays.get(t.game)?.finished).length + (englishDone ? 1 : 0);
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
    <RoomBackdrop>
      {cat === null ? (
        <>
          <RoomHero streak={streak} doneToday={doneCount} totalToday={eduTotal} coins={coinBalance} />
          <CategoryCards funCount={funCount} eduCount={eduTotal} eduDone={doneCount} eduTotal={eduTotal} />

      <section className="mb-5">
        <ChestButton opened={chestOpened} />
      </section>

          <div className="mb-5 rounded-3xl bg-[var(--bg)] p-3 text-[var(--ink)]">
      <StoreGallery items={storeItems.map((i) => (i.status === "scheduled" && i.game_key && i.game_key in dates ? { ...i, release_at: dates[i.game_key as keyof typeof dates] } : i))} balance={coinBalance} ownedIds={ownedAll} />
      <XpExchange availableXp={availableXp} rate={xpRate} early={earlyExchange} />
          </div>

      <section className="mb-5">
        <h2 className="gr-sec">🏆 Elo vs Elo — semana</h2>
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
          <h2 className="gr-sec">Quem já jogou hoje no seu Elo</h2>
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
      ) : (
        <>
          <CategoryBar current={cat} />
          <h1 className="gr-title mb-4 text-center !text-3xl">{cat === "divertidos" ? "🎉 Jogos Divertidos" : "📚 Jogos Educativos"}</h1>
          {cat === "divertidos" ? (
            <>
      <div className="flex flex-col">
      <div key="quemdesenha" style={{ order: order["quemdesenha"] }}>
        {hide("quemdesenha") || !qdOpen ? null : (
          <Link href="/app/jogos/quemdesenha" className="relative mb-5 block overflow-hidden rounded-2xl border-[3px] border-indigo-400 bg-indigo-950 shadow-lg transition active:scale-[0.99]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/quemdesenha/capa.webp" alt="Quem Desenha?" className="block aspect-[4/3] w-full object-cover" draggable={false} />
            <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/85 to-transparent px-4 pb-2.5 pt-8">
              <span className="text-xs font-bold text-indigo-100">Desenhe a Bíblia e deixe os amigos adivinharem</span>
              <span className="shrink-0 rounded-full bg-rose-600 px-2.5 py-0.5 text-[11px] font-black text-white">▶ JOGAR</span>
            </span>
          </Link>
        )}
      </div>

      <div key="arena" style={{ order: order["arena"] }}>
        {hide("arena") ? null : <ArenaCover asleep={arenaClosedFor(profile.role)} />}
      </div>

      <div key="memory" style={{ order: order["memory"] }}>
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
      </div>

      <div key="dress" style={{ order: order["dress"] }}>
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
                Abre em <DressTeaserText at={dates.dress} />
              </span>
            </span>
          </Link>
        )}
      </div>

      <div key="minearena" style={{ order: order["minearena"] }}>
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
                Abre em <DressTeaserText game="minearena" at={dates.minearena} />
              </span>
            </span>
          </Link>
        )}
      </div>

      <div key="arenasoccer" style={{ order: order["arenasoccer"] }}>
        {hide("arenasoccer") || !soccerOpen ? null : (
          <Link href="/app/jogos/arenasoccer" className="relative mb-5 block overflow-hidden rounded-2xl border-[3px] border-emerald-400 bg-[#0d3b22] shadow-lg transition active:scale-[0.99]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/arenasoccer/capa.webp" alt="ArenaSoccer" className="block aspect-[4/3] w-full object-cover" draggable={false} />
            <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/85 to-transparent px-4 pb-2.5 pt-8">
              <span className="text-xs font-bold text-emerald-100">Futebol arcade · 1×1 a 4×4, Copa, Carreira e Online</span>
              <span className="shrink-0 rounded-full bg-rose-600 px-2.5 py-0.5 text-[11px] font-black text-white">▶ JOGAR</span>
            </span>
          </Link>
        )}
      </div>

      <div key="biblerush" style={{ order: order["biblerush"] }}>
        {hide("biblerush") || !rushOpen ? null : (
          <Link href="/app/jogos/biblerush" className="relative mb-5 block overflow-hidden rounded-2xl border-[3px] border-amber-400 bg-gradient-to-br from-[#1f3a5f] via-[#2e5a7a] to-[#c9a15a] p-4 shadow-lg transition active:scale-[0.99]">
            <span className="absolute -right-2 -top-3 text-7xl opacity-30" aria-hidden>
              🛶
            </span>
            <p className="text-2xl font-black tracking-wide text-amber-100 [text-shadow:0_2px_0_#3a2208]">BIBLE RUSH</p>
            <p className="mt-0.5 text-sm font-bold text-white/90">Histórias da Bíblia, uma missão de cada vez.</p>
            <span className="mt-3 inline-block rounded-full bg-rose-600 px-3 py-0.5 text-[11px] font-black text-white">{releasedNow("biblerush", dates) ? "NOVO" : "SÓ ADMIN"}</span>
          </Link>
        )}
      </div>

      <div key="missao" style={{ order: order["missao"] }}>
        {hide("missao") || !missaoOpen ? null : (
          <Link href="/app/jogos/missao" className="relative mb-5 block overflow-hidden rounded-2xl border-[3px] border-amber-400 bg-gradient-to-br from-[#0f2747] via-[#1d4ed8] to-[#f59e0b] p-4 shadow-lg transition active:scale-[0.99]">
            <p className="text-2xl font-black tracking-wide text-white [text-shadow:0_2px_0_#0b1a33]">MISSÃO MADUREIRA</p>
            <p className="mt-0.5 text-sm font-bold text-white/90">3 minutos para falar de Jesus pelas ruas de Madureira.</p>
            <span className="mt-2 inline-block rounded-full bg-rose-700 px-3 py-0.5 text-[10px] font-black text-white">SÓ ADMIN · EM CONSTRUÇÃO</span>
          </Link>
        )}
      </div>

      <div key="tribos" style={{ order: order["tribos"] }}>
        {hide("tribos") || !tribosOpen ? null : (
          <Link href="/app/jogos/tribos" className="relative mb-5 block overflow-hidden rounded-2xl border-[3px] border-lime-400 bg-gradient-to-br from-[#14532d] via-[#f5b301] to-[#e0443e] p-4 shadow-lg transition active:scale-[0.99]">
            <p className="text-2xl font-black tracking-wide text-white [text-shadow:0_2px_0_#0b2a14]">🏕️ CLASH OF TRIBOS</p>
            <p className="mt-0.5 text-sm font-bold text-white/95">Escolha sua tribo, construa a vila e enfrente as outras.</p>
            <span className="mt-2 inline-block rounded-full bg-rose-700 px-3 py-0.5 text-[10px] font-black text-white">SÓ ADMIN · EM CONSTRUÇÃO</span>
          </Link>
        )}
      </div>

      <div key="ultimatribo" style={{ order: order["ultimatribo"] }}>
        {hide("ultimatribo") || !triboOpen ? null : (
          <Link href="/app/jogos/ultimatribo" className="relative mb-5 block overflow-hidden rounded-2xl border-[3px] border-stone-500 bg-[#14110d] shadow-lg transition active:scale-[0.99]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ultimatribo/capa.webp" alt="" className="block h-36 w-full object-cover object-[50%_28%] opacity-80" draggable={false} />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-3">
              <p className="text-xl font-black tracking-wide text-stone-100 [text-shadow:0_2px_0_#000]">A ÚLTIMA TRIBO</p>
              <p className="text-xs font-bold text-white/85">O arrebatamento aconteceu. Você ficou. Agora, sobreviva.</p>
              <span className="mt-1 inline-block rounded-full bg-rose-700 px-3 py-0.5 text-[10px] font-black text-white">SÓ ADMIN · EM CONSTRUÇÃO</span>
            </div>
          </Link>
        )}
      </div>
      </div>
            </>
          ) : (
            <>
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
        {englishVisible ? (
          <Link href="/app/jogos/ingles" className={`relative flex aspect-square flex-col justify-between rounded-2xl border-2 border-sky-300 bg-sky-100 p-4 text-sky-900 transition active:scale-[0.98] ${englishDone ? "opacity-80" : ""}`}>
            <span className="text-5xl" aria-hidden>
              🗣️
            </span>
            <div>
              <p className="text-lg font-black leading-tight">Inglês de CRIA</p>
              <p className="mt-1 text-xs font-bold opacity-80">{englishDone ? "✔ Feito hoje · continue treinando" : "Lições e conversas · até +5 XP/dia"}</p>
              <p className="mt-0.5 text-[11px] font-black uppercase tracking-wide opacity-70">Novo</p>
            </div>
          </Link>
        ) : null}
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
            </>
          )}
        </>
      )}
    </RoomBackdrop>
  );
}
