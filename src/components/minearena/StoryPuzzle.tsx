"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { checkAnswer, checkLock, checkOrder, checkSimon, quizScore, shuffled } from "@/lib/minearena/story/puzzle";
import type { PuzzleDef } from "@/lib/minearena/story/types";

type Props = { def: PuzzleDef; onSolve: () => void; onSkip: () => void; onClose: () => void };

/** Desafio do capítulo: ordenar, ligar pares, perguntas, resposta escrita, cadeado ou sequência de sons. */
export function StoryPuzzle({ def, onSolve, onSkip, onClose }: Props) {
  const [attempts, setAttempts] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const solvedRef = useRef(false);

  const fail = (text: string) => {
    setAttempts((a) => a + 1);
    setMsg(text);
  };
  const win = () => {
    if (solvedRef.current) return;
    solvedRef.current = true;
    setMsg("Isso! Desafio resolvido.");
    window.setTimeout(onSolve, 700);
  };

  // dicas: aparecem depois de erros
  const shown = attempts >= 5 ? 3 : attempts >= 3 ? 2 : attempts >= 1 ? 1 : 0;

  return (
    <div className="ms-modal ms-learn" role="dialog" aria-label={def.title}>
      <div className="ms-panel ms-panel-wide ms-pz">
        <p className="ms-learn-k">🧩 DESAFIO</p>
        <h2>{def.title}</h2>
        <p>{def.intro}</p>
        <p className="ms-learn-ref">📖 Consulte a sua Bíblia: {def.refs.join(" · ")}</p>

        <div className="ms-pz-body">
          {def.kind === "order" ? <OrderGame def={def} onWin={win} onFail={fail} /> : null}
          {def.kind === "match" ? <MatchGame def={def} onWin={win} onFail={fail} /> : null}
          {def.kind === "quiz" ? <QuizGame def={def} onWin={win} onFail={fail} /> : null}
          {def.kind === "answer" ? <AnswerGame def={def} onWin={win} onFail={fail} /> : null}
          {def.kind === "lock" ? <LockGame def={def} onWin={win} onFail={fail} /> : null}
          {def.kind === "simon" ? <SimonGame def={def} onWin={win} onFail={fail} /> : null}
        </div>

        {msg ? (
          <p className="ms-pz-msg" role="status">
            {msg}
          </p>
        ) : null}
        {shown > 0 ? (
          <ul className="ms-pz-hints">
            {def.hints.slice(0, shown).map((h, i) => (
              <li key={i}>💡 {h}</li>
            ))}
          </ul>
        ) : null}
        {attempts >= 6 ? (
          <p className="ms-note">Está difícil? Respire, leia a passagem indicada e tente de novo. Se preferir, você pode seguir adiante (o desafio fica sem a marca de resolvido).</p>
        ) : null}

        <div className="ms-pz-actions">
          <button type="button" className="ms-btn ms-btn-ghost" onClick={onClose}>
            Fechar e explorar
          </button>
          {attempts >= 6 ? (
            <button type="button" className="ms-btn ms-btn-ghost" onClick={onSkip}>
              Seguir sem resolver
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

type GameProps<K extends PuzzleDef["kind"]> = { def: Extract<PuzzleDef, { kind: K }>; onWin: () => void; onFail: (text: string) => void };

function OrderGame({ def, onWin, onFail }: GameProps<"order">) {
  const order = useMemo(() => shuffled(def.items.map((_, i) => i)), [def]);
  const [chosen, setChosen] = useState<number[]>([]);
  const left = order.filter((i) => !chosen.includes(i));
  const check = () => {
    if (checkOrder(def, chosen)) onWin();
    else {
      onFail("Essa ordem não está certa. Tente de novo.");
      setChosen([]);
    }
  };
  return (
    <div>
      <p className="ms-pz-label">Sua ordem ({chosen.length}/{def.items.length}):</p>
      <ol className="ms-pz-chosen">
        {chosen.map((i, k) => (
          <li key={i}>
            <button type="button" className="ms-pz-item ms-pz-on" onClick={() => setChosen((c) => c.slice(0, k))} title="Toque para tirar este e os seguintes">
              {def.items[i]}
            </button>
          </li>
        ))}
      </ol>
      <p className="ms-pz-label">Toque nas opções, na ordem certa:</p>
      <div className="ms-pz-grid">
        {left.map((i) => (
          <button key={i} type="button" className="ms-pz-item" onClick={() => setChosen((c) => [...c, i])}>
            {def.items[i]}
          </button>
        ))}
      </div>
      <div className="ms-pz-actions">
        <button type="button" className="ms-btn" disabled={chosen.length === 0} onClick={() => setChosen((c) => c.slice(0, -1))}>
          ↶ Desfazer
        </button>
        <button type="button" className="ms-btn ms-btn-gold" disabled={chosen.length !== def.items.length} onClick={check}>
          Conferir
        </button>
      </div>
    </div>
  );
}

function MatchGame({ def, onWin, onFail }: GameProps<"match">) {
  const rights = useMemo(() => shuffled(def.pairs.map((_, i) => i)), [def]);
  const [sel, setSel] = useState<number | null>(null);
  const [done, setDone] = useState<number[]>([]);
  const pick = (r: number) => {
    if (sel === null) return;
    if (sel === r) {
      const next = [...done, r];
      setDone(next);
      setSel(null);
      if (next.length === def.pairs.length) onWin();
    } else {
      onFail("Esse par não combina. Tente de novo.");
      setSel(null);
    }
  };
  return (
    <div className="ms-pz-match">
      <div>
        {def.pairs.map((p, i) => (
          <button key={i} type="button" className={`ms-pz-item ${done.includes(i) ? "ms-pz-ok" : sel === i ? "ms-pz-on" : ""}`} disabled={done.includes(i)} onClick={() => setSel(i)}>
            {p[0]}
          </button>
        ))}
      </div>
      <div>
        {rights.map((r) => (
          <button key={r} type="button" className={`ms-pz-item ${done.includes(r) ? "ms-pz-ok" : ""}`} disabled={done.includes(r) || sel === null} onClick={() => pick(r)}>
            {def.pairs[r][1]}
          </button>
        ))}
      </div>
    </div>
  );
}

function QuizGame({ def, onWin, onFail }: GameProps<"quiz">) {
  const orders = useMemo(() => def.questions.map((q) => shuffled(q.options.map((_, i) => i))), [def]);
  const [qi, setQi] = useState(0);
  const [picks, setPicks] = useState<(number | null)[]>(() => def.questions.map(() => null));
  const q = def.questions[qi];
  const answer = (opt: number) => {
    const next = picks.map((p, i) => (i === qi ? opt : p));
    setPicks(next);
    if (qi + 1 < def.questions.length) {
      setQi(qi + 1);
      return;
    }
    const n = quizScore(def, next);
    if (n >= def.need) onWin();
    else {
      onFail(`Você acertou ${n} de ${def.questions.length}; precisa de ${def.need}. Consulte a Bíblia e tente de novo.`);
      setQi(0);
      setPicks(def.questions.map(() => null));
    }
  };
  return (
    <div>
      <p className="ms-pz-label">
        Pergunta {qi + 1} de {def.questions.length}
      </p>
      <p className="ms-pz-q">{q.q}</p>
      <div className="ms-pz-grid">
        {orders[qi].map((i) => (
          <button key={i} type="button" className="ms-pz-item" onClick={() => answer(i)}>
            {q.options[i]}
          </button>
        ))}
      </div>
    </div>
  );
}

function AnswerGame({ def, onWin, onFail }: GameProps<"answer">) {
  const [v, setV] = useState("");
  const go = () => (checkAnswer(def, v) ? onWin() : onFail("Não é essa. Releia a passagem indicada."));
  return (
    <div>
      <p className="ms-pz-q">{def.question}</p>
      <input
        className="ms-pz-input"
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") go();
        }}
        placeholder="Digite a resposta"
        autoComplete="off"
        aria-label="Resposta"
      />
      <button type="button" className="ms-btn ms-btn-gold" onClick={go} disabled={!v.trim()}>
        Responder
      </button>
    </div>
  );
}

function LockGame({ def, onWin, onFail }: GameProps<"lock">) {
  const [d, setD] = useState<number[]>(() => Array.from({ length: def.answer.length }, () => 0));
  const bump = (i: number, k: number) => setD((x) => x.map((v, j) => (j === i ? (v + k + 10) % 10 : v)));
  const go = () => (checkLock(def, d.join("")) ? onWin() : onFail("O cadeado não abriu. Releia as pistas."));
  return (
    <div>
      <ol className="ms-pz-clues">
        {def.clues.map((c, i) => (
          <li key={i}>{c}</li>
        ))}
      </ol>
      <div className="ms-pz-dials">
        {d.map((v, i) => (
          <div key={i} className="ms-pz-dial">
            <button type="button" aria-label="Aumentar" onClick={() => bump(i, 1)}>
              ▲
            </button>
            <b>{v}</b>
            <button type="button" aria-label="Diminuir" onClick={() => bump(i, -1)}>
              ▼
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="ms-btn ms-btn-gold" onClick={go}>
        🔓 Abrir
      </button>
    </div>
  );
}

function SimonGame({ def, onWin, onFail }: GameProps<"simon">) {
  const [round, setRound] = useState(3);
  const [phase, setPhase] = useState<"watch" | "play">("watch");
  const [lit, setLit] = useState<number | null>(null);
  const [played, setPlayed] = useState<number[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (phase !== "watch") return;
    const timers: number[] = [];
    const seq = def.seq.slice(0, round);
    seq.forEach((s, i) => {
      timers.push(window.setTimeout(() => setLit(s), 700 + i * 700));
      timers.push(window.setTimeout(() => setLit(null), 700 + i * 700 + 450));
    });
    timers.push(window.setTimeout(() => setPhase("play"), 700 + seq.length * 700));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [phase, round, def, tick]);

  const press = (s: number) => {
    if (phase !== "play") return;
    const next = [...played, s];
    setLit(s);
    window.setTimeout(() => setLit(null), 180);
    const want = def.seq.slice(0, round);
    if (next[next.length - 1] !== want[next.length - 1]) {
      onFail("Errou a sequência. Olhe de novo com atenção.");
      setPlayed([]);
      setPhase("watch");
      setTick((t) => t + 1);
      return;
    }
    if (next.length === want.length) {
      setPlayed([]);
      if (round >= def.length) {
        if (checkSimon(def, next)) onWin();
        return;
      }
      setRound(round + 1);
      setPhase("watch");
      return;
    }
    setPlayed(next);
  };
  return (
    <div>
      <p className="ms-pz-label">{phase === "watch" ? `Olhe a sequência (${round} sons)…` : `Sua vez: repita (${played.length}/${round})`}</p>
      <div className="ms-pz-simon">
        {def.symbols.map((sym, i) => (
          <button key={i} type="button" className={`ms-pz-sym ${lit === i ? "ms-pz-lit" : ""}`} disabled={phase !== "play"} onClick={() => press(i)} aria-label={`Som ${i + 1}`}>
            {sym}
          </button>
        ))}
      </div>
    </div>
  );
}
