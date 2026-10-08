"use client";

import Link from "next/link";
import { useState } from "react";
import type { Result } from "@/lib/bible-rush/core/engine";
import type { LevelDef, SaveData, Settings } from "@/lib/bible-rush/core/types";
import { ACHIEVEMENTS, type Achievement } from "@/lib/bible-rush/data/achievements";
import { CAMPAIGN, CHALLENGES, type ChapterInfo } from "@/lib/bible-rush/data/levels";
import { GALLERY } from "@/lib/bible-rush/data/gallery";

export type ScreenId = "menu" | "chapters" | "challenge" | "achievements" | "gallery" | "settings";

export function Back({ onClick, label = "← Voltar" }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" className="br-back" onClick={onClick}>
      {label}
    </button>
  );
}

const Stars = ({ n, big }: { n: number; big?: boolean }) => (
  <span className={`br-stars ${big ? "br-stars-big" : ""}`} aria-label={`${n} de 3 estrelas`}>
    {[0, 1, 2].map((i) => (
      <span key={i} className={i < n ? "on" : ""}>
        ★
      </span>
    ))}
  </span>
);

export function MenuScreen({ save, onContinue, onNew, go }: { save: SaveData; onContinue: () => void; onNew: () => void; go: (s: ScreenId) => void }) {
  const [confirm, setConfirm] = useState(false);
  const started = Object.keys(save.stars).length > 0 || save.tutorialDone;
  const items: { label: string; emoji: string; action: () => void; gold?: boolean; hide?: boolean }[] = [
    { label: started ? "Continuar" : "Começar", emoji: "▶", action: onContinue, gold: true },
    { label: "Nova Campanha", emoji: "✨", action: () => (started ? setConfirm(true) : onNew()) },
    { label: "Seleção de Capítulos", emoji: "📜", action: () => go("chapters") },
    { label: "Modo Desafio", emoji: "🏆", action: () => go("challenge") },
    { label: "Conquistas", emoji: "🎖️", action: () => go("achievements") },
    { label: "Galeria", emoji: "🖼️", action: () => go("gallery") },
    { label: "Configurações", emoji: "⚙️", action: () => go("settings") },
  ];
  return (
    <div className="br-menu">
      <div className="br-logo">
        <span className="br-logo-ark" aria-hidden>
          🍽️
        </span>
        <h1>BIBLE RUSH</h1>
        <p>Histórias da Bíblia à mesa, uma refeição de cada vez.</p>
      </div>
      <nav className="br-menu-list" aria-label="Menu principal">
        {items.map((it) => (
          <button key={it.label} type="button" className={`br-btn ${it.gold ? "br-btn-gold" : ""}`} onClick={it.action}>
            <span aria-hidden>{it.emoji}</span> {it.label}
          </button>
        ))}
        <Link href="/app/jogos" className="br-btn br-btn-ghost">
          ← Voltar aos jogos
        </Link>
      </nav>
      {confirm ? (
        <div className="br-overlay" role="dialog" aria-label="Nova campanha">
          <div className="br-panel">
            <h2 className="br-h2">Começar do zero?</h2>
            <p className="br-p">Isso apaga o progresso, as estrelas e as conquistas deste aparelho.</p>
            <button type="button" className="br-btn br-btn-gold" onClick={() => (setConfirm(false), onNew())}>
              Sim, nova campanha
            </button>
            <button type="button" className="br-btn" onClick={() => setConfirm(false)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ChapterSelect({ save, onPlay, onBack }: { save: SaveData; onPlay: (l: LevelDef) => void; onBack: () => void }) {
  return (
    <div className="br-screen">
      <Back onClick={onBack} />
      <h2 className="br-h2">Capítulos</h2>
      <p className="br-p">Histórias da Bíblia que acontecem à mesa. A campanha avança em ordem; os próximos capítulos chegam em breve.</p>
      <ol className="br-chapters">
        {CAMPAIGN.map((c, idx) => {
          const head = idx === 0 || CAMPAIGN[idx - 1].arc !== c.arc ? <li key={`a${c.arc}`} className="br-arc">{c.arc}</li> : null;
          const playable = !!c.level;
          const unlocked = playable && save.unlockedChapter >= c.number;
          const stars = c.level ? (save.stars[c.level.id] ?? 0) : 0;
          return (
            <span key={c.number} className="contents">
              {head}
              <li>
                <button type="button" className={`br-chap ${unlocked ? "" : "br-locked"}`} disabled={!unlocked} onClick={() => c.level && onPlay(c.level)}>
                  <span className="br-chap-n">{c.number}</span>
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block font-black leading-tight">{c.title}</span>
                    <span className="block text-xs opacity-75">{c.ref}</span>
                  </span>
                  {playable ? (
                    unlocked ? (
                      <Stars n={stars} />
                    ) : (
                      <span aria-hidden>🔒</span>
                    )
                  ) : (
                    <span className="br-soon">{save.unlockedChapter === c.number ? "Próximo · em breve" : "Em breve"}</span>
                  )}
                </button>
              </li>
            </span>
          );
        })}
      </ol>
    </div>
  );
}

export function ChallengeScreen({ save, onPlay, onBack }: { save: SaveData; onPlay: (m: "survival" | "speed" | "perfect") => void; onBack: () => void }) {
  const open = (save.stars.abraao ?? 0) >= 1;
  return (
    <div className="br-screen">
      <Back onClick={onBack} />
      <h2 className="br-h2">Modo Desafio</h2>
      {!open ? (
        <div className="br-panel">
          <p className="br-p">🔒 Complete a fase «Abraão: A Hospitalidade» para desbloquear os desafios.</p>
        </div>
      ) : (
        <ul className="br-list">
          {CHALLENGES.map((c) => (
            <li key={c.mode}>
              <button type="button" className="br-chap" onClick={() => onPlay(c.mode)}>
                <span className="br-chap-n">{c.emoji}</span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block font-black">{c.name}</span>
                  <span className="block text-xs opacity-80">{c.desc}</span>
                </span>
                <span className="text-right text-xs font-black">
                  Recorde
                  <span className="block text-lg tabular-nums">{save.challengeBest[c.mode] ?? 0}</span>
                </span>
              </button>
            </li>
          ))}
          <li>
            <div className="br-chap br-locked">
              <span className="br-chap-n">📦</span>
              <span className="min-w-0 flex-1 text-left">
                <span className="block font-black">Corrida de Recursos</span>
                <span className="block text-xs opacity-80">Complete a missão usando o mínimo de recursos.</span>
              </span>
              <span className="br-soon">Em breve</span>
            </div>
          </li>
        </ul>
      )}
    </div>
  );
}

export function AchievementsScreen({ save, onBack }: { save: SaveData; onBack: () => void }) {
  return (
    <div className="br-screen">
      <Back onClick={onBack} />
      <h2 className="br-h2">Conquistas</h2>
      <p className="br-p">
        {save.achievements.length} de {ACHIEVEMENTS.length} desbloqueadas
      </p>
      <ul className="br-list">
        {ACHIEVEMENTS.map((a) => {
          const got = save.achievements.includes(a.id);
          return (
            <li key={a.id} className={`br-ach ${got ? "got" : ""}`}>
              <span className="br-ach-ic" aria-hidden>
                {got ? a.emoji : "🔒"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-black">{a.name}</span>
                <span className="block text-xs opacity-80">{a.desc}</span>
              </span>
              <span className="text-xs font-black">{got ? "✓" : a.soon ? "Em breve" : ""}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function GalleryScreen({ save, onBack }: { save: SaveData; onBack: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const sel = GALLERY.find((g) => g.id === open);
  return (
    <div className="br-screen">
      <Back onClick={onBack} />
      <h2 className="br-h2">Galeria</h2>
      <p className="br-p">
        {GALLERY.filter((g) => save.gallery.includes(g.id)).length} de {GALLERY.length} descobertos. Atenda cada convidado para conhecê-lo.
      </p>
      <ul className="br-gal">
        {GALLERY.map((g) => {
          const got = save.gallery.includes(g.id);
          return (
            <li key={g.id}>
              <button type="button" className={`br-gal-i ${got ? "" : "br-locked"}`} disabled={!got} onClick={() => setOpen(g.id)}>
                {got ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/bible-rush/personagens/${g.id}.webp`} alt="" className="br-gal-art" draggable={false} />
                ) : (
                  <span className="text-4xl" aria-hidden>
                    ❔
                  </span>
                )}
                <span className="text-xs font-black">{got ? g.name : "???"}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {sel ? (
        <div className="br-overlay" role="dialog" aria-label={sel.name} onClick={() => setOpen(null)}>
          <div className="br-panel">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/bible-rush/personagens/${sel.id}.webp`} alt="" className="br-gal-big" draggable={false} />
            <h3 className="br-h2">{sel.name}</h3>
            <p className="br-tag">{sel.kind}</p>
            <p className="br-p">{sel.desc}</p>
            <p className="br-ref">📖 {sel.ref}</p>
            <button type="button" className="br-btn br-btn-gold" onClick={() => setOpen(null)}>
              Fechar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ToggleRow({ on, label, onToggle }: { on: boolean; label: string; onToggle: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} className="br-row" onClick={onToggle}>
      <span>{label}</span>
      <span className={`br-sw ${on ? "on" : ""}`} aria-hidden>
        <i />
      </span>
    </button>
  );
}

export function SettingsScreen({ settings, onChange, onBack }: { settings: Settings; onChange: (s: Settings) => void; onBack: () => void }) {
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => onChange({ ...settings, [k]: v });
  const toggle = (k: "music" | "sfx" | "colorblind" | "reduceMotion", label: string) => (
    <ToggleRow key={k} on={settings[k]} label={label} onToggle={() => set(k, !settings[k])} />
  );
  return (
    <div className="br-screen">
      <Back onClick={onBack} />
      <h2 className="br-h2">Configurações</h2>
      <div className="br-panel br-form">
        <label className="br-row">
          <span>Volume: {settings.volume}%</span>
          <input type="range" min={0} max={100} value={settings.volume} onChange={(e) => set("volume", Number(e.target.value))} aria-label="Volume" />
        </label>
        {toggle("music", "Música")}
        {toggle("sfx", "Efeitos sonoros")}
        <div className="br-row">
          <span>Velocidade do texto</span>
          <span className="br-seg" role="radiogroup" aria-label="Velocidade do texto">
            {(["slow", "normal", "fast"] as const).map((v) => (
              <button key={v} type="button" role="radio" aria-checked={settings.textSpeed === v} className={settings.textSpeed === v ? "on" : ""} onClick={() => set("textSpeed", v)}>
                {v === "slow" ? "Lenta" : v === "normal" ? "Normal" : "Rápida"}
              </button>
            ))}
          </span>
        </div>
        <div className="br-row">
          <span>Tamanho da interface</span>
          <span className="br-seg" role="radiogroup" aria-label="Tamanho da interface">
            {(["normal", "large"] as const).map((v) => (
              <button key={v} type="button" role="radio" aria-checked={settings.uiScale === v} className={settings.uiScale === v ? "on" : ""} onClick={() => set("uiScale", v)}>
                {v === "normal" ? "Normal" : "Grande"}
              </button>
            ))}
          </span>
        </div>
        {toggle("colorblind", "Modo daltônico (cores e símbolos mais fortes)")}
        {toggle("reduceMotion", "Reduzir animações")}
      </div>
    </div>
  );
}

export function ResultScreen({
  level,
  result,
  newAch,
  next,
  onNext,
  onRetry,
  onMenu,
}: {
  level: LevelDef;
  result: Result;
  newAch: Achievement[];
  next: ChapterInfo | null;
  onNext: () => void;
  onRetry: () => void;
  onMenu: () => void;
}) {
  const campaign = result.mode === "campaign";
  return (
    <div className="br-screen br-result">
      <h2 className="br-h2">{campaign ? (result.won ? "Missão cumprida!" : "Não foi dessa vez") : "Fim do desafio"}</h2>
      <p className="br-p">{level.title}</p>
      {campaign ? <Stars n={result.stars} big /> : null}
      <dl className="br-stats">
        <div>
          <dt>{campaign ? "Ganhos" : "Atendidos"}</dt>
          <dd>{result.score}</dd>
        </div>
        {campaign ? (
          <div>
            <dt>Meta</dt>
            <dd>{level.targetScore}</dd>
          </div>
        ) : null}
        <div>
          <dt>Satisfação</dt>
          <dd>{result.satisfaction}%</dd>
        </div>
        <div>
          <dt>Atendidos</dt>
          <dd>{result.served}</dd>
        </div>
        <div>
          <dt>Perdidos</dt>
          <dd>{result.abandoned}</dd>
        </div>
        <div>
          <dt>Pratos perdidos</dt>
          <dd>{result.waste}</dd>
        </div>
      </dl>
      {campaign && !result.won ? (
        <p className="br-tip">
          Dica: ponha vários pães e peixes para assar ao mesmo tempo, tire do fogo assim que aparecer o ✓ verde e sirva primeiro quem está com o balão mais vermelho.
        </p>
      ) : null}
      {newAch.length > 0 ? (
        <ul className="br-list">
          {newAch.map((a) => (
            <li key={a.id} className="br-ach got">
              <span className="br-ach-ic" aria-hidden>
                {a.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-black uppercase">Conquista desbloqueada</span>
                <span className="block font-black">{a.name}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {campaign && result.won ? (
        <div className="br-panel br-context">
          <p className="br-label">CONTEXTO BÍBLICO</p>
          <p className="br-ref">📖 {level.ref}</p>
          <p className="br-p">{level.context}</p>
          <p className="br-note">{level.note}</p>
        </div>
      ) : null}
      {campaign && result.won && next ? <p className="br-p">{next.level ? `🔓 Próximo capítulo: ${next.title}.` : `Próximo capítulo: ${next.title} (em breve).`}</p> : null}
      <div className="br-actions">
        {next?.level ? (
          <button type="button" className="br-btn br-btn-gold" onClick={onNext}>
            Próximo capítulo ▶
          </button>
        ) : null}
        <button type="button" className={`br-btn ${next?.level ? "" : "br-btn-gold"}`} onClick={onRetry}>
          ↻ Jogar de novo
        </button>
        <button type="button" className="br-btn" onClick={onMenu}>
          Menu
        </button>
      </div>
    </div>
  );
}
