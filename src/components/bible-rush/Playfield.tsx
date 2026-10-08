"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RushLevel, type ActionResult, type SoundKind } from "@/lib/bible-rush/core/engine";
import type { FeedId, GuestId, Request, Settings } from "@/lib/bible-rush/core/types";
import { FEEDS, GUESTS } from "@/lib/bible-rush/data/items";
import { RushAudio } from "@/lib/bible-rush/audio/audio";
import { PATIENCE_FACE, PATIENCE_LABEL, patienceState } from "@/lib/bible-rush/systems/patience";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const RING = 2 * Math.PI * 15.5;

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
    level.setSound((k: SoundKind, g?: GuestId) => audio.play(k, g));
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
  const campaign = level.mode === "campaign";
  const pct = campaign ? Math.min(100, Math.round((level.score / target) * 100)) : 0;
  const stars = campaign ? (level.score >= target * 1.5 ? 3 : level.score >= target * 1.25 ? 2 : level.score >= target ? 1 : 0) : 0;
  const large = settings.uiScale === "large";
  const lowTime = level.mode !== "survival" && level.timeLeft < 20 && level.timeLeft > 0;

  return (
    <div className={`br-play ${settings.colorblind ? "br-cb" : ""} ${settings.reduceMotion ? "br-calm" : ""} ${large ? "br-large" : ""}`}>
      {/* cenário: o campo da arca, com o HUD no céu e a fila de clientes no caminho */}
      <div className="br-scene" style={{ ["--cena" as string]: `url(/bible-rush/cena-${level.def.scene}.webp)` }}>
        <header className="br-hud2">
          <div className="br-hud-row">
            <p className="br-chip">{campaign ? `FASE ${String(level.def.number).padStart(2, "0")}` : title}</p>
            <p className={`br-pill br-pill-time ${lowTime ? "br-warn" : ""}`} aria-label="Tempo">
              ⏱ {level.mode === "survival" ? fmt(level.t) : fmt(level.timeLeft)}
            </p>
            <p className="br-pill" aria-label="Satisfação">
              {level.satisfaction >= 75 ? "😊" : level.satisfaction >= 45 ? "😐" : "😠"} {level.satisfaction}%
            </p>
            <p className="br-pill" aria-label="Clientes perdidos">
              🚪 {level.abandoned}/{level.maxAbandon}
            </p>
            <button type="button" className="br-icon" aria-label="Pausar" onClick={() => setPaused(true)}>
              ⏸
            </button>
          </div>
          {campaign ? (
            <div className="br-goal" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso da meta">
              <i style={{ width: `${pct}%` }} />
              <span>
                🪙 {level.score} <small>/ meta {target}</small>
              </span>
              <em className="br-goal-stars" aria-label={`${stars} estrelas`}>
                {[0, 1, 2].map((i) => (
                  <b key={i} className={i < stars ? "on" : ""}>
                    ★
                  </b>
                ))}
              </em>
            </div>
          ) : (
            <p className="br-pill br-pill-wide">🪙 Pares atendidos: {level.served}</p>
          )}
        </header>

        {/* faixa de avisos (altura fixa): erro recente > evento > dica do tutorial > lembrete de como jogar */}
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
          ) : (
            <p className="br-strip-in br-howto">
              <span>1 ➕ Cozinhar</span>
              <span>2 ✅ Pegar</span>
              <span>3 👆 Servir</span>
            </p>
          )}
        </div>
        {level.storm ? <div className="br-storm" aria-hidden /> : null}

        <section className="br-street" aria-label="Clientes">
          {level.slots.map((r, i) => (
            <div key={i} className="br-seat">
              {r ? (
                <Customer r={r} canServe={r.needs.some((f) => level.plate.includes(f))} hl={hint?.target === "card"} onServe={() => flash(level.serve(r.id))} />
              ) : (
                <div className="br-empty" aria-hidden />
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
      </div>

      {/* balcão com toldo: uma prateleira por prato do cardápio e a bandeja */}
      <div className="br-bench">
        <section className="br-shelves" aria-label="Cozinha da Arca">
          {level.def.feeds.map((id) => FEEDS[id]).map((f) => {
            const st = f.station;
            const cells = level.cells[f.id];
            const firstEmpty = cells ? cells.findIndex((c) => c.state === "empty") : 0;
            return (
              <div key={f.id} className="br-shelf2">
                <div className="br-shelf-id">
                  <span className="br-badge" aria-hidden>
                    {st.emoji}
                  </span>
                  <span className="br-shelf-txt">
                    <b>{st.name}</b>
                    <small>
                      {f.emoji} {f.name} · 🪙{f.price}
                    </small>
                  </span>
                </div>
                <div className="br-cells2">
                  {!cells ? (
                    <button type="button" className={`br-slot2 br-slot-direct ${hl(`slot:${f.id}`)}`} onClick={() => flash(level.tapStation(f.id, 0))} aria-label={`Pegar ${f.name}`}>
                      <span className="br-dish">{f.emoji}</span>
                      <em className="br-slot-cap">PEGAR</em>
                    </button>
                  ) : (
                    cells.map((c, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={`br-slot2 br-s-${c.state} ${c.state === "empty" && idx === firstEmpty ? hl(`slot:${f.id}`) : ""} ${c.state === "ready" ? hl(`ready:${f.id}`) : ""}`}
                        onClick={() => flash(level.tapStation(f.id, idx))}
                        aria-label={`${f.name}: ${c.state === "empty" ? "vaga livre" : c.state === "cooking" ? "cozinhando" : c.state === "ready" ? "no ponto" : "queimado"}`}
                      >
                        <Slot feed={f.id} state={c.state} progress={level.progress(f.id, idx)} />
                      </button>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </section>

        <section className="br-tray" aria-label="Bandeja">
          <p className="br-tray-label">
            🍽️ BANDEJA
            <small>toque no prato para jogar fora</small>
          </p>
          <div className="br-tray-cells">
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
            <p className="br-aboard" aria-label="Já atendidos">
              🍽️ {level.placed.slice(-9).map((g) => GUESTS[g].faces[0]).join("")}
            </p>
          ) : null}
        </section>
      </div>

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

/** O conteúdo de uma vaga: vazia (➕), cozinhando (anel enchendo), no ponto (✓ e anel esvaziando até queimar) ou queimada. */
function Slot({ feed, state, progress }: { feed: FeedId; state: "empty" | "cooking" | "ready" | "burnt"; progress: number }) {
  if (state === "empty") {
    return (
      <>
        <span className="br-plus">＋</span>
        <em className="br-slot-cap">assar</em>
      </>
    );
  }
  if (state === "burnt") {
    return (
      <>
        <span className="br-dish">💥</span>
        <em className="br-slot-cap">queimou!</em>
      </>
    );
  }
  const burns = FEEDS[feed].station.burnAfter > 0;
  const warn = state === "ready" && burns && progress < 0.35;
  return (
    <>
      <svg className="br-ring" viewBox="0 0 36 36" aria-hidden>
        <circle cx="18" cy="18" r="15.5" className="br-ring-bg" />
        <circle cx="18" cy="18" r="15.5" className={`br-ring-fg ${state === "ready" ? (warn ? "warn" : "ok") : ""}`} strokeDasharray={`${(state === "ready" && !burns ? 1 : progress) * RING} ${RING}`} transform="rotate(-90 18 18)" />
      </svg>
      <span className="br-dish">{FEEDS[feed].emoji}</span>
      {state === "ready" ? <span className="br-ok">✓</span> : null}
      <em className="br-slot-cap">{state === "ready" ? "pegar!" : "assando"}</em>
    </>
  );
}

/** Um cliente no caminho: balão do pedido (enche de cor conforme a paciência), o par de animais e o aviso quando já dá para servir. */
function Customer({ r, canServe, hl, onServe }: { r: Request; canServe: boolean; hl: boolean; onServe: () => void }) {
  const d = GUESTS[r.guest];
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
    <button type="button" className={`br-cust br-st-${st} ${canServe ? "br-can" : ""} ${hl ? "br-hl" : ""}`} onClick={onServe} aria-label={`${d.name}. ${PATIENCE_LABEL[st]}. Toque para servir.`}>
      <span className="br-bubble" aria-hidden style={{ ["--p" as string]: `${Math.max(0, r.patience) * 100}%` }}>
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
        {d.faces.map((f, k) => (
          <span key={k} className={`br-an ${k > 0 ? "br-an2" : ""} ${d.faces.length > 1 ? "br-an-grp" : ""}`}>
            {f}
          </span>
        ))}
        <span className="br-shadow" />
      </span>
      <span className="br-name">{d.name}</span>
      <span className="br-face" aria-hidden>
        {PATIENCE_FACE[st]}
        {r.restless ? <span className="br-rest">🌀</span> : null}
      </span>
      {canServe ? <span className="br-serve">SERVIR!</span> : null}
    </button>
  );
}
