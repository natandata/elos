"use client";

import { MINI_BY_ID, type MiniHud } from "@/lib/minearena/mini/types";

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** Painel da partida de um minigame: contagem, vivos, zona, tema, votação e resultado. */
export function MiniOverlay({ hud, onVote, onLeave }: { hud: MiniHud; onVote: (n: number) => void; onLeave: () => void }) {
  const info = MINI_BY_ID.get(hud.game);
  const r = hud.result;
  return (
    <div className="ma-mini-hud" aria-live="polite">
      <div className="ma-mini-top">
        <b>
          {info?.emoji} {info?.name}
        </b>
        {hud.phase === "play" && hud.game !== "build" ? (
          <span>
            👥 {hud.alive}/{hud.total} vivos · ⚔ {hud.kills}
          </span>
        ) : null}
        {hud.phase === "play" && hud.game === "build" ? <span>⏱ {mmss(hud.left)}</span> : null}
      </div>

      {hud.theme && hud.phase !== "end" ? <p className="ma-mini-theme">Tema: {hud.theme}</p> : null}

      {hud.announce ? <p className="ma-mini-banner">{hud.announce}</p> : null}

      {hud.phase === "countdown" && !hud.announce ? <p className="ma-mini-count">{Math.max(1, Math.ceil(hud.left))}</p> : null}

      {hud.zone && hud.phase === "play" && !hud.spectating ? (
        <p className="ma-mini-zone" data-out={hud.outside}>
          {hud.outside ? "⚠ Você está fora da zona segura!" : hud.zone.shrinking ? "🔵 A zona está diminuindo" : hud.zone.nextIn >= 0 ? `🔵 Próxima redução em ${mmss(hud.zone.nextIn)}` : "🔵 Zona final"}
        </p>
      ) : null}

      {hud.spectating && hud.phase === "play" ? <p className="ma-mini-banner">👀 Você foi eliminado — assistindo (voe com pular/agachar)</p> : null}

      {hud.judging && hud.phase === "judge" ? (
        <div className="ma-mini-judge">
          <p>
            Construção {hud.judging.idx}/{hud.judging.of}: <b>{hud.judging.name}</b>
            {hud.judging.mine ? " (a sua!)" : ""} · {Math.ceil(hud.left)}s
          </p>
          {hud.judging.mine ? (
            <p className="ma-mini-sub2">Os outros estão dando a nota…</p>
          ) : (
            <div className="ma-mini-stars" role="radiogroup" aria-label="Nota de 1 a 5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" role="radio" aria-checked={hud.judging!.voted === n} disabled={hud.judging!.voted !== null} data-on={hud.judging!.voted !== null && n <= hud.judging!.voted} onClick={() => onVote(n)}>
                  ★
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}

      <ul className="ma-mini-feed">
        {hud.feed.map((f) => (
          <li key={f.id}>{f.text}</li>
        ))}
      </ul>

      {r ? (
        <div className="ma-mini-result">
          <h3>{r.title}</h3>
          <p className="ma-mini-sub2">{r.mePlace === 1 ? "🥇 Você venceu!" : `Você ficou em ${r.mePlace}º lugar`}</p>
          <ol>
            {r.ranks.map((p) => (
              <li key={p.id}>
                <span>{["🥇", "🥈", "🥉"][p.place - 1] ?? `${p.place}º`}</span> <b>{p.name}</b> <small>{p.note}</small>
              </li>
            ))}
          </ol>
          <button type="button" className="ma-btn" onClick={onLeave}>
            Voltar ao menu
          </button>
        </div>
      ) : null}
    </div>
  );
}
