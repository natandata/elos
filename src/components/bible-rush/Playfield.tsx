"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RushLevel, type SoundKind, type StationRef } from "@/lib/bible-rush/core/engine";
import type { FeedId, PenId, Request, Settings, SpeciesId } from "@/lib/bible-rush/core/types";
import { FEEDS, FEED_LIST, PENS, SPECIES } from "@/lib/bible-rush/data/items";
import { RushAudio } from "@/lib/bible-rush/audio/audio";
import { PATIENCE_FACE, PATIENCE_LABEL, patienceState } from "@/lib/bible-rush/systems/patience";
import { STOCK_MAX } from "@/lib/bible-rush/systems/resources";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** Entrada abstrata: toque (selecionar / usar estação) e arrastar o cartão até uma estação viram a mesma intenção. */
type Drag = { id: number; x: number; y: number; emoji: string } | null;

export function Playfield({
  level,
  audio,
  settings,
  title,
  onEnd,
  onQuit,
}: {
  level: RushLevel;
  audio: RushAudio;
  settings: Settings;
  title: string;
  onEnd: () => void;
  onQuit: () => void;
}) {
  const [, setTick] = useState(0);
  const [drag, setDrag] = useState<Drag>(null);
  const [shake, setShake] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; tone: string } | null>(null);
  const endedRef = useRef(false);
  const dragRef = useRef<{ id: number; sx: number; sy: number; moved: boolean } | null>(null);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const endRef = useRef(onEnd);
  useEffect(() => {
    pausedRef.current = paused;
    endRef.current = onEnd;
  });

  useEffect(() => {
    level.setSound((k: SoundKind, sp?: SpeciesId) => audio.play(k, sp));
    const st = { raf: 0, last: performance.now() };
    const loop = (now: number) => {
      const dt = (now - st.last) / 1000;
      st.last = now;
      if (!pausedRef.current) level.update(dt);
      audio.setTense(level.mode === "campaign" && level.timeLeft > 0 && level.timeLeft < 30);
      setTick((x) => (x + 1) % 1_000_000);
      if (level.status !== "playing" && !endedRef.current) {
        endedRef.current = true;
        window.setTimeout(() => endRef.current(), 900);
      }
      st.raf = requestAnimationFrame(loop);
    };
    st.raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(st.raf);
      level.setSound(undefined);
    };
  }, [level, audio]);

  const flash = useCallback((key: string, text: string, tone: string) => {
    setShake(key);
    setMsg({ text, tone });
    window.setTimeout(() => setShake((s) => (s === key ? null : s)), 380);
    window.setTimeout(() => setMsg((m) => (m && m.text === text ? null : m)), 2200);
  }, []);

  const act = (st: StationRef, forId?: number) => {
    const key = `${st.type}:${st.id}`;
    const r = level.press(st, forId);
    if (r.text) flash(key, r.text, r.tone);
  };

  // arrastar um cartão até uma estação
  const down = (e: React.PointerEvent, r: Request) => {
    dragRef.current = { id: r.id, sx: e.clientX, sy: e.clientY, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const move = (e: React.PointerEvent, r: Request) => {
    const d = dragRef.current;
    if (!d || d.id !== r.id) return;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 10) d.moved = true;
    if (d.moved) setDrag({ id: r.id, x: e.clientX, y: e.clientY, emoji: SPECIES[r.species].emoji });
  };
  const up = (e: React.PointerEvent, r: Request) => {
    const d = dragRef.current;
    dragRef.current = null;
    setDrag(null);
    if (!d || d.id !== r.id) return;
    if (!d.moved) return level.select(r.id);
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-station]") as HTMLElement | null;
    const [type, id] = (el?.dataset.station ?? "").split(":");
    if (type === "feed") act({ type: "feed", id: id as FeedId }, r.id);
    else if (type === "pen") act({ type: "pen", id: id as PenId }, r.id);
  };

  const hint = level.hint();
  const hl = (t: string) => (hint && hint.target === t ? "br-hl" : "");
  const cardHl = hint?.target === "card";
  const target = level.def.targetScore;
  const pct = level.mode === "campaign" ? Math.min(100, Math.round((level.score / target) * 100)) : 0;
  const stars = level.mode === "campaign" ? (level.score >= target * 1.5 ? 3 : level.score >= target * 1.25 ? 2 : level.score >= target ? 1 : 0) : 0;
  const large = settings.uiScale === "large";

  return (
    <div className={`br-field ${settings.colorblind ? "br-cb" : ""} ${settings.reduceMotion ? "br-calm" : ""} ${large ? "br-large" : ""}`}>
      {/* HUD */}
      <header className="br-hud">
        <div className="flex items-center justify-between gap-2">
          <p className="br-chip">{level.mode === "campaign" ? `FASE ${String(level.def.number).padStart(2, "0")}` : title}</p>
          {level.mode === "campaign" ? <p className="br-chip">META {target}</p> : <p className="br-chip">PARES {level.served}</p>}
          {level.mode === "campaign" ? (
            <p className="br-stars" aria-label={`${stars} estrelas`}>
              {[0, 1, 2].map((i) => (
                <span key={i} className={i < stars ? "on" : ""}>
                  ★
                </span>
              ))}
            </p>
          ) : null}
          <button type="button" className="br-icon" aria-label="Pausar" onClick={() => setPaused(true)}>
            ⏸
          </button>
        </div>
        {level.mode === "campaign" ? (
          <div className="mt-1.5">
            <p className="br-label">OBJETIVO</p>
            <div className="br-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso da meta">
              <i style={{ width: `${pct}%` }} />
              <span>{pct}%</span>
            </div>
          </div>
        ) : null}
      </header>

      {/* faixa de avisos de altura fixa (o layout não pula): erro recente > evento > dica do tutorial */}
      <div className="br-strip" role="status" aria-live="polite">
        {msg ? (
          <p className={`br-strip-in br-msg-${msg.tone}`}>{msg.text}</p>
        ) : level.banner ? (
          <p className="br-strip-in br-banner">{level.banner}</p>
        ) : hint ? (
          <p className="br-strip-in br-coach">
            <span aria-hidden>🧔</span>
            {hint.text}
          </p>
        ) : null}
      </div>
      {level.storm ? <div className="br-storm" aria-hidden /> : null}

      {/* fila */}
      <section className="br-queue" aria-label="Pedidos">
        {level.slots.map((r, i) => (
          <div key={i} className="br-slot">
            {r ? (
              <RequestCard
                r={r}
                selected={level.selected === r.id}
                dragging={drag?.id === r.id}
                hl={cardHl && (level.tut?.step !== 3 || r.patience <= 0.5)}
                handlers={{ onPointerDown: (e) => down(e, r), onPointerMove: (e) => move(e, r), onPointerUp: (e) => up(e, r), onPointerCancel: () => ((dragRef.current = null), setDrag(null)) }}
                needsFeedHl={hint?.target.startsWith("feed:") ?? false}
              />
            ) : (
              <div className="br-empty" aria-hidden>
                <span>vaga</span>
              </div>
            )}
            {level.floaters
              .filter((f) => f.slot === i)
              .map((f) => (
                <span key={f.id} className={`br-float br-float-${f.tone}`}>
                  {f.text}
                </span>
              ))}
          </div>
        ))}
      </section>

      {/* arca: cercados */}
      <section className="br-ark" aria-label="Arca">
        <p className="br-label br-label-ark">A ARCA</p>
        <div className="br-pens">
          {level.def.pens.map((p) => (
            <button
              key={p}
              type="button"
              data-station={`pen:${p}`}
              className={`br-pen ${hl(`pen:${p}`)} ${shake === `pen:${p}` ? "br-shake" : ""}`}
              onClick={() => act({ type: "pen", id: p })}
              aria-label={`${PENS[p].name}: ${level.placed[p].length} pares`}
            >
              <span className="text-2xl" aria-hidden>
                {PENS[p].emoji}
              </span>
              <span className="br-pen-name">{PENS[p].name}</span>
              <span className="br-pen-in" aria-hidden>
                {level.placed[p].slice(-6).map((s, i) => (
                  <span key={i}>{SPECIES[s].emoji}</span>
                ))}
              </span>
              <span className="br-pen-count">{level.placed[p].length}</span>
            </button>
          ))}
        </div>
      </section>

      {/* estoque */}
      <section className="br-crates" aria-label="Alimentos">
        {FEED_LIST.filter((f) => level.def.feeds.includes(f.id)).map((f) => {
          const s = level.resources.stock[f.id];
          const busy = s.refill > 0;
          return (
            <div key={f.id} className="br-crate-wrap">
              <button
                type="button"
                data-station={`feed:${f.id}`}
                className={`br-crate ${hl(`feed:${f.id}`)} ${shake === `feed:${f.id}` ? "br-shake" : ""} ${s.n === 0 ? "br-out" : ""}`}
                onClick={() => act({ type: "feed", id: f.id })}
                aria-label={`${f.name}: ${s.n} de ${STOCK_MAX}`}
              >
                <span className="text-2xl" aria-hidden>
                  {f.emoji}
                </span>
                <span className="br-crate-name">{f.name}</span>
                <span className="br-crate-bar" aria-hidden>
                  <i style={{ width: `${(s.n / STOCK_MAX) * 100}%` }} data-low={s.n <= 1} />
                </span>
                <span className="br-crate-n">{s.n}</span>
              </button>
              <button
                type="button"
                className={`br-refill ${hl(`refill:${f.id}`)}`}
                disabled={busy}
                onClick={() => {
                  const r = level.refill(f.id);
                  if (r.text) flash(`refill:${f.id}`, r.text, r.tone);
                }}
                aria-label={`Reabastecer ${f.name}`}
              >
                {busy ? (
                  <span className="br-refill-bar" style={{ width: `${(1 - s.refill / 2.2) * 100}%` }} />
                ) : null}
                <span className="relative">↻ +4</span>
              </button>
            </div>
          );
        })}
      </section>

      {/* HUD inferior */}
      <footer className="br-foot">
        <div>
          <p className="br-label">TEMPO</p>
          <p className={`br-big ${level.mode !== "survival" && level.timeLeft < 20 && level.timeLeft > 0 ? "br-warn" : ""}`}>{level.mode === "survival" ? fmt(level.t) : fmt(level.timeLeft)}</p>
        </div>
        <div>
          <p className="br-label">{level.mode === "campaign" ? "RECURSOS" : "PARES"}</p>
          <p className="br-big">{level.mode === "campaign" ? level.score : level.served}</p>
        </div>
        <div>
          <p className="br-label">SATISF.</p>
          <p className="br-big">{level.satisfaction}%</p>
        </div>
        <div>
          <p className="br-label">PERDIDOS</p>
          <p className="br-big">
            {level.abandoned}/{level.maxAbandon}
          </p>
        </div>
      </footer>

      {drag ? (
        <div className="br-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden>
          {drag.emoji}
        </div>
      ) : null}

      {paused && level.status === "playing" ? (
        <div className="br-overlay" role="dialog" aria-label="Pausa">
          <div className="br-panel">
            <h2 className="br-h2">Pausa</h2>
            <button type="button" className="br-btn br-btn-gold" onClick={() => setPaused(false)}>
              ▶ Continuar
            </button>
            <button type="button" className="br-btn" onClick={onQuit}>
              Sair da fase
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RequestCard({
  r,
  selected,
  dragging,
  hl,
  handlers,
  needsFeedHl,
}: {
  r: Request;
  selected: boolean;
  dragging: boolean;
  hl: boolean;
  needsFeedHl: boolean;
  handlers: Pick<React.HTMLAttributes<HTMLDivElement>, "onPointerDown" | "onPointerMove" | "onPointerUp" | "onPointerCancel">;
}) {
  const d = SPECIES[r.species];
  const st = patienceState(r.patience);
  const feeds = d.feeds;
  const pen = PENS[d.pen];
  void needsFeedHl;
  return (
    <div
      className={`br-card ${selected ? "br-sel" : ""} ${hl ? "br-hl" : ""} ${dragging ? "br-drag" : ""} br-st-${st}`}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`2 ${d.plural}. ${PATIENCE_LABEL[st]}.`}
      {...handlers}
      onKeyDown={() => undefined}
    >
      <div className="br-pair" aria-hidden>
        <span className="br-an">{d.emoji}</span>
        <span className="br-an br-an2">{d.emoji}</span>
      </div>
      <p className="br-name">2 {d.plural}</p>
      <div className="br-needs">
        {feeds.map((f) => {
          const left = r.needs.some((n) => n.kind === "feed" && n.id === f);
          return (
            <span key={f} className={`br-need ${left ? "" : "done"}`} title={FEEDS[f].name}>
              {FEEDS[f].emoji}
              {left ? "" : "✓"}
            </span>
          );
        })}
        <span className="br-need br-need-pen" title={pen.name}>
          {pen.emoji}
        </span>
      </div>
      <div className="br-pat" aria-hidden>
        <i style={{ width: `${Math.max(0, r.patience) * 100}%` }} />
      </div>
      <p className="br-face">
        <span aria-hidden>{PATIENCE_FACE[st]}</span>
        <span className="br-face-t">{PATIENCE_LABEL[st]}</span>
        {r.restless ? <span className="br-rest">🌀</span> : null}
      </p>
    </div>
  );
}
