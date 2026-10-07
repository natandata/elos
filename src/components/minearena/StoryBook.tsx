"use client";

import { useMemo, useState } from "react";
import { CHAPTERS } from "@/lib/minearena/story/data/chapters";
import { LEARN } from "@/lib/minearena/story/data/learn";
import { PUZZLES } from "@/lib/minearena/story/data/puzzles";
import { RELICS, relicBearing } from "@/lib/minearena/story/data/relics";
import { STORY_MAPS } from "@/lib/minearena/story/maps";
import type { ChapterDef, StoryProgress } from "@/lib/minearena/story/types";

/** As pistas da relíquia de um capítulo: as duas escritas à mão e a terceira, calculada (direção e distância). */
function relicHints(c: ChapterDef): string[] {
  const r = RELICS[c.id];
  if (!r) return [];
  const zone = c.map ? STORY_MAPS[c.map]?.zones[r.near.zone] : undefined;
  return [r.hints[0], r.hints[1], zone ? relicBearing(r, zone) : "Procure no mapa, com atenção ao brilho no chão."];
}

/**
 * O Livro da História: uma página por capítulo, escrita conforme o jogador conclui a campanha.
 * Cada página conta o que aconteceu e guarda as pistas da relíquia (ou a relíquia, se já foi achada).
 */
export function StoryBook({ progress, onHunt }: { progress: StoryProgress; onHunt: (chapterId: string) => void }) {
  const done = (c: ChapterDef) => progress.completed.includes(c.id);
  const written = useMemo(() => CHAPTERS.filter((c) => progress.completed.includes(c.id)), [progress.completed]);
  // abre na última página já escrita (ou na primeira, se o livro ainda está em branco)
  const [page, setPage] = useState(() => Math.max(0, (written[written.length - 1]?.number ?? 1) - 1));
  const [index, setIndex] = useState(false);
  const c = CHAPTERS[page];
  const learn = LEARN[c.id];
  const relic = RELICS[c.id];
  const hasPz = !!PUZZLES[c.id];
  const got = progress.relics.includes(c.id);
  const open = done(c);
  const prevPeriod = page > 0 ? CHAPTERS[page - 1].period : null;
  const periods = [...new Set(CHAPTERS.map((x) => x.period))];

  const go = (n: number) => {
    setPage(Math.min(CHAPTERS.length - 1, Math.max(0, n)));
    setIndex(false);
  };

  return (
    <>
      <h2 className="ms-h2">📖 Livro da História</h2>
      <p className="ms-sub">
        {written.length === 0 ? "O livro está em branco. Cada capítulo concluído escreve uma página nele." : `${written.length} de ${CHAPTERS.length} páginas escritas.`}
      </p>

      <div className="ms-bk-bar">
        <button type="button" className="ms-bk-nav" onClick={() => go(page - 1)} disabled={page === 0} aria-label="Página anterior">
          ◀
        </button>
        <button type="button" className="ms-bk-idx" onClick={() => setIndex((v) => !v)} aria-expanded={index}>
          📑 Índice
        </button>
        <button type="button" className="ms-bk-nav" onClick={() => go(page + 1)} disabled={page === CHAPTERS.length - 1} aria-label="Próxima página">
          ▶
        </button>
      </div>

      {index ? (
        <div className="ms-bk-index">
          {periods.map((p) => (
            <section key={p}>
              <h3>{p}</h3>
              <ul>
                {CHAPTERS.filter((x) => x.period === p).map((x) => (
                  <li key={x.id}>
                    <button type="button" data-on={x.id === c.id} data-done={done(x)} onClick={() => go(x.number - 1)}>
                      <b>{String(x.number).padStart(2, "0")}</b> {done(x) ? x.title : "· · ·"}
                      {done(x) && RELICS[x.id] ? <i aria-hidden>{progress.relics.includes(x.id) ? RELICS[x.id].emoji : "🏺"}</i> : null}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <article className="ms-bk-page" aria-label={`Página do capítulo ${c.number}`}>
          {prevPeriod !== c.period ? <p className="ms-bk-period">✦ {c.period.toUpperCase()} ✦</p> : null}
          <p className="ms-bk-k">CAPÍTULO {String(c.number).padStart(2, "0")}</p>
          {open ? (
            <>
              <h3 className="ms-bk-title">{c.title}</h3>
              <p className="ms-bk-sub">{c.subtitle}</p>
              <p className="ms-bk-ref">📖 {c.ref}</p>

              {learn ? (
                <>
                  <p className="ms-bk-text">{learn.what}</p>
                  {learn.characters.length > 0 ? (
                    <p className="ms-bk-meta">
                      <b>Personagens:</b> {learn.characters.join(" · ")}
                    </p>
                  ) : null}
                  {learn.concepts.length > 0 ? (
                    <p className="ms-bk-meta">
                      <b>Para lembrar:</b> {learn.concepts.join(" · ")}
                    </p>
                  ) : null}
                  {learn.gameNote ? <p className="ms-bk-note">🎮 {learn.gameNote}</p> : null}
                </>
              ) : null}

              {hasPz ? <p className="ms-bk-meta">🧩 Desafio do capítulo: {progress.puzzles.includes(c.id) ? "resolvido ✓" : "ainda não resolvido"}</p> : null}

              {relic ? (
                got ? (
                  <section className="ms-bk-relic ms-bk-relic-got">
                    <h4>
                      {relic.emoji} Relíquia encontrada: {relic.name}
                    </h4>
                    <p>{relic.desc}</p>
                  </section>
                ) : (
                  <section className="ms-bk-relic">
                    <h4>🏺 Uma relíquia ficou escondida neste capítulo</h4>
                    <p>Ainda não foi achada. Cave onde o chão brilhar de leve. Estas são as pistas, da mais vaga à mais clara:</p>
                    <ol>
                      {relicHints(c).map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ol>
                    <button type="button" className="ms-btn ms-btn-gold" onClick={() => onHunt(c.id)}>
                      🔍 Ir procurar a relíquia
                    </button>
                  </section>
                )
              ) : null}
            </>
          ) : (
            <>
              <h3 className="ms-bk-title ms-bk-blank">· · ·</h3>
              <p className="ms-bk-blank-text">Esta página ainda está em branco. Ela será escrita quando você concluir este capítulo.</p>
            </>
          )}
        </article>
      )}
    </>
  );
}
