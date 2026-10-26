"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { videoExternal, videoPing, videoProgress, videoReset, type VideoProgress } from "@/lib/actions/videoWatch";
import { WatchTracker } from "@/lib/video/tracker";

// Player de vídeo do "Conteúdo relevante": YouTube embutido SEM os controles do YouTube (nada de pular para frente nem de links para fora),
// com barra própria. Conta o que a pessoa assiste de verdade (blocos de 5 s, conferidos no servidor) e guarda o ponto onde parou.
// Em dia de vídeo, assistir inteiro aqui libera a Sala de Jogos; assistir no YouTube não conta.

type Api = {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (s: number, ahead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlaybackRate: () => number;
  setPlaybackRate: (r: number) => void;
  destroy: () => void;
};
type YTNs = { Player: new (el: HTMLElement, opts: Record<string, unknown>) => Api };

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function loadApi(): Promise<void> {
  return new Promise((resolve) => {
    const w = window as unknown as { YT?: { Player?: unknown }; onYouTubeIframeAPIReady?: () => void };
    if (w.YT?.Player) return resolve();
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    }
  });
}

type Stage = "loading" | "choose" | "play" | "done" | "gap" | "warn";

export function GatePlayer({ videoId, title, label, onClose }: { videoId: string; title: string; label: string; onClose: () => void }) {
  const [stage, setStage] = useState<Stage>("loading");
  const [prog, setProg] = useState<VideoProgress | null>(null);
  const [start, setStart] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState(0);
  const [pct, setPct] = useState(0);
  const [gap, setGap] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const mount = useRef<HTMLDivElement>(null);
  const api = useRef<Api | null>(null);
  const tracker = useRef(new WatchTracker());
  const live = useRef({ pos: 0, dur: 0, playing: false, stage: "loading" as Stage, ended: false });
  const flushing = useRef(false);

  useEffect(() => {
    live.current.stage = stage;
  }, [stage]);

  // trava a rolagem do fundo e deixa o Esc fechar
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // progresso salvo: se parou no meio, pergunta se continua ou volta do início
  useEffect(() => {
    let alive = true;
    void videoProgress(videoId)
      .then((p) => {
        if (!alive) return;
        setProg(p);
        setPct(p.pct);
        if (p.lastPos >= 10 && p.pct < 95 && !p.completedToday) setStage("choose");
        else setStage("play");
      })
      .catch(() => alive && setStage("play"));
    return () => {
      alive = false;
    };
  }, [videoId]);

  const flush = useCallback(
    async (ended = false) => {
      if (flushing.current && !ended) return;
      const l = live.current;
      if (l.dur < 10) return;
      const blocks = tracker.current.take();
      if (blocks.length === 0 && !ended) return;
      flushing.current = true;
      try {
        const r = await videoPing(videoId, l.pos, l.dur, blocks, ended);
        if (!r) {
          tracker.current.giveBack(blocks);
          return;
        }
        setPct(r.pct);
        setGap(r.gapSec);
        if (r.done) {
          api.current?.pauseVideo();
          setStage("done");
        } else if (ended) {
          setStage("gap");
        }
      } catch {
        tracker.current.giveBack(blocks);
      } finally {
        flushing.current = false;
      }
    },
    [videoId],
  );

  // cria o player quando a pessoa escolhe de onde começar
  useEffect(() => {
    if (stage !== "play" || api.current || !mount.current) return;
    let cancelled = false;
    void loadApi().then(() => {
      if (cancelled || !mount.current) return;
      const YT = (window as unknown as { YT: YTNs }).YT;
      const host = document.createElement("div");
      mount.current.appendChild(host);
      api.current = new YT.Player(host, {
        videoId,
        playerVars: { autoplay: 1, controls: 0, disablekb: 1, fs: 0, rel: 0, playsinline: 1, modestbranding: 1, iv_load_policy: 3, start: Math.floor(start), origin: window.location.origin },
        events: {
          onReady: () => {
            setDur(api.current?.getDuration() ?? 0);
            api.current?.playVideo();
          },
          onStateChange: (e: { data: number }) => {
            const st = e.data;
            const p = st === 1;
            live.current.playing = p;
            setPlaying(p);
            if (!p) tracker.current.breakRun();
            if (st === 0) {
              const d = api.current?.getDuration() ?? live.current.dur;
              tracker.current.step(d);
              live.current.pos = d;
              void flush(true);
            }
          },
          onError: () => setFailed(true),
        },
      });
    });
    return () => {
      cancelled = true;
    };
  }, [stage, videoId, start, flush]);

  // a cada segundo: lê a posição, conta o bloco e não deixa mudar a velocidade
  useEffect(() => {
    const t = setInterval(() => {
      const a = api.current;
      if (!a || !live.current.playing) return;
      const p = a.getCurrentTime();
      const d = a.getDuration();
      if (a.getPlaybackRate() !== 1) a.setPlaybackRate(1);
      live.current.pos = p;
      live.current.dur = d;
      tracker.current.step(p);
      setPos(p);
      setDur(d);
    }, 1000);
    // a cada 5 s manda o que foi assistido; ao sair da aba, manda na hora
    const net = setInterval(() => void flush(), 5000);
    const hide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    document.addEventListener("visibilitychange", hide);
    addEventListener("pagehide", hide);
    return () => {
      clearInterval(t);
      clearInterval(net);
      document.removeEventListener("visibilitychange", hide);
      removeEventListener("pagehide", hide);
    };
  }, [flush]);

  // ao desmontar: último aviso e limpeza do player
  useEffect(() => {
    const tr = tracker;
    const ap = api;
    return () => {
      void flush();
      try {
        ap.current?.destroy();
      } catch {
        // player já descartado
      }
      ap.current = null;
      tr.current.breakRun();
    };
  }, [flush]);

  const close = async () => {
    await flush();
    onClose();
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") void close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const toggle = () => {
    const a = api.current;
    if (!a) return;
    if (live.current.playing) a.pauseVideo();
    else a.playVideo();
  };
  const back10 = () => {
    const a = api.current;
    if (!a) return;
    const to = Math.max(0, a.getCurrentTime() - 10);
    tracker.current.breakRun();
    a.seekTo(to, true);
  };

  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const askExternal = () => {
    if (prog?.gateDay && !prog.completedToday && stage !== "done") {
      api.current?.pauseVideo();
      setStage("warn");
    } else window.open(url, "_blank", "noopener,noreferrer");
  };
  const goExternal = async () => {
    await flush();
    await videoExternal(videoId).catch(() => null);
    window.open(url, "_blank", "noopener,noreferrer");
    onClose();
  };

  const total = dur || prog?.duration || 0;
  const bar = total > 0 ? Math.min(100, (pos / total) * 100) : 0;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-3" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-3xl">
        <div className="mb-2 flex items-start justify-between gap-3 text-white">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wider text-white/70">{label}</p>
            <p className="text-sm font-bold leading-snug">{title}</p>
          </div>
          <button type="button" onClick={() => void close()} aria-label="Fechar vídeo" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15 text-lg font-black">
            ✕
          </button>
        </div>

        {stage === "loading" ? <div className="grid aspect-video w-full place-items-center rounded-2xl bg-black text-sm font-bold text-white/70">Carregando…</div> : null}

        {stage === "choose" && prog ? (
          <div className="rounded-2xl bg-white p-5 text-center text-[#1d1535]">
            <p className="text-lg font-black">Você já assistiu {prog.pct}% deste vídeo</p>
            <p className="mt-1 text-sm font-semibold text-[#5a5070]">Parou em {mmss(prog.lastPos)}. O que você prefere?</p>
            <button
              type="button"
              onClick={() => {
                setStart(prog.lastPos);
                setStage("play");
              }}
              className="btn btn-primary mt-4 w-full !py-3 text-base"
            >
              ▶ Continuar de onde parou ({mmss(prog.lastPos)})
            </button>
            <button
              type="button"
              onClick={async () => {
                await videoReset(videoId).catch(() => null);
                setPct(0);
                setStart(0);
                setStage("play");
              }}
              className="btn btn-soft mt-2 w-full !py-3 text-base text-[#1d1535]"
            >
              ↺ Voltar do início
            </button>
          </div>
        ) : null}

        {stage === "play" || stage === "gap" || stage === "warn" || stage === "done" ? (
          <div className={stage === "play" ? "" : "hidden"}>
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black">
              <div ref={mount} className="absolute inset-0 [&_iframe]:h-full [&_iframe]:w-full" />
              {/* camada que bloqueia qualquer toque no player do YouTube (títulos, logotipo e links para fora): só os nossos controles funcionam */}
              <button type="button" onClick={toggle} aria-label={playing ? "Pausar" : "Assistir"} className="absolute inset-0 z-10 grid place-items-center bg-transparent">
                {!playing ? <span className="grid h-16 w-16 place-items-center rounded-full bg-black/65 pl-1 text-3xl text-white">▶</span> : null}
              </button>
            </div>
            {failed ? <p className="mt-2 rounded-xl bg-rose-100 px-3 py-2 text-center text-sm font-bold text-rose-900">O vídeo não carregou. Confira a internet e tente de novo.</p> : null}
            <div className="mt-2 flex items-center gap-3 text-white">
              <button type="button" onClick={back10} className="shrink-0 rounded-full bg-white/15 px-3 py-1.5 text-xs font-black" aria-label="Voltar 10 segundos">
                ⟲ 10 s
              </button>
              <button type="button" onClick={toggle} className="shrink-0 rounded-full bg-white/15 px-3 py-1.5 text-xs font-black">
                {playing ? "❚❚ Pausar" : "▶ Assistir"}
              </button>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/20" aria-hidden>
                <div className="h-full rounded-full bg-emerald-400" style={{ width: `${bar}%` }} />
              </div>
              <span className="shrink-0 text-xs font-bold tabular-nums">
                {mmss(pos)} / {total ? mmss(total) : "--:--"}
              </span>
            </div>
            <p className="mt-2 text-center text-xs font-semibold text-white/80">
              {prog?.gateDay ? "Assista até o fim, sem pular, para liberar a Sala de Jogos. " : ""}Se você sair, o ponto onde parou fica salvo ({pct}% assistido).
            </p>
            <button type="button" onClick={askExternal} className="mt-1 block w-full text-center text-xs font-semibold text-white/60 underline">
              Abrir no YouTube
            </button>
          </div>
        ) : null}

        {stage === "gap" ? (
          <div className="rounded-2xl bg-white p-5 text-center text-[#1d1535]">
            <p className="text-lg font-black">Faltaram alguns trechos</p>
            <p className="mt-1 text-sm font-semibold text-[#5a5070]">Você assistiu {pct}% e é preciso ver o vídeo por inteiro. Volte ao trecho que ficou para trás.</p>
            <button
              type="button"
              onClick={() => {
                const to = gap ?? 0;
                setStage("play");
                setTimeout(() => {
                  tracker.current.breakRun();
                  api.current?.seekTo(to, true);
                  api.current?.playVideo();
                }, 50);
              }}
              className="btn btn-primary mt-4 w-full !py-3 text-base"
            >
              ▶ Ir ao trecho que faltou {gap !== null ? `(${mmss(gap)})` : ""}
            </button>
          </div>
        ) : null}

        {stage === "done" ? (
          <div className="rounded-2xl bg-white p-5 text-center text-[#1d1535]">
            <p className="text-4xl" aria-hidden>
              ✅
            </p>
            <p className="mt-1 text-lg font-black">Conteúdo assistido por inteiro!</p>
            {prog?.gateDay ? <p className="mt-1 text-sm font-semibold text-[#5a5070]">Vale como o desbloqueio do dia: a Sala de Jogos está liberada.</p> : null}
            {prog?.gateDay ? (
              <Link href="/app/jogos" onClick={onClose} className="btn btn-primary mt-4 w-full !py-3 text-base">
                🎮 Ir para a Sala de Jogos
              </Link>
            ) : null}
            <button type="button" onClick={onClose} className="btn btn-soft mt-2 w-full !py-3 text-base text-[#1d1535]">
              Fechar
            </button>
          </div>
        ) : null}

        {stage === "warn" ? (
          <div className="rounded-2xl bg-white p-5 text-center text-[#1d1535]">
            <p className="text-3xl" aria-hidden>
              ⚠️
            </p>
            <p className="mt-1 text-lg font-black">Assistir no YouTube não contabiliza para a liberação da Sala de Jogos</p>
            <p className="mt-2 text-sm font-semibold text-[#5a5070]">Se você for para o YouTube, a Sala de Jogos fica bloqueada até você assistir este conteúdo por inteiro aqui, no player do ELOS.</p>
            <button type="button" onClick={() => setStage("play")} className="btn btn-primary mt-4 w-full !py-3 text-base">
              Continuar assistindo aqui
            </button>
            <button type="button" onClick={() => void goExternal()} className="btn btn-soft mt-2 w-full !py-3 text-base text-[#1d1535]">
              Ir para o YouTube mesmo assim
            </button>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
