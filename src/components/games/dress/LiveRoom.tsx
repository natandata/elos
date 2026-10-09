"use client";

// Sala ao vivo do "Vista o Herói": mostra a fase que o banco diz e manda os pedidos da jogadora.
// Nada de regra aqui: o tempo, a ordem do desfile, os votos e a pontuação vêm de dress_room_state.
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camarim, type LiveCamarim } from "./Camarim";
import { LandscapeShell } from "./LandscapeShell";
import { PaperDoll } from "./PaperDoll";
import { RunwayWalk } from "./RunwayWalk";
import { StarPicker, StarsStatic } from "./Stars";
import { ThemeCard } from "./ThemeCard";
import { SparkleBurst, Sparkles, VhStage } from "./Vh";
import { saveRoomLook } from "@/lib/actions/dressLive";
import { baseFromBeauty, cleanBeauty, type Beauty } from "@/lib/games/dress/beauty";
import { ITEM_BY_ID, type Look } from "@/lib/games/dress/items";
import { PHASE_LABEL, POSES, cleanPose, firstName, type PoseKey, type RoomPlayer, type RoomState } from "@/lib/games/dress/live";
import { ticketTitle } from "@/lib/games/dress/ranks";
import { fmtClock } from "@/lib/games/dress/rules";
import { THEME_BY_ID, type BibleTheme } from "@/lib/games/dress/themes";
import { createClient } from "@/lib/supabase/client";
import { PLACE_TICKETS, TICKETS_PER_XP } from "@/lib/games/dress/economy";

const FALLBACK_THEME: BibleTheme = {
  id: "livre",
  name: "Tema livre",
  description: "Monte um visual inspirado no mundo bíblico.",
  category: "concepts",
  difficulty: "easy",
  tags: [],
  hint: "Use a sua criatividade com túnicas, mantos e enfeites.",
  historicalContext: "",
  suggestions: ["Túnica", "Manto", "Sandálias"],
  scene: "palacio",
};

/** O look que desfila: quem não escolheu roupa aparece com a túnica simples (ninguém desfila sem roupa). */
const lookOf = (l: Look | null | undefined): Look => {
  const out: Look = { ...(l ?? {}) };
  if (!out.tunic && ITEM_BY_ID.has("tunic_simple")) out.tunic = "tunic_simple";
  return out;
};
const baseOf = (beauty: unknown) => baseFromBeauty(cleanBeauty(beauty));
const PLACE = ["🥇", "🥈", "🥉"];
const TUTORIAL_KEY = "vh:live:tutorial";

