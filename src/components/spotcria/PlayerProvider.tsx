"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { recordSpotPlay } from "@/lib/actions/spotcria";
import { patchSpotTrack } from "@/lib/spotcria/store";
import { thumb, type SpotTrack } from "@/lib/spotcria/types";

// Player do Spot Cria: um único player do YouTube (IFrame API) que não é desmontado ao navegar entre as telas,
// com fila, próxima/anterior e barra de progresso própria. A tela de "Tocando agora" só reposiciona o mesmo player.

type YTPlayer = {
  loadVideoById: (id: string) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (s: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  destroy: () => void;
};
type YTNamespace = {
  Player: new (el: string | HTMLElement, opts: Record<string, unknown>) => YTPlayer;
};
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

function loadYouTubeApi(): Promise<void> {
  return new Promise((resolve) => {
    if (window.YT?.Player) return resolve();
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
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

type Ctx = {
  current: SpotTrack | null;
  queue: SpotTrack[];
  index: number;
  playing: boolean;
  position: number;
  duration: number;
  error: string | null;
  expanded: boolean;
  setExpanded: (v: boolean) => void;
  shuffle: boolean;
  repeat: "off" | "all" | "one";
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  play: (track: SpotTrack, queue?: SpotTrack[]) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (seconds: number) => void;
  patchTrack: (id: string, patch: Partial<SpotTrack>) => void;
  registerSlot: (kind: "mini" | "full", el: HTMLElement) => void;
  unregisterSlot: (kind: "mini" | "full", el: HTMLElement) => void;
};

const MINI_BASE_W = 356;

type Slots = { mini: HTMLElement[]; full: HTMLElement[] };

const PlayerContext = createContext<Ctx | null>(null);

export function useSpotPlayer(): Ctx {
  const c = useContext(PlayerContext);
  if (!c) throw new Error("useSpotPlayer fora do SpotPlayerRoot");
  return c;
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<SpotTrack[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<"off" | "all" | "one">("off");

  const playerRef = useRef<YTPlayer | null>(null);
  const readyRef = useRef(false);
  const pendingRef = useRef<string | null>(null);
  const queueRef = useRef<SpotTrack[]>([]);
  const indexRef = useRef(0);
  const recordedRef = useRef<string | null>(null);
  const advanceRef = useRef<() => void>(() => undefined);
  const endedRef = useRef<() => void>(() => undefined);
  const shuffleRef = useRef(false);
  const repeatRef = useRef<"off" | "all" | "one">("off");
  const userPausedRef = useRef(false);
  const slotsRef = useRef<Slots>({ mini: [], full: [] });
  const playingRef = useRef(false);

  useEffect(() => {
    queueRef.current = queue;
    indexRef.current = index;
  }, [queue, index]);
  const current = queue[index] ?? null;

  const load = useCallback((track: SpotTrack) => {
    setError(null);
    setPosition(0);
    setDuration(0);
    recordedRef.current = null;
    if (readyRef.current && playerRef.current) playerRef.current.loadVideoById(track.video_id);
    else pendingRef.current = track.video_id;
  }, []);

  // cria o player uma vez
  useEffect(() => {
    let cancelled = false;
    void loadYouTubeApi().then(() => {
      if (cancelled || !window.YT) return;
      playerRef.current = new window.YT.Player("spot-yt-target", {
        width: "100%",
        height: "100%",
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1, controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3 },
        events: {
          onReady: () => {
            readyRef.current = true;
            if (pendingRef.current) {
              playerRef.current?.loadVideoById(pendingRef.current);
              pendingRef.current = null;
            }
          },
          onStateChange: (e: { data: number }) => {
            if (e.data === 1) {
              setPlaying(true);
              playingRef.current = true;
              const t = queueRef.current[indexRef.current];
              if (t && recordedRef.current !== t.id) {
                recordedRef.current = t.id;
                void recordSpotPlay(t.id, t.title).catch(() => null);
                // a contagem sobe na hora para todo mundo que está vendo a faixa
                patchSpotTrack(t.id, { play_count: t.play_count + 1 });
                setQueue((q) => q.map((x) => (x.id === t.id ? { ...x, play_count: x.play_count + 1 } : x)));
              }
            } else if (e.data === 2) {
              setPlaying(false);
              // o navegador pausou sozinho (app em segundo plano / tela bloqueada): tenta continuar, já que a pessoa não pausou
              if (!userPausedRef.current && playingRef.current && document.visibilityState === "hidden") {
                [250, 1200, 3000].forEach((ms) =>
                  window.setTimeout(() => {
                    if (!userPausedRef.current) playerRef.current?.playVideo();
                  }, ms),
                );
              }
              playingRef.current = false;
            }
            else if (e.data === 0) {
              setPlaying(false);
              endedRef.current();
            }
          },
          onError: () => {
            setPlaying(false);
            setError("Esse vídeo não pode ser tocado aqui. Passando para o próximo…");
            window.setTimeout(() => advanceRef.current(), 1800);
          },
        },
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // progresso
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      const p = playerRef.current;
      if (!p || !readyRef.current) return;
      setPosition(p.getCurrentTime() || 0);
      setDuration(p.getDuration() || 0);
    }, 500);
    return () => window.clearInterval(id);
  }, [playing]);

  const goTo = useCallback(
    (i: number) => {
      const t = queueRef.current[i];
      if (!t) return;
      setIndex(i);
      load(t);
    },
    [load],
  );

  const next = useCallback(() => {
    const q = queueRef.current;
    const cur = indexRef.current;
    if (shuffleRef.current && q.length > 1) {
      let i = cur;
      while (i === cur) i = Math.floor(Math.random() * q.length);
      goTo(i);
      return;
    }
    const i = cur + 1;
    if (i < q.length) goTo(i);
    else if (repeatRef.current === "all" && q.length > 0) goTo(0);
    else {
      setPlaying(false);
      playerRef.current?.pauseVideo();
    }
  }, [goTo]);
  useEffect(() => {
    advanceRef.current = next;
    endedRef.current = () => {
      if (repeatRef.current === "one") {
        playerRef.current?.seekTo(0, true);
        playerRef.current?.playVideo();
      } else next();
    };
  }, [next]);
  useEffect(() => {
    shuffleRef.current = shuffle;
    repeatRef.current = repeat;
  }, [shuffle, repeat]);
  const toggleShuffle = useCallback(() => setShuffle((v) => !v), []);
  const cycleRepeat = useCallback(() => setRepeat((r) => (r === "off" ? "all" : r === "all" ? "one" : "off")), []);

  const prev = useCallback(() => {
    if (position > 3) {
      playerRef.current?.seekTo(0, true);
      setPosition(0);
      return;
    }
    goTo(Math.max(0, indexRef.current - 1));
  }, [goTo, position]);

  const play = useCallback(
    (track: SpotTrack, q?: SpotTrack[]) => {
      userPausedRef.current = false;
      const list = q && q.length ? q : [track];
      const i = Math.max(0, list.findIndex((t) => t.id === track.id));
      setQueue(list);
      queueRef.current = list;
      setIndex(i);
      indexRef.current = i;
      load(track);
    },
    [load],
  );

  const toggle = useCallback(() => {
    const p = playerRef.current;
    if (!p || !current) return;
    if (playing) {
      userPausedRef.current = true;
      p.pauseVideo();
    } else {
      userPausedRef.current = false;
      p.playVideo();
    }
  }, [playing, current]);

  const seek = useCallback((s: number) => {
    playerRef.current?.seekTo(s, true);
    setPosition(s);
  }, []);

  const patchTrack = useCallback((id: string, patch: Partial<SpotTrack>) => {
    setQueue((q) => q.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  // controles na tela de bloqueio / fones (quando o navegador permite)
  useEffect(() => {
    if (!current || typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({ title: current.title, artist: current.channel, artwork: [{ src: thumb(current.video_id, "hq"), sizes: "480x360", type: "image/jpeg" }] });
    navigator.mediaSession.setActionHandler("play", () => {
      userPausedRef.current = false;
      playerRef.current?.playVideo();
    });
    navigator.mediaSession.setActionHandler("pause", () => {
      userPausedRef.current = true;
      playerRef.current?.pauseVideo();
    });
    navigator.mediaSession.setActionHandler("nexttrack", () => advanceRef.current());
  }, [current]);
  useEffect(() => {
    if (typeof navigator !== "undefined" && "mediaSession" in navigator) navigator.mediaSession.playbackState = playing ? "playing" : current ? "paused" : "none";
  }, [playing, current]);

  // vários espaços podem existir por instantes durante uma troca de tela: vale o mais recente que ainda está na página
  const registerSlot = useCallback((kind: "mini" | "full", el: HTMLElement) => {
    const list = slotsRef.current[kind];
    if (!list.includes(el)) list.push(el);
  }, []);
  const unregisterSlot = useCallback((kind: "mini" | "full", el: HTMLElement) => {
    slotsRef.current[kind] = slotsRef.current[kind].filter((x) => x !== el);
  }, []);

  const value = useMemo<Ctx>(
    () => ({ current, queue, index, playing, position, duration, error, expanded, setExpanded, shuffle, repeat, toggleShuffle, cycleRepeat, play, toggle, next, prev, seek, patchTrack, registerSlot, unregisterSlot }),
    [current, queue, index, playing, position, duration, error, expanded, shuffle, repeat, toggleShuffle, cycleRepeat, play, toggle, next, prev, seek, patchTrack, registerSlot, unregisterSlot],
  );

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <PlayerHost slotsRef={slotsRef} />
    </PlayerContext.Provider>
  );
}

/**
 * O elemento onde o player do YouTube mora. Fica sempre montado na raiz do app (por isso a música continua ao navegar pelo ELOS)
 * e acompanha, quadro a quadro, a posição do espaço ("slot") da tela atual: o mini player ou a tela "Tocando agora".
 */
function PlayerHost({ slotsRef }: { slotsRef: React.RefObject<Slots> }) {
  const { current } = useContext(PlayerContext) as Ctx;
  const hostRef = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState(false);

  useEffect(() => {
    if (!current) return;
    let raf = 0;
    const tick = () => {
      const host = hostRef.current;
      const slots = slotsRef.current;
      if (host && slots) {
        const last = (list: HTMLElement[]) => [...list].reverse().find((x) => x.isConnected) ?? null;
        const fullEl = last(slots.full);
        const el = fullEl ?? last(slots.mini);
        if (!el) {
          host.style.transform = "translate(-9999px, 0)";
        } else {
          const r = el.getBoundingClientRect();
          host.style.left = `${r.left}px`;
          host.style.top = `${r.top}px`;
          host.style.transformOrigin = "0 0";
          if (fullEl) {
            host.style.width = `${r.width}px`;
            host.style.height = `${r.height}px`;
            host.style.transform = "none";
          } else {
            // o YouTube não toca em players pequenos: o player mantém 356x200 e é só encolhido na tela
            host.style.width = `${MINI_BASE_W}px`;
            host.style.height = `${(MINI_BASE_W * 9) / 16}px`;
            host.style.transform = `scale(${r.width / MINI_BASE_W})`;
          }
          host.style.pointerEvents = fullEl ? "auto" : "none";
          host.style.borderRadius = fullEl ? "8px" : "14px";
          setFull((f) => (f === !!fullEl ? f : !!fullEl));
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [current, slotsRef]);

  return (
    <div
      id="spot-yt-host"
      ref={hostRef}
      className="fixed z-[85] overflow-hidden bg-black"
      style={{ left: -9999, top: 0, width: MINI_BASE_W, height: (MINI_BASE_W * 9) / 16 }}
    >
      {full && current ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb(current.video_id, "hq")} alt="" className="absolute inset-0 h-full w-full scale-150 object-cover opacity-70 blur-2xl" draggable={false} />
      ) : null}
      <div className={full ? "absolute inset-x-0 top-1/2 aspect-video -translate-y-1/2" : "absolute inset-0"}>
        <div id="spot-yt-target" />
      </div>
    </div>
  );
}

/** Ref de callback para marcar um espaço da tela onde o player deve aparecer. */
export function useSlot(kind: "mini" | "full") {
  const { registerSlot, unregisterSlot } = useSpotPlayer();
  const attached = useRef<HTMLElement | null>(null);
  return useCallback(
    (el: HTMLElement | null) => {
      if (el) {
        attached.current = el;
        registerSlot(kind, el);
      } else if (attached.current) {
        unregisterSlot(kind, attached.current);
        attached.current = null;
      }
    },
    [registerSlot, unregisterSlot, kind],
  );
}
