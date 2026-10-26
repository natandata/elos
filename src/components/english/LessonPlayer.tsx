"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { buyBabelItem, loseHeart } from "@/lib/actions/babel";
import { finishEnglish, reportEnglishContent, type EnglishResult } from "@/lib/actions/english";
import { gradeBank, gradeTyped, lessonStars, requeue, seededShuffle } from "@/lib/english/grade";
import { placementUnit } from "@/lib/english/content";
import { canSpeak, prepareVoices, speak, stopSpeaking } from "@/lib/english/speak";
import type { Exercise, LsEx, McEx, MtEx, TrEx, TyEx } from "@/lib/english/types";
import { WEEK_LETTERS } from "@/lib/babel/economy";
import { IcoBolt, IcoBoost, IcoCheck, IcoClose, IcoFlame, IcoGem, IcoHeart, IcoSparkle, IcoSpeaker, IcoStar, IcoTarget, IcoTurtle } from "./icons";

// Jogador de lições: trilha, nível lendário (sem errar), treino de erros/palavras/ouvir e teste de nivelamento.
// A correção é feita aqui (resposta instantânea); o servidor só confere o resultado final e paga o XP.

export type PlayerMode = "lesson" | "legendary" | "practice" | "placement";
type Outcome = { ok: boolean; typo?: boolean; expected?: string; chosen?: number; typed?: string };

const EMOJI = /^[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}️]+$/u;

