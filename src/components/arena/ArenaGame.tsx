"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { useCallback, useRef, useState } from "react";
import { finishArena, saveArenaDeck, startArena, upgradeArenaCard, type ArenaFinish } from "@/lib/actions/arena";
import { DeckBuilder } from "./DeckBuilder";
import { ArenaHome, type ArenaTab, type RankRow } from "./ArenaHome";
import { ARENA_CARD_BY_KEY } from "@/lib/arena/cards";
import { ARENAS, TROPHY_LOSS, TROPHY_WIN, arenaProgress, cardsUnlockedIn } from "@/lib/arena/arenas";
import { CardArt } from "./CardArt";
import { ArenaPlayfield, type PlayDriver } from "./ArenaPlayfield";
import { inDeployZone, inField, type Input } from "@/lib/arena/core";
import { createGame, step } from "@/lib/arena/engine";

type Phase = "intro" | "playing" | "finishing" | "result";

export function ArenaGame({ winsToday, maxWins, initialDeck, initialTrophies, initialBest, initialScrolls, initialLevels, eloRanking, myEloId, trophyRanking, myId, missionsHref, invites }: { winsToday: number; maxWins: number; initialDeck: string[]; initialTrophies: number; initialBest: number; initialScrolls: number; initialLevels: Record<string, number>; eloRanking: { id: string; name: string; points: number }[]; myEloId: string | null; trophyRanking: RankRow[]; myId: string; missionsHref: string; invites: number }) {
  const [scrolls, setScrolls] = useState(initialScrolls);
  const [levels, setLevels] = useState<Record<string, number>>(initialLevels);
  const [trophies, setTrophies] = useState(initialTrophies);
  const [best, setBest] = useState(Math.max(initialBest, initialTrophies));
  const [deck, setDeck] = useState<string[]>(initialDeck);
  const [tab, setTab] = useState<ArenaTab>("battle");
  const [savingDeck, setSavingDeck] = useState(false);
  const [phase, setPhase] = useState<Phase>("intro");
  const [error, setError] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<ArenaFinish | null>(null);

  const matchRef = useRef<string | null>(null);
  const logRef = useRef<Input[]>([]);
  const [driver, setDriver] = useState<PlayDriver | null>(null);

  const finish = useCallback(async (surrender: boolean) => {
    setPhase("finishing");
    try {
      const res = await finishArena({ matchId: matchRef.current!, inputs: logRef.current, surrender });
      setVerdict(res);
      if (typeof res.scrollsTotal === "number") setScrolls(res.scrollsTotal);
      if (typeof res.trophies === "number") {
        setTrophies(res.trophies);
        setBest((b) => Math.max(b, res.trophies as number));
      }
    } catch {
      setVerdict({ error: "Sem conexão. Não foi possível confirmar o resultado." });
    }
    setPhase("result");
  }, []);

  async function begin() {
    setError(null);
    setVerdict(null);
    const res: { error?: string; matchId?: string; seed?: number; deck?: string[]; arena?: number; levels?: Record<string, number> } = await startArena().catch(() => ({
      error: "Sem conexão. Tente de novo.",
    }));
    if (res.error || !res.matchId || res.seed === undefined) {
      setError(res.error ?? "Não foi possível começar.");
      return;
    }
    matchRef.current = res.matchId;
    const game = createGame(res.seed, res.deck ?? deck, undefined, { levels: res.levels ?? levels, arena: res.arena ?? 0 });
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
        if (card.kind === "unit" ? !inDeployZone(0, x, y) : !inField(x, y)) return false;
        const input: Input = { tick: game.tick, side: 0, slot, x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
        pending.push(input);
        logRef.current.push(input);
        return true;
      },
      isPending: () => false,
    });
    setPhase("playing");
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
        scrolls={scrolls}
        winsToday={winsToday}
        maxWins={maxWins}
        eloRanking={eloRanking}
        myEloId={myEloId}
        trophyRanking={trophyRanking}
        myId={myId}
        missionsHref={missionsHref}
        invites={invites}
        onBattle={begin}
        error={error}
        cards={
          <DeckBuilder
            key={tab}
            initial={deck}
            best={best}
            levels={levels}
            scrolls={scrolls}
            onUpgrade={async (key) => {
              const r = await upgradeArenaCard(key).catch(() => ({ error: "Sem conexão. Tente de novo." }) as { error?: string; level?: number; scrolls?: number });
              if (r.error) return r.error;
              if (typeof r.level === "number") setLevels((l) => ({ ...l, [key]: r.level as number }));
              if (typeof r.scrolls === "number") setScrolls(r.scrolls);
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
              {result !== "draw" ? (
                <p className={`mt-2 text-xl font-black tabular-nums ${(r.trophyDelta ?? 0) >= 0 ? "text-amber-500" : "text-rose-500"}`}>
                  {(r.trophyDelta ?? 0) >= 0 ? "+" : ""}
                  {r.trophyDelta ?? 0} 🏆 <span className="text-sm font-bold text-[var(--muted)]">(total {r.trophies ?? trophies})</span>
                </p>
              ) : null}
              {(r.scrolls ?? 0) > 0 ? (
                <p className="mt-1 text-sm font-black text-violet-500">+{r.scrolls} 📜 Pergaminhos (total {r.scrollsTotal})</p>
              ) : null}
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
              <Link href="/app/jogos" className="btn btn-ghost">
                Voltar aos jogos
              </Link>
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
