"use client";

import { useMemo, useState } from "react";
import { BOOKS, KIND_LABEL } from "@/lib/minearena/story/data/books";
import { CHAPTERS } from "@/lib/minearena/story/data/chapters";
import { STORY_ACHIEVEMENTS } from "@/lib/minearena/story/data/achievements";
import { CAMPAIGNS, campaignOpen } from "@/lib/minearena/story/campaigns";
import { RELICS } from "@/lib/minearena/story/data/relics";
import { PUZZLES } from "@/lib/minearena/story/data/puzzles";
import type { ChapterDef, StoryProgress } from "@/lib/minearena/story/types";

type View = "home" | "chapters" | "library" | "progress" | "achievements" | "relics";

const statusOf = (c: ChapterDef, p: StoryProgress): "done" | "open" | "locked" | "soon" => {
  if (p.completed.includes(c.id)) return "done";
  const prevDone = c.number === 1 || p.completed.includes(CHAPTERS[c.number - 2].id);
  if (!prevDone) return "locked";
  return c.built ? "open" : "soon";
};

const dateLabel = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", timeZone: "America/Sao_Paulo" });

/** Menu do Modo História: capítulos, progresso, biblioteca e conquistas. */
export function StoryMenu({ progress, hasSave, onPlay, onBack }: { progress: StoryProgress; hasSave: (chapterId: string) => boolean; onPlay: (chapterId: string, fresh: boolean, hunt?: boolean) => void; onBack: () => void }) {
  const [view, setView] = useState<View>("home");
  const [pick, setPick] = useState<ChapterDef | null>(null);

  const total = CHAPTERS.length;
  const pct = Math.round((progress.completed.length / total) * 100);
  const current = useMemo(() => CHAPTERS.find((c) => statusOf(c, progress) === "open") ?? null, [progress]);
  const main = CHAPTERS.find((c) => hasSave(c.id)) ?? current;
  const nextSoon = useMemo(() => CHAPTERS.find((c) => statusOf(c, progress) === "soon") ?? null, [progress]);
  const nt = CAMPAIGNS.find((c) => c.id === "nt")!;

  const back = () => (view === "home" ? onBack() : setView("home"));

  const startOrAsk = (c: ChapterDef) => {
    const st = statusOf(c, progress);
    if (st === "locked" || st === "soon") return;
    if (st === "done" || hasSave(c.id)) setPick(c);
    else onPlay(c.id, true);
  };

  return (
    <div className="ms-menu">
      <button type="button" className="ms-back" onClick={back}>
        ← {view === "home" ? "Sair" : "Voltar"}
      </button>

      {view === "home" ? (
        <>
          <header className="ms-title">
            <p>MINEARENA</p>
            <h1>O ANTIGO TESTAMENTO</h1>
            <div className="ms-pbar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso da campanha">
              <i style={{ width: `${pct}%` }} />
              <span>
                {pct}% · {progress.completed.length} de {total} capítulos
              </span>
            </div>
            <p className="ms-sub">
              {progress.books.length} {progress.books.length === 1 ? "livro descoberto" : "livros descobertos"} · {progress.completed.length} {progress.completed.length === 1 ? "história concluída" : "histórias concluídas"}
            </p>
          </header>
          <nav className="ms-list" aria-label="Modo História">
            {main ? (
              <button type="button" className="ms-btn ms-btn-gold" onClick={() => startOrAsk(main)}>
                ▶ {hasSave(main.id) ? "Continuar" : "Jogar"}: Capítulo {String(main.number).padStart(2, "0")} · {main.title}
              </button>
            ) : (
              <p className="ms-note ms-soon-note">
                {nextSoon ? `O próximo capítulo, «${nextSoon.title}», chega em breve. A campanha jogável vai até o capítulo ${nextSoon.number - 1}.` : "Campanha concluída!"}
              </p>
            )}
            <button type="button" className="ms-btn" onClick={() => setView("chapters")}>
              📜 Capítulos
            </button>
            <button type="button" className="ms-btn" onClick={() => setView("progress")}>
              📊 Progresso da campanha
            </button>
            <button type="button" className="ms-btn" onClick={() => setView("library")}>
              📚 Biblioteca ({progress.books.length}/{BOOKS.length})
            </button>
            <button type="button" className="ms-btn" onClick={() => setView("relics")}>
              🏺 Relíquias ({progress.relics.length}/{Object.keys(RELICS).length}) · Desafios ({progress.puzzles.length}/{Object.keys(PUZZLES).length})
            </button>
            <button type="button" className="ms-btn" onClick={() => setView("achievements")}>
              🏅 Conquistas ({progress.achievements.length}/{STORY_ACHIEVEMENTS.length})
            </button>
          </nav>
          <aside className="ms-nt" aria-label="Novo Testamento">
            <p className="ms-nt-k">🔒 {nt.title}</p>
            <p className="ms-nt-d">{campaignOpen(nt) ? "Disponível!" : nt.releaseAt ? `Abre em ${dateLabel(nt.releaseAt)}` : "Em breve"}</p>
          </aside>
        </>
      ) : null}

      {view === "chapters" ? (
        <>
          <h2 className="ms-h2">Capítulos</h2>
          <p className="ms-sub">Os concluídos podem ser jogados de novo. Os próximos se abrem conforme você avança.</p>
          <ol className="ms-chapters">
            {CHAPTERS.map((c) => {
              const st = statusOf(c, progress);
              return (
                <li key={c.id}>
                  <button type="button" className={`ms-chap ms-chap-${st}`} disabled={st === "locked" || st === "soon"} onClick={() => startOrAsk(c)}>
                    <span className="ms-chap-n">CAPÍTULO {String(c.number).padStart(2, "0")}</span>
                    <span className="ms-chap-t">{c.title}</span>
                    <span className="ms-chap-s">{c.subtitle}</span>
                    <span className="ms-chap-st">
                      {st === "done" ? "✓ CONCLUÍDO" : st === "open" ? "▶ DISPONÍVEL" : st === "soon" ? "EM BREVE" : "🔒 BLOQUEADO"}
                      {PUZZLES[c.id] ? (progress.puzzles.includes(c.id) ? " · 🧩" : "") : ""}
                      {RELICS[c.id] ? (progress.relics.includes(c.id) ? ` · ${RELICS[c.id].emoji}` : st === "done" ? " · 🏺?" : "") : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </>
      ) : null}

      {view === "relics" ? <RelicsView progress={progress} /> : null}
      {view === "progress" ? <ProgressView progress={progress} /> : null}
      {view === "library" ? <LibraryView progress={progress} /> : null}

      {view === "achievements" ? (
        <>
          <h2 className="ms-h2">Conquistas</h2>
          <ul className="ms-list">
            {STORY_ACHIEVEMENTS.map((a) => {
              const got = progress.achievements.includes(a.id);
              return (
                <li key={a.id} className={`ms-ach ${got ? "got" : ""}`}>
                  <span aria-hidden>{got ? a.emoji : "🔒"}</span>
                  <span>
                    <b>{a.name}</b>
                    <small>{a.desc}</small>
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}

      {pick ? (
        <div className="ms-modal" role="dialog" aria-label={pick.title} onClick={() => setPick(null)}>
          <div className="ms-panel" onClick={(e) => e.stopPropagation()}>
            <h3>
              Capítulo {pick.number}: {pick.title}
            </h3>
            {hasSave(pick.id) ? (
              <button type="button" className="ms-btn ms-btn-gold" onClick={() => onPlay(pick.id, false)}>
                ▶ Continuar de onde parou
              </button>
            ) : null}
            <button type="button" className="ms-btn" onClick={() => onPlay(pick.id, true)}>
              ↻ {progress.completed.includes(pick.id) ? "Jogar de novo" : "Começar do início"}
            </button>
            {progress.completed.includes(pick.id) && RELICS[pick.id] && !progress.relics.includes(pick.id) ? (
              <button type="button" className="ms-btn" onClick={() => onPlay(pick.id, true, true)}>
                🔍 Procurar a relíquia escondida
              </button>
            ) : null}
            <button type="button" className="ms-btn ms-btn-ghost" onClick={() => setPick(null)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ProgressView({ progress }: { progress: StoryProgress }) {
  // percentual por livro: capítulos concluídos / capítulos do livro
  const rows = useMemo(() => {
    const map = new Map<string, { total: number; done: number }>();
    for (const c of CHAPTERS) {
      for (const name of c.book.split(",").map((s) => s.trim().toUpperCase())) {
        const r = map.get(name) ?? { total: 0, done: 0 };
        r.total++;
        if (progress.completed.includes(c.id)) r.done++;
        map.set(name, r);
      }
    }
    return [...map.entries()];
  }, [progress]);
  return (
    <>
      <h2 className="ms-h2">Progresso da campanha</h2>
      <ul className="ms-list">
        {rows.map(([name, r]) => {
          const p = Math.round((r.done / r.total) * 100);
          return (
            <li key={name} className="ms-prog">
              <span>{name}</span>
              <span className="ms-pbar ms-pbar-sm">
                <i style={{ width: `${p}%` }} />
                <span>{p}%</span>
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function LibraryView({ progress }: { progress: StoryProgress }) {
  const [open, setOpen] = useState<string | null>(null);
  const book = BOOKS.find((b) => b.id === open);
  const kinds = ["narrativo", "poetico", "profeta_maior", "profeta_menor"] as const;
  return (
    <>
      <h2 className="ms-h2">Biblioteca</h2>
      <p className="ms-sub">Os livros aparecem conforme as histórias que você vive. Poéticos e proféticos se abrem junto do contexto deles.</p>
      {kinds.map((k) => (
        <section key={k}>
          <h3 className="ms-h3">{KIND_LABEL[k]}</h3>
          <ul className="ms-books">
            {BOOKS.filter((b) => b.kind === k).map((b) => {
              const got = progress.books.includes(b.id);
              return (
                <li key={b.id}>
                  <button type="button" className={`ms-book ${got ? "got" : ""}`} disabled={!got} onClick={() => setOpen(b.id)}>
                    {got ? "📖" : "🔒"} {got ? b.name : "???"}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {book ? (
        <div className="ms-modal" role="dialog" aria-label={book.name} onClick={() => setOpen(null)}>
          <div className="ms-panel" onClick={(e) => e.stopPropagation()}>
            <h3>{book.name}</h3>
            <p className="ms-chip">{KIND_LABEL[book.kind]}</p>
            <p>{book.summary}</p>
            <button type="button" className="ms-btn" onClick={() => setOpen(null)}>
              Fechar
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function RelicsView({ progress }: { progress: StoryProgress }) {
  return (
    <>
      <h2 className="ms-h2">Relíquias</h2>
      <p className="ms-sub">Cada capítulo esconde uma relíquia enterrada no mapa. Cave onde o chão brilhar de leve.</p>
      <ul className="ms-list">
        {CHAPTERS.filter((c) => RELICS[c.id]).map((c) => {
          const r = RELICS[c.id];
          const got = progress.relics.includes(c.id);
          return (
            <li key={c.id} className={`ms-ach ${got ? "got" : ""}`}>
              <span aria-hidden>{got ? r.emoji : "❔"}</span>
              <span>
                <b>{got ? r.name : `Relíquia de «${c.title}»`}</b>
                <small>{got ? r.desc : c.built ? "Ainda escondida." : "Em breve."}</small>
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}
