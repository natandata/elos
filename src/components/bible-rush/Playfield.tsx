"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RushLevel, type ActionResult, type SoundKind } from "@/lib/bible-rush/core/engine";
import type { FeedId, Request, Settings, SpeciesId } from "@/lib/bible-rush/core/types";
import { FEEDS, FEED_LIST, SPECIES } from "@/lib/bible-rush/data/items";
import { RushAudio } from "@/lib/bible-rush/audio/audio";
import { PATIENCE_FACE, PATIENCE_LABEL, patienceState } from "@/lib/bible-rush/systems/patience";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

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
  const [msg, setMsg] = useState<{ text: string; tone: string } | null>(null);
  const endedRef = useRef(false);
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

  const flash = useCallback((r: ActionResult) => {
    if (!r.text) return;
    setMsg({ text: r.text, tone: r.tone });
    window.setTimeout(() => setMsg((m) => (m && m.text === r.text ? null : m)), 2200);
  }, []);

  const hint = level.hint();
  const hl = (t: string) => (hint && hint.target === t ? "br-hl" : "");
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
          {level.mode === "campaign" ? <p className="br-chip br-chip-gold">🪙 {level.score} / {target}</p> : <p className="br-chip">PARES {level.served}</p>}
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
            <div className="br-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso da meta">
              <i style={{ width: `${pct}%` }} />
              <span>META {pct}%</span>
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

      {/* clientes na fila, cada um com o balão do pedido */}
      <section className="br-street" aria-label="Clientes">
        {level.slots.map((r, i) => (
          <div key={i} className="br-seat">
            {r ? (
              <Customer r={r} hl={hint?.target === "card"} onServe={() => flash(level.serve(r.id))} />
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

      {/* balcão: uma prateleira por prato do cardápio */}
      <section className="br-counter" aria-label="Cozinha da Arca">
        {FEED_LIST.filter((f) => level.def.feeds.includes(f.id)).map((f) => {
          const st = f.station;
          const cells = level.cells[f.id];
          const firstEmpty = cells ? cells.findIndex((c) => c.state === "empty") : 0;
          return (
            <div key={f.id} className="br-shelf">
              <div className="br-shelf-name">
                <span aria-hidden>{st.emoji}</span>
                <b>{st.name}</b>
                <small>
                  {f.emoji} {f.name} · {f.price}
                </small>
              </div>
              <div className="br-cells">
                {!cells ? (
                  <button type="button" className={`br-cell br-cell-direct ${hl(`slot:${f.id}`)}`} onClick={() => flash(level.tapStation(f.id, 0))} aria-label={`Pegar ${f.name}`}>
                    <span className="br-cell-emoji">{f.emoji}</span>
                    <em>pegar</em>
                  </button>
                ) : (
                  cells.map((c, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`br-cell br-c-${c.state} ${c.state === "empty" && idx === firstEmpty ? hl(`slot:${f.id}`) : ""} ${c.state === "ready" ? hl(`ready:${f.id}`) : ""}`}
                      onClick={() => flash(level.tapStation(f.id, idx))}
                      aria-label={`${f.name}: ${c.state === "empty" ? "vaga livre" : c.state === "cooking" ? "cozinhando" : c.state === "ready" ? "no ponto" : "queimado"}`}
                    >
                      <Cell feed={f.id} state={c.state} progress={level.progress(f.id, idx)} burns={st.burnAfter > 0} />
                    </button>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </section>

      {/* bandeja */}
      <section className="br-plate" aria-label="Bandeja">
        <p className="br-label">BANDEJA · toque num prato para jogar fora</p>
        <div className="br-plate-cells">
          {Array.from({ length: level.def.plateMax }, (_, i) => {
            const f = level.plate[i];
            return f ? (
              <button key={i} type="button" className="br-pl" onClick={() => flash(level.discard(i))} aria-label={`${FEEDS[f].name} na bandeja`}>
                {FEEDS[f].emoji}
              </button>
            ) : (
              <span key={i} className="br-pl br-pl-empty" aria-hidden />
            );
          })}
        </div>
        {level.placed.length > 0 ? (
          <p className="br-aboard" aria-label="Já embarcaram na arca">
            🛶 {level.placed.slice(-12).map((s) => SPECIES[s].emoji).join("")}
          </p>
        ) : null}
      </section>

      {/* HUD inferior */}
      <footer className="br-foot">
        <div>
          <p className="br-label">TEMPO</p>
          <p className={`br-big ${level.mode !== "survival" && level.timeLeft < 20 && level.timeLeft > 0 ? "br-warn" : ""}`}>{level.mode === "survival" ? fmt(level.t) : fmt(level.timeLeft)}</p>
        </div>
        <div>
          <p className="br-label">{level.mode === "campaign" ? "GANHOS" : "PARES"}</p>
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

/** O conteúdo de uma vaga da estação: vazia, cozinhando (barra enchendo), no ponto (✓ e barra do tempo até queimar) ou queimada. */
function Cell({ feed, state, progress, burns }: { feed: FeedId; state: "empty" | "cooking" | "ready" | "burnt"; progress: number; burns: boolean }) {
  if (state === "empty") return <span className="br-plus">+</span>;
  if (state === "burnt") return <span className="br-cell-emoji">💥</span>;
  return (
    <>
      <span className="br-cell-emoji">{FEEDS[feed].emoji}</span>
      {state === "ready" ? <span className="br-ok">✓</span> : null}
      {state === "cooking" || burns ? (
        <span className="br-prog" aria-hidden>
          <i style={{ width: `${progress * 100}%` }} data-warn={state === "ready" && progress < 0.35} />
        </span>
      ) : null}
    </>
  );
}

/** Um cliente: o balão do pedido enche de cor conforme a paciência (verde, amarelo, vermelho) e os pratos já entregues ficam marcados. */
function Customer({ r, hl, onServe }: { r: Request; hl: boolean; onServe: () => void }) {
  const d = SPECIES[r.species];
  const st = patienceState(r.patience);
  const left = [...r.needs];
  const items = r.want.map((f) => {
    const i = left.indexOf(f);
    if (i >= 0) {
      left.splice(i, 1);
      return { f, done: false };
    }
    return { f, done: true };
  });
  return (
    <button type="button" className={`br-cust br-st-${st} ${hl ? "br-hl" : ""}`} onClick={onServe} aria-label={`2 ${d.plural}. ${PATIENCE_LABEL[st]}. Toque para servir.`}>
      <span className="br-bubble" aria-hidden>
        <i style={{ height: `${Math.max(0, r.patience) * 100}%` }} />
        <span className="br-want">
          {items.map((it, k) => (
            <span key={k} className={it.done ? "done" : ""}>
              {FEEDS[it.f].emoji}
              {it.done ? <b>✓</b> : null}
            </span>
          ))}
        </span>
      </span>
      <span className="br-pair" aria-hidden>
        <span className="br-an">{d.emoji}</span>
        <span className="br-an br-an2">{d.emoji}</span>
      </span>
      <span className="br-name">2 {d.plural}</span>
      <span className="br-face">
        <span aria-hidden>{PATIENCE_FACE[st]}</span>
        {r.restless ? <span className="br-rest">🌀</span> : null}
      </span>
    </button>
  );
}
