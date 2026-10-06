"use client";

import Link from "next/link";
import { useState } from "react";
import type { WorldSave } from "@/lib/minearena/save/save";

function ago(ts: number): string {
  const m = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (m < 1) return "agora há pouco";
  if (m < 60) return `há ${m} min`;
  if (m < 1440) return `há ${Math.round(m / 60)} h`;
  return `há ${Math.round(m / 1440)} d`;
}

export function MineArenaLogo({ small }: { small?: boolean }) {
  return (
    <div className={small ? "ma-logo ma-logo-sm" : "ma-logo"}>
      <h1>
        MINE<span>ARENA</span>
      </h1>
      <p>Construa. Explore. Enfrente.</p>
    </div>
  );
}

export function MainMenu({
  worlds,
  onPlay,
  onCreate,
  onDelete,
  onOptions,
}: {
  worlds: WorldSave[] | null;
  onPlay: (w: WorldSave) => void;
  onCreate: (name: string, seed: string) => void;
  onDelete: (w: WorldSave) => void;
  onOptions: () => void;
}) {
  const [view, setView] = useState<"home" | "new" | "load">("home");
  const [name, setName] = useState("Meu mundo");
  const [seed, setSeed] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);
  const latest = worlds?.[0];

  return (
    <div className="ma-menu">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="ma-menu-cover" src="/minearena/capa.webp" alt="MineArena: construa, explore, enfrente" draggable={false} />
      <div className="ma-menu-body">

        {view === "home" ? (
          <div className="ma-menu-btns">
            {latest ? (
              <button type="button" className="ma-btn ma-btn-gold" onClick={() => onPlay(latest)}>
                ▶ Continuar
                <small>
                  {latest.name} · {ago(latest.updatedAt)}
                </small>
              </button>
            ) : null}
            <button type="button" className="ma-btn" onClick={() => setView("new")}>
              ✦ Novo mundo
            </button>
            {worlds && worlds.length > 0 ? (
              <button type="button" className="ma-btn" onClick={() => setView("load")}>
                📜 Carregar mundo ({worlds.length})
              </button>
            ) : null}
            <button type="button" className="ma-btn" onClick={onOptions}>
              ⚙ Opções
            </button>
            <Link href="/app/jogos" className="ma-btn ma-btn-dark">
              ← Sala de Jogos
            </Link>
          </div>
        ) : null}

        {view === "new" ? (
          <form
            className="ma-form"
            onSubmit={(e) => {
              e.preventDefault();
              onCreate(name.trim() || "Meu mundo", seed.trim());
            }}
          >
            <label>
              Nome do mundo
              <input value={name} maxLength={28} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              Seed (opcional — a mesma seed gera o mesmo mundo)
              <input value={seed} maxLength={24} placeholder="deixe vazio pra sortear" onChange={(e) => setSeed(e.target.value)} />
            </label>
            <button type="submit" className="ma-btn ma-btn-gold">
              ▶ Criar e jogar
            </button>
            <button type="button" className="ma-btn ma-btn-dark" onClick={() => setView("home")}>
              Voltar
            </button>
          </form>
        ) : null}

        {view === "load" ? (
          <div className="ma-load">
            <ul>
              {(worlds ?? []).map((w) => (
                <li key={w.id}>
                  <button type="button" className="ma-world" onClick={() => onPlay(w)}>
                    <b>{w.name}</b>
                    <small>
                      seed {w.seed} · {Math.round(w.playedSeconds / 60)} min jogados · {ago(w.updatedAt)}
                    </small>
                  </button>
                  {confirm === w.id ? (
                    <button
                      type="button"
                      className="ma-del ma-del-yes"
                      onClick={() => {
                        onDelete(w);
                        setConfirm(null);
                      }}
                    >
                      Apagar?
                    </button>
                  ) : (
                    <button type="button" className="ma-del" aria-label={`Excluir ${w.name}`} onClick={() => setConfirm(w.id)}>
                      🗑
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <button type="button" className="ma-btn ma-btn-dark" onClick={() => setView("home")}>
              Voltar
            </button>
          </div>
        ) : null}

        <p className="ma-menu-hint">No computador: WASD, mouse, E (mochila). No celular: manche e botões na tela. Seu progresso fica salvo neste aparelho.</p>
      </div>
    </div>
  );
}
