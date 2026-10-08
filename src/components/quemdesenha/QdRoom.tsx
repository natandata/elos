"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Chat, DrawOp, PlayerPub, PubState } from "@/lib/quemdesenha/host";
import type { Choice, Session } from "@/lib/quemdesenha/net";
import { MAX_PLAYERS, MIN_PLAYERS, matchStars, type MatchReport, type Settings } from "@/lib/quemdesenha/rules";
import { CATEGORY_LABEL, CULTURES, LEVEL_LABEL, type Category } from "@/lib/quemdesenha/words";
import { DrawBoard, type BoardApi } from "./DrawBoard";
import { QT } from "./QdIcons";

type Saved = { stars?: number; error?: string };

const secs = (ms: number) => Math.ceil(Math.max(0, ms) / 1000);

function Chip({ on, children, onClick, disabled }: { on: boolean; children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={`rounded-full px-3 py-1.5 text-xs font-black transition ${on ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "bg-[var(--line)] text-[var(--muted)]"} ${disabled ? "opacity-60" : "active:scale-95"}`}>
      {children}
    </button>
  );
}

/** A sala: lobby, partida, revelação e ranking. Todo o estado vem do anfitrião; aqui só se mostra e se pede. */
export function QdRoom({ session, training, onLeave, onFinished }: { session: Session; training: boolean; onLeave: () => void; onFinished: (r: MatchReport) => Promise<Saved> }) {
  const [s, setS] = useState<PubState | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [choices, setChoices] = useState<Choice[] | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [deadline, setDeadline] = useState(0);
  const [tick, setTick] = useState(0);
  const [closed, setClosed] = useState<string | null>(null);
  const [guess, setGuess] = useState("");
  const [saved, setSaved] = useState<Saved | null>(null);
  const [copied, setCopied] = useState(false);
  const board = useRef<BoardApi | null>(null);
  const ops = useRef<DrawOp[]>([]);
  const chatBox = useRef<HTMLDivElement>(null);
  const startedAt = useRef(0);
  const reported = useRef(false);
  const mounts = useRef(0);

  const onReady = useCallback((api: BoardApi) => {
    board.current = api;
    api.replay(ops.current);
  }, []);

  useEffect(() => {
    session.on("state", (st) => {
      setS(st);
      setDeadline(performance.now() + st.leftMs);
      if (st.phase === "choosing" && startedAt.current === 0) startedAt.current = performance.now();
      if (st.phase === "choosing") {
        setSecret(null);
        setGuess("");
      }
      if (st.phase !== "choosing") setChoices(null);
      if (st.phase === "lobby") {
        startedAt.current = 0;
        reported.current = false;
        setSaved(null);
        setChats([]);
      }
    });
    session.on("chat", (c) => setChats((l) => [...l.slice(-79), c]));
    session.on("choices", (w) => setChoices(w));
    session.on("secret", (t) => setSecret(t));
    session.on("op", (_from, op) => {
      if (op.k === "c") ops.current = [];
      else ops.current.push(op);
      board.current?.apply(op);
    });
    session.on("canvas", (list) => {
      ops.current = [...list];
      board.current?.replay(list);
    });
    session.on("closed", (r) => setClosed(r));
    session.begin?.();
    const t = setInterval(() => setTick(performance.now()), 250);
    mounts.current++;
    const n = mounts.current;
    return () => {
      clearInterval(t);
      // no modo de desenvolvimento o React monta, desmonta e monta de novo: só fecha a sala se ninguém a reassumiu
      setTimeout(() => {
        // eslint-disable-next-line react-hooks/exhaustive-deps -- o contador precisa do valor de agora, não do de quando o efeito rodou
        if (mounts.current === n) session.close();
      }, 150);
    };
  }, [session]);

  useEffect(() => {
    const el = chatBox.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chats]);

  // fim da partida: manda o resultado de quem jogou (a sala de treino não vale estrelas)
  useEffect(() => {
    if (!s || s.phase !== "end" || reported.current) return;
    reported.current = true;
    const ranked = [...s.players].sort((a, b) => b.score - a.score);
    const mine = ranked.find((p) => p.id === session.me.id);
    if (!mine || training) return;
    const place = ranked.findIndex((p) => p.score === mine.score) + 1;
    const report: MatchReport = { players: s.players.filter((p) => !p.bot).length, place, score: mine.score, drawings: mine.drawings, guesses: mine.guesses, seconds: Math.round((performance.now() - startedAt.current) / 1000) };
    void onFinished(report).then(setSaved);
  }, [s, session, training, onFinished]);

  const sendOp = useCallback(
    (op: DrawOp) => {
      if (op.k === "c") ops.current = [];
      else ops.current.push(op);
      session.sendOp(op);
    },
    [session],
  );

  if (closed) {
    return (
      <div className="card p-6 text-center">
        <p className="text-5xl" aria-hidden><QT>🚪</QT></p>
        <p className="mt-2 text-lg font-black">{closed}</p>
        <button type="button" onClick={onLeave} className="btn btn-primary mt-4 !py-3">Voltar</button>
      </div>
    );
  }
  if (!s) return <p className="card p-6 text-center text-sm font-bold">Entrando na sala…</p>;

  const me = s.players.find((p) => p.id === session.me.id);
  const isHost = session.isHost;
  const iDraw = s.drawerId === session.me.id;
  const drawer = s.players.find((p) => p.id === s.drawerId);
  const left = deadline - tick;
  const total = s.totalMs || 1;

  const leave = () => {
    if (s.phase !== "lobby" && s.phase !== "end" && !window.confirm("Sair da partida?")) return;
    onLeave();
  };
  const change = (patch: Partial<Settings>) => session.send({ t: "settings", settings: patch });
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(s.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // sem permissão de área de transferência: o código está na tela
    }
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = guess.trim();
    if (!t) return;
    session.send({ t: "guess", text: t });
    setGuess("");
  };

  // ---------------------------------------------------------------- lobby
  if (s.phase === "lobby") {
    const st = s.settings;
    const can = s.players.length >= MIN_PLAYERS;
    return (
      <div className="space-y-3">
        <section className="card p-4 text-center">
          <p className="text-xs font-black uppercase tracking-wider text-[var(--muted)]">{training ? "Sala de treino" : "Código da sala"}</p>
          {training ? null : (
            <button type="button" onClick={() => void copy()} className="mx-auto mt-1 block rounded-2xl bg-[var(--accent-soft)] px-6 py-2 text-4xl font-black tracking-[0.3em] text-[var(--accent-strong)] active:scale-95">
              {s.code}
            </button>
          )}
          {training ? null : <p className="mt-1 text-[11px] font-bold text-[var(--muted)]">{copied ? "Código copiado!" : "Toque no código para copiar e passe para os amigos."}</p>}
        </section>

        <section className="card p-4">
          <p className="text-sm font-black"><QT>🎨 Jogadores (</QT>{s.players.length}/{st.maxPlayers})</p>
          <ul className="mt-2 grid grid-cols-2 gap-2">
            {s.players.map((p) => (
              <li key={p.id} className="flex items-center gap-2 rounded-xl bg-[var(--line)]/60 px-3 py-2 text-sm font-bold">
                <span aria-hidden>{p.id === s.hostId ? <QT>{"👑"}</QT> : p.bot ? <QT>{"🤖"}</QT> : <QT>{"🙂"}</QT>}</span>
                <span className="truncate">{p.name}</span>
                {p.id === session.me.id ? <span className="ml-auto text-[10px] text-[var(--muted)]">você</span> : null}
              </li>
            ))}
          </ul>
          {!can ? <p className="mt-2 text-xs font-bold text-amber-700">Faltam jogadores: precisa de pelo menos {MIN_PLAYERS}.</p> : null}
        </section>

        <section className="card space-y-3 p-4">
          <p className="text-sm font-black"><QT>⚙️ Ajustes </QT>{isHost ? "" : "(só o anfitrião muda)"}</p>
          <div>
            <p className="mb-1 text-[11px] font-black uppercase text-[var(--muted)]">Tema</p>
            <div className="flex flex-wrap gap-1.5">
              {CULTURES.map((c) => (
                <Chip key={c.key} on={st.culture === c.key} disabled={!isHost} onClick={() => change({ culture: c.key })}>
                  <QT>{c.emoji}</QT> {c.name}
                </Chip>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-[var(--muted)]">{CULTURES.find((c) => c.key === st.culture)?.hint}</p>
          </div>
          <div>
            <p className="mb-1 text-[11px] font-black uppercase text-[var(--muted)]">Categoria</p>
            <div className="flex flex-wrap gap-1.5">
              <Chip on={st.category === "todas"} disabled={!isHost} onClick={() => change({ category: "todas" })}>Todas</Chip>
              {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => (
                <Chip key={c} on={st.category === c} disabled={!isHost} onClick={() => change({ category: c })}>
                  <QT>{CATEGORY_LABEL[c].emoji}</QT> {CATEGORY_LABEL[c].name}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 text-[11px] font-black uppercase text-[var(--muted)]">Dificuldade</p>
            <div className="flex flex-wrap gap-1.5">
              <Chip on={st.level === "mista"} disabled={!isHost} onClick={() => change({ level: "mista" })}><QT>🎲 Mista</QT></Chip>
              {(["facil", "medio", "dificil"] as const).map((l) => (
                <Chip key={l} on={st.level === l} disabled={!isHost} onClick={() => change({ level: l })}>
                  <QT>{LEVEL_LABEL[l].emoji}</QT> {LEVEL_LABEL[l].name}
                </Chip>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-1 text-[11px] font-black uppercase text-[var(--muted)]">Rodadas</p>
              <div className="flex flex-wrap gap-1.5">
                {[1, 2, 3, 4].map((n) => (
                  <Chip key={n} on={st.rounds === n} disabled={!isHost} onClick={() => change({ rounds: n })}>{n}</Chip>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1 text-[11px] font-black uppercase text-[var(--muted)]">Tempo p/ desenhar</p>
              <div className="flex flex-wrap gap-1.5">
                {[30, 45, 60, 90].map((n) => (
                  <Chip key={n} on={st.drawSeconds === n} disabled={!isHost} onClick={() => change({ drawSeconds: n })}>{n}s</Chip>
                ))}
              </div>
            </div>
          </div>
          {training ? (
            <div>
              <p className="mb-1 text-[11px] font-black uppercase text-[var(--muted)]">Jogadores do computador</p>
              <div className="flex flex-wrap gap-1.5">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <Chip key={n} on={st.bots === n} onClick={() => change({ bots: n })}>{n}</Chip>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <p className="mb-1 text-[11px] font-black uppercase text-[var(--muted)]">Máximo de jogadores</p>
              <div className="flex flex-wrap gap-1.5">
                {[4, 6, 8, MAX_PLAYERS].map((n) => (
                  <Chip key={n} on={st.maxPlayers === n} disabled={!isHost} onClick={() => change({ maxPlayers: n })}>{n}</Chip>
                ))}
              </div>
            </div>
          )}
          <p className="text-[11px] text-[var(--muted)]">
            Cada pessoa desenha {st.rounds} vez{st.rounds > 1 ? "es" : ""}. Modo desta versão: <b>Desenho Livre</b>. Em breve: Versículo Misterioso, Quem Sou Eu?, História em 60 s, Desenho às Cegas e Duelo.
          </p>
        </section>

        {isHost ? (
          <button type="button" disabled={!can} onClick={() => session.send({ t: "start" })} className="btn btn-primary w-full !py-3 !text-base disabled:opacity-50"><QT>
            ▶ Iniciar partida
          </QT></button>
        ) : (
          <p className="rounded-2xl bg-[var(--line)] p-3 text-center text-sm font-bold">Esperando o anfitrião iniciar…</p>
        )}
        <button type="button" onClick={leave} className="btn btn-ghost w-full">← Sair da sala</button>
      </div>
    );
  }

  // ---------------------------------------------------------------- fim
  if (s.phase === "end") {
    const ranked = [...s.players].sort((a, b) => b.score - a.score);
    const places = ranked.map((p) => ranked.findIndex((o) => o.score === p.score) + 1);
    const win = ranked[0];
    const stars = me ? matchStars({ players: s.players.filter((p) => !p.bot).length, place: places[ranked.indexOf(me)], score: me.score, drawings: me.drawings, guesses: me.guesses, seconds: 0 }) : 0;
    return (
      <div className="space-y-3">
        <section className="card p-5 text-center">
          <p className="text-6xl" aria-hidden><QT>🏆</QT></p>
          <p className="mt-1 text-2xl font-black">{win?.id === session.me.id ? "Você venceu!" : `${win?.name} venceu!`}</p>
          <ol className="mt-4 space-y-2 text-left">
            {ranked.map((p, i) => (
              <li key={p.id} className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 ${i === 0 ? "bg-amber-100 text-amber-950" : "bg-[var(--line)]/60"}`}>
                <span className="w-7 text-center text-xl font-black"><QT>{["🥇", "🥈", "🥉"][places[i] - 1] ?? places[i]}</QT></span>
                <span className="min-w-0 flex-1 truncate font-black">{p.name}{p.id === session.me.id ? " (você)" : ""}</span>
                <span className="text-xs font-bold opacity-70"><QT>🎯 </QT>{p.guesses}<QT> · 🎨 </QT>{p.drawings}</span>
                <span className="text-lg font-black tabular-nums">{p.score}</span>
              </li>
            ))}
          </ol>
          {training ? (
            <p className="mt-3 text-xs text-[var(--muted)]">Treino com o computador não vale estrelas.</p>
          ) : saved?.error ? (
            <p className="mt-3 text-xs font-bold text-rose-700">{saved.error}</p>
          ) : saved?.stars !== undefined ? (
            <p className="mt-3 inline-block rounded-full bg-[var(--accent-soft)] px-4 py-1.5 text-sm font-black text-[var(--accent-strong)]">+{saved.stars}<QT> ⭐ estrelas</QT></p>
          ) : (
            <p className="mt-3 text-xs text-[var(--muted)]">Salvando… (≈ +{stars}<QT> ⭐)</QT></p>
          )}
        </section>
        {isHost ? (
          <button type="button" onClick={() => session.send({ t: "again" })} className="btn btn-primary w-full !py-3 !text-base"><QT>🔁 Jogar de novo</QT></button>
        ) : (
          <p className="rounded-2xl bg-[var(--line)] p-3 text-center text-sm font-bold">O anfitrião pode abrir outra partida.</p>
        )}
        <button type="button" onClick={leave} className="btn btn-ghost w-full">← Sair</button>
      </div>
    );
  }

  // ---------------------------------------------------------------- partida
  const playing = s.phase === "drawing";
  const pct = Math.max(0, Math.min(100, (left / total) * 100));
  const guessed = me?.guessed ?? false;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-black">
        <button type="button" onClick={leave} className="rounded-full bg-[var(--line)] px-3 py-1.5" aria-label="Sair"><QT>✕</QT></button>
        <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1.5 text-[var(--accent-strong)]">Rodada {s.round}/{s.settings.rounds}</span>
        <span className="text-[var(--muted)]">vez {s.turn + 1}/{s.totalTurns}</span>
        <span className={`ml-auto rounded-full px-3 py-1.5 text-base tabular-nums ${secs(left) <= 10 && s.phase !== "reveal" ? "bg-rose-600 text-white" : "bg-[var(--line)]"}`}><QT>⏱ </QT>{secs(left)}s</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--line)]">
        <div className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-200" style={{ width: `${pct}%` }} />
      </div>

      {s.phase === "choosing" ? (
        iDraw ? (
          <section className="card p-4">
            <p className="text-center text-lg font-black">Escolha o que desenhar</p>
            <p className="text-center text-xs text-[var(--muted)]">Se o tempo acabar, sorteamos uma.</p>
            <div className="mt-3 grid gap-2">
              {(choices ?? []).map((c) => (
                <button key={c.i} type="button" onClick={() => session.send({ t: "pick", i: c.i })} className="flex items-center gap-3 rounded-2xl border-2 border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-left active:scale-[0.98]">
                  <span className="text-2xl" aria-hidden><QT>{LEVEL_LABEL[c.level].emoji}</QT></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-black">{c.text}</span>
                    <span className="block text-[11px] font-bold text-[var(--muted)]"><QT>{CATEGORY_LABEL[c.category].emoji}</QT> {CATEGORY_LABEL[c.category].name} · {LEVEL_LABEL[c.level].name}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        ) : (
          <section className="card p-6 text-center">
            <p className="text-5xl" aria-hidden><QT>🎨</QT></p>
            <p className="mt-2 text-lg font-black">{drawer?.name} está escolhendo a palavra…</p>
          </section>
        )
      ) : (
        <>
          <section className="card px-3 py-2 text-center">
            {s.phase === "reveal" ? (
              <p className="text-sm font-black">{drawer?.name} desenhou… e a resposta foi revelada!</p>
            ) : iDraw ? (
              <p className="text-sm font-black">Desenhe: <span className="rounded-lg bg-amber-100 px-2 py-0.5 text-lg text-amber-950">{secret ?? "…"}</span></p>
            ) : (
              <>
                <p className="text-[11px] font-black uppercase tracking-wider text-[var(--muted)]">
                  {drawer?.name} está desenhando · {s.category ? `${CATEGORY_LABEL[s.category].emoji} ${CATEGORY_LABEL[s.category].name}` : ""} {s.level ? `· ${LEVEL_LABEL[s.level].emoji}` : ""}
                </p>
                <p className="whitespace-pre text-xl font-black tracking-[0.15em]">{s.mask}</p>
              </>
            )}
            {/* as duas linhas ficam reservadas: a pista aparecer não empurra o desenho para baixo */}
            {[0, 1].map((i) => (
              <p key={i} className={`mt-1 text-xs font-bold text-amber-700 ${s.hints[i] && s.phase === "drawing" ? "" : "invisible"}`}><QT>💡 </QT>{s.hints[i] ?? "pista"}</p>
            ))}
          </section>

          <div className="relative">
            <DrawBoard canDraw={playing && iDraw} onOp={sendOp} onReady={onReady} />
            {s.phase === "reveal" ? (
              <div className="absolute inset-0 grid place-items-center rounded-2xl bg-black/55 p-3">
                <div className="w-full max-w-xs rounded-2xl bg-zinc-900 p-4 text-center text-zinc-50 shadow-xl">
                  <p className="text-xs font-black uppercase tracking-wider text-zinc-400">A resposta era</p>
                  <p className="text-3xl font-black">{s.word}</p>
                  <ul className="mt-2 space-y-1 text-left text-sm font-bold">
                    {[...s.players]
                      .filter((p) => p.gain > 0)
                      .sort((a, b) => b.gain - a.gain)
                      .map((p) => (
                        <li key={p.id} className="flex justify-between">
                          <span className="truncate">{p.id === s.drawerId ? <QT>{"🎨 "}</QT> : <QT>{"✅ "}</QT>}{p.name}</span>
                          <span className="tabular-nums text-emerald-400">+{p.gain}</span>
                        </li>
                      ))}
                    {s.players.every((p) => p.gain === 0) ? <li className="text-center text-zinc-400">Ninguém pontuou.</li> : null}
                  </ul>
                  <p className="mt-2 text-[11px] text-zinc-400">Próxima vez em {secs(left)}s…</p>
                </div>
              </div>
            ) : null}
          </div>
        </>
      )}

      <Scoreboard players={s.players} drawerId={s.drawerId} meId={session.me.id} />

      <section className="card p-3">
        <div ref={chatBox} className="h-32 space-y-1 overflow-y-auto text-sm" aria-live="polite">
          {chats.length === 0 ? <p className="text-center text-xs text-[var(--muted)]">Os palpites aparecem aqui.</p> : null}
          {chats.map((c) => (
            <p key={c.id} className={c.kind === "hit" ? "font-black text-emerald-700" : c.kind === "near" ? "font-black text-amber-700" : c.kind === "sys" ? "text-xs italic text-[var(--muted)]" : ""}>
              {c.kind === "guess" ? <b>{c.name}: </b> : null}
              {c.text}
            </p>
          ))}
        </div>
        {playing && !iDraw ? (
          <form onSubmit={submit} className="mt-2 flex gap-2">
            <input value={guess} onChange={(e) => setGuess(e.target.value)} maxLength={40} autoComplete="off" autoCapitalize="none" disabled={guessed} placeholder={guessed ? "Você acertou! Aguarde os outros…" : "Seu palpite…"} className="min-w-0 flex-1 rounded-xl border-2 border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-base font-bold" />
            <button type="submit" disabled={guessed} className="btn btn-primary !px-5 disabled:opacity-50">Enviar</button>
          </form>
        ) : playing && iDraw ? (
          <p className="mt-2 text-center text-xs font-bold text-[var(--muted)]">Você está desenhando: não pode palpitar.</p>
        ) : null}
      </section>
    </div>
  );
}

function Scoreboard({ players, drawerId, meId }: { players: PlayerPub[]; drawerId: string | null; meId: string }) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  return (
    <ul className="flex gap-2 overflow-x-auto pb-1">
      {sorted.map((p) => (
        <li key={p.id} className={`shrink-0 rounded-2xl border-2 px-3 py-1.5 text-center ${p.id === drawerId ? "border-amber-400 bg-amber-50 text-amber-950" : p.guessed ? "border-emerald-400 bg-emerald-50 text-emerald-950" : "border-[var(--line)] bg-[var(--surface)]"} ${p.connected ? "" : "opacity-40"}`}>
          <p className="max-w-[5.5rem] truncate text-[11px] font-black">
            {p.id === drawerId ? <QT>{"🎨 "}</QT> : p.guessed ? <QT>{"✅ "}</QT> : ""}
            {p.name}
            {p.id === meId ? " •" : ""}
          </p>
          <p className="text-base font-black tabular-nums">{p.score}</p>
        </li>
      ))}
    </ul>
  );
}

