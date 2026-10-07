"use client";

import { useEffect, useState } from "react";
import type { HudState, MineArena } from "@/lib/minearena/game";
import { ACH_BY_ID } from "@/lib/minearena/story/data/achievements";
import { BOOK_BY_ID } from "@/lib/minearena/story/data/books";
import { StoryPuzzle } from "./StoryPuzzle";
import type { StoryUi } from "@/lib/minearena/story/types";

const CPS = 55;

type Dlg = NonNullable<StoryUi["dialogue"]>;

/** Caixa de fala: o 1º toque completa o texto, o 2º avança. */
function DialogueBox({ dlg, onAdvance, onHistory, onSkip }: { dlg: Dlg; onAdvance: () => void; onHistory: () => void; onSkip: () => void }) {
  const [n, setN] = useState(0);
  const full = n >= dlg.text.length;
  useEffect(() => {
    const id = window.setInterval(() => setN((c) => Math.min(dlg.text.length, c + Math.max(1, Math.round(CPS / 30)))), 33);
    return () => window.clearInterval(id);
  }, [dlg.text]);
  const tap = () => (full ? onAdvance() : setN(dlg.text.length));
  return (
    <div className="ms-dlg-wrap" onClick={tap} role="dialog" aria-label="Diálogo" data-full={full}>
      <div className="ms-dlg">
        <p className={`ms-who ${voiceClass(dlg.who)}`}>{dlg.who}</p>
        <p className="ms-line">
          {dlg.text.slice(0, n)}
          <span className="ms-ghost">{dlg.text.slice(n)}</span>
        </p>
        {dlg.ref && full ? <p className="ms-ref">📖 {dlg.ref}</p> : null}
        <p className="ms-tap">
          {dlg.total > 1 ? `${dlg.index + 1}/${dlg.total} · ` : ""}
          {full ? "Toque para continuar" : "Toque para mostrar tudo"}
        </p>
      </div>
      <div className="ms-dlg-btns">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onHistory();
          }}
        >
          📜 Histórico
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSkip();
          }}
        >
          Pular ⏭
        </button>
      </div>
    </div>
  );
}

const voiceClass = (who: string) => (who === "Deus" ? "ms-who-god" : who === "Narrador" ? "ms-who-narr" : "");

