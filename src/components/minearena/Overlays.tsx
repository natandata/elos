"use client";

import type { DialogInfo } from "@/lib/minearena/game";
import { MineArenaLogo } from "./MainMenu";

export function HeroDialog({ d, onAct }: { d: DialogInfo; onAct: (a: "follow" | "stay" | "close") => void }) {
  return (
    <div className="ma-modal">
      <div className="ma-dialog">
        <div className="ma-dialog-head">
          {d.portrait ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={d.portrait} alt={d.name} draggable={false} />
          ) : (
            <span className="ma-dialog-emoji">{d.emoji ?? "🛡️"}</span>
          )}
          <div>
            <h2>{d.name}</h2>
            <p>{d.title}</p>
          </div>
        </div>
        <p className="ma-dialog-line">“{d.line}”</p>
        {d.verse ? <p className="ma-dialog-verse">{d.verse}</p> : null}
        {d.gifts.length > 0 ? <p className="ma-dialog-gift">🎁 Presente: {d.gifts.join(", ")}</p> : null}
        <div className="ma-dialog-btns">
          {d.closeOnly ? null : d.recruited ? (
            <button type="button" className="ma-btn" onClick={() => onAct("stay")}>
              Ficar aqui
            </button>
          ) : (
            <button type="button" className="ma-btn ma-btn-gold" onClick={() => onAct("follow")}>
              🛡 Seguir comigo
            </button>
          )}
          <button type="button" className="ma-btn ma-btn-dark" onClick={() => onAct("close")}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

export function PauseMenu({ onResume, onOptions, onExit }: { onResume: () => void; onOptions: () => void; onExit: () => void }) {
  return (
    <div className="ma-modal">
      <div className="ma-dialog ma-pause">
        <MineArenaLogo small />
        <button type="button" className="ma-btn ma-btn-gold" onClick={onResume}>
          ▶ Continuar
        </button>
        <button type="button" className="ma-btn" onClick={onOptions}>
          ⚙ Opções
        </button>
        <button type="button" className="ma-btn ma-btn-dark" onClick={onExit}>
          💾 Salvar e sair
        </button>
      </div>
    </div>
  );
}

export function DeathScreen({ onRespawn }: { onRespawn: () => void }) {
  return (
    <div className="ma-modal ma-death">
      <div className="ma-dialog">
        <h2>Você caiu em Canaã</h2>
        <p className="ma-dialog-line">Levante-se. A aventura continua e seus itens foram mantidos.</p>
        <button type="button" className="ma-btn ma-btn-gold" onClick={onRespawn}>
          ✦ Renascer
        </button>
      </div>
    </div>
  );
}

export function LoadingScreen() {
  return (
    <div className="ma-loading">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="ma-loading-cover" src="/minearena/capa.webp" alt="MineArena" draggable={false} />
      <p>Erguendo o mundo…</p>
      <span className="ma-loading-bar">
        <i />
      </span>
    </div>
  );
}
