"use client";

import Link from "next/link";
import { useState } from "react";
import { answerQuestion, type AnswerResult } from "@/lib/actions/games";
import { CardTile } from "./CardTile";

type Q = { prompt: string; options: string[] };

export function QuestionGame({
  game,
  duelId,
  questions,
  startIdx,
  startScore,
  emoji,
  title,
  backHref = "/app/jogos",
}: {
  game: "quiz" | "verse" | "duel";
  duelId?: string;
  questions: Q[];
  startIdx: number;
  startScore: number;
  emoji: string;
  title: string;
  backHref?: string;
}) {
  const [idx, setIdx] = useState(startIdx);
  const [score, setScore] = useState(startScore);
  const [picked, setPicked] = useState<number | null>(null);
  const [fb, setFb] = useState<AnswerResult | null>(null);
  const [final, setFinal] = useState<AnswerResult | null>(null);
  const [showFinal, setShowFinal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = questions.length;
  const q = questions[idx];

  async function pick(choice: number) {
    if (busy || picked !== null) return;
    setBusy(true);
    setError(null);
    try {
      const res = await answerQuestion({ game, idx, choice, duelId });
      if (res.error) {
        if (res.done) setShowFinal(true);
        else if (typeof res.answered === "number") setIdx(Math.min(res.answered, total - 1));
        setError(res.error);
        return;
      }
      setPicked(choice);
      setFb(res);
      if (typeof res.score === "number") setScore(res.score);
      if (res.done) setFinal(res);
    } catch {
      setError("Sem conexão. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  function next() {
    if (final) {
      setShowFinal(true);
      return;
    }
    setIdx((i) => i + 1);
    setPicked(null);
    setFb(null);
  }

  if (showFinal) {
    return (
      <div className="card p-6 text-center">
        <p className="text-6xl" aria-hidden>
          {final ? (score >= total ? "🏆" : score >= Math.ceil(total / 2) ? "🎉" : "💪") : "✅"}
        </p>
        <h2 className="mt-2 text-2xl font-black">{final ? `${score} de ${total} certas!` : "Jogo concluído"}</h2>
        {final && (final.xp ?? 0) > 0 ? (
          <p className="mt-2 inline-block rounded-full bg-[var(--accent-soft)] px-4 py-1.5 text-lg font-black text-[var(--accent-strong)]">
            +{final.xp} XP
          </p>
        ) : null}
        {final?.card ? (
          <div className="mt-5 flex flex-col items-center gap-2">
            <p className="text-sm font-black">🎁 Você ganhou uma carta nova!</p>
            <CardTile card={final.card} big />
          </div>
        ) : null}
        {final?.duel ? (
          <p className="mt-4 text-base font-bold">
            {final.duel.status === "finished"
              ? final.duel.won === null
                ? `🤝 Empate! (${final.duel.mine} x ${final.duel.theirs})`
                : final.duel.won
                  ? `🏆 Você venceu! (${final.duel.mine} x ${final.duel.theirs})`
                  : `😅 Quase! Placar ${final.duel.mine} x ${final.duel.theirs}`
              : "⏳ Agora é com o seu colega — você será avisado do resultado."}
          </p>
        ) : null}
        <Link href={backHref} className="btn btn-primary mt-6 w-full !py-3 !text-base">
          Voltar aos jogos
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-sm font-bold text-[var(--muted)]">
        <span>
          {emoji} {title}
        </span>
        <span className="tabular-nums">
          {Math.min(idx + 1, total)}/{total}
        </span>
      </div>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-[var(--line)]">
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-all"
          style={{ width: `${(idx / total) * 100}%` }}
        />
      </div>

      <div className="card mb-4 p-5">
        <p className="text-xl font-black leading-snug">{q.prompt}</p>
      </div>

      <div className="grid gap-3">
        {q.options.map((opt, i) => {
          let tone = "border-[var(--line)] bg-[var(--card)]";
          if (picked !== null && fb) {
            if (i === fb.correctIdx) tone = "border-emerald-400 bg-emerald-50 text-emerald-900";
            else if (i === picked) tone = "border-rose-400 bg-rose-50 text-rose-900";
            else tone = "border-[var(--line)] bg-[var(--card)] opacity-60";
          }
          return (
            <button
              key={i}
              type="button"
              disabled={busy || picked !== null}
              onClick={() => pick(i)}
              className={`rounded-2xl border-2 px-4 py-4 text-left text-lg font-bold transition active:scale-[0.98] ${tone}`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {error ? <p className="mt-3 text-sm font-semibold text-rose-600">{error}</p> : null}

      {fb ? (
        <div className="mt-4">
          <p className={`text-lg font-black ${fb.correct ? "text-emerald-700" : "text-rose-700"}`}>
            {fb.correct ? "🎉 Acertou!" : "😅 Não foi dessa vez"}
          </p>
          {fb.ref ? <p className="text-sm font-semibold text-[var(--muted)]">📖 {fb.ref}</p> : null}
          <button type="button" onClick={next} className="btn btn-primary mt-3 w-full !py-3 !text-base">
            {final ? "Ver resultado" : "Próxima →"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
