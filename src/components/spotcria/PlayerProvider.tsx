"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { recordSpotPlay } from "@/lib/actions/spotcria";
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
  play: (track: SpotTrack, queue?: SpotTrack[]) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (seconds: number) => void;
  patchTrack: (id: string, patch: Partial<SpotTrack>) => void;
};

const PlayerContext = createContext<Ctx | null>(null);

export function useSpotPlayer(): Ctx {
  const c = useContext(PlayerContext);
  if (!c) throw new Error("useSpotPlayer fora do SpotShell");
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

  const playerRef = useRef<YTPlayer | null>(null);
  const readyRef = useRef(false);
  const pendingRef = useRef<string | null>(null);
  const queueRef = useRef<SpotTrack[]>([]);
  const indexRef = useRef(0);
  const recordedRef = useRef<string | null>(null);
  const advanceRef = useRef<() => void>(() => undefined);

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
              const t = queueRef.current[indexRef.current];
              if (t && recordedRef.current !== t.id) {
                recordedRef.current = t.id;
                void recordSpotPlay(t.id, t.title).catch(() => null);
              }
            } else if (e.data === 2) setPlaying(false);
            else if (e.data === 0) {
              setPlaying(false);
              advanceRef.current();
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
    const i = indexRef.current + 1;
    if (i < queueRef.current.length) goTo(i);
    else {
      setPlaying(false);
      playerRef.current?.pauseVideo();
    }
  }, [goTo]);
  useEffect(() => {
    advanceRef.current = next;
  }, [next]);

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
    if (playing) p.pauseVideo();
    else p.playVideo();
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
    navigator.mediaSession.setActionHandler("play", () => playerRef.current?.playVideo());
    navigator.mediaSession.setActionHandler("pause", () => playerRef.current?.pauseVideo());
    navigator.mediaSession.setActionHandler("nexttrack", () => advanceRef.current());
  }, [current]);

  const value = useMemo<Ctx>(
    () => ({ current, queue, index, playing, position, duration, error, expanded, setExpanded, play, toggle, next, prev, seek, patchTrack }),
    [current, queue, index, playing, position, duration, error, expanded, play, toggle, next, prev, seek, patchTrack],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

/** O elemento onde o player do YouTube mora. Fica sempre montado (dentro do quadro do Spot Cria) e só muda de lugar/tamanho. */
export function PlayerHost() {
  const { current, expanded } = useSpotPlayer();
  return (
    <div
      id="spot-yt-host"
      className={
        !current
          ? "pointer-events-none absolute -left-[9999px] top-0 h-[200px] w-[200px]"
          : expanded
            ? "absolute inset-x-5 top-[72px] z-[85] aspect-video overflow-hidden rounded-2xl bg-black shadow-2xl"
            : "pointer-events-none absolute bottom-[calc(env(safe-area-inset-bottom)+63px)] left-4 z-[85] h-[54px] w-24 overflow-hidden rounded-lg bg-black"
      }
    >
      <div id="spot-yt-target" />
    </div>
  );
}
