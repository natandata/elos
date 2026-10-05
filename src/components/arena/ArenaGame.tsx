"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { finishArena, startArena, type ArenaFinish } from "@/lib/actions/arena";
import { ARENA_CARDS, ARENA_CARD_BY_KEY, STARTER_DECK } from "@/lib/arena/cards";
import { CardArt } from "./CardArt";
import { TEAM, buildBackground, drawTower, layoutFor, type Layout } from "./arenaRender";
import {
  DOUBLE_MANA_TICK,
  H,
  MANA_MAX,
  MATCH_TICKS,
  RIVER_BOT,
  TICKS_PER_SEC,
  W,
  inDeployZone,
  inField,
  type GameEvent,
  type GameState,
  type Input,
} from "@/lib/arena/core";
import { createGame, step } from "@/lib/arena/engine";

type Phase = "intro" | "playing" | "finishing" | "result";

type Fx =
  | { kind: "line"; x1: number; y1: number; x2: number; y2: number; ranged: boolean; side: number; ttl: number }
  | { kind: "spell"; emoji: string; x: number; y: number; r: number; ttl: number; max: number }
  | { kind: "puff"; x: number; y: number; big: boolean; ttl: number };

type Hud = { mana: number; tick: number; crowns: [number, number]; slots: string[]; next: string };

const STEP_MS = 1000 / TICKS_PER_SEC;

