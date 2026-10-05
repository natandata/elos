"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { useCallback, useRef, useState } from "react";
import { finishArena, saveArenaDeck, startArena, upgradeArenaCard, type ArenaFinish } from "@/lib/actions/arena";
import { DeckBuilder } from "./DeckBuilder";
import { ARENA_CARD_BY_KEY } from "@/lib/arena/cards";
import { ARENAS, TROPHY_LOSS, TROPHY_WIN, arenaProgress, cardsUnlockedIn } from "@/lib/arena/arenas";
import { CardArt } from "./CardArt";
import { ArenaPlayfield, type PlayDriver } from "./ArenaPlayfield";
import { inDeployZone, inField, type Input } from "@/lib/arena/core";
import { createGame, step } from "@/lib/arena/engine";

type Phase = "intro" | "playing" | "finishing" | "result";

export function ArenaGame({ winsToday, maxWins, initialDeck, initialTrophies, initialBest, initialScrolls, initialLevels }: { winsToday: number; maxWins: number; initialDeck: string[]; initialTrophies: number; initialBest: number; initialScrolls: number; initialLevels: Record<string, number> }) {
  const [scrolls, setScrolls] = useState(initialScrolls);
  const [levels, setLevels] = useState<Record<string, number>>(initialLevels);
  const [trophies, setTrophies] = useState(initialTrophies);
  const [best, setBest] = useState(Math.max(initialBest, initialTrophies));
  const [deck, setDeck] = useState<string[]>(initialDeck);
  const [editing, setEditing] = useState(false);
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
  const header = <PageHeader title="🏰 Arena dos Heróis" subtitle="Enfrente o computador com heróis e poderes bíblicos." />;

  const prog = arenaProgress(trophies);

  if (phase === "intro" && editing) {
    return (
      <div>
        {header}
        <DeckBuilder
          initial={deck}
          best={best}
          levels={levels}
          scrolls={scrolls}
          onUpgrade={async (key) => {
            const r = await upgradeArenaCard(key).catch(() => ({ error: "Sem conexão. Tente de novo." } as { error?: string; level?: number; scrolls?: number }));
            if (r.error) return r.error;
            if (typeof r.level === "number") setLevels((l) => ({ ...l, [key]: r.level as number }));
            if (typeof r.scrolls === "number") setScrolls(r.scrolls);
            return null;
          }}
          saving={savingDeck}
          error={error}
          onCancel={() => setEditing(false)}
          onSave={async (d) => {
            setSavingDeck(true);
            setError(null);
            const r = await saveArenaDeck(d).catch(() => ({ error: "Sem conexão. Tente de novo." }));
            setSavingDeck(false);
            if (r.error) return setError(r.error);
            setDeck(d);
            setEditing(false);
          }}
        />
      </div>
    );
  }

  if (phase === "intro") {
    return (
      <div>
        {header}
        <div className="card mb-4 overflow-hidden p-0">
          <div className="flex items-center gap-3 p-4" style={{ background: `linear-gradient(135deg, ${prog.cur.theme.grass}, ${prog.cur.theme.grassAlt})` }}>
            <span className="text-5xl drop-shadow" aria-hidden>{prog.cur.emoji}</span>
            <div className="min-w-0 flex-1 text-slate-900">
              <p className="text-xs font-black uppercase tracking-wide opacity-70">Arena {prog.idx + 1} de {ARENAS.length}</p>
              <p className="text-xl font-black leading-tight">{prog.cur.name}</p>
              <p className="text-xs font-semibold opacity-80">{prog.cur.blurb} <span className="whitespace-nowrap">({prog.cur.ref})</span></p>
            </div>
            <p className="rounded-2xl bg-black/65 px-3 py-1.5 text-center text-white">
              <span className="block text-2xl font-black leading-none tabular-nums">🏆 {trophies}</span>
              <span className="mt-0.5 block text-xs font-bold tabular-nums text-violet-200">📜 {scrolls}</span>
            </p>
          </div>
          <div className="p-3">
            {prog.next ? (
              <>
                <div className="h-2.5 overflow-hidden rounded-full bg-[var(--line)]">
                  <div className="h-full rounded-full bg-amber-400" style={{ width: `${prog.pct}%` }} />
                </div>
                <p className="mt-1 text-xs font-bold text-[var(--muted)]">
                  Faltam {prog.next.min - trophies} 🏆 para {prog.next.emoji} {prog.next.name}
                </p>
                <p className="text-xs font-bold text-violet-500">
                  🔓 Libera: {cardsUnlockedIn(prog.idx + 1).map((k) => ARENA_CARD_BY_KEY.get(k)?.name).join(" e ")}
                </p>
              </>
            ) : (
              <p className="text-xs font-bold text-[var(--muted)]">Você chegou à última arena. 🎉</p>
            )}
            <p className="mt-1 text-xs text-[var(--muted)]">Vitória: +{TROPHY_WIN} 🏆 · Derrota: −{TROPHY_LOSS} 🏆</p>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {ARENAS.map((a, i) => (
                <div key={a.key} className={`w-[84px] shrink-0 rounded-xl border-2 p-2 text-center ${i === prog.idx ? "border-amber-400" : "border-[var(--line)]"} ${trophies >= a.min ? "" : "opacity-50"}`}>
                  <span className="text-2xl" aria-hidden>{trophies >= a.min ? a.emoji : "🔒"}</span>
                  <p className="text-[10px] font-bold leading-tight">{a.name}</p>
                  <p className="text-[10px] font-bold text-[var(--muted)]">🏆 {a.min}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="card mb-4 p-5">
          <p className="text-lg font-black">Como jogar</p>
          <ul className="mt-2 space-y-1.5 text-sm font-semibold text-[var(--muted)]">
            <li>💧 O Maná enche sozinho. Cada carta custa um pouco dele.</li>
            <li>👆 Toque numa carta e depois no campo (na sua metade) pra colocar o herói.</li>
            <li>🗼 Derrube as Atalaias (1 coroa) e o Santuário (3 coroas) do computador.</li>
            <li>⏱️ São 3 minutos. No último minuto o Maná enche em dobro!</li>
          </ul>
        </div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Seu baralho</p>
          <button type="button" onClick={() => { setError(null); setEditing(true); }} className="text-sm font-black text-violet-600">✏️ Montar baralho</button>
        </div>
        <div className="mb-4 grid grid-cols-4 gap-2">
          {deck.map((k) => {
            const c = ARENA_CARD_BY_KEY.get(k)!;
            return (
              <div key={k} className="relative rounded-2xl border-2 border-[var(--line)] bg-[var(--card)] p-2 text-center">
                <span className="absolute -left-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-xs font-black text-white">{c.cost}</span>
                <div className="flex h-14 items-end justify-center">
                  {c.art ? <CardArt card={c} className="h-14" /> : <span className="text-3xl" aria-hidden>{c.emoji}</span>}
                </div>
                <p className="mt-1 text-[10px] font-bold leading-tight">{c.name}</p>
                <p className="text-[9px] font-black text-violet-500">Nv.{levels[k] ?? 1}</p>
              </div>
            );
          })}
        </div>
        <p className="mb-3 text-center text-sm font-bold text-[var(--muted)]">
          Vitória do dia que vale XP: {winsToday}/{maxWins} · +1 XP
        </p>
        {error ? <p className="mb-3 text-center text-sm font-semibold text-rose-600">{error}</p> : null}
        <button type="button" onClick={begin} className="btn btn-primary w-full !py-4 !text-lg">
          ⚔️ Jogar contra o computador
        </button>
        <Link href="/app/jogos/arena/pvp" className="btn btn-ghost mt-3 w-full !border-2 !border-amber-400 !font-black">
          ⚔️ Desafiar um colega (1x1)
        </Link>
        <Link href="/app/jogos" className="btn btn-ghost mt-3 w-full">
          ← Voltar aos jogos
        </Link>
      </div>
    );
  }

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