/** Como a sala fala com o banco (dá para trocar por um simulador nos testes de tela). */
export type RoomRpc = (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;

export function LiveRoom(props: { code: string; meId: string; rpc?: RoomRpc }) {
  return (
    <LandscapeShell>
      <LiveRoomInner {...props} />
    </LandscapeShell>
  );
}

function LiveRoomInner({ code, meId, rpc }: { code: string; meId: string; rpc?: RoomRpc }) {
  const router = useRouter();
  const sb = useMemo(() => createClient(), []);
  const call = useCallback<RoomRpc>((fn, args) => (rpc ? rpc(fn, args) : sb.rpc(fn, args)), [rpc, sb]);
  const [st, setSt] = useState<RoomState | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [left, setLeft] = useState(0);
  const [voted, setVoted] = useState<Record<string, number>>({});
  const [voteMsg, setVoteMsg] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);
  const [tutorial, setTutorial] = useState(false);
  const [initial, setInitial] = useState<{ key: string; value: LiveCamarim["initial"] } | null>(null);
  const deadline = useRef(0);
  const initialKey = useRef("");
  const fails = useRef(0);

  const poll = useCallback(async (): Promise<number> => {
    const { data, error } = await call("dress_room_state", { p_code: code });
    if (error) {
      fails.current += 1;
      if (fails.current >= 3) setOffline(true);
      return 2500;
    }
    fails.current = 0;
    setOffline(false);
    const s = data as RoomState & { error?: string };
    if (s?.error) {
      setFatal(s.error);
      return 60_000;
    }
    setSt(s);
    deadline.current = performance.now() + (s.left_ms ?? 0);
    setLeft((s.left_ms ?? 0) / 1000);
    // o estado inicial do camarim é o do começo da fase (depois o camarim cuida do próprio look)
    const key = `${s.code}:${s.round}`;
    if (s.phase === "dressing" && initialKey.current !== key) {
      initialKey.current = key;
      setInitial({ key, value: { look: s.me.look ?? {}, beauty: s.me.beauty, pose: s.me.pose, ready: s.me.ready } });
    }
    // consulta logo depois que a fase vence; no camarim o relógio é local, então dá para consultar menos
    const base = s.phase === "dressing" ? 3000 : s.phase === "lobby" ? 2500 : 1500;
    return s.left_ms == null ? base : Math.max(350, Math.min(base, s.left_ms + 250));
  }, [call, code]);

  // entra na sala e fica consultando o estado
  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const loop = async () => {
      if (stop) return;
      const wait = await poll().catch(() => 2500);
      if (!stop) timer = setTimeout(loop, wait);
    };
    void (async () => {
      const { data, error } = await call("dress_room_join", { p_code: code });
      if (stop) return;
      if (error) return setFatal("Não foi possível entrar na sala. Confira a conexão.");
      const r = (data ?? {}) as { error?: string };
      if (r.error) return setFatal(r.error);
      void loop();
    })();
    return () => {
      stop = true;
      if (timer) clearTimeout(timer);
    };
  }, [call, code, poll]);

  // relógio da tela (anda sozinho entre uma consulta e outra)
  useEffect(() => {
    const id = setInterval(() => setLeft(Math.max(0, (deadline.current - performance.now()) / 1000)), 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        if (!localStorage.getItem(TUTORIAL_KEY)) setTutorial(true);
      } catch {
        /* sem armazenamento: não mostra o tutorial */
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);
  const closeTutorial = () => {
    setTutorial(false);
    try {
      localStorage.setItem(TUTORIAL_KEY, "1");
    } catch {
      /* ok */
    }
  };

  // rodada nova: esquece as notas marcadas na tela
  const round = st?.round ?? 0;
  useEffect(() => {
    const t = setTimeout(() => {
      setVoted({});
      setVoteMsg(null);
    }, 0);
    return () => clearTimeout(t);
  }, [round]);

  const leave = useCallback(async () => {
    await Promise.resolve(call("dress_room_leave", { p_code: code })).catch(() => undefined);
    router.push("/app/jogos/vestir/sala");
  }, [call, code, router]);

  const vote = useCallback(
    async (target: string, stars: number) => {
      if (voting) return;
      setVoting(true);
      setVoteMsg(null);
      setVoted((v) => ({ ...v, [target]: stars }));
      const { data, error } = await call("dress_room_vote", { p_code: code, p_target: target, p_stars: stars });
      setVoting(false);
      const r = (data ?? {}) as { error?: string };
      if (error || r.error) {
        // só mostra "registrado" quando o banco confirmou
        if (!r.error?.startsWith("Você já avaliou")) {
          setVoted((v) => {
            const next = { ...v };
            delete next[target];
            return next;
          });
        }
        setVoteMsg(r.error ?? "Sem conexão. Tente de novo.");
        return;
      }
      setVoteMsg("Nota registrada! ✨");
      void poll();
    },
    [call, code, poll, voting],
  );

  const onSave = useCallback<LiveCamarim["onSave"]>(
    async (look: Look, beauty: Beauty, pose: PoseKey, ready: boolean) => {
      const r = await saveRoomLook(code, look, beauty, pose, ready).catch(() => ({ error: "Sem conexão. Tente de novo." }));
      return r.error ?? null;
    },
    [code],
  );
  const live = useMemo<LiveCamarim | undefined>(() => (initial && initial.key === `${code}:${round}` ? { initial: initial.value, onSave } : undefined), [initial, onSave, code, round]);

  if (fatal) {
    return (
      <VhStage>
        <div className="vh-panel text-center">
          <p className="text-4xl" aria-hidden>
            🚪
          </p>
          <p className="vh-title mt-1 text-2xl">Sala indisponível</p>
          <p className="mt-2 text-sm text-purple-100">{fatal}</p>
          <button type="button" className="vh-btn mt-4" onClick={() => router.push("/app/jogos/vestir/sala")}>
            Ver outras salas
          </button>
        </div>
      </VhStage>
    );
  }
  if (!st) {
    return (
      <VhStage>
        <p className="vh-panel text-center text-sm font-bold text-purple-100" role="status">
          Entrando na sala {code}…
        </p>
      </VhStage>
    );
  }

  const theme = (st.theme && THEME_BY_ID.get(st.theme)) || FALLBACK_THEME;
  const byId = new Map(st.players.map((p) => [p.id, p]));
  const online = st.players.filter((p) => p.online);
  const inRound = st.players.filter((p) => p.eligible);
  const iVoted = (id: string) => st.me.voted.includes(id) || voted[id] !== undefined;
  const clock = st.left_ms == null ? null : fmtClock(Math.ceil(left));
  const offlineBar = offline ? (
    <p className="mb-3 rounded-xl bg-rose-900/80 px-3 py-2 text-center text-xs font-bold text-rose-100" role="status">
      📡 Conexão instável: tentando voltar…
    </p>
  ) : null;

  // ------------------------------------------------------------------ camarim (tela cheia)
  if (st.phase === "dressing" && st.me.eligible && live) {
    return <Camarim key={`live-${code}-${round}`} theme={theme} mode="live" msLeft={left * 1000} draftKey={`vh:live:${code}:${round}`} exitHref="/app/jogos/vestir/sala" live={live} />;
  }

  const header = (
    <div className="mb-3 flex items-center justify-between gap-2">
      <button type="button" className="vh-chip !px-3 !py-1 !text-[11px]" onClick={() => void leave()}>
        ← Sair
      </button>
      <p className="text-center text-[11px] font-black uppercase tracking-[0.18em] text-amber-200">
        Sala {st.code} · {PHASE_LABEL[st.phase]}
        {st.round > 0 ? ` · rodada ${st.round}` : ""}
      </p>
      {clock ? (
        <span className="vh-timer !text-sm" role="timer" aria-label="Tempo restante" data-low={left <= 5}>
          ⏱ {clock}
        </span>
      ) : (
        <span className="w-12" />
      )}
    </div>
  );

  // ------------------------------------------------------------------ lobby e intervalo
  if (st.phase === "lobby" || st.phase === "intermission") {
    const missing = Math.max(0, st.min_players - online.length);
    const t = ticketTitle(st.me.tickets);
    return (
      <VhStage>
        {header}
        {offlineBar}
        <div className="vh-cols">
          <div>
            <div className="vh-panel mb-4 text-center">
              {st.mega ? (
                <>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200">Todo domingo · 15h</p>
                  <p className="vh-title text-4xl">🎆 Mega Desfile</p>
                </>
              ) : (
                <>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200">Código da sala</p>
                  <p className="vh-title text-5xl tracking-[0.18em]">{st.code}</p>
                  <p className="mt-1 text-xs text-purple-100">{st.public ? "Sala aberta: aparece na lista para qualquer jogadora." : "Sala fechada: só entra quem tiver o código."}</p>
                </>
              )}
              {st.phase === "intermission" ? (
                <p className="mt-3 text-lg font-black text-amber-100" role="status">
                  A rodada começa em <span className="tabular-nums">{Math.ceil(left)}</span> s
                </p>
              ) : st.mega && st.left_ms != null && st.left_ms > 0 ? (
                <p className="mt-3 text-lg font-black text-amber-100" role="status">
                  O desfile começa em <span className="tabular-nums">{fmtClock(Math.ceil(left))}</span>
                </p>
              ) : (
                <p className="mt-3 text-sm font-bold text-amber-100" role="status">
                  {missing > 0 ? `Falta${missing > 1 ? "m" : ""} ${missing} jogadora${missing > 1 ? "s" : ""} para começar (mínimo ${st.min_players}). Passe o código para as amigas!` : "Começando…"}
                </p>
              )}
            </div>

            {tutorial ? (
              <div className="vh-panel vh-pop mb-4 text-sm">
                <p className="vh-h2 mb-1">Como funciona</p>
                <ol className="space-y-1 text-purple-100">
                  <li>
                    <b className="text-amber-200">1.</b> Todas recebem o mesmo tema bíblico.
                  </li>
                  <li>
                    <b className="text-amber-200">2.</b> Ande pelo salão, escolha as peças nas prateleiras e capriche na make e no cabelo.
                  </li>
                  <li>
                    <b className="text-amber-200">3.</b> Quando o relógio zera, o look é registrado e cada modelo desfila.
                  </li>
                  <li>
                    <b className="text-amber-200">4.</b> Dê de 1 a 5 estrelas para as outras (não dá para votar em você).
                  </li>
                  <li>
                    <b className="text-amber-200">5.</b> 🥇 {PLACE_TICKETS[0]} · 🥈 {PLACE_TICKETS[1]} · 🥉 {PLACE_TICKETS[2]} 🎫. A 1ª vitória do dia vale 1 XP!
                  </li>
                </ol>
                <button type="button" className="vh-btn vh-btn-purple mt-3" onClick={closeTutorial}>
                  Entendi
                </button>
              </div>
            ) : null}

            <section className="mb-4 grid grid-cols-2 gap-3">
              <div className="vh-panel text-center">
                <p className="vh-title text-3xl tabular-nums">{st.me.tickets}</p>
                <p className="text-[10px] font-black uppercase tracking-wide text-amber-200">🎫 Bilhetes Dourados</p>
                <p className="mt-0.5 text-[9px] font-bold text-purple-200">{TICKETS_PER_XP} 🎫 = 1 XP</p>
              </div>
              <div className="vh-panel text-center">
                <p className="text-base font-black leading-tight text-amber-100">{t.title}</p>
                <p className="mt-1 text-[10px] font-bold text-purple-200">{t.next ? `${t.next.min - st.me.tickets} 🎫 para ${t.next.title}` : "Topo da passarela!"}</p>
              </div>
            </section>
          </div>

          <section className="vh-panel mb-4">
            <h2 className="vh-h2 mb-2">
              Na sala ({online.length}/{st.max_players})
            </h2>
            <ul className="grid grid-cols-4 gap-2">
              {st.players.slice(0, 16).map((p) => (
                <li key={p.id} className="text-center" data-me={p.id === meId}>
                  <div className={`mx-auto flex h-24 items-end justify-center ${p.online ? "" : "opacity-40"}`}>
                    <Mini p={p} className="h-24" />
                  </div>
                  <p className="truncate text-[11px] font-black text-amber-50">
                    {firstName(p.name).split(" ")[0]}
                    {p.id === meId ? " (você)" : ""}
                  </p>
                  <p className="text-[9px] font-bold text-purple-200">{p.online ? "na sala" : "ausente"}</p>
                </li>
              ))}
            </ul>
            {st.players.length > 16 ? <p className="mt-2 text-center text-xs font-bold text-purple-200">e mais {st.players.length - 16} jogadoras…</p> : null}
          </section>
        </div>

        {st.results.length > 0 ? <Scoreboard st={st} byId={byId} meId={meId} title={`Rodada ${st.round}: resultado`} /> : null}
      </VhStage>
    );
  }

  // ------------------------------------------------------------------ revelação do tema
  if (st.phase === "theme") {
    return (
      <VhStage>
        {header}
        {offlineBar}
        <div className="vh-reveal">
          <p className="mb-2 text-center text-[11px] font-black uppercase tracking-[0.25em] text-amber-200">Todas recebem o mesmo desafio</p>
          <div className="vh-cols">
          <ThemeCard theme={theme} label={`Rodada ${st.round}`} full />
          <div className="vh-panel vh-pop text-center">
            <p className="text-sm leading-snug text-amber-50">{theme.hint}</p>
            {theme.ref ? <p className="mt-1 text-xs font-bold text-amber-300">📖 {theme.ref}</p> : null}
            <p className="mt-3 text-lg font-black text-amber-100" role="status">
              {st.me.eligible ? "O camarim abre em " : "Você joga a próxima rodada · camarim em "}
              <span className="tabular-nums">{Math.ceil(left)}</span> s
            </p>
          </div>
          </div>
        </div>
      </VhStage>
    );
  }

  // ------------------------------------------------------------------ espectadora no camarim
  if (st.phase === "dressing") {
    const done = inRound.filter((p) => p.ready).length;
    return (
      <VhStage>
        {header}
        {offlineBar}
        <ThemeCard theme={theme} label={`Rodada ${st.round}`} />
        <div className="vh-panel text-center">
          <p className="text-4xl" aria-hidden>
            👗
          </p>
          <p className="vh-title mt-1 text-2xl">As modelos estão no camarim</p>
          <p className="mt-2 text-sm text-purple-100">Você entrou com a rodada em andamento: assiste ao desfile desta e joga a próxima.</p>
          <p className="mt-3 text-sm font-bold text-amber-100">
            {done} de {inRound.length} prontas
          </p>
        </div>
      </VhStage>
    );
  }

  // ------------------------------------------------------------------ preparando a passarela
  if (st.phase === "prep") {
    return (
      <VhStage>
        {header}
        {offlineBar}
        <div className="vh-panel vh-pop text-center">
          <p className="text-4xl" aria-hidden>
            🎬
          </p>
          <p className="vh-title mt-1 text-3xl">Looks registrados!</p>
          <p className="mt-1 text-sm text-purple-100">Ordem do desfile:</p>
          <ol className="mt-3 space-y-1.5 text-left">
            {st.order.map((id, i) => (
              <li key={id} className="vh-row" data-me={id === meId}>
                <span className="w-7 text-center text-sm font-black">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-amber-50">
                  {firstName(byId.get(id)?.name ?? "Modelo")}
                  {id === meId ? " (você)" : ""}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </VhStage>
    );
  }

  // ------------------------------------------------------------------ desfile + voto
  if (st.phase === "runway") {
    const currentId = st.order[st.idx - 1];
    const cur = currentId ? byId.get(currentId) : undefined;
    const mine = currentId === meId;
    const total = st.total_ms ?? 1;
    const pct = Math.max(0, Math.min(100, ((left * 1000) / total) * 100));
    return (
      <VhStage>
        {header}
        {offlineBar}
        <div className="vh-cols vh-cols-wide">
          <div>
            <p className="mb-2 text-center text-xs font-black uppercase tracking-wide text-amber-200">
              Modelo {st.idx} de {st.order.length} · tema {theme.name}
            </p>
            {cur ? (
              <RunwayWalk key={`${round}-${cur.id}`} base={baseOf(cur.beauty)} look={lookOf(cur.look)} name={cur.name} scene={theme.scene} pose={cleanPose(cur.pose)} showMs={total}>
                {st.me.eligible && !mine ? (
                  <div className="vh-starbar" data-done={iVoted(cur.id)}>
                    <StarPicker value={voted[cur.id] ?? 0} onPick={(n) => void vote(cur.id, n)} disabled={voting || iVoted(cur.id)} />
                  </div>
                ) : null}
                <div className="absolute inset-x-0 top-0 z-[4] bg-gradient-to-b from-black/85 to-transparent px-3 pb-8 pt-2 text-center">
                  <p className="truncate text-base font-black text-amber-100 [text-shadow:0_2px_4px_#000]">
                    {firstName(cur.name)}
                    {mine ? " (você)" : ""}
                  </p>
                  <p className="text-[11px] font-bold text-purple-200">
                    {POSES.find((x) => x.key === cleanPose(cur.pose))?.icon} pose {POSES.find((x) => x.key === cleanPose(cur.pose))?.label.toLowerCase()}
                    {cur.online ? "" : " · saiu da sala"}
                  </p>
                </div>
              </RunwayWalk>
            ) : null}
            <div className="mx-auto mt-2 h-1.5 max-w-[400px] overflow-hidden rounded-full bg-white/15" aria-hidden>
              <div className="h-full rounded-full bg-amber-300 transition-[width] duration-300" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div>
            <div className="vh-panel mx-auto mt-3 max-w-[400px] text-center">
              {!st.me.eligible ? (
                <p className="text-sm font-bold text-purple-100">Você está assistindo: joga e avalia a partir da próxima rodada.</p>
              ) : mine ? (
                <>
                  <p className="vh-h2">É o seu desfile! 🌟</p>
                  <p className="mt-1 text-sm text-purple-100">As outras estão dando a nota. Ninguém avalia o próprio look.</p>
                </>
              ) : cur ? (
                <p className="text-[12px] font-bold text-purple-100" role="status">
                  {iVoted(cur.id) ? (voteMsg ?? "Nota registrada! ✨") : (voteMsg ?? "Toque numa estrela, lá embaixo da passarela. Não dá para trocar depois.")}
                </p>
              ) : null}
            </div>
            <ol className="vh-panel mx-auto mt-3 max-w-[400px] space-y-1 !p-2.5" aria-label="Ordem do desfile">
              {st.order.slice(0, 12).map((id, i) => (
                <li key={id} className="flex items-center gap-2 text-[12px] font-bold" data-now={i + 1 === st.idx} style={{ color: i + 1 === st.idx ? "#ffe066" : i + 1 < st.idx ? "#a7f3d0" : "#d8c9f5" }}>
                  <span className="w-5 text-center">{i + 1 < st.idx ? "✓" : i + 1 === st.idx ? "▶" : i + 1}</span>
                  <span className="min-w-0 flex-1 truncate">
                    {firstName(byId.get(id)?.name ?? "Modelo")}
                    {id === meId ? " (você)" : ""}
                  </span>
                  {id !== meId && st.me.eligible && i + 1 <= st.idx ? <span>{iVoted(id) ? "⭐" : "·"}</span> : null}
                </li>
              ))}
              {st.order.length > 12 ? <li className="text-center text-[11px] text-purple-200">e mais {st.order.length - 12}…</li> : null}
            </ol>
          </div>
        </div>
      </VhStage>
    );
  }

  // ------------------------------------------------------------------ últimos votos
  if (st.phase === "voting") {
    const others = st.order.map((id) => byId.get(id)).filter((p): p is RoomPlayer => !!p && p.id !== meId);
    const pending = others.filter((p) => !iVoted(p.id));
    return (
      <VhStage>
        {header}
        {offlineBar}
        <div className="vh-panel mb-3 text-center">
          <p className="vh-title text-2xl">Últimos votos</p>
          <p className="mt-1 text-sm text-purple-100">{!st.me.eligible ? "A votação está fechando…" : pending.length ? "Faltou avaliar alguém? Agora é a hora." : "Você avaliou todas! Aguardando a apuração."}</p>
        </div>
        {st.me.eligible ? (
          <ul className="space-y-2">
            {others.map((p) => (
              <li key={p.id} className="vh-panel flex items-center gap-3 !p-2.5">
                <div className="flex h-24 w-16 shrink-0 items-end justify-center">
                  <Mini p={p} className="h-24" />
                </div>
                <div className="min-w-0 flex-1 text-center">
                  <p className="truncate text-sm font-black text-amber-50">{firstName(p.name)}</p>
                  {iVoted(p.id) ? (
                    <p className="mt-1 text-xs font-bold text-emerald-300">✓ Nota registrada</p>
                  ) : (
                    <StarPicker value={0} onPick={(n) => void vote(p.id, n)} disabled={voting} />
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : null}
        {voteMsg && !voteMsg.startsWith("Nota") ? <p className="mt-2 rounded-xl bg-rose-900/70 px-3 py-2 text-center text-sm font-bold text-rose-100">{voteMsg}</p> : null}
      </VhStage>
    );
  }

  // ------------------------------------------------------------------ apuração
  if (st.phase === "calc") {
    return (
      <VhStage>
        {header}
        <div className="vh-panel vh-pop text-center">
          <Sparkles />
          <p className="text-5xl" aria-hidden>
            ⚖️
          </p>
          <p className="vh-title mt-2 text-3xl">Apurando as notas…</p>
          <p className="mt-2 text-sm text-purple-100">O júri está somando as estrelas de cada look.</p>
        </div>
      </VhStage>
    );
  }

  // ------------------------------------------------------------------ pódio
  if (st.phase === "podium") {
    const top = st.results.slice(0, 3);
    const order = [top[1], top[0], top[2]].filter(Boolean);
    const myRes = st.results.find((r) => r.id === meId);
    return (
      <VhStage>
        {header}
        {offlineBar}
        <p className="vh-title mb-1 text-center text-3xl">Pódio</p>
        <p className="mb-3 text-center text-xs font-bold text-purple-200">Tema: {theme.name}</p>
        <div className="vh-podium" style={{ backgroundImage: `linear-gradient(180deg, rgba(28,11,54,0.35), rgba(28,11,54,0.9)), url(/dress/passarela.webp)` }}>
          {order.map((r) => {
            const p = byId.get(r.id);
            if (!p) return null;
            return (
              <div key={r.id} className="vh-podium-col" data-place={r.place} data-me={r.id === meId}>
                {r.place === 1 ? <SparkleBurst n={14} /> : null}
                <div className="vh-podium-doll">
                  <Mini p={p} still={r.place !== 1} className="h-full" />
                </div>
                <div className="vh-podium-step">
                  <span className="text-2xl leading-none">{PLACE[r.place - 1]}</span>
                  <b className="block truncate text-xs">{firstName(p.name).split(" ")[0]}</b>
                  <span className="block text-[11px] font-black tabular-nums text-amber-200">{Number(r.score).toFixed(2)}</span>
                  <span className="block text-[10px] font-bold text-amber-100">+{r.tickets} 🎫</span>
                </div>
              </div>
            );
          })}
        </div>
        {myRes ? (
          <p className="vh-panel mt-3 text-center text-sm font-black text-amber-100" role="status">
            Você ficou em {myRes.place}º lugar{myRes.avg != null ? ` · média ${Number(myRes.avg).toFixed(1)} ★` : " · sem votos recebidos"}
          </p>
        ) : null}
      </VhStage>
    );
  }

  // ------------------------------------------------------------------ recompensas e placar
  const mine = st.results.find((r) => r.id === meId);
  return (
    <VhStage>
      {header}
      {offlineBar}
      {mine ? (
        <div className="vh-panel vh-pop mb-4 text-center">
          <SparkleBurst n={12} />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200">Sua recompensa</p>
          <p className="vh-title text-5xl tabular-nums">+{mine.tickets} 🎫</p>
          <p className="mt-1 text-xs text-purple-100">
            {mine.tickets > 0
              ? st.mega
                ? "Prêmio em dobro do Mega Desfile para o pódio!"
                : `🥇 ${PLACE_TICKETS[0]} · 🥈 ${PLACE_TICKETS[1]} · 🥉 ${PLACE_TICKETS[2]} 🎫. Só o pódio ganha bilhetes.`
              : mine.place <= 3
                ? "Você já ganhou o máximo de rodadas premiadas por hoje, mas a posição conta!"
                : "Fora do pódio desta vez. Na próxima você chega lá! 💪"}
          </p>
        </div>
      ) : (
        <p className="vh-panel mb-4 text-center text-sm font-bold text-purple-100">Você assistiu a esta rodada. A próxima já vale para você!</p>
      )}
      <Scoreboard st={st} byId={byId} meId={meId} title="Placar da rodada" />
      {st.mega ? (
        <p className="mt-3 text-center text-sm font-black text-amber-100" role="status">
          O Mega Desfile desta semana terminou. Até domingo que vem! 🎆
        </p>
      ) : (
        <p className="mt-3 text-center text-sm font-black text-amber-100" role="status">
          Próxima rodada em <span className="tabular-nums">{Math.ceil(left)}</span> s
        </p>
      )}
    </VhStage>
  );
}

function Mini({ p, still = true, className = "h-28" }: { p: RoomPlayer; still?: boolean; className?: string }) {
  return <PaperDoll base={baseOf(p.beauty)} look={lookOf(p.look)} title={`Look de ${p.name}`} className={`${className} w-auto ${still ? "" : "vh-doll"}`} />;
}

function Scoreboard({ st, byId, meId, title }: { st: RoomState; byId: Map<string, RoomPlayer>; meId: string; title: string }) {
  return (
    <section className="vh-panel">
      <h2 className="vh-h2 mb-2">{title}</h2>
      <ol className="space-y-1.5">
        {st.results.map((r) => {
          const p = byId.get(r.id);
          return (
            <li key={r.id} className="vh-row" data-me={r.id === meId}>
              <span className="w-7 text-center text-base font-black">{PLACE[r.place - 1] ?? r.place}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-amber-50">{p ? firstName(p.name) : "Jogadora"}</span>
                <span className="block text-[11px] text-purple-200">
                  {r.votes > 0 ? (
                    <>
                      <StarsStatic value={Number(r.avg ?? 0)} /> {Number(r.avg ?? 0).toFixed(1)} · {r.votes} voto{r.votes > 1 ? "s" : ""}
                    </>
                  ) : (
                    "sem votos"
                  )}
                </span>
              </span>
              <span className="text-right">
                <span className="block text-sm font-black tabular-nums text-amber-200">{Number(r.score).toFixed(2)}</span>
                <span className="block text-[11px] font-bold text-amber-100">+{r.tickets} 🎫</span>
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-[10px] leading-snug text-purple-200">Pontuação = (soma das estrelas + 3) ÷ (votos + 1). Sem votos vale 3,00. Empate: mais votos, depois mais notas 5, depois quem ficou pronta primeiro.</p>
    </section>
  );
}
