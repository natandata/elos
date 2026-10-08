"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { finishQdMatch } from "@/lib/actions/quemdesenha";
import { createIsolatedClient } from "@/lib/supabase/client";
import { GuestSession, HostSession, LocalSession, cleanCode, watchRooms, type RoomAd, type Session } from "@/lib/quemdesenha/net";
import { DEFAULT_SETTINGS, TITLES, titleFor, type MatchReport, type QdStats } from "@/lib/quemdesenha/rules";
import { QdRoom } from "./QdRoom";

type Active = { session: Session; training: boolean };

/** Quem Desenha?: menu (perfil, criar, entrar, partida rápida, treino) e a sala. */
export function QdClient({ me, initial }: { me: { id: string; name: string }; initial: QdStats }) {
  const [stats, setStats] = useState(initial);
  const [active, setActive] = useState<Active | null>(null);
  const [rooms, setRooms] = useState<RoomAd[]>([]);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    if (active) return;
    const sb = createIsolatedClient();
    const stop = watchRooms(sb, setRooms);
    return () => {
      stop();
      void sb.realtime.disconnect();
    };
  }, [active]);

  const go = async (label: string, make: () => Promise<Active>) => {
    if (busy) return;
    setBusy(label);
    setError(null);
    try {
      setActive(await make());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível entrar na sala.");
    }
    setBusy(null);
  };

  const create = (publicRoom: boolean) => go("create", async () => ({ session: await HostSession.open(createIsolatedClient(), me, DEFAULT_SETTINGS, publicRoom), training: false }));
  const join = (c: string) => go(`join-${c}`, async () => ({ session: await GuestSession.join(createIsolatedClient(), me, c), training: false }));
  const quick = () => (rooms.length ? join(rooms[0].code) : create(true));
  const train = () => go("train", async () => ({ session: new LocalSession(me, { bots: 3 }), training: true }));

  const finished = useCallback(async (r: MatchReport) => {
    const res = await finishQdMatch(r).catch(() => ({ error: "Sem conexão: as estrelas desta partida não foram salvas." }) as { error?: string; stars?: number; stats?: QdStats });
    if (res.stats) setStats(res.stats);
    return { stars: res.stars, error: res.error };
  }, []);

  if (active) return <QdRoom key={active.session.code + me.id} session={active.session} training={active.training} onLeave={() => setActive(null)} onFinished={finished} />;

  const { title, next } = titleFor(stats.stars);
  const into = next ? Math.max(0, Math.min(100, ((stats.stars - title.stars) / (next.stars - title.stars)) * 100)) : 100;

  return (
    <div className="space-y-3">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-sky-500 via-indigo-500 to-fuchsia-500 p-5 text-white shadow-lg">
        <p className="text-[11px] font-black uppercase tracking-widest opacity-80">Em construção · oculto</p>
        <h1 className="mt-1 text-3xl font-black leading-none">🎨 Quem Desenha?</h1>
        <p className="mt-2 text-sm font-bold opacity-95">Desenhe personagens, histórias, lugares e conceitos da Bíblia. Os outros tentam adivinhar antes do tempo acabar!</p>
      </section>

      <section className="card p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--accent-soft)] text-3xl" aria-hidden>{title.emoji}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-black">{me.name}</p>
            <p className="text-sm font-bold text-[var(--accent-strong)]">{title.name}</p>
          </div>
          <p className="text-right text-2xl font-black tabular-nums">⭐ {stats.stars.toLocaleString("pt-BR")}</p>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--line)]">
          <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${into}%` }} />
        </div>
        <p className="mt-1 text-[11px] text-[var(--muted)]">{next ? `Faltam ${next.stars - stats.stars} estrelas para ${next.emoji} ${next.name}` : "Você chegou ao maior título!"}</p>
        <div className="mt-3 grid grid-cols-4 gap-2 text-center">
          {[
            ["🎨", stats.drawings, "desenhos"],
            ["🎯", stats.guesses, "acertos"],
            ["🏆", stats.wins, "vitórias"],
            ["🔥", stats.win_streak, "em sequência"],
          ].map(([e, n, l]) => (
            <div key={String(l)} className="rounded-xl bg-[var(--line)]/60 py-2">
              <p className="text-lg font-black tabular-nums">{e} {n}</p>
              <p className="text-[10px] font-bold text-[var(--muted)]">{l}</p>
            </div>
          ))}
        </div>
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-black text-[var(--muted)]">Títulos</summary>
          <ul className="mt-2 grid grid-cols-2 gap-1.5 text-xs font-bold">
            {TITLES.map((t) => (
              <li key={t.name} className={`rounded-lg px-2 py-1.5 ${stats.stars >= t.stars ? "bg-emerald-100 text-emerald-900" : "bg-[var(--line)]/60 text-[var(--muted)]"}`}>
                {t.emoji} {t.name} <span className="opacity-70">({t.stars})</span>
              </li>
            ))}
          </ul>
        </details>
      </section>

      <section className="card space-y-2 p-4">
        <button type="button" disabled={!!busy} onClick={() => void quick()} className="btn btn-primary w-full !py-3 !text-base disabled:opacity-60">
          {busy?.startsWith("join") ? "Entrando…" : "⚡ Partida rápida"}
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={!!busy} onClick={() => void create(true)} className="btn btn-ghost !py-3 disabled:opacity-60">➕ Criar sala</button>
          <button type="button" disabled={!!busy} onClick={() => void create(false)} className="btn btn-ghost !py-3 disabled:opacity-60">🔒 Sala privada</button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (code.length === 4) void join(code);
          }}
          className="flex gap-2"
        >
          <input value={code} onChange={(e) => setCode(cleanCode(e.target.value))} placeholder="CÓDIGO" maxLength={4} autoCapitalize="characters" autoComplete="off" className="min-w-0 flex-1 rounded-xl border-2 border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-center text-xl font-black tracking-[0.35em]" />
          <button type="submit" disabled={code.length !== 4 || !!busy} className="btn btn-primary !px-6 disabled:opacity-50">Entrar</button>
        </form>
        <button type="button" disabled={!!busy} onClick={() => void train()} className="btn btn-ghost w-full disabled:opacity-60">🤖 Treinar contra o computador</button>
        {error ? <p className="rounded-xl bg-rose-100 px-3 py-2 text-xs font-bold text-rose-800">{error}</p> : null}
      </section>

      <section className="card p-4">
        <p className="text-sm font-black">🌐 Salas abertas</p>
        {rooms.length === 0 ? (
          <p className="mt-1 text-xs text-[var(--muted)]">Nenhuma sala aberta agora. Crie uma e chame os amigos!</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {rooms.map((r) => (
              <li key={r.code} className="flex items-center gap-3 rounded-xl bg-[var(--line)]/60 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black">Sala de {r.hostName}</p>
                  <p className="text-[11px] text-[var(--muted)]">{r.players}/{r.max} jogadores · {r.summary}</p>
                </div>
                <button type="button" disabled={!!busy} onClick={() => void join(r.code)} className="btn btn-primary !px-4 !py-1.5 !text-xs disabled:opacity-60">Entrar</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-4">
        <button type="button" onClick={() => setHelp((h) => !h)} className="w-full text-left text-sm font-black">
          📖 Como jogar {help ? "▲" : "▼"}
        </button>
        {help ? (
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-[var(--muted)]">
            <li>De 2 a 12 jogadores entram numa sala. Cada um desenha na sua vez.</li>
            <li>O desenhista escolhe uma entre 3 palavras bíblicas e tem até 60 segundos para desenhar. Não vale escrever letras!</li>
            <li>Os outros digitam palpites. Quem acerta mais rápido ganha mais pontos (até 100).</li>
            <li>Duas pistas aparecem com o tempo, mas cada uma reduz a pontuação.</li>
            <li>O desenhista ganha conforme o número de pessoas que entenderam o desenho.</li>
            <li>No fim, vence quem tiver mais pontos. Estrelas contam para o seu título.</li>
          </ol>
        ) : null}
      </section>

      <Link href="/app/jogos" className="btn btn-ghost block w-full text-center">← Sala de Jogos</Link>
    </div>
  );
}
