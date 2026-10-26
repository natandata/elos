"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { finishEnglish, type EnglishResult } from "@/lib/actions/english";
import { gradeRoleplayTyped, roleplayReport } from "@/lib/english/grade";
import { canSpeak, speak, stopSpeaking } from "@/lib/english/speak";
import type { Roleplay, RpReport, TurnResult } from "@/lib/english/types";
import { IcoBolt, IcoCheck, IcoClose, IcoSpeaker } from "./icons";

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
      <div className="flex min-h-[85dvh] flex-col text-center">
        <div className="flex flex-1 flex-col items-center justify-center">
        <p className="text-7xl" aria-hidden>
          {rp.emoji}
        </p>
        <h2 className="bb-h mt-3 text-3xl">{rp.title}</h2>
        <p className="bb-sub mt-1">{rp.intro}</p>
        <div className="bb-card mt-5 flex w-full items-center gap-3 p-3 text-left">
          <span className="text-4xl" aria-hidden>
            {rp.who.emoji}
          </span>
          <div>
            <p className="font-extrabold">{rp.who.name}</p>
            <p className="bb-sub text-xs">{rp.who.role}</p>
          </div>
        </div>
        <p className="bb-sub mt-3 text-xs">São {rp.turns.length} falas. Escolha uma resposta pronta ou digite a sua. Não se preocupe com erros: aqui é para praticar.</p>
        </div>
        <div className="bb-foot">
        <button
          type="button"
          onClick={() => {
            startedAt.current = Date.now();
            setStarted(true);
          }}
          className="bb-btn"
        >
          Começar a conversa
        </button>
        <Link href={backHref} className="bb-btn bb-btn-ghost mt-3">
          Voltar
        </Link>
        </div>
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
          <div className="bb-bubble max-w-[82%] !rounded-bl-sm">
            <p className="text-base font-bold">{tt.npc.en}</p>
            {showPt ? <p className="bb-sub mt-1">{tt.npc.pt}</p> : null}
            {canSpeak() ? (
              <button type="button" onClick={() => speak(tt.npc.en, 0.9, undefined, true)} className="mt-1 text-[var(--bb-blue)]" aria-label="Ouvir a fala">
                <IcoSpeaker className="h-6 w-6" />
              </button>
            ) : null}
          </div>
        </div>
        {r ? (
          <div className="flex justify-end">
            <div className="max-w-[82%] rounded-2xl rounded-br-sm border-2 border-[var(--bb-sel-line)] bg-[var(--bb-sel-bg)] px-4 py-3 text-[var(--bb-sel-ink)]">
              <p className="text-base font-bold">{r.reply}</p>
            </div>
          </div>
        ) : null}
      </div>
    );
  });

  if (report) {
    return (
      <div className="pb-6">
        <div className="space-y-3">{bubbles}</div>
        <div className="mt-6 text-center">
          <p className="text-6xl" aria-hidden>
            {report.accuracy >= 80 ? "🏆" : report.accuracy >= 50 ? "👏" : "💪"}
          </p>
          <h2 className="mt-2 text-3xl font-extrabold text-[var(--bb-gold)]">Conversa concluída!</h2>
          <div className="mx-auto mt-5 flex max-w-xs gap-3">
            <div className="bb-stat" style={{ ["--c" as string]: "var(--bb-gold)" }}>
              <b>XP</b>
              <span className="flex items-center justify-center gap-1">
                <IcoBolt className="h-6 w-6" />
                {saved && !saved.error ? saved.xp ?? 0 : "…"}
              </span>
            </div>
            <div className="bb-stat" style={{ ["--c" as string]: "var(--bb-green)" }}>
              <b>Precisão</b>
              <span>{report.accuracy}%</span>
            </div>
            <div className="bb-stat" style={{ ["--c" as string]: "var(--bb-blue)" }}>
              <b>Nível</b>
              <span>{report.complexity}%</span>
            </div>
          </div>
          <p className="mt-3 text-sm font-bold">{report.complexityLabel}</p>
          {saved?.error ? <p className="mt-2 rounded-2xl bg-[var(--bb-bad-bg)] px-3 py-2 text-sm font-extrabold text-[var(--bb-bad-ink)]">{saved.error}</p> : null}
          {saved && !saved.error && !saved.xp && saved.valid ? <p className="bb-sub mt-2 text-xs">Você já ganhou o XP de conversa de hoje.</p> : null}
          {saved && !saved.error && saved.valid === false ? <p className="bb-sub mt-2 text-xs">Rápido demais para valer XP: leia cada fala com calma.</p> : null}
        </div>
        {report.tips.length ? (
          <div className="bb-card mt-5 p-4">
            <p className="text-sm font-extrabold uppercase tracking-wide">Dicas para a próxima</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
              {report.tips.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="bb-card mt-3 p-4">
          <p className="text-sm font-extrabold uppercase tracking-wide">Frases para levar</p>
          <ul className="mt-1 space-y-2">
            {report.phrases.map((p) => (
              <li key={p} className="flex items-center justify-between gap-2 rounded-xl bg-[var(--bb-sel-bg)] px-3 py-2 text-sm font-bold text-[var(--bb-sel-ink)]">
                <span>{p}</span>
                {canSpeak() ? (
                  <button type="button" onClick={() => speak(p, 0.9, undefined, true)} aria-label={`Ouvir: ${p}`}>
                    <IcoSpeaker className="h-6 w-6" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
        <div className="bb-foot">
        {nextHref ? (
          <Link href={nextHref} className="bb-btn">
            Continuar a trilha
          </Link>
        ) : (
          <Link href={backHref} className="bb-btn">
            Voltar à trilha
          </Link>
        )}
        <button type="button" onClick={restart} className="bb-btn bb-btn-ghost mt-3">
          Conversar de novo
        </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-6">
      <div className="mb-5 flex items-center gap-4">
        <Link href={backHref} className="text-[var(--bb-mute)]" aria-label="Sair da conversa">
          <IcoClose />
        </Link>
        <div className="bb-bar" role="progressbar" aria-valuenow={turn + 1} aria-valuemin={0} aria-valuemax={rp.turns.length} aria-label={rp.title}>
          <i style={{ width: `${Math.round(((turn + (fb ? 1 : 0)) / rp.turns.length) * 100)}%` }} />
        </div>
        <button type="button" onClick={() => setShowPt((v) => !v)} className="bb-link whitespace-nowrap">
          {showPt ? "Ocultar PT" : "Ver PT"}
        </button>
      </div>

      <div className="space-y-3">{bubbles}</div>

      {fb ? (
        <div className={`bb-sheet ${fb.q === 2 ? "ok" : fb.q === 1 ? "warn" : "bad"}`}>
          <div className="bb-sheet-in">
            <p className="bb-sheet-t">
              <span className="bb-sheet-dot">{fb.q === 0 ? <IcoClose className="h-5 w-5 text-[var(--bb-red)]" /> : <IcoCheck className="h-5 w-5 text-[var(--bb-ok)]" />}</span>
              {fb.q === 2 ? "Ótimo!" : fb.q === 1 ? "Quase!" : "Ainda não"}
            </p>
            <p className="mt-1 text-sm font-bold">{fb.text.replace(/^(Ótimo! 🎉|Quase! |Ainda não: )/, "")}</p>
            {fb.q < 2 ? (
              <p className="mt-1 text-sm font-bold">
                Mais natural: <b>{t.model}</b>
              </p>
            ) : null}
            <button type="button" onClick={() => void next()} className={`bb-btn mt-3 ${fb.q === 0 ? "bb-btn-red" : ""}`}>
              {turn + 1 < rp.turns.length ? "Continuar" : "Ver o relatório"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <p className="bb-sub text-sm">{t.you}</p>
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
              <input value={text} onChange={(e) => setText(e.target.value)} autoFocus autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="Digite sua resposta em inglês" className="bb-input" aria-label="Sua resposta em inglês" />
              <div className="mt-2 flex gap-2">
                <button type="submit" disabled={!text.trim()} className="bb-btn flex-1">
                  Enviar
                </button>
                <button type="button" onClick={() => setTyping(false)} className="bb-btn bb-btn-ghost !w-auto px-4">
                  Ideias
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-2 grid gap-2">
              {(t.options ?? []).map((o) => (
                <button key={o.en} type="button" onClick={() => reply(o.en, o.q, o.q === 2 ? undefined : o.why)} className="bb-opt">
                  {o.en}
                </button>
              ))}
              <button type="button" onClick={() => setTyping(true)} className="bb-btn bb-btn-ghost mt-1">
                Digitar a minha resposta
              </button>
            </div>
          )}
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
