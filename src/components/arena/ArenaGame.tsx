"use client";

import { PageHeader } from "@/components/ui";
import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { finishArena, saveArenaDeck, startArena, upgradeArenaCard, type ArenaFinish } from "@/lib/actions/arena";
import { DeckBuilder } from "./DeckBuilder";
import { ArenaHome, type ArenaTab, type DayRecord, type RankRow } from "./ArenaHome";
import type { GateInfo } from "@/lib/arena/gate";
import { ARENA_CARD_BY_KEY } from "@/lib/arena/cards";
import { ARENAS, TROPHY_LOSS, TROPHY_WIN, arenaIndexFor, arenaProgress, cardsUnlockedIn } from "@/lib/arena/arenas";
import { CardArt } from "./CardArt";
import { CopyReward } from "./CopyReward";
import { ArenaChests } from "./ArenaChests";
import { useArenaPresence } from "./arenaPresence";
import { ArenaPlayfield, type PlayDriver } from "./ArenaPlayfield";
import { inDeployZone, inField, type Input } from "@/lib/arena/core";
import { createGame, step } from "@/lib/arena/engine";
import { ARENA_LOAD_MS, ArenaLoadingScreen } from "@/components/games/ArenaLoadingScreen";

type Phase = "intro" | "playing" | "finishing" | "result";

