"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { finishEnglish, reportEnglishContent, type EnglishResult } from "@/lib/actions/english";
import { gradeBank, gradeTyped, lessonStars, requeue, seededShuffle } from "@/lib/english/grade";
import { placementUnit } from "@/lib/english/content";
import { canSpeak, speak, stopSpeaking } from "@/lib/english/speak";
import type { Exercise, LsEx, McEx, MtEx, TrEx, TyEx } from "@/lib/english/types";

// Jogador de lições: trilha, nível lendário (sem errar), treino de erros/palavras/ouvir e teste de nivelamento.
// A correção é feita aqui (resposta instantânea); o servidor só confere o resultado final e paga o XP.

export type PlayerMode = "lesson" | "legendary" | "practice" | "placement";
type Outcome = { ok: boolean; typo?: boolean; expected?: string; chosen?: number; typed?: string };

const EMOJI = /^[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}️]+$/u;

function Speaker({ text, label = "Ouvir" }: { text: string; label?: string }) {
  if (!canSpeak()) return <p className="rounded-xl bg-[var(--accent-soft)] px-3 py-2 text-sm font-bold text-[#1d1535]">🔇 Sem áudio neste aparelho. Frase: “{text}”</p>;
  return (
    <div className="flex items-center justify-center gap-2">
      <button type="button" onClick={() => speak(text, 0.9)} className="btn btn-primary !px-5 !py-3 text-base" aria-label={label}>
        🔊 {label}
      </button>
      <button type="button" onClick={() => speak(text, 0.55)} className="btn btn-soft !px-4 !py-3 text-base" aria-label="Ouvir devagar">
        🐢 Devagar
      </button>
    </div>
  );
}

// ------------------------------------------------------------------ exercícios

function McView({ ex, onSubmit }: { ex: McEx & { id: string }; onSubmit: (o: Outcome) => void }) {
  const [sel, setSel] = useState<number | null>(null);
  useEffect(() => {
    if (ex.say) speak(ex.say);
    return () => stopSpeaking();
  }, [ex]);
  return (
    <div>
      <p className="text-lg font-black leading-snug">{ex.say ? "🎧 " + ex.q : ex.q}</p>
      {ex.say ? (
        <div className="mt-3">
          <Speaker text={ex.say} />
        </div>
      ) : null}
      <div className="mt-4 grid gap-2">
        {ex.opts.map((o, i) => (
          <button key={i} type="button" onClick={() => setSel(i)} className={`rounded-2xl border-2 px-4 py-3 text-left text-base font-bold transition active:scale-[0.99] ${sel === i ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[#1d1535]" : "border-[var(--line)] bg-[var(--card)]"}`}>
            {o}
          </button>
        ))}
      </div>
      <button type="button" disabled={sel === null} onClick={() => sel !== null && onSubmit({ ok: sel === ex.a, chosen: sel, expected: ex.opts[ex.a] })} className="btn btn-primary mt-4 w-full !py-3 text-base">
        Verificar
      </button>
    </div>
  );
}

function TrView({ ex, onSubmit }: { ex: TrEx & { id: string }; onSubmit: (o: Outcome) => void }) {
  const bank = useMemo(() => seededShuffle(ex.bank, ex.id), [ex]);
  const [picked, setPicked] = useState<number[]>([]);
  const words = picked.map((i) => bank[i]);
  return (
    <div>
      <p className="text-sm font-bold text-[var(--muted)]">Escreva em inglês</p>
      <p className="mt-1 text-lg font-black leading-snug">“{ex.pt}”</p>
      <div className="mt-4 flex min-h-[3.5rem] flex-wrap items-center gap-2 rounded-2xl border-2 border-dashed border-[var(--line)] p-2">
        {picked.length === 0 ? <span className="px-1 text-sm text-[var(--muted)]">Toque nas palavras abaixo</span> : null}
        {picked.map((bi, k) => (
          <button key={k} type="button" onClick={() => setPicked((p) => p.filter((_, j) => j !== k))} className="rounded-xl bg-[var(--accent-soft)] px-3 py-2 text-base font-bold text-[#1d1535]">
            {bank[bi]}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {bank.map((w, i) => (
          <button key={i} type="button" disabled={picked.includes(i)} onClick={() => setPicked((p) => [...p, i])} className="rounded-xl border-2 border-[var(--line)] bg-[var(--card)] px-3 py-2 text-base font-bold transition active:scale-95 disabled:opacity-30">
            {w}
          </button>
        ))}
      </div>
      <button type="button" disabled={picked.length === 0} onClick={() => onSubmit({ ...gradeBank(words, ex.ans), typed: words.join(" ") })} className="btn btn-primary mt-4 w-full !py-3 text-base">
        Verificar
      </button>
    </div>
  );
}

function TyView({ ex, onSubmit }: { ex: TyEx & { id: string }; onSubmit: (o: Outcome) => void }) {
  const [v, setV] = useState("");
  const emoji = EMOJI.test(ex.prompt);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (v.trim()) onSubmit({ ...gradeTyped(v, ex.ans), typed: v });
      }}
    >
      <p className="text-sm font-bold text-[var(--muted)]">{emoji ? "Como se diz em inglês?" : "Escreva em inglês"}</p>
      <p className={emoji ? "mt-2 text-center text-7xl" : "mt-1 text-lg font-black leading-snug"}>{emoji ? ex.prompt : `“${ex.prompt}”`}</p>
      {ex.hint ? <p className="mt-1 text-center text-xs font-bold text-[var(--muted)]">Dica: {ex.hint}</p> : null}
      <input value={v} onChange={(e) => setV(e.target.value)} autoFocus autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="Digite em inglês" className="mt-4 w-full rounded-2xl border-2 border-[var(--line)] bg-[var(--card)] px-4 py-3 text-lg font-bold outline-none focus:border-[var(--accent)]" aria-label="Sua resposta em inglês" />
      <button type="submit" disabled={!v.trim()} className="btn btn-primary mt-4 w-full !py-3 text-base">
        Verificar
      </button>
    </form>
  );
}

