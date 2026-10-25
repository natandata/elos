"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { invalidateSpot, seedSpot } from "@/lib/spotcria/store";
import type { SpotHomeData } from "@/lib/actions/spotcria";
import { MiniPlayer } from "./MiniPlayer";
import { useSlot, useSpotPlayer } from "./PlayerProvider";
import { NewPlaylistSheet } from "./SearchView";
import { AddTrackSheet, Cover, Icon, likeOptimistic, PlaylistPicker, playsLabel, Portal, SpotMetaProvider, useSpotMeta, type SpotMeta } from "./ui";

// "App dentro do app": cobre a tela inteira com o visual do Spotify em roxo. O player fica montado aqui,
// então a música continua tocando enquanto a pessoa navega entre Início, Buscar e Sua biblioteca.

const mmss = (s: number) => {
  const t = Math.max(0, Math.floor(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

function TabBar({ onCreate }: { onCreate: () => void }) {
  const pathname = usePathname();
  const tabs = [
    { href: "/app/spotcria", label: "Início", icon: "home" as const, on: pathname === "/app/spotcria" },
    { href: "/app/spotcria/buscar", label: "Buscar", icon: "search" as const, on: pathname.startsWith("/app/spotcria/buscar") },
    { href: "/app/spotcria/biblioteca", label: "Sua Biblioteca", icon: "library" as const, on: /\/(biblioteca|curtidas|minhas|playlist|lista)/.test(pathname) },
  ];
  const cls = (on: boolean) => `flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-semibold ${on ? "text-white" : "text-[#a7a7a7]"}`;
  return (
    <nav className="absolute inset-x-0 bottom-0 z-[80] box-content flex h-[58px] items-stretch bg-gradient-to-t from-[#121212] via-[#121212]/95 to-[#121212]/80 pb-[env(safe-area-inset-bottom)] backdrop-blur" aria-label="Spot Cria">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} className={cls(t.on)}>
          <Icon name={t.icon === "home" && !t.on ? "home-outline" : t.icon} className="h-6 w-6" />
          {t.label}
        </Link>
      ))}
      <button type="button" onClick={onCreate} className={cls(false)}>
        <Icon name="plus" className="h-6 w-6" />
        Criar
      </button>
    </nav>
  );
}

