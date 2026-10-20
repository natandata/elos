"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { finishEnglish, type EnglishResult } from "@/lib/actions/english";
import { gradeRoleplayTyped, roleplayReport } from "@/lib/english/grade";
import { canSpeak, speak, stopSpeaking } from "@/lib/english/speak";
import type { Roleplay, RpReport, TurnResult } from "@/lib/english/types";

// Conversa roteirizada: a personagem fala, você escolhe uma resposta pronta ou digita a sua. Sem IA: as respostas são
// avaliadas por regras. No fim, um relatório de precisão e complexidade, dicas e frases novas.

type Feedback = { q: 0 | 1 | 2; text: string };

export function RoleplayPlayer({ rp, backHref, nextHref }: { rp: Roleplay; backHref: string; nextHref?: string }) {
  const [started, setStarted] = useState(false);
  const [turn, setTurn] = useState(0);
  const [results, setResults] = useState<TurnResult[]>([]);
  const [fb, setFb] = useState<Feedback | null>(null);
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState("");
  const [showPt, setShowPt] = useState(false);
  const [report, setReport] = useState<RpReport | null>(null);
  const [saved, setSaved] = useState<EnglishResult | null>(null);
  const startedAt = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);

  const t = rp.turns[turn];

  useEffect(() => {
    if (started && !fb) speak(t.npc.en);
    return () => stopSpeaking();
  }, [started, turn, fb, t]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turn, fb, report]);

  function reply(en: string, q: 0 | 1 | 2, why?: string) {
    setResults((r) => [...r, { turn, reply: en, q }]);
    setFb({ q, text: q === 2 ? "Ótimo! 🎉" : q === 1 ? `Quase! ${why ?? t.tip}` : `Ainda não: ${why ?? t.tip}` });
    setTyping(false);
    setText("");
  }

  async function next() {
    setFb(null);
    if (turn + 1 < rp.turns.length) {
      setTurn(turn + 1);
      return;
    }
    const all = results;
    const rep = roleplayReport(rp.turns, all);
    setReport(rep);
    try {
      setSaved(await finishEnglish({ kind: "roleplay", key: rp.id, correct: rep.accuracy, total: rp.turns.length, secs: Math.round((Date.now() - startedAt.current) / 1000), complexity: rep.complexity, turns: all }));
    } catch {
      setSaved({ error: "Sem conexão: a conversa não foi salva." });
    }
  }

  function restart() {
    setTurn(0);
    setResults([]);
    setFb(null);
    setReport(null);
    setSaved(null);
    setText("");
    setTyping(false);
    startedAt.current = Date.now();
  }

  if (!started) {
    return (
      <div className="mx-auto max-w-md text-center">
        <p className="text-6xl" aria-hidden>
          {rp.emoji}
        </p>
        <h2 className="mt-2 text-2xl font-black">{rp.title}</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">{rp.intro}</p>
        <div className="card mt-4 flex items-center gap-3 p-3 text-left">
          <span className="text-4xl" aria-hidden>
            {rp.who.emoji}
          </span>
          <div>
            <p className="font-black">{rp.who.name}</p>
            <p className="text-xs text-[var(--muted)]">{rp.who.role}</p>
          </div>
        </div>
        <p className="mt-3 text-xs font-semibold text-[var(--muted)]">São {rp.turns.length} falas. Escolha uma resposta pronta ou digite a sua. Não se preocupe com erros: aqui é para praticar.</p>
        <button
          type="button"
          onClick={() => {
            startedAt.current = Date.now();
            setStarted(true);
          }}
          className="btn btn-primary mt-5 w-full !py-3 text-base"
        >
          Começar a conversa
        </button>
        <Link href={backHref} className="btn btn-ghost mt-2 w-full">
          Voltar
        </Link>
      </div>
    );
  }

  const bubbles = rp.turns.slice(0, turn + 1).map((tt, i) => {
    const r = results.find((x) => x.turn === i);
    return (
      <div key={i} className="space-y-2">
        <div className="flex items-end gap-2">
          <span className="text-3xl" aria-hidden>
            {rp.who.emoji}
          </span>
          <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-[var(--card)] px-4 py-3 shadow-sm ring-1 ring-[var(--line)]">
            <p className="text-base font-bold">{tt.npc.en}</p>
            {showPt ? <p className="mt-1 text-sm text-[var(--muted)]">{tt.npc.pt}</p> : null}
            <button type="button" onClick={() => speak(tt.npc.en)} className="mt-1 text-xs font-black text-[var(--accent-strong)]" aria-label="Ouvir a fala">
              {canSpeak() ? "🔊 ouvir" : ""}
            </button>
          </div>
        </div>
        {r ? (
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-[var(--accent)] px-4 py-3 text-[var(--accent-ink)]">
              <p className="text-base font-bold">{r.reply}</p>
            </div>
          </div>
        ) : null}
      </div>
    );
  });

  if (report) {
    return (
      <div className="mx-auto max-w-md pb-6">
        <div className="space-y-3">{bubbles}</div>
        <div className="card mt-5 p-4 text-center">
          <p className="text-5xl" aria-hidden>
            {report.accuracy >= 80 ? "🏆" : report.accuracy >= 50 ? "👏" : "💪"}
          </p>
          <h2 className="mt-1 text-xl font-black">Conversa concluída!</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 text-left">
            <div className="rounded-2xl bg-[var(--accent-soft)] p-3">
              <p className="text-xs font-bold text-[var(--muted)]">Precisão</p>
              <p className="text-3xl font-black tabular-nums">{report.accuracy}%</p>
            </div>
            <div className="rounded-2xl bg-[var(--accent-soft)] p-3">
              <p className="text-xs font-bold text-[var(--muted)]">Complexidade</p>
              <p className="text-3xl font-black tabular-nums">{report.complexity}%</p>
            </div>
          </div>
          <p className="mt-2 text-sm font-semibold">{report.complexityLabel}</p>
          {saved?.error ? <p className="mt-2 rounded-2xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-900">{saved.error}</p> : null}
          {saved && !saved.error && saved.xp ? <p className="mt-2 rounded-2xl bg-emerald-50 px-3 py-2 text-base font-black text-emerald-900">+{saved.xp} XP 🎉</p> : null}
          {saved && !saved.error && !saved.xp && saved.valid ? <p className="mt-2 text-xs font-semibold text-[var(--muted)]">Você já ganhou o XP de conversa de hoje.</p> : null}
          {saved && !saved.error && saved.valid === false ? <p className="mt-2 text-xs font-semibold text-[var(--muted)]">Rápido demais para valer XP: leia cada fala com calma.</p> : null}
        </div>
        {report.tips.length ? (
          <div className="card mt-3 p-4">
            <p className="text-sm font-black">💡 Dicas para a próxima</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
              {report.tips.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="card mt-3 p-4">
          <p className="text-sm font-black">🗣️ Frases para levar</p>
          <ul className="mt-1 space-y-2">
            {report.phrases.map((p) => (
              <li key={p} className="flex items-center justify-between gap-2 rounded-xl bg-[var(--accent-soft)] px-3 py-2 text-sm font-bold">
                <span>{p}</span>
                {canSpeak() ? (
                  <button type="button" onClick={() => speak(p)} aria-label={`Ouvir: ${p}`}>
                    🔊
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
        <button type="button" onClick={restart} className="btn btn-soft mt-4 w-full !py-3">
          Conversar de novo
        </button>
        {nextHref ? (
          <Link href={nextHref} className="btn btn-primary mt-2 w-full !py-3">
            Continuar a trilha
          </Link>
        ) : null}
        <Link href={backHref} className="btn btn-ghost mt-2 w-full">
          Voltar à trilha
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md pb-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <Link href={backHref} className="text-xl font-black text-[var(--muted)]" aria-label="Sair da conversa">
          ✕
        </Link>
        <p className="text-sm font-black">
          {rp.who.name} · {turn + 1}/{rp.turns.length}
        </p>
        <button type="button" onClick={() => setShowPt((v) => !v)} className="btn btn-ghost !px-3 !py-1.5 text-xs">
          {showPt ? "Ocultar tradução" : "Ver tradução"}
        </button>
      </div>

      <div className="space-y-3">{bubbles}</div>

      {fb ? (
        <div className={`mt-4 rounded-2xl border-2 px-4 py-3 ${fb.q === 2 ? "border-emerald-300 bg-emerald-50 text-emerald-950" : fb.q === 1 ? "border-amber-300 bg-amber-50 text-amber-950" : "border-rose-300 bg-rose-50 text-rose-950"}`}>
          <p className="text-sm font-bold">{fb.text}</p>
          {fb.q < 2 ? (
            <p className="mt-1 text-sm">
              Mais natural: <b>{t.model}</b>
            </p>
          ) : null}
          <button type="button" onClick={() => void next()} className="btn btn-primary mt-2 w-full !py-2.5">
            {turn + 1 < rp.turns.length ? "Continuar" : "Ver o relatório"}
          </button>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-sm font-black">{t.you}</p>
          {typing ? (
            <form
              className="mt-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!text.trim()) return;
                const q = gradeRoleplayTyped(text, t);
                reply(text.trim(), q, q === 0 ? t.tip : undefined);
              }}
            >
              <input value={text} onChange={(e) => setText(e.target.value)} autoFocus autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="Digite sua resposta em inglês" className="w-full rounded-2xl border-2 border-[var(--line)] bg-[var(--card)] px-4 py-3 text-base font-bold outline-none focus:border-[var(--accent)]" aria-label="Sua resposta em inglês" />
              <div className="mt-2 flex gap-2">
                <button type="submit" disabled={!text.trim()} className="btn btn-primary flex-1 !py-2.5">
                  Enviar
                </button>
                <button type="button" onClick={() => setTyping(false)} className="btn btn-ghost !px-4">
                  Ver ideias
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-2 grid gap-2">
              {(t.options ?? []).map((o) => (
                <button key={o.en} type="button" onClick={() => reply(o.en, o.q, o.q === 2 ? undefined : o.why)} className="rounded-2xl border-2 border-[var(--line)] bg-[var(--card)] px-4 py-3 text-left text-base font-bold transition active:scale-[0.99]">
                  {o.en}
                </button>
              ))}
              <button type="button" onClick={() => setTyping(true)} className="btn btn-soft !py-2.5">
                ✍️ Digitar a minha resposta
              </button>
            </div>
          )}
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