function LsView({ ex, onSubmit }: { ex: LsEx & { id: string }; onSubmit: (o: Outcome) => void }) {
  const [v, setV] = useState("");
  useEffect(() => {
    speak(ex.say);
    return () => stopSpeaking();
  }, [ex]);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (v.trim()) onSubmit({ ...gradeTyped(v, ex.ans), typed: v });
      }}
    >
      <p className="text-lg font-black leading-snug">🎧 Digite o que você ouviu</p>
      <div className="mt-3">
        <Speaker text={ex.say} />
      </div>
      <input value={v} onChange={(e) => setV(e.target.value)} autoFocus autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="Digite em inglês" className="mt-4 w-full rounded-2xl border-2 border-[var(--line)] bg-[var(--card)] px-4 py-3 text-lg font-bold outline-none focus:border-[var(--accent)]" aria-label="O que você ouviu" />
      <button type="submit" disabled={!v.trim()} className="btn btn-primary mt-4 w-full !py-3 text-base">
        Verificar
      </button>
    </form>
  );
}

function MtView({ ex, onSubmit }: { ex: MtEx & { id: string }; onSubmit: (o: Outcome) => void }) {
  const right = useMemo(() => seededShuffle(ex.pairs.map((_, i) => i), ex.id + "r"), [ex]);
  const [left, setLeft] = useState<number | null>(null);
  const [matched, setMatched] = useState<number[]>([]);
  const [bad, setBad] = useState<number | null>(null);
  const [errors, setErrors] = useState(0);
  const finished = useRef(false);
  useEffect(() => {
    if (matched.length === ex.pairs.length && !finished.current) {
      finished.current = true;
      const t = setTimeout(() => onSubmit({ ok: errors === 0, expected: ex.pairs.map((p) => `${p[0]} = ${p[1]}`).join(" · ") }), 450);
      return () => clearTimeout(t);
    }
  }, [matched, errors, ex, onSubmit]);
  const pickRight = (ri: number) => {
    if (left === null || matched.includes(ri)) return;
    if (left === ri) {
      setMatched((m) => [...m, ri]);
      setLeft(null);
    } else {
      setErrors((e) => e + 1);
      setBad(ri);
      setTimeout(() => setBad(null), 500);
    }
  };
  return (
    <div>
      <p className="text-lg font-black">Ligue os pares</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          {ex.pairs.map((p, i) => (
            <button key={i} type="button" disabled={matched.includes(i)} onClick={() => { setLeft(i); speak(p[0]); }} className={`rounded-2xl border-2 px-3 py-3 text-base font-bold transition ${matched.includes(i) ? "border-emerald-300 bg-emerald-50 text-emerald-800 opacity-60" : left === i ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[#1d1535]" : "border-[var(--line)] bg-[var(--card)]"}`}>
              {p[0]}
            </button>
          ))}
        </div>
        <div className="grid gap-2">
          {right.map((ri) => (
            <button key={ri} type="button" disabled={matched.includes(ri)} onClick={() => pickRight(ri)} className={`rounded-2xl border-2 px-3 py-3 text-base font-bold transition ${matched.includes(ri) ? "border-emerald-300 bg-emerald-50 text-emerald-800 opacity-60" : bad === ri ? "border-rose-400 bg-rose-50 text-rose-900" : "border-[var(--line)] bg-[var(--card)]"}`}>
              {ex.pairs[ri][1]}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-3 text-center text-xs font-bold text-[var(--muted)]">Toque numa palavra em inglês e depois no significado.</p>
    </div>
  );
}

// ------------------------------------------------------------------ jogador

export function LessonPlayer({ mode, keyId, title, exercises, backHref, nextHref, nextLabel }: { mode: PlayerMode; keyId: string; title: string; exercises: Exercise[]; backHref: string; nextHref?: string; nextLabel?: string }) {
  const [queue, setQueue] = useState<Exercise[]>(exercises);
  const [idx, setIdx] = useState(0);
  const [out, setOut] = useState<Outcome | null>(null);
  const [explain, setExplain] = useState(false);
  const [reported, setReported] = useState(false);
  const [phase, setPhase] = useState<"play" | "done" | "failed">("play");
  const [saving, setSaving] = useState(false);
  const [res, setRes] = useState<EnglishResult | null>(null);
  const [wrongFirst, setWrongFirst] = useState<string[]>([]);
  const [fixed, setFixed] = useState<string[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const retried = useRef(new Set<string>());
  const seen = useRef(new Set<string>());
  const startedAt = useRef(0);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const total = exercises.length;
  const current = queue[idx];

  function submit(o: Outcome) {
    setOut(o);
    setExplain(false);
    setReported(false);
    const firstTime = !seen.current.has(current.id);
    seen.current.add(current.id);
    if (firstTime) {
      if (o.ok) {
        setCorrectCount((c) => c + 1);
        if (mode === "practice") setFixed((f) => [...f, current.id]);
      } else setWrongFirst((w) => [...w, current.id]);
    }
    if (!o.ok && mode === "legendary") setPhase("failed");
    if (!o.ok && mode !== "placement") setQueue((q) => requeue(q, idx, true, retried.current));
  }

  async function next() {
    setOut(null);
    if (idx + 1 < queue.length) {
      setIdx(idx + 1);
      return;
    }
    await finish();
  }

  async function finish() {
    setPhase("done");
    setSaving(true);
    const secs = Math.round((Date.now() - startedAt.current) / 1000);
    try {
      const startUnit = mode === "placement" ? placementUnit(correctCount) : undefined;
      const kind = mode === "lesson" ? "lesson" : mode === "legendary" ? "legendary" : mode === "placement" ? "placement" : "practice";
      setRes(await finishEnglish({ kind, key: keyId, correct: correctCount, total, secs, wrong: wrongFirst, fixed, startUnit }));
    } catch {
      setRes({ error: "Sem conexão: o progresso não foi salvo. Tente de novo." });
    }
    setSaving(false);
  }

  function restart() {
    setAttempt((a) => a + 1);
    setQueue(exercises);
    setIdx(0);
    setOut(null);
    setPhase("play");
    setWrongFirst([]);
    setFixed([]);
    setCorrectCount(0);
    retried.current = new Set();
    seen.current = new Set();
    startedAt.current = Date.now();
  }

  const pct = Math.round((Math.min(idx + (out ? 1 : 0), total) / Math.max(1, total)) * 100);

  // ------------------------------------------------------------ telas finais
  if (phase === "failed") {
    return (
      <div className="mx-auto max-w-md text-center">
        <p className="text-6xl" aria-hidden>
          💥
        </p>
        <h2 className="mt-2 text-2xl font-black">Quase! Errou uma</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">No Nível Lendário não pode errar nenhuma. Você pode tentar quantas vezes quiser.</p>
        {out && !out.ok ? <p className="mt-3 rounded-2xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-900">Resposta certa: {out.expected}</p> : null}
        <button type="button" onClick={restart} className="btn btn-primary mt-5 w-full !py-3 text-base">
          Tentar de novo
        </button>
        <Link href={backHref} className="btn btn-ghost mt-2 w-full">
          Voltar
        </Link>
      </div>
    );
  }

  if (phase === "done") {
    const stars = mode === "lesson" || mode === "legendary" ? lessonStars(wrongFirst.length) : null;
    const startU = mode === "placement" ? placementUnit(correctCount) : null;
    return (
      <div className="mx-auto max-w-md text-center">
        <p className="text-6xl" aria-hidden>
          {mode === "placement" ? "🎯" : "🎉"}
        </p>
        <h2 className="mt-2 text-2xl font-black">{mode === "placement" ? "Teste concluído!" : mode === "legendary" ? "Nível Lendário!" : mode === "practice" ? "Treino concluído!" : "Lição concluída!"}</h2>
        {stars ? (
          <p className="mt-1 text-4xl" aria-label={`${stars} estrelas`}>
            {"⭐".repeat(stars)}
            <span className="opacity-25">{"⭐".repeat(3 - stars)}</span>
          </p>
        ) : null}
        <p className="mt-2 text-sm font-bold text-[var(--muted)]">
          {correctCount}/{total} certos de primeira
        </p>
        {startU ? <p className="mt-3 rounded-2xl bg-[var(--accent-soft)] px-4 py-3 text-base font-black text-[#1d1535]">Você começa na Unidade {startU}</p> : null}
        {saving ? <p className="mt-3 text-sm text-[var(--muted)]">Salvando…</p> : null}
        {res?.error ? <p className="mt-3 rounded-2xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-900">{res.error}</p> : null}
        {res && !res.error ? (
          <div className="mt-3 space-y-1">
            {res.xp ? <p className="rounded-2xl bg-emerald-50 px-3 py-2 text-base font-black text-emerald-900">+{res.xp} XP 🎉</p> : null}
            {!res.xp && res.valid === false ? <p className="text-xs font-semibold text-[var(--muted)]">Rápido demais para valer XP: leia e pense em cada resposta.</p> : null}
            {!res.xp && res.valid && (mode === "lesson" || mode === "legendary") ? <p className="text-xs font-semibold text-[var(--muted)]">Você já ganhou o XP das lições de hoje (máximo de 3).</p> : null}
            {res.streak ? <p className="text-sm font-black">🔥 {res.streak} {res.streak === 1 ? "dia seguido" : "dias seguidos"} de inglês</p> : null}
          </div>
        ) : null}
        {nextHref && !saving ? (
          <Link href={nextHref} className="btn btn-primary mt-5 w-full !py-3 text-base">
            {nextLabel ?? "Continuar"}
          </Link>
        ) : null}
        <Link href={backHref} className="btn btn-ghost mt-2 w-full">
          Voltar à trilha
        </Link>
      </div>
    );
  }

  // ------------------------------------------------------------ exercício
  const view = () => {
    const e = current;
    const key = `${e.id}-${idx}-${attempt}`;
    if (e.k === "mc") return <McView key={key} ex={e} onSubmit={submit} />;
    if (e.k === "tr") return <TrView key={key} ex={e} onSubmit={submit} />;
    if (e.k === "ty") return <TyView key={key} ex={e} onSubmit={submit} />;
    if (e.k === "ls") return <LsView key={key} ex={e} onSubmit={submit} />;
    return <MtView key={key} ex={e} onSubmit={submit} />;
  };

  const ex = current;
  const why = out && !out.ok && ex.k === "mc" && out.chosen !== undefined ? ex.why?.[out.chosen] : null;

  return (
    <div className="mx-auto max-w-md pb-28">
      <div className="mb-4 flex items-center gap-3">
        <Link href={backHref} className="text-xl font-black text-[var(--muted)]" aria-label="Sair da lição">
          ✕
        </Link>
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-[var(--accent-soft)]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={title}>
          <div className="h-full rounded-full bg-[var(--accent)] transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
      {view()}

      {out ? (
        <div className={`fixed inset-x-0 bottom-0 z-40 border-t-4 px-4 pb-5 pt-3 ${out.ok ? "border-emerald-400 bg-emerald-50 text-emerald-950" : "border-rose-400 bg-rose-50 text-rose-950"}`}>
          <div className="mx-auto max-w-md">
            <p className="text-lg font-black">{out.ok ? (out.typo ? "Quase! Confira a escrita 👀" : "Correto! 🎉") : "Não foi dessa vez"}</p>
            {out.typo || !out.ok ? <p className="text-sm font-bold">Resposta certa: {out.expected}</p> : null}
            {!out.ok && mode === "lesson" ? <p className="text-xs font-semibold opacity-80">Esse exercício volta no fim da lição.</p> : null}
            {explain ? (
              <div className="mt-2 rounded-2xl bg-white/70 px-3 py-2 text-sm">
                <p className="font-black">💡 Por quê?</p>
                {why ? <p className="mt-1">Você escolheu uma opção que não serve: {why}</p> : null}
                <p className="mt-1">{ex.ex}</p>
              </div>
            ) : null}
            <div className="mt-2 flex items-center gap-2">
              <button type="button" onClick={() => setExplain((v) => !v)} className="btn btn-soft !px-3 !py-2 text-sm">
                💡 Explicar minha resposta
              </button>
              <button
                type="button"
                disabled={reported}
                onClick={() => {
                  setReported(true);
                  void reportEnglishContent(ex.id);
                }}
                className="text-xs font-bold underline opacity-70 disabled:no-underline"
              >
                {reported ? "Obrigado! Vamos revisar" : "Reportar erro"}
              </button>
              <button type="button" onClick={() => void next()} className="btn btn-primary ml-auto !px-5 !py-2.5 text-base">
                {idx + 1 < queue.length ? "Continuar" : "Terminar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