function ArenaGameInner({ onLaunching, dayRecord, winsToday, maxWins, initialDeck, initialTrophies, initialBest, initialCopies, initialLevels, dailyChestReady, eloRanking, myEloId, trophyRanking, myId, invites, gate, openTournaments }: { onLaunching: (v: boolean) => void; dayRecord: DayRecord; winsToday: number; maxWins: number; initialDeck: string[]; initialTrophies: number; initialBest: number; initialCopies: Record<string, number>; initialLevels: Record<string, number>; dailyChestReady: boolean; eloRanking: { id: string; name: string; points: number }[]; myEloId: string | null; trophyRanking: RankRow[]; myId: string; invites: number; gate: GateInfo; openTournaments: number }) {
  const [copies, setCopies] = useState<Record<string, number>>(initialCopies);
  const [dailyReady, setDailyReady] = useState(dailyChestReady);
  const [day, setDay] = useState<DayRecord>(dayRecord);
  const [levels, setLevels] = useState<Record<string, number>>(initialLevels);
  const [trophies, setTrophies] = useState(initialTrophies);
  const [best, setBest] = useState(Math.max(initialBest, initialTrophies));
  const [viewArena, setViewArena] = useState(arenaIndexFor(initialTrophies));
  const [deck, setDeck] = useState<string[]>(initialDeck);
  const router = useRouter();
  const startingRef = useRef(false);
  const [tab, setTab] = useState<ArenaTab>("battle");
  const [savingDeck, setSavingDeck] = useState(false);
  const [phase, setPhase] = useState<Phase>("intro");
  const [error, setError] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<ArenaFinish | null>(null);

  const matchRef = useRef<string | null>(null);
  const logRef = useRef<Input[]>([]);
  const [driver, setDriver] = useState<PlayDriver | null>(null);
  useArenaPresence(myId, "cpu", driver, phase === "playing");

  const lastSurrenderRef = useRef(false);
  const finish = useCallback(async (surrender: boolean) => {
    lastSurrenderRef.current = surrender;
    setPhase("finishing");
    try {
      // internet instável: tenta de novo uma vez antes de desistir de confirmar
      const send = () => finishArena({ matchId: matchRef.current!, inputs: logRef.current, surrender });
      const res = await send().catch(async () => {
        await new Promise((r) => setTimeout(r, 1500));
        return send();
      });
      setVerdict(res);
      // placar do dia: conta mais uma partida
      if (!res.error && res.result) setDay((d) => ({ w: d.w + (res.result === "win" ? 1 : 0), l: d.l + (res.result === "loss" ? 1 : 0), d: d.d + (res.result === "draw" ? 1 : 0) }));
      if (res.copyCard && res.copies) {
        const card = res.copyCard;
        const n = res.copies;
        setCopies((c) => ({ ...c, [card]: (c[card] ?? 0) + n }));
      }
      if (typeof res.trophies === "number") {
        // volta a mirar a arena atual depois de uma partida valendo troféus
        if (!res.training) setViewArena(arenaIndexFor(res.trophies));
        setTrophies(res.trophies);
        setBest((b) => Math.max(b, res.trophies as number));
      }
    } catch {
      setVerdict({ error: "Sem conexão. Não foi possível confirmar o resultado." });
    }
    setPhase("result");
    // traz dados novos (pausa de jogos, ranking, XP do dia); a tela de resultado continua montada
    router.refresh();
  }, [router]);

  async function begin() {
    // um toque duplo não pode abrir duas partidas (a esquecida viraria derrota)
    if (startingRef.current) return;
    startingRef.current = true;
    setError(null);
    setVerdict(null);
    // tela de carregamento de 5 s na entrada de toda partida (a partida é criada enquanto isso)
    onLaunching(true);
    const wait = new Promise<void>((r) => setTimeout(r, ARENA_LOAD_MS));
    const res: { error?: string; matchId?: string; seed?: number; deck?: string[]; arena?: number; levels?: Record<string, number>; botBoost?: number } = await startArena(viewArena).catch(() => ({
      error: "Sem conexão. Tente de novo.",
    }));
    if (res.error || !res.matchId || res.seed === undefined) {
      onLaunching(false);
      setError(res.error ?? "Não foi possível começar.");
      startingRef.current = false;
      return;
    }
    await wait;
    matchRef.current = res.matchId;
    const game = createGame(res.seed, res.deck ?? deck, undefined, { levels: res.levels ?? levels, arena: res.arena ?? 0, botBoost: res.botBoost ?? 0 });
    logRef.current = [];
    let pending: Input[] = [];
    setDriver({
      game,
      mySide: 0,
      arena: res.arena ?? 0,
      opponentLabel: "Computador",
      inputDelay: 0,
      advance: () => {
        const inputs = pending;
        pending = [];
        return step(game, inputs, [1]);
      },
      place: (slot, x, y) => {
        const card = ARENA_CARD_BY_KEY.get(game.slots[0][slot]);
        if (!card || game.mana[0] + 1e-9 < card.cost) return false;
        if (card.kind === "unit" ? !inDeployZone(0, x, y, game) : !inField(x, y)) return false;
        const input: Input = { tick: game.tick, side: 0, slot, x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
        pending.push(input);
        logRef.current.push(input);
        return true;
      },
      isPending: () => false,
    });
    setPhase("playing");
    onLaunching(false);
    startingRef.current = false;
  }

  // ------------------------------------------------------------ telas
  if (phase === "intro") {
    return (
      <ArenaHome
        tab={tab}
        setTab={(t) => {
          setError(null);
          setTab(t);
        }}
        trophies={trophies}
        viewArena={viewArena}
        maxArena={Math.max(arenaIndexFor(best), arenaIndexFor(trophies))}
        onViewArena={setViewArena}
        dailyChestReady={dailyReady}
        chests={
          <ArenaChests
            trophies={trophies}
            dailyReady={dailyReady}
            onOpened={(kind, grants, left) => {
              setCopies((c) => {
                const next = { ...c };
                for (const g of grants) next[g.card] = (next[g.card] ?? 0) + g.n;
                return next;
              });
              setTrophies(left);
              if (kind === "daily") setDailyReady(false);
            }}
          />
        }
        winsToday={winsToday}
        dayRecord={day}
        maxWins={maxWins}
        eloRanking={eloRanking}
        myEloId={myEloId}
        trophyRanking={trophyRanking}
        myId={myId}
        invites={invites}
        gate={gate}
        openTournaments={openTournaments}
        onBattle={begin}
        error={error}
        cards={
          <DeckBuilder
            key={tab}
            initial={deck}
            best={best}
            levels={levels}
            copies={copies}
            onUpgrade={async (key) => {
              const r = await upgradeArenaCard(key).catch(() => ({ error: "Sem conexão. Tente de novo." }) as { error?: string; level?: number; copies?: number });
              if (r.error) return r.error;
              if (typeof r.level === "number") setLevels((l) => ({ ...l, [key]: r.level as number }));
              if (typeof r.copies === "number") setCopies((c) => ({ ...c, [key]: r.copies as number }));
              return null;
            }}
            saving={savingDeck}
            error={error}
            onCancel={() => setTab("battle")}
            onSave={async (d) => {
              setSavingDeck(true);
              setError(null);
              const r = await saveArenaDeck(d).catch(() => ({ error: "Sem conexão. Tente de novo." }));
              setSavingDeck(false);
              if (r.error) return setError(r.error);
              setDeck(d);
              setTab("battle");
            }}
          />
        }
      />
    );
  }

  const header = <PageHeader title="🏰 Arena dos Heróis" subtitle="Enfrente o computador com heróis e poderes bíblicos." />;

  if (phase === "result" || phase === "finishing") {
    const r = verdict;
    const result = r?.result;
    return (
      <>
        {header}
        <div className="card p-6 text-center">
          {phase === "finishing" || !r ? (
            <p className="text-lg font-black">Conferindo o resultado…</p>
          ) : r.error ? (
            <>
              <p className="text-5xl" aria-hidden>
                ⚠️
              </p>
              <p className="mt-2 font-bold text-rose-700">{r.error}</p>
              {matchRef.current ? (
                <button type="button" onClick={() => void finish(lastSurrenderRef.current)} className="btn btn-ghost mt-3">
                  Tentar confirmar de novo
                </button>
              ) : null}
            </>
          ) : (
            <>
              <p className="text-6xl" aria-hidden>
                {result === "win" ? "🏆" : result === "draw" ? "🤝" : "😅"}
              </p>
              <h2 className="mt-2 text-2xl font-black">{result === "win" ? "Vitória!" : result === "draw" ? "Empate" : "Derrota"}</h2>
              <p className="mt-1 text-lg font-bold tabular-nums">
                👑 {r.crownsMe ?? 0} x {r.crownsBot ?? 0} 👑
              </p>
              {r.training ? (
                <p className="mt-2 rounded-2xl bg-sky-100 px-4 py-2 text-sm font-black text-sky-900">🏋️ Treino numa arena já vencida: troféus e XP não mudaram.</p>
              ) : result !== "draw" ? (
                <p className={`mt-2 text-xl font-black tabular-nums ${(r.trophyDelta ?? 0) >= 0 ? "text-amber-500" : "text-rose-500"}`}>
                  {(r.trophyDelta ?? 0) >= 0 ? "+" : ""}
                  {r.trophyDelta ?? 0} 🏆 <span className="text-sm font-bold text-[var(--muted)]">(total {r.trophies ?? trophies})</span>
                </p>
              ) : null}
              <CopyReward card={r.copyCard} n={r.copies} />
              {r.arenaUp ? (
                <p className="mt-3 rounded-2xl bg-amber-100 px-4 py-2 text-sm font-black text-amber-900">
                  🎉 Nova arena: {r.arenaUp}!
                  {(() => {
                    const idx = ARENAS.findIndex((a) => a.name === r.arenaUp);
                    const names = cardsUnlockedIn(idx).map((k) => ARENA_CARD_BY_KEY.get(k)?.name);
                    return names.length ? <span className="block text-xs">🔓 Carta nova: {names.join(" e ")}</span> : null;
                  })()}
                </p>
              ) : null}
              {(r.xp ?? 0) > 0 ? (
                <p className="mt-3 inline-block rounded-full bg-[var(--accent-soft)] px-4 py-1.5 text-lg font-black text-[var(--accent-strong)]">
                  +{r.xp} XP
                </p>
              ) : result === "win" ? (
                <p className="mt-3 text-sm text-[var(--muted)]">Você já ganhou o XP da Arena de hoje (ou venceu rápido demais).</p>
              ) : null}
            </>
          )}
          {phase === "result" ? (
            <div className="mt-6 grid gap-3">
              <button type="button" onClick={() => setPhase("intro")} className="btn btn-primary !py-3 !text-base">
                Jogar de novo
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab("battle");
                  setPhase("intro");
                }}
                className="btn btn-ghost"
              >
                Voltar à Batalha
              </button>
            </div>
          ) : null}
        </div>
      </>
    );
  }

  // jogando: tela cheia
  if (!driver) return null;
  return (
    <ArenaPlayfield
      driver={driver}
      onOver={() => void finish(false)}
      onLeave={() => {
        if (window.confirm("Desistir da partida?")) void finish(true);
      }}
    />
  );
}

export function ArenaGame(props: Omit<Parameters<typeof ArenaGameInner>[0], "onLaunching">) {
  const [launching, setLaunching] = useState(false);
  return (
    <>
      <ArenaGameInner {...props} onLaunching={setLaunching} />
      {launching ? <ArenaLoadingScreen label="Preparando a batalha…" /> : null}
    </>
  );
}