/** Camada do Modo História sobre o jogo: objetivo, marcador, cutscenes, diálogos e telas de aprendizado. */
export function StoryOverlay({ game, ui, hud }: { game: MineArena; ui: StoryUi | null; hud: HudState }) {
  const [history, setHistory] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [help, setHelp] = useState<ReturnType<MineArena["storyHelp"]>>(null);
  const dlg = ui?.dialogue ?? null;

  // painéis abertos precisam do cursor livre (o jogo prende o mouse)
  useEffect(() => {
    game.storyHoldUi(helpOpen || history);
    return () => game.storyHoldUi(false);
  }, [helpOpen, history, game]);

  // dicas: atualiza a cada segundo enquanto o painel está aberto
  useEffect(() => {
    if (!helpOpen) return;
    const first = window.setTimeout(() => setHelp(game.storyHelp()), 0);
    const id = window.setInterval(() => setHelp(game.storyHelp()), 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [helpOpen, game]);

  // Enter / Espaço avançam a fala
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!dlg) return;
      if (e.code === "Enter" || e.code === "Space") {
        e.preventDefault();
        document.querySelector<HTMLElement>(".ms-dlg-wrap")?.click();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dlg, game]);

  if (!ui) return null;
  const st = hud.story;
  const wp = st?.wp;

  return (
    <div className="ms-root">
      {/* objetivo atual */}
      {st && !hud.cinematic && !dlg && !ui.learn && !ui.chapterEnd ? (
        <div className="ms-obj" role="status">
          <p className="ms-obj-kicker">{st.chapter.toUpperCase()}</p>
          <p className="ms-obj-title">{st.mission}</p>
          <p className="ms-obj-text">
            <span aria-hidden>🎯</span> {st.objective}
          </p>
          {st.progress ? <p className="ms-obj-prog">{st.progress}</p> : null}
          <p className="ms-obj-meta">
            {st.dist !== null ? <span>📍 {st.dist} m</span> : null}
            {st.ref ? <span>📖 {st.ref}</span> : null}
          </p>
          <p className="ms-obj-tools">
            {st.puzzle ? (
              <button type="button" className="ms-mini" onClick={() => game.storyOpenPuzzle()}>
                🧩 Abrir desafio
              </button>
            ) : null}
            <button type="button" className="ms-mini" onClick={() => setHelpOpen(true)}>
              🔍 Relíquia e dicas
            </button>
          </p>
        </div>
      ) : null}

      {/* marcador do objetivo */}
      {wp && st && !hud.cinematic && !dlg ? (
        wp.on ? (
          <div className="ms-wp" style={{ left: `${50 + wp.sx * 50}%`, top: `${50 - wp.sy * 50}%` }} aria-hidden>
            <span className="ms-wp-gem">◆</span>
            {st.dist !== null ? <span className="ms-wp-d">{st.dist} m</span> : null}
          </div>
        ) : (
          <div className="ms-wp ms-wp-edge" style={{ left: `${50 + wp.sx * 50}%`, top: `${50 - wp.sy * 50}%` }} aria-hidden>
            <span className="ms-wp-arrow" style={{ transform: `rotate(${wp.angle}deg)` }}>
              ➤
            </span>
            {st.dist !== null ? <span className="ms-wp-d">{st.dist} m</span> : null}
          </div>
        )
      ) : null}

      {/* barras de cinema */}
      <div className="ms-bar ms-bar-top" data-on={ui.bars} aria-hidden />
      <div className="ms-bar ms-bar-bottom" data-on={ui.bars} aria-hidden />

      {/* legenda central */}
      {ui.caption ? (
        <div className="ms-caption" role="status">
          <p>{ui.caption.text}</p>
          {ui.caption.sub ? <small>{ui.caption.sub}</small> : null}
        </div>
      ) : null}

      {/* fade */}
      {ui.fade > 0.01 ? (
        <div className="ms-fade" style={{ opacity: ui.fade }} aria-hidden>
          {ui.fadeText ? <p>{ui.fadeText}</p> : null}
        </div>
      ) : null}

      {/* diálogo */}
      {dlg && !ui.learn && !ui.chapterEnd ? <DialogueBox key={`${dlg.who}:${dlg.text}`} dlg={dlg} onAdvance={() => game.storyAdvance()} onHistory={() => setHistory(true)} onSkip={() => game.storySkip()} /> : null}
      {ui.cinematic && !dlg ? (
        <button type="button" className="ms-skip" onClick={() => game.storySkip()}>
          Pular cena ⏭
        </button>
      ) : null}

      {/* desafio do capítulo */}
      {ui.puzzle && !dlg ? <StoryPuzzle key={ui.puzzle.id} def={ui.puzzle} onSolve={() => game.storyPuzzleSolved()} onSkip={() => game.storyPuzzleSkip()} onClose={() => game.storyPuzzleClose()} /> : null}

      {/* relíquia achada */}
      {ui.relic ? (
        <div className="ms-modal ms-learn" role="dialog" aria-label="Relíquia encontrada">
          <div className="ms-panel">
            <p className="ms-learn-k">RELÍQUIA ENCONTRADA</p>
            <p className="ms-relic-emoji" aria-hidden>
              {ui.relic.emoji}
            </p>
            <h2>{ui.relic.name}</h2>
            <p>{ui.relic.desc}</p>
            <p className="ms-note">Ela foi guardada na sua coleção de relíquias, no menu da campanha.</p>
            <button type="button" className="ms-btn ms-btn-gold" onClick={() => game.storyDismissRelic()}>
              {ui.relic.hunt ? "VOLTAR AO MENU" : "CONTINUAR"}
            </button>
          </div>
        </div>
      ) : null}

      {/* dicas da relíquia e do desafio */}
      {helpOpen && !ui.puzzle && !ui.relic ? (
        <div className="ms-modal" role="dialog" aria-label="Relíquia e dicas" onClick={() => setHelpOpen(false)}>
          <div className="ms-panel" onClick={(e) => e.stopPropagation()}>
            <h3>🔍 Relíquia e dicas</h3>
            {help && help.has ? (
              <>
                <h4>Relíquia escondida</h4>
                {help.found ? (
                  <p>✅ Você já achou a relíquia deste capítulo.</p>
                ) : (
                  <>
                    <p>Há uma relíquia enterrada neste capítulo. Quando você chegar perto, o chão brilha de leve: cave ali com as mãos (ou uma pá).</p>
                    <ul className="ms-pz-hints">
                      {help.hints.map((h, i) => (
                        <li key={i}>💡 {h}</li>
                      ))}
                    </ul>
                    {help.nextIn !== null ? (
                      <p className="ms-note">
                        Próxima dica em {Math.floor(help.nextIn / 60)}:{String(help.nextIn % 60).padStart(2, "0")} de jogo.
                      </p>
                    ) : null}
                  </>
                )}
              </>
            ) : null}
            {help && help.puzzle !== "none" && !help.hunt ? (
              <>
                <h4>Desafio do capítulo</h4>
                <p>{help.puzzle === "solved" ? "✅ Resolvido." : help.puzzle === "skipped" ? "Você seguiu sem resolver." : "🧩 Ainda não resolvido: ele aparece mais adiante na história."}</p>
              </>
            ) : null}
            <button type="button" className="ms-btn" onClick={() => setHelpOpen(false)}>
              Fechar
            </button>
          </div>
        </div>
      ) : null}

      {/* histórico de falas */}
      {history ? (
        <div className="ms-modal" role="dialog" aria-label="Histórico" onClick={() => setHistory(false)}>
          <div className="ms-panel ms-panel-wide" onClick={(e) => e.stopPropagation()}>
            <h3>Histórico de falas</h3>
            <ul className="ms-hist">
              {ui.history.length === 0 ? <li>Nada por aqui ainda.</li> : null}
              {ui.history.map((h, i) => (
                <li key={i}>
                  <b className={voiceClass(h.who)}>{h.who}:</b> {h.text}
                </li>
              ))}
            </ul>
            <button type="button" className="ms-btn" onClick={() => setHistory(false)}>
              Fechar
            </button>
          </div>
        </div>
      ) : null}

      {/* VOCÊ APRENDEU */}
      {ui.learn ? (
        <div className="ms-modal ms-learn" role="dialog" aria-label="Você aprendeu">
          <div className="ms-panel ms-panel-wide">
            <p className="ms-learn-k">VOCÊ APRENDEU</p>
            <h2>{ui.learn.title}</h2>
            <h4>O que aconteceu?</h4>
            <p>{ui.learn.what}</p>
            <h4>Onde está na Bíblia?</h4>
            <p className="ms-learn-ref">
              📖 {ui.learn.ref.startsWith(ui.learn.book) ? ui.learn.ref : `${ui.learn.book} · ${ui.learn.ref}`}
            </p>
            <h4>Personagens</h4>
            <p>{ui.learn.characters.join(" · ")}</p>
            <h4>Conceitos</h4>
            <p>
              {ui.learn.concepts.map((c) => (
                <span key={c} className="ms-chip">
                  {c}
                </span>
              ))}
            </p>
            {ui.learn.gameNote ? (
              <p className="ms-note">
                <b>Elemento do jogo:</b> {ui.learn.gameNote}
              </p>
            ) : null}
            <p className="ms-note">Os diálogos são adaptações. Para ler o texto completo, abra a sua Bíblia em {ui.learn.ref}.</p>
            <button type="button" className="ms-btn ms-btn-gold" onClick={() => game.storyDismissLearn()}>
              CONTINUAR
            </button>
          </div>
        </div>
      ) : null}

      {/* fim do capítulo */}
      {ui.chapterEnd && !ui.learn ? (
        <div className="ms-modal ms-learn" role="dialog" aria-label="Capítulo concluído">
          <div className="ms-panel">
            <p className="ms-learn-k">CAPÍTULO CONCLUÍDO</p>
            <h2>{ui.chapterEnd.title}</h2>
            {ui.chapterEnd.unlockedBooks.length > 0 ? (
              <>
                <h4>Livros desbloqueados na biblioteca</h4>
                <p>
                  {ui.chapterEnd.unlockedBooks.map((b) => (
                    <span key={b} className="ms-chip">
                      📖 {BOOK_BY_ID.get(b)?.name ?? b}
                    </span>
                  ))}
                </p>
              </>
            ) : null}
            {ui.chapterEnd.achievement ? (
              <>
                <h4>Conquista</h4>
                <p>
                  🏅 {ACH_BY_ID.get(ui.chapterEnd.achievement)?.name ?? ui.chapterEnd.achievement}
                </p>
              </>
            ) : null}
            <h4>Desafio e relíquia</h4>
            <p>{ui.chapterEnd.puzzle ? "🧩 Desafio resolvido." : "🧩 Desafio não resolvido (você pode tentar de novo ao jogar o capítulo outra vez)."}</p>
            {ui.chapterEnd.relic !== "none" ? (
              <p>{ui.chapterEnd.relic === "found" ? "🏺 Relíquia encontrada." : "🏺 Relíquia ainda escondida: procure por ela no menu da campanha, em Capítulos."}</p>
            ) : null}
            <button type="button" className="ms-btn ms-btn-gold" onClick={() => game.storyContinue()}>
              CONTINUAR
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