function NowPlaying() {
  const { current, queue, index, playing, toggle, next, prev, position, duration, seek, expanded, setExpanded, error, patchTrack, play, shuffle, repeat, toggleShuffle, cycleRepeat } = useSpotPlayer();
  const [picker, setPicker] = useState(false);
  const [menu, setMenu] = useState(false);
  const fullSlot = useSlot("full");
  if (!expanded || !current) return null;

  const like = () => void likeOptimistic(current, patchTrack);
  const share = async () => {
    const url = `https://www.youtube.com/watch?v=${current.video_id}`;
    try {
      if (navigator.share) await navigator.share({ title: current.title, url });
      else await navigator.clipboard.writeText(url);
    } catch {
      // cancelou o compartilhamento
    }
  };
  const dur = Math.max(1, Math.floor(duration));

  return (
    <div className="spot-up absolute inset-0 z-[82] flex flex-col overflow-y-auto bg-gradient-to-b from-[#5b2a99] via-[#2a1747] to-[#121212] pb-[calc(env(safe-area-inset-bottom)+1.5rem)] text-white">
      <div className="flex items-center justify-between px-4 pt-4">
        <button type="button" onClick={() => setExpanded(false)} aria-label="Minimizar" className="grid h-10 w-10 place-items-center">
          <Icon name="chevron-down" className="h-8 w-8" />
        </button>
        <p className="text-sm font-bold">Tocando agora</p>
        <button type="button" onClick={() => setMenu(true)} aria-label="Mais opções" className="grid h-10 w-10 place-items-center">
          <Icon name="more" className="h-7 w-7" />
        </button>
      </div>

      {/* espaço onde o player (PlayerHost) aparece: quadrado, como a capa do álbum */}
      <div ref={fullSlot} className="mx-5 mt-6 aspect-square shrink-0" aria-hidden />

      <div className="px-6 pt-6">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-2xl font-black leading-tight">{current.title}</p>
            <p className="mt-0.5 truncate text-base text-white/70">{current.channel}</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-white/60"><Icon name="play" className="h-3 w-3" />{playsLabel(current.play_count)} no ELOS</p>
          </div>
          <button type="button" onClick={like} aria-label={current.liked ? "Remover das curtidas" : "Curtir"} className="grid h-10 w-10 shrink-0 place-items-center">
            <Icon name={current.liked ? "check" : "plus-circle"} className={`h-8 w-8 ${current.liked ? "text-[#c58bff]" : "text-white"}`} />
          </button>
        </div>
        {error ? <p className="mt-2 text-xs font-bold text-rose-300">{error}</p> : null}

        <input type="range" min={0} max={dur} value={Math.min(Math.floor(position), dur)} onChange={(e) => seek(Number(e.target.value))} aria-label="Progresso" className="mt-5 h-1.5 w-full accent-white" />
        <div className="mt-1 flex justify-between text-xs tabular-nums text-white/70">
          <span>{mmss(position)}</span>
          <span>{duration ? `-${mmss(Math.max(0, duration - position))}` : "--:--"}</span>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <button type="button" onClick={toggleShuffle} aria-label="Aleatório" aria-pressed={shuffle} className={`grid h-11 w-11 place-items-center ${shuffle ? "text-[#c58bff]" : "text-white"}`}>
            <Icon name="shuffle" className="h-7 w-7" />
          </button>
          <button type="button" onClick={prev} aria-label="Anterior" className="grid h-12 w-12 place-items-center">
            <Icon name="prev" className="h-10 w-10" />
          </button>
          <button type="button" onClick={toggle} aria-label={playing ? "Pausar" : "Tocar"} className="grid h-[72px] w-[72px] place-items-center rounded-full bg-white text-[#121212]">
            <Icon name={playing ? "pause" : "play"} className="h-9 w-9" />
          </button>
          <button type="button" onClick={next} aria-label="Próxima" className="grid h-12 w-12 place-items-center">
            <Icon name="next" className="h-10 w-10" />
          </button>
          <button type="button" onClick={cycleRepeat} aria-label="Repetir" aria-pressed={repeat !== "off"} className={`relative grid h-11 w-11 place-items-center ${repeat !== "off" ? "text-[#c58bff]" : "text-white"}`}>
            <Icon name="repeat" className="h-7 w-7" />
            {repeat === "one" ? <span className="absolute text-[9px] font-black">1</span> : null}
          </button>
        </div>

        <div className="mt-3 flex items-center justify-end gap-2">
          <button type="button" onClick={share} aria-label="Compartilhar" className="grid h-10 w-10 place-items-center">
            <Icon name="share" className="h-6 w-6" />
          </button>
          <button type="button" onClick={() => document.getElementById("spot-queue")?.scrollIntoView({ behavior: "smooth" })} aria-label="Fila" className="grid h-10 w-10 place-items-center">
            <Icon name="queue" className="h-6 w-6" />
          </button>
        </div>
      </div>

      {queue.length > 1 ? (
        <div id="spot-queue" className="mt-6 px-4">
          <p className="mb-1 px-2 text-sm font-black">Na fila</p>
          <ul>
            {queue.map((t, i) => (
              <li key={t.id}>
                <button type="button" onClick={() => play(t, queue)} className={`flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left ${i === index ? "bg-white/10" : ""}`}>
                  <Cover videoId={t.video_id} className="h-10 w-10" />
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm font-bold ${i === index ? "text-[#c58bff]" : ""}`}>{t.title}</span>
                    <span className="block truncate text-xs text-white/70">{t.channel}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {menu ? (
        <Portal>
        <div className="spot-fade fixed inset-0 z-[120] flex items-end justify-center bg-black/70" onClick={() => setMenu(false)}>
          <div className="spot-up w-full max-w-2xl rounded-t-3xl bg-[#282828] p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/25" />
            <button type="button" onClick={() => { setMenu(false); setPicker(true); }} className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left text-sm font-bold active:bg-white/10">
              <Icon name="plus-circle" className="h-6 w-6" /> Adicionar à playlist
            </button>
            <a href={`https://www.youtube.com/watch?v=${current.video_id}`} target="_blank" rel="noopener noreferrer" onClick={() => setMenu(false)} className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left text-sm font-bold active:bg-white/10">
              <Icon name="share" className="h-6 w-6" /> Abrir no YouTube
            </a>
          </div>
        </div>
        </Portal>
      ) : null}
      {picker ? <PlaylistPicker track={current} onClose={() => setPicker(false)} /> : null}
    </div>
  );
}

const PULL_TRIGGER = 70;

function Frame({ children }: { children: ReactNode }) {
  const [sheet, setSheet] = useState<null | "create" | "track" | "playlist">(null);
  const { current } = useSpotPlayer();
  const scroller = useRef<HTMLDivElement>(null);
  // seta de voltar: no Início do Spot Cria sai para o início do ELOS; nas demais telas volta para a tela anterior
  const router = useRouter();
  const { homeHref } = useSpotMeta();
  const pathname = usePathname();
  const trail = useRef<string[]>([]);
  useEffect(() => {
    const t = trail.current;
    if (t[t.length - 2] === pathname) t.pop();
    else if (t[t.length - 1] !== pathname) t.push(pathname);
  }, [pathname]);
  // cada tela lembra a posição de rolagem: voltar para o Início devolve você onde estava
  const scrollPos = useRef<Record<string, number>>({});
  const pathRef = useRef(pathname);
  useLayoutEffect(() => {
    pathRef.current = pathname;
    const want = scrollPos.current[pathname] ?? 0;
    const apply = () => {
      if (scroller.current) scroller.current.scrollTop = want;
    };
    apply();
    const timers = want > 0 ? [120, 400, 900].map((ms) => window.setTimeout(apply, ms)) : [];
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [pathname]);
  const goBack = () => {
    if (pathname === "/app/spotcria") router.push(homeHref);
    else if (trail.current.length > 1) router.back();
    else router.push("/app/spotcria");
  };
  // puxar a tela para baixo, no topo, recarrega (como no Spotify)
  const startY = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [dragging, setDragging] = useState(false);

  const onTouchStart = (e: React.TouchEvent) => {
    const ok = !!scroller.current && scroller.current.scrollTop <= 0 && !refreshing;
    startY.current = ok ? e.touches[0].clientY : null;
    setDragging(ok);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy <= 0) return setPull(0);
    setPull(Math.min(110, dy * 0.5));
  };
  const onTouchEnd = () => {
    const done = pull >= PULL_TRIGGER * 0.5 + 8;
    startY.current = null;
    setDragging(false);
    if (!done) return setPull(0);
    setRefreshing(true);
    setPull(48);
    void Promise.all([invalidateSpot(), new Promise((r) => window.setTimeout(r, 700))]).finally(() => {
      setRefreshing(false);
      setPull(0);
    });
  };
  return (
    <div className="fixed inset-0 z-[60] bg-[#121212] text-white">
      <div className="relative mx-auto flex h-full max-w-2xl flex-col">
        <header className="flex items-center gap-3 px-4 pb-1 pt-[calc(env(safe-area-inset-top)+0.6rem)]">
          <button type="button" onClick={goBack} aria-label={pathname === "/app/spotcria" ? "Voltar ao ELOS" : "Voltar"} className="grid h-8 w-8 place-items-center rounded-full bg-black/40">
            <Icon name="chevron-left" className="h-6 w-6" />
          </button>
          <Link href="/app/spotcria" aria-label="Spot Cria — início">
            <img src="/spotcria/logo-branco.png" alt="Spotcria" className="h-6 w-auto" draggable={false} />
          </Link>
        </header>

        <div
          className="pointer-events-none absolute inset-x-0 top-[52px] z-[70] flex justify-center"
          style={{ transform: `translateY(${pull - 34}px)`, opacity: pull > 6 || refreshing ? 1 : 0, transition: dragging ? "none" : "transform .25s ease, opacity .2s" }}
          aria-hidden
        >
          <span className={`grid h-9 w-9 place-items-center rounded-full bg-[#2a2a2a] shadow-lg ${refreshing ? "animate-spin" : ""}`} style={{ transform: refreshing ? undefined : `rotate(${pull * 4}deg)` }}>
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor">
              <path d="M17.7 6.3A8 8 0 1 0 20 12h-2a6 6 0 1 1-1.8-4.3L13 11h7V4z" />
            </svg>
          </span>
        </div>

        <div
          ref={scroller}
          onScroll={(e) => {
            scrollPos.current[pathRef.current] = e.currentTarget.scrollTop;
          }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{ transform: pull ? `translateY(${pull * 0.6}px)` : undefined, transition: dragging ? "none" : "transform .25s ease" }}
          className={`min-h-0 flex-1 overflow-y-auto overscroll-y-contain ${current ? "pb-[calc(env(safe-area-inset-bottom)+58px+80px)]" : "pb-[calc(env(safe-area-inset-bottom)+58px+16px)]"}`}>{children}</div>

        <MiniPlayer variant="frame" />
        <TabBar onCreate={() => setSheet("create")} />
        <NowPlaying />
        {sheet === "create" ? (
          <Portal>
          <div className="spot-fade fixed inset-0 z-[120] flex items-end justify-center bg-black/70" onClick={() => setSheet(null)}>
            <div className="spot-up w-full max-w-2xl rounded-t-3xl bg-[#282828] p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]" onClick={(e) => e.stopPropagation()}>
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/25" />
              <button type="button" onClick={() => setSheet("playlist")} className="flex w-full items-center gap-4 rounded-xl px-2 py-3 text-left active:bg-white/10">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-white/10">
                  <Icon name="queue" className="h-6 w-6" />
                </span>
                <span>
                  <span className="block text-base font-bold">Playlist</span>
                  <span className="block text-xs text-[#a7a7a7]">Monte uma playlist com as músicas que você curte</span>
                </span>
              </button>
              <button type="button" onClick={() => setSheet("track")} className="flex w-full items-center gap-4 rounded-xl px-2 py-3 text-left active:bg-white/10">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-white/10">
                  <Icon name="plus-circle" className="h-6 w-6" />
                </span>
                <span>
                  <span className="block text-base font-bold">Adicionar música</span>
                  <span className="block text-xs text-[#a7a7a7]">Cole um link do YouTube para o ELOS ouvir</span>
                </span>
              </button>
            </div>
          </div>
          </Portal>
        ) : null}
        {sheet === "track" ? <AddTrackSheet onClose={() => setSheet(null)} /> : null}
        {sheet === "playlist" ? <NewPlaylistSheet onClose={() => setSheet(null)} /> : null}
      </div>
    </div>
  );
}

export function SpotShell({ children, meta, initialHome }: { children: ReactNode; meta: SpotMeta; initialHome?: SpotHomeData }) {
  // o Início já chega com os dados do servidor: abre sem esqueleto
  useState(() => {
    if (initialHome) seedSpot("home", initialHome);
    return true;
  });
  return (
    <SpotMetaProvider value={meta}>
      <Frame>{children}</Frame>
    </SpotMetaProvider>
  );
}