function fmtTime(ticks: number): string {
  const s = Math.max(0, Math.ceil((MATCH_TICKS - ticks) / TICKS_PER_SEC));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Gota de Maná (custo das cartas e Maná atual). */
function Drop({ n, size = 28 }: { n: number; size?: number }) {
  return (
    <span
      className="flex items-center justify-center border-2 border-fuchsia-200 bg-gradient-to-b from-fuchsia-400 to-purple-700 shadow"
      style={{ width: size, height: size, borderRadius: "0 50% 50% 50%", transform: "rotate(45deg)" }}
    >
      <span className="font-black leading-none text-white" style={{ transform: "rotate(-45deg)", fontSize: size * 0.5 }}>
        {n}
      </span>
    </span>
  );
}

function CrownCount({ n, color }: { n: number; color: "red" | "blue" }) {
  return (
    <div className="flex flex-col items-center">
      <span className={`min-w-8 rounded-md border-2 border-black/60 bg-black/70 px-1.5 text-center text-lg font-black tabular-nums ${color === "red" ? "text-red-400" : "text-sky-300"}`}>
        {n}
      </span>
      <span
        className="-mt-1 text-4xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.6)]"
        style={{ filter: color === "red" ? "hue-rotate(-35deg) saturate(2.4)" : "hue-rotate(170deg) saturate(1.8)" }}
        aria-hidden
      >
        👑
      </span>
    </div>
  );
}

export function ArenaGame({ winsToday, maxWins }: { winsToday: number; maxWins: number }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [error, setError] = useState<string | null>(null);
  const [hud, setHud] = useState<Hud | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [verdict, setVerdict] = useState<ArenaFinish | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const areaRef = useRef<HTMLDivElement | null>(null);
  const bgRef = useRef<HTMLCanvasElement | null>(null);
  const layoutRef = useRef<Layout | null>(null);
  const dprRef = useRef(1);
  const gameRef = useRef<GameState | null>(null);
  const matchRef = useRef<string | null>(null);
  const pendingRef = useRef<Input[]>([]);
  const logRef = useRef<Input[]>([]);
  const fxRef = useRef<Fx[]>([]);
  const selectedRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const spritesRef = useRef<Record<string, HTMLImageElement>>({});

  selectedRef.current = selected;

  // carrega as ilustrações dos heróis uma vez
  useEffect(() => {
    for (const c of ARENA_CARDS) {
      if (!c.art || spritesRef.current[c.key]) continue;
      const img = new Image();
      img.src = `/arena/${c.key}.webp`;
      spritesRef.current[c.key] = img;
    }
  }, []);

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);
  useEffect(() => stopLoop, [stopLoop]);

  // ------------------------------------------------------------ tamanho do campo
  const setupCanvas = useCallback(() => {
    const area = areaRef.current;
    const canvas = canvasRef.current;
    if (!area || !canvas || area.clientWidth === 0) return;
    const l = layoutFor(area.clientWidth, area.clientHeight);
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = `${l.cw}px`;
    canvas.style.height = `${l.ch}px`;
    canvas.width = Math.round(l.cw * dpr);
    canvas.height = Math.round(l.ch * dpr);
    layoutRef.current = l;
    dprRef.current = dpr;
    bgRef.current = buildBackground(l, dpr);
  }, []);

  // ------------------------------------------------------------ desenho
  const draw = useCallback((alpha: number) => {
    const canvas = canvasRef.current;
    const game = gameRef.current;
    const l = layoutRef.current;
    const bg = bgRef.current;
    if (!canvas || !game || !l || !bg) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const s = l.s;
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, l.cw, l.ch);
    ctx.drawImage(bg, 0, 0, l.cw, l.ch);
    ctx.save();
    ctx.translate(l.ox, l.oy);

    // zona de colocação quando há uma carta de tropa escolhida
    const sel = selectedRef.current;
    if (sel !== null) {
      const card = ARENA_CARD_BY_KEY.get(game.slots[0][sel]);
      if (card?.kind === "unit") {
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.fillRect(0, (RIVER_BOT + 0.6) * s, W * s, (H - RIVER_BOT - 0.6) * s);
        ctx.strokeStyle = "rgba(255,255,255,0.7)";
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(0, (RIVER_BOT + 0.6) * s);
        ctx.lineTo(W * s, (RIVER_BOT + 0.6) * s);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    const lerp = (a: number, b: number) => a + (b - a) * alpha;
    const ordered = [...game.entities].sort((a, b) => (a.type === b.type ? a.y - b.y : a.type === "tower" ? -1 : 1));
    for (const e of ordered) {
      if (e.type === "tower") {
        drawTower(ctx, s, e);
        continue;
      }
      const x = lerp(e.px, e.x) * s;
      const y = lerp(e.py, e.y) * s;
      const r = e.radius * s;
      const img = spritesRef.current[e.card];
      const hasArt = !!img && img.complete && img.naturalWidth > 0;
      let topY = y - r;
      const footY = y + r * 0.9;

      // sombra no chão + anel do time
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.beginPath();
      ctx.ellipse(x, footY, r * 1.05, r * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = TEAM[e.side];
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(x, footY, r * 1.15, r * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();

      const lift = e.flying ? 0.9 * s : 0;
      if (hasArt && img) {
        const h = e.radius * 4.4 * s;
        const w = (h * img.naturalWidth) / img.naturalHeight;
        ctx.drawImage(img, x - w / 2, footY - lift - h * 0.97, w, h);
        topY = footY - lift - h - 2;
      } else {
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `${Math.max(14, e.radius * 2.4 * s)}px system-ui, "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
        ctx.fillStyle = "#000";
        const yy = footY - lift - r * 0.9;
        ctx.fillText(ARENA_CARD_BY_KEY.get(e.card)?.emoji ?? "❔", x, yy);
        topY = yy - r;
      }

      // barra de vida (azul = seu time, vermelha = computador)
      if (e.hp < e.maxHp) {
        const bw = Math.max(r * 2, 0.9 * s);
        const by = topY - 7;
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(x - bw / 2 - 1, by - 1, bw + 2, 6);
        ctx.fillStyle = TEAM[e.side];
        ctx.fillRect(x - bw / 2, by, Math.max(0, (e.hp / e.maxHp) * bw), 4);
      }
    }

    // efeitos
    for (const f of fxRef.current) {
      if (f.kind === "line") {
        ctx.strokeStyle = f.ranged ? "rgba(255,255,255,0.9)" : "rgba(255,240,150,0.95)";
        ctx.lineWidth = f.ranged ? 2 : 4;
        ctx.beginPath();
        ctx.moveTo(f.x1 * s, f.y1 * s);
        ctx.lineTo(f.x2 * s, f.y2 * s);
        ctx.stroke();
      } else if (f.kind === "spell") {
        const t = 1 - f.ttl / f.max;
        ctx.fillStyle = `rgba(255,200,60,${0.5 * (1 - t)})`;
        ctx.beginPath();
        ctx.arc(f.x * s, f.y * s, f.r * s * (0.6 + 0.4 * t), 0, Math.PI * 2);
        ctx.fill();
        ctx.font = `${f.r * s}px system-ui, "Segoe UI Emoji", sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.globalAlpha = 1 - t;
        ctx.fillText(f.emoji, f.x * s, f.y * s);
        ctx.globalAlpha = 1;
      } else {
        ctx.font = `${(f.big ? 2.4 : 1.3) * s}px system-ui, "Segoe UI Emoji", sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.globalAlpha = Math.min(1, f.ttl / 6);
        ctx.fillText("💥", f.x * s, f.y * s);
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
  }, []);

  // ------------------------------------------------------------ laço do jogo
  const finish = useCallback(
    async (surrender: boolean) => {
      stopLoop();
      setPhase("finishing");
      try {
        const res = await finishArena({ matchId: matchRef.current!, inputs: logRef.current, surrender });
        setVerdict(res);
      } catch {
        setVerdict({ error: "Sem conexão. Não foi possível confirmar o resultado." });
      }
      setPhase("result");
    },
    [stopLoop],
  );

  const startLoop = useCallback(() => {
    let last = performance.now();
    let acc = 0;
    const frame = (now: number) => {
      const game = gameRef.current;
      if (!game) return;
      acc += Math.min(250, now - last);
      last = now;
      let guard = 0;
      while (acc >= STEP_MS && !game.over && guard++ < 10) {
        const inputs = pendingRef.current;
        pendingRef.current = [];
        const ev: GameEvent[] = step(game, inputs, [1]);
        for (const e of ev) {
          if (e.t === "attack") fxRef.current.push({ kind: "line", x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2, ranged: e.ranged, side: e.side, ttl: e.ranged ? 3 : 2 });
          else if (e.t === "spell") fxRef.current.push({ kind: "spell", emoji: ARENA_CARD_BY_KEY.get(e.key)?.emoji ?? "✨", x: e.x, y: e.y, r: e.r, ttl: 14, max: 14 });
          else if (e.t === "death") fxRef.current.push({ kind: "puff", x: e.x, y: e.y, big: e.tower, ttl: e.tower ? 20 : 8 });
        }
        fxRef.current = fxRef.current.map((f) => ({ ...f, ttl: f.ttl - 1 })).filter((f) => f.ttl > 0);
        acc -= STEP_MS;
        if (game.tick % 4 === 0 || game.over) {
          setHud({ mana: game.mana[0], tick: game.tick, crowns: [game.crowns[0], game.crowns[1]], slots: [...game.slots[0]], next: game.queue[0][0] });
        }
      }
      draw(Math.min(1, acc / STEP_MS));
      if (game.over) {
        draw(1);
        void finish(false);
        return;
      }
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
  }, [draw, finish]);

  async function begin() {
    setError(null);
    setVerdict(null);
    const res: { error?: string; matchId?: string; seed?: number } = await startArena().catch(() => ({
      error: "Sem conexão. Tente de novo.",
    }));
    if (res.error || !res.matchId || res.seed === undefined) {
      setError(res.error ?? "Não foi possível começar.");
      return;
    }
    matchRef.current = res.matchId;
    const game = createGame(res.seed, STARTER_DECK);
    gameRef.current = game;
    pendingRef.current = [];
    logRef.current = [];
    fxRef.current = [];
    setSelected(null);
    setHud({ mana: game.mana[0], tick: 0, crowns: [0, 0], slots: [...game.slots[0]], next: game.queue[0][0] });
    setPhase("playing");
  }

  // tela cheia durante a partida: mede o campo, trava a rolagem e liga o laço
  useEffect(() => {
    if (phase !== "playing") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setupCanvas();
    const area = areaRef.current;
    const ro = area ? new ResizeObserver(() => setupCanvas()) : null;
    if (area && ro) ro.observe(area);
    startLoop();
    return () => {
      document.body.style.overflow = prev;
      ro?.disconnect();
      stopLoop();
    };
  }, [phase, setupCanvas, startLoop, stopLoop]);

  function onCanvasPointer(ev: React.PointerEvent<HTMLCanvasElement>) {
    const game = gameRef.current;
    const slot = selectedRef.current;
    const l = layoutRef.current;
    if (!game || game.over || slot === null || !l) return;
    const rect = ev.currentTarget.getBoundingClientRect();
    const k = l.cw / rect.width;
    const x = ((ev.clientX - rect.left) * k - l.ox) / l.s;
    const y = ((ev.clientY - rect.top) * k - l.oy) / l.s;
    const card = ARENA_CARD_BY_KEY.get(game.slots[0][slot]);
    if (!card || game.mana[0] + 1e-9 < card.cost) return;
    if (card.kind === "unit" ? !inDeployZone(0, x, y) : !inField(x, y)) return;
    const input: Input = { tick: game.tick, side: 0, slot, x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
    pendingRef.current.push(input);
    logRef.current.push(input);
    setSelected(null);
  }

  function surrender() {
    if (phase !== "playing") return;
    if (!window.confirm("Desistir da partida?")) return;
    void finish(true);
  }

  // ------------------------------------------------------------ telas
  const header = <PageHeader title="🏰 Arena dos Heróis" subtitle="Enfrente o computador com heróis e poderes bíblicos." />;

  if (phase === "intro") {
    return (
      <div>
        {header}
        <div className="card mb-4 p-5">
          <p className="text-lg font-black">Como jogar</p>
          <ul className="mt-2 space-y-1.5 text-sm font-semibold text-[var(--muted)]">
            <li>💧 O Maná enche sozinho. Cada carta custa um pouco dele.</li>
            <li>👆 Toque numa carta e depois no campo (na sua metade) pra colocar o herói.</li>
            <li>🗼 Derrube as Atalaias (1 coroa) e o Santuário (3 coroas) do computador.</li>
            <li>⏱️ São 3 minutos. No último minuto o Maná enche em dobro!</li>
          </ul>
        </div>
        <p className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Seu baralho</p>
        <div className="mb-4 grid grid-cols-4 gap-2">
          {STARTER_DECK.map((k) => {
            const c = ARENA_CARD_BY_KEY.get(k)!;
            return (
              <div key={k} className="relative rounded-2xl border-2 border-[var(--line)] bg-[var(--card)] p-2 text-center">
                <span className="absolute -left-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-xs font-black text-white">{c.cost}</span>
                <div className="flex h-14 items-end justify-center">
                  {c.art ? <CardArt card={c} className="h-14" /> : <span className="text-3xl" aria-hidden>{c.emoji}</span>}
                </div>
                <p className="mt-1 text-[10px] font-bold leading-tight">{c.name}</p>
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
  const slots = hud?.slots ?? [];
  const mana = hud?.mana ?? 0;
  const doubled = (hud?.tick ?? 0) >= DOUBLE_MANA_TICK;
  const nextCard = ARENA_CARD_BY_KEY.get(hud?.next ?? "");
  const shadow = "[text-shadow:0_1px_3px_#000,0_0_2px_#000]";
  return (
    <div className="fixed inset-0 z-[70] select-none bg-[#10201a]">
      <div className="mx-auto flex h-full w-full max-w-[480px] flex-col bg-[#4d8f3a]">
        <div ref={areaRef} className="relative min-h-0 flex-1 overflow-hidden">
          <canvas
            ref={canvasRef}
            onPointerDown={onCanvasPointer}
            className="absolute left-0 top-0 touch-none"
          />
          <div className="pointer-events-none absolute left-2 top-2 flex items-center gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg border-2 border-amber-300 bg-gradient-to-b from-rose-700 to-rose-950 text-2xl shadow-lg">🛡️</div>
            <div className="leading-tight">
              <p className={`text-base font-black text-fuchsia-300 ${shadow}`}>Computador</p>
              <p className={`text-xs font-bold text-white ${shadow}`}>Arena dos Heróis</p>
            </div>
          </div>
          <div className="pointer-events-none absolute right-2 top-2 rounded-lg border-2 border-black/70 bg-[#173a1c]/90 px-3 py-1 text-right shadow-lg">
            <p className={`text-[11px] font-black ${doubled ? "text-fuchsia-300" : "text-white/90"}`}>{doubled ? "Maná em dobro!" : "Tempo:"}</p>
            <p className="text-2xl font-black leading-none tabular-nums text-white">{fmtTime(hud?.tick ?? 0)}</p>
          </div>
          <div className="pointer-events-none absolute right-1 top-1/2 flex -translate-y-1/2 flex-col gap-4">
            <CrownCount n={hud?.crowns[1] ?? 0} color="red" />
            <CrownCount n={hud?.crowns[0] ?? 0} color="blue" />
          </div>
        </div>

        <div className="border-t-4 border-[#7db4ff] bg-gradient-to-b from-[#2e72cc] to-[#1c4c9c] px-2 pb-2 pt-3">
          <div className="flex items-end gap-2">
            <div className="flex w-14 shrink-0 flex-col items-center gap-1">
              <button
                type="button"
                onClick={surrender}
                aria-label="Desistir"
                className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-[#5a1010] bg-gradient-to-b from-red-500 to-red-700 text-xl font-black text-white shadow active:scale-95"
              >
                ✕
              </button>
              <p className="text-[10px] font-black text-white">Próxima:</p>
              <div className="flex h-12 w-11 items-center justify-center rounded-lg border-2 border-[#0f2f6b] bg-gradient-to-b from-[#4a90e2] to-[#2d62b8]">
                {nextCard ? nextCard.art ? <CardArt card={nextCard} className="h-10" /> : <span className="text-xl" aria-hidden>{nextCard.emoji}</span> : null}
              </div>
            </div>
            <div className="grid flex-1 grid-cols-4 gap-1.5 pb-3">
              {slots.map((key, i) => {
                const c = ARENA_CARD_BY_KEY.get(key);
                if (!c) return <div key={i} />;
                const can = mana + 1e-9 >= c.cost;
                const isSel = selected === i;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelected(isSel ? null : i)}
                    className={`relative aspect-[3/4] rounded-xl border-[3px] bg-gradient-to-b from-[#4a90e2] to-[#2d62b8] p-1 shadow-md transition active:scale-95 ${
                      isSel ? "-translate-y-3 border-amber-300 shadow-[0_0_16px_#fcd34d]" : "border-[#0f2f6b]"
                    } ${can ? "" : "brightness-50"}`}
                  >
                    <span className="flex h-full items-center justify-center pb-2">
                      {c.art ? <CardArt card={c} className="h-full max-h-[72px]" /> : <span className="text-3xl" aria-hidden>{c.emoji}</span>}
                    </span>
                    <span className="absolute -bottom-3 left-1/2 -translate-x-1/2">
                      <Drop n={c.cost} size={26} />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-1 flex items-center gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center">
              <Drop n={Math.floor(mana)} size={32} />
            </div>
            <div className="relative h-5 flex-1 overflow-hidden rounded-full border-2 border-[#0f2f6b] bg-[#1a1040]">
              <div
                className="h-full bg-gradient-to-b from-fuchsia-400 to-fuchsia-700 transition-[width] duration-200 ease-linear"
                style={{ width: `${(Math.min(MANA_MAX, mana) / MANA_MAX) * 100}%` }}
              />
              {Array.from({ length: MANA_MAX - 1 }).map((_, i) => (
                <span key={i} className="absolute top-0 h-full w-px bg-black/40" style={{ left: `${((i + 1) / MANA_MAX) * 100}%` }} />
              ))}
            </div>
            <span className="w-11 text-right text-[10px] font-black text-white/85">Máx: {MANA_MAX}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