function Speaker({ text, label = "Ouvir" }: { text: string; label?: string }) {
  const [failed, setFailed] = useState(false);
  const [showText, setShowText] = useState(false);
  // o servidor não sabe se o aparelho tem voz: começa "com voz" (igual nos dois lados) e confere depois de montar
  const [supported, setSupported] = useState(true);
  useEffect(() => {
    prepareVoices();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(canSpeak());
  }, []);
  const play = (rate: number) => speak(text, rate, (ok) => setFailed(!ok));
  if (!supported) return <p className="bb-card px-3 py-2 text-sm">Sem áudio neste aparelho. Frase: “{text}”</p>;
  return (
    <div>
      <div className="flex items-center justify-center gap-3">
        <button type="button" onClick={() => play(0.9)} className="bb-speaker !h-20 !w-20 !rounded-3xl" aria-label={label}>
          <IcoSpeaker className="h-10 w-10" />
        </button>
        <button type="button" onClick={() => play(0.55)} className="bb-speaker !h-14 !w-14" aria-label="Ouvir devagar">
          <IcoTurtle className="h-8 w-8" />
        </button>
      </div>
      {failed ? (
        <div className="mt-3 rounded-2xl bg-[#fff4cc] px-3 py-2 text-sm text-[#7a5d00]">
          <p className="font-extrabold">Não saiu som. Confira:</p>
          <ul className="mt-1 list-disc pl-5 text-xs font-bold">
            <li>o volume do aparelho e se o iPhone não está no modo silencioso (botão ao lado);</li>
            <li>toque de novo no botão de som (o navegador só toca depois de um toque seu).</li>
          </ul>
          {showText ? (
            <p className="mt-2 rounded-xl bg-white px-3 py-2 text-base font-extrabold">“{text}”</p>
          ) : (
            <button type="button" onClick={() => setShowText(true)} className="mt-2 text-xs font-extrabold underline">
              Ver a frase por escrito
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

function Foot({ children }: { children: React.ReactNode }) {
  return <div className="bb-foot">{children}</div>;
}

// ------------------------------------------------------------------ exercícios

function McView({ ex, onSubmit }: { ex: McEx & { id: string }; onSubmit: (o: Outcome) => void }) {
  const [sel, setSel] = useState<number | null>(null);
  useEffect(() => {
    if (ex.say) speak(ex.say);
    return () => stopSpeaking();
  }, [ex]);
  return (
    <div className="bb-view">
      <h2 className="bb-h">{ex.q}</h2>
      {ex.say ? (
        <div className="mt-5">
          <Speaker text={ex.say} />
        </div>
      ) : null}
      <div className="mt-5 grid gap-3">
        {ex.opts.map((o, i) => (
          <button key={i} type="button" onClick={() => setSel(i)} className={`bb-opt ${sel === i ? "bb-opt-sel" : ""}`}>
            {o}
          </button>
        ))}
      </div>
      <Foot>
        <button type="button" disabled={sel === null} onClick={() => sel !== null && onSubmit({ ok: sel === ex.a, chosen: sel, expected: ex.opts[ex.a] })} className="bb-btn">
          Verificar
        </button>
      </Foot>
    </div>
  );
}

function TrView({ ex, onSubmit }: { ex: TrEx & { id: string }; onSubmit: (o: Outcome) => void }) {
  const bank = useMemo(() => seededShuffle(ex.bank, ex.id), [ex]);
  const [picked, setPicked] = useState<number[]>([]);
  const words = picked.map((i) => bank[i]);
  return (
    <div className="bb-view">
      <h2 className="bb-h">Escreva isto em inglês</h2>
      <p className="bb-bubble mt-5">{ex.pt}</p>
      <div className="mt-5 flex min-h-[4.5rem] flex-wrap content-start items-center gap-2 border-y-2 border-[var(--bb-line)] py-3">
        {picked.map((bi, k) => (
          <button key={k} type="button" onClick={() => setPicked((p) => p.filter((_, j) => j !== k))} className="bb-tile">
            {bank[bi]}
          </button>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {bank.map((w, i) => (
          <button key={i} type="button" disabled={picked.includes(i)} onClick={() => setPicked((p) => [...p, i])} className="bb-tile">
            {w}
          </button>
        ))}
      </div>
      <Foot>
        <button type="button" disabled={picked.length === 0} onClick={() => onSubmit({ ...gradeBank(words, ex.ans), typed: words.join(" ") })} className="bb-btn">
          Verificar
        </button>
      </Foot>
    </div>
  );
}

function TyView({ ex, onSubmit }: { ex: TyEx & { id: string }; onSubmit: (o: Outcome) => void }) {
  const [v, setV] = useState("");
  const emoji = EMOJI.test(ex.prompt);
  return (
    <form
      className="bb-view"
      onSubmit={(e) => {
        e.preventDefault();
        if (v.trim()) onSubmit({ ...gradeTyped(v, ex.ans), typed: v });
      }}
    >
      <h2 className="bb-h">{emoji ? "Como se diz em inglês?" : "Escreva isto em inglês"}</h2>
      {emoji ? <p className="bb-card mx-auto mt-5 w-fit px-8 py-4 text-center text-7xl">{ex.prompt}</p> : <p className="bb-bubble mt-5">{ex.prompt}</p>}
      {ex.hint ? <p className="bb-sub mt-2 text-center">Dica: {ex.hint}</p> : null}
      <input value={v} onChange={(e) => setV(e.target.value)} autoFocus autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="Digite em inglês" className="bb-input mt-5" aria-label="Sua resposta em inglês" />
      <Foot>
        <button type="submit" disabled={!v.trim()} className="bb-btn">
          Verificar
        </button>
      </Foot>
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
      className="bb-view"
      onSubmit={(e) => {
        e.preventDefault();
        if (v.trim()) onSubmit({ ...gradeTyped(v, ex.ans), typed: v });
      }}
    >
      <h2 className="bb-h">O que você ouviu?</h2>
      <div className="mt-5">
        <Speaker text={ex.say} />
      </div>
      <input value={v} onChange={(e) => setV(e.target.value)} autoFocus autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="Digite em inglês" className="bb-input mt-5" aria-label="O que você ouviu" />
      <Foot>
        <button type="submit" disabled={!v.trim()} className="bb-btn">
          Verificar
        </button>
      </Foot>
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
      <h2 className="bb-h">Toque nos pares</h2>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="grid gap-3">
          {ex.pairs.map((p, i) => (
            <button key={i} type="button" disabled={matched.includes(i)} onClick={() => { setLeft(i); speak(p[0]); }} className={`bb-opt !text-base ${matched.includes(i) ? "bb-opt-ok opacity-40" : left === i ? "bb-opt-sel" : ""}`}>
              {p[0]}
            </button>
          ))}
        </div>
        <div className="grid gap-3">
          {right.map((ri) => (
            <button key={ri} type="button" disabled={matched.includes(ri)} onClick={() => pickRight(ri)} className={`bb-opt !text-base ${matched.includes(ri) ? "bb-opt-ok opacity-40" : bad === ri ? "bb-opt-bad" : ""}`}>
              {ex.pairs[ri][1]}
            </button>
          ))}
        </div>
      </div>
      <p className="bb-sub mt-4 text-center text-xs">Toque numa palavra em inglês e depois no significado.</p>
    </div>
  );
}

// ------------------------------------------------------------------ jogador

export function LessonPlayer({ mode, keyId, title, exercises, backHref, nextHref, nextLabel, hearts }: { mode: PlayerMode; keyId: string; title: string; exercises: Exercise[]; backHref: string; nextHref?: string; nextLabel?: string; /** corações atuais; só nas lições comuns (as demais não gastam coração) */ hearts?: number }) {
  const [queue, setQueue] = useState<Exercise[]>(exercises);
  const [idx, setIdx] = useState(0);
  const [out, setOut] = useState<Outcome | null>(null);
  const [explain, setExplain] = useState(false);
  const [reported, setReported] = useState(false);
  const [phase, setPhase] = useState<"play" | "done" | "failed" | "nohearts">(mode === "lesson" && hearts === 0 ? "nohearts" : "play");
  const heartsOn = mode === "lesson" && hearts !== undefined;
  const [hp, setHp] = useState(hearts ?? 0);
  const [step, setStep] = useState(0);
  const router = useRouter();
  const [buying, setBuying] = useState(false);
  const [buyErr, setBuyErr] = useState<string | null>(null);
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
    if (!o.ok && heartsOn) {
      setHp((h) => Math.max(0, h - 1));
      void loseHeart();
    }
    if (!o.ok && mode === "legendary") setPhase("failed");
    if (!o.ok && mode !== "placement") setQueue((q) => requeue(q, idx, true, retried.current));
  }

  async function next() {
    setOut(null);
    if (heartsOn && hp === 0) {
      setPhase("nohearts");
      return;
    }
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
    setStep(0);
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
      <div className="flex min-h-[85dvh] flex-col text-center">
        <div className="flex flex-1 flex-col items-center justify-center">
          <IcoTarget className="h-24 w-24" />
          <h2 className="mt-4 text-3xl font-extrabold text-[var(--bb-red)]">Quase! Errou uma</h2>
          <p className="bb-sub mt-2">No Nível Lendário não pode errar nenhuma. Você pode tentar quantas vezes quiser.</p>
          {out && !out.ok ? <p className="mt-4 rounded-2xl bg-[var(--bb-bad-bg)] px-4 py-3 text-sm font-extrabold text-[var(--bb-bad-ink)]">Resposta certa: {out.expected}</p> : null}
        </div>
        <Foot>
          <button type="button" onClick={restart} className="bb-btn">
            Tentar de novo
          </button>
          <Link href={backHref} className="bb-btn bb-btn-ghost mt-3">
            Voltar
          </Link>
        </Foot>
      </div>
    );
  }

  if (phase === "nohearts") {
    return (
      <div className="flex min-h-[85dvh] flex-col text-center">
        <div className="flex flex-1 flex-col items-center justify-center">
          <IcoHeart className="h-24 w-24" broken />
          <h2 className="mt-4 text-3xl font-extrabold">Você ficou sem corações</h2>
          <p className="bb-sub mt-2">Treine os seus erros para ganhar 1 coração, recarregue com gemas ou espere: volta 1 coração a cada 4 horas.</p>
          {buyErr ? <p className="mt-3 rounded-2xl bg-[var(--bb-bad-bg)] px-3 py-2 text-sm font-extrabold text-[var(--bb-bad-ink)]">{buyErr}</p> : null}
        </div>
        <Foot>
          <Link href="/app/jogos/ingles/treino/erros" className="bb-btn">
            Treinar para ganhar coração
          </Link>
          <button
            type="button"
            disabled={buying}
            onClick={async () => {
              setBuying(true);
              const r = await buyBabelItem("refill");
              setBuying(false);
              if (r.error) setBuyErr(r.error);
              else router.refresh();
              if (!r.error) window.location.reload();
            }}
            className="bb-btn bb-btn-blue mt-3 flex items-center justify-center gap-2"
          >
            Recarregar por 80 <IcoGem className="h-5 w-5" />
          </button>
          <Link href={backHref} className="bb-btn bb-btn-ghost mt-3">
            Sair
          </Link>
        </Foot>
      </div>
    );
  }

  if (phase === "done") {
    const stars = mode === "lesson" || mode === "legendary" ? lessonStars(wrongFirst.length) : null;
    const startU = mode === "placement" ? placementUnit(correctCount) : null;
    const accuracy = Math.round((correctCount / Math.max(1, total)) * 100);
    const heading = mode === "placement" ? "Teste concluído!" : mode === "legendary" ? "Nível Lendário!" : mode === "practice" ? "Treino concluído!" : "Lição completa!";
    const bab = res && !res.error ? res.babel ?? null : null;
    const steps: ("summary" | "streak" | "goal")[] = ["summary"];
    if (bab?.extended) steps.push("streak");
    if (bab?.goal_now) steps.push("goal");
    const cur = steps[Math.min(step, steps.length - 1)];
    const last = step >= steps.length - 1;

    const footer = (
      <Foot>
        {!last && !saving ? (
          <button type="button" onClick={() => setStep((n) => n + 1)} className="bb-btn">
            Continuar
          </button>
        ) : (
          <>
            {nextHref && !saving ? (
              <Link href={nextHref} className="bb-btn">
                {nextLabel ?? "Continuar"}
              </Link>
            ) : null}
            <Link href={backHref} className={`bb-btn ${nextHref && !saving ? "bb-btn-ghost mt-3" : ""}`}>
              Voltar à trilha
            </Link>
          </>
        )}
      </Foot>
    );

    if (cur === "streak" && bab) {
      return (
        <div className="flex min-h-[85dvh] flex-col text-center">
          <div className="flex flex-1 flex-col items-center justify-center">
            <div className="bb-pop">
              <IcoFlame className="mx-auto h-32 w-32" />
            </div>
            <p className="bb-pop mt-2 text-7xl font-black text-[var(--bb-orange)]">{bab.streak}</p>
            <h2 className="mt-1 text-2xl font-extrabold text-[var(--bb-orange)]">{bab.streak === 1 ? "dia de ofensiva!" : "dias de ofensiva!"}</h2>
            <div className="bb-card mt-6 w-full p-4">
              <div className="bb-week">
                {WEEK_LETTERS.map((l, i) => (
                  <div key={i} className={`bb-day ${bab.week[i] ? "on" : ""} ${i === bab.dow ? "today" : ""}`}>
                    <i>{bab.week[i] ? <IcoCheck className="h-5 w-5" /> : null}</i>
                    {l}
                  </div>
                ))}
              </div>
            </div>
            <p className="bb-sub mt-4">{bab.froze ? "Seu congelamento salvou a ofensiva!" : bab.streak === 1 ? "Volte amanhã para manter a ofensiva." : "Continue amanhã para ela crescer."}</p>
            {bab.milestone_gems ? (
              <p className="mt-3 flex items-center justify-center gap-1 rounded-2xl bg-[var(--bb-sel-bg)] px-4 py-2 text-base font-extrabold text-[var(--bb-sel-ink)]">
                Marco de ofensiva! +{bab.milestone_gems} <IcoGem className="h-5 w-5" />
              </p>
            ) : null}
          </div>
          {footer}
        </div>
      );
    }

    if (cur === "goal" && bab) {
      return (
        <div className="flex min-h-[85dvh] flex-col text-center">
          <div className="flex flex-1 flex-col items-center justify-center">
            <div className="bb-ring bb-pop !h-36 !w-36" style={{ ["--p" as string]: 100 }}>
              <span className="!h-28 !w-28">
                <IcoCheck className="h-14 w-14 text-[var(--bb-green)]" />
              </span>
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-[var(--bb-green)]">Meta diária concluída!</h2>
            <p className="bb-sub mt-2">
              Você fez {bab.day_xp} XP hoje (meta: {bab.goal}).
            </p>
            <p className="mt-3 flex items-center justify-center gap-1 text-lg font-extrabold text-[var(--bb-blue)]">
              +10 <IcoGem className="h-6 w-6" />
            </p>
          </div>
          {footer}
        </div>
      );
    }

    return (
      <div className="flex min-h-[85dvh] flex-col text-center">
        <div className="flex flex-1 flex-col items-center justify-center">
          {stars ? (
            <p className="bb-pop flex gap-1 text-[var(--bb-gold)]" aria-label={`${stars} estrelas`}>
              {[1, 2, 3].map((s) => (
                <IcoStar key={s} className={`${s === 2 ? "h-20 w-20 -translate-y-3" : "h-14 w-14"} ${s <= stars ? "" : "opacity-25"}`} />
              ))}
            </p>
          ) : (
            <IcoCheck className="h-20 w-20 text-[var(--bb-green)]" />
          )}
          <h2 className="mt-5 text-3xl font-extrabold text-[var(--bb-gold)]">{heading}</h2>
          <div className="mt-6 flex w-full max-w-xs gap-3">
            <div className="bb-stat" style={{ ["--c" as string]: "var(--bb-gold)" }}>
              <b>XP</b>
              <span className="flex items-center justify-center gap-1">
                <IcoBolt className="h-6 w-6" />
                {saving ? "…" : bab?.xp ?? 0}
              </span>
            </div>
            <div className="bb-stat" style={{ ["--c" as string]: "var(--bb-blue)" }}>
              <b>Gemas</b>
              <span className="flex items-center justify-center gap-1">
                <IcoGem className="h-6 w-6" />
                {saving ? "…" : bab?.gems ?? 0}
              </span>
            </div>
            <div className="bb-stat" style={{ ["--c" as string]: "var(--bb-green)" }}>
              <b>Precisão</b>
              <span>{accuracy}%</span>
            </div>
          </div>
          {bab?.perfect && mode !== "practice" ? <p className="mt-4 text-base font-extrabold text-[var(--bb-gold)]">Sem erros! Bônus de XP e gemas.</p> : null}
          {bab?.boosted ? (
            <p className="mt-2 flex items-center justify-center gap-1 text-sm font-extrabold text-[var(--bb-purple)]">
              <IcoBoost className="h-5 w-5" /> XP em dobro ativo
            </p>
          ) : null}
          {bab?.heart_gain ? (
            <p className="mt-2 flex items-center justify-center gap-1 text-sm font-extrabold text-[var(--bb-red)]">
              <IcoHeart className="h-5 w-5" /> +1 coração
            </p>
          ) : null}
          {startU ? <p className="mt-5 rounded-2xl bg-[var(--bb-sel-bg)] px-4 py-3 text-base font-extrabold text-[var(--bb-sel-ink)]">Você começa na Unidade {startU}</p> : null}
          {res?.error ? <p className="mt-4 rounded-2xl bg-[var(--bb-bad-bg)] px-3 py-2 text-sm font-extrabold text-[var(--bb-bad-ink)]">{res.error}</p> : null}
          {res && !res.error && res.valid === false ? <p className="bb-sub mt-4">Rápido demais para valer XP: leia e pense em cada resposta.</p> : null}
        </div>
        {footer}
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
  const tone = out ? (out.ok && !out.typo ? "ok" : out.ok ? "warn" : "bad") : "ok";

  return (
    <div className="pb-2">
      <div className="mb-6 flex items-center gap-4">
        <Link href={backHref} className="text-[var(--bb-mute)]" aria-label="Sair da lição">
          <IcoClose />
        </Link>
        <div className="bb-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={title}>
          <i style={{ width: `${pct}%` }} />
        </div>
        {heartsOn ? (
          <span className="bb-chip" style={{ color: "var(--bb-red)" }} aria-label={`${hp} corações`}>
            <IcoHeart />
            {hp}
          </span>
        ) : null}
      </div>
      {view()}

      {out ? (
        <div className={`bb-sheet ${tone}`}>
          <div className="bb-sheet-in">
            <p className="bb-sheet-t">
              <span className="bb-sheet-dot">{out.ok ? <IcoCheck className="h-5 w-5 text-[var(--bb-green)]" /> : <IcoClose className="h-5 w-5 text-[var(--bb-red)]" />}</span>
              {out.ok ? (out.typo ? "Quase! Confira a escrita" : "Correto!") : "Resposta correta:"}
            </p>
            {out.typo || !out.ok ? <p className="mt-1 text-base font-bold">{out.expected}</p> : null}
            {!out.ok && mode === "lesson" ? <p className="mt-1 text-xs font-bold opacity-80">Esse exercício volta no fim da lição.</p> : null}
            {explain ? (
              <div className="mt-2 rounded-2xl bg-white/70 px-3 py-2 text-sm font-bold text-[#4b4b4b]">
                <p className="font-extrabold">Por quê?</p>
                {why ? <p className="mt-1">Você escolheu uma opção que não serve: {why}</p> : null}
                <p className="mt-1">{ex.ex}</p>
              </div>
            ) : null}
            <div className="mt-2 flex items-center gap-3">
              <button type="button" onClick={() => setExplain((v) => !v)} className="bb-link flex items-center gap-1 !text-current">
                <IcoSparkle /> Explicar
              </button>
              <button
                type="button"
                disabled={reported}
                onClick={() => {
                  setReported(true);
                  void reportEnglishContent(ex.id);
                }}
                className="bb-link !text-current opacity-70 disabled:no-underline"
              >
                {reported ? "Obrigado!" : "Reportar"}
              </button>
            </div>
            <button type="button" onClick={() => void next()} className={`bb-btn mt-2 ${out.ok ? "" : "bb-btn-red"}`}>
              {idx + 1 < queue.length ? "Continuar" : "Terminar"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
