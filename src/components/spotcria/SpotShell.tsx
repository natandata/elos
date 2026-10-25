"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { toggleSpotLike } from "@/lib/actions/spotcria";
import { PlayerHost, PlayerProvider, useSpotPlayer } from "./PlayerProvider";
import { NewPlaylistSheet } from "./SearchView";
import { AddTrackSheet, Cover, Icon, PlaylistPicker, SpotMetaProvider, type SpotMeta } from "./ui";

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
          <Icon name={t.icon} className="h-6 w-6" />
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

function MiniPlayer() {
  const router = useRouter();
  const { current, playing, toggle, position, duration, setExpanded, error, patchTrack } = useSpotPlayer();
  const [, start] = useTransition();
  if (!current) return null;
  const pct = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;
  const like = () =>
    start(async () => {
      const liked = await toggleSpotLike(current.id);
      patchTrack(current.id, { liked, like_count: Math.max(0, current.like_count + (liked ? 1 : -1)) });
      router.refresh();
    });
  return (
    <div className="absolute inset-x-2 bottom-[calc(env(safe-area-inset-bottom)+58px+2px)] z-[80] overflow-hidden rounded-lg bg-[#5b2a99] shadow-xl">
      <div className="flex h-[68px] items-center gap-3 px-2">
        {/* o player de verdade fica por cima deste espaço (PlayerHost) */}
        <button type="button" onClick={() => setExpanded(true)} aria-label="Abrir Tocando agora" className="pointer-events-auto h-[54px] w-24 shrink-0" />
        <button type="button" onClick={() => setExpanded(true)} className="min-w-0 flex-1 text-left">
          <span className="block truncate text-sm font-bold text-white">{current.title}</span>
          <span className="block truncate text-xs text-white/70">{error ?? current.channel}</span>
        </button>
        <button type="button" onClick={like} aria-label={current.liked ? "Remover das curtidas" : "Curtir"} className="grid h-9 w-9 shrink-0 place-items-center">
          <Icon name={current.liked ? "check" : "plus-circle"} className={`h-7 w-7 ${current.liked ? "text-[#c58bff]" : "text-white"}`} />
        </button>
        <button type="button" onClick={toggle} aria-label={playing ? "Pausar" : "Tocar"} className="grid h-9 w-9 shrink-0 place-items-center text-white">
          <Icon name={playing ? "pause" : "play"} className="h-8 w-8" />
        </button>
      </div>
      <div className="mx-2 mb-1 h-[3px] rounded-full bg-white/25">
        <div className="h-full rounded-full bg-white" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function NowPlaying() {
  const router = useRouter();
  const { current, queue, index, playing, toggle, next, prev, position, duration, seek, expanded, setExpanded, error, patchTrack, play, shuffle, repeat, toggleShuffle, cycleRepeat } = useSpotPlayer();
  const [picker, setPicker] = useState(false);
  const [menu, setMenu] = useState(false);
  const [, start] = useTransition();
  if (!expanded || !current) return null;

  const like = () =>
    start(async () => {
      const liked = await toggleSpotLike(current.id);
      patchTrack(current.id, { liked, like_count: Math.max(0, current.like_count + (liked ? 1 : -1)) });
      router.refresh();
    });
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
    <div className="absolute inset-0 z-[82] flex flex-col overflow-y-auto bg-gradient-to-b from-[#5b2a99] via-[#2a1747] to-[#121212] pb-[calc(env(safe-area-inset-bottom)+1.5rem)] text-white">
      <div className="flex items-center justify-between px-4 pt-4">
        <button type="button" onClick={() => setExpanded(false)} aria-label="Minimizar" className="grid h-10 w-10 place-items-center">
          <Icon name="chevron-down" className="h-8 w-8" />
        </button>
        <p className="text-sm font-bold">Tocando agora</p>
        <button type="button" onClick={() => setMenu(true)} aria-label="Mais opções" className="grid h-10 w-10 place-items-center text-2xl">
          ⋯
        </button>
      </div>

      {/* espaço onde o player (PlayerHost) aparece: quadrado, como a capa do álbum */}
      <div className="mx-5 mt-6 aspect-square shrink-0" aria-hidden />

      <div className="px-6 pt-6">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-2xl font-black leading-tight">{current.title}</p>
            <p className="mt-0.5 truncate text-base text-white/70">{current.channel}</p>
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
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70" onClick={() => setMenu(false)}>
          <div className="w-full max-w-2xl rounded-t-3xl bg-[#282828] p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/25" />
            <button type="button" onClick={() => { setMenu(false); setPicker(true); }} className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left text-sm font-bold active:bg-white/10">
              <Icon name="plus-circle" className="h-6 w-6" /> Adicionar à playlist
            </button>
            <a href={`https://www.youtube.com/watch?v=${current.video_id}`} target="_blank" rel="noopener noreferrer" onClick={() => setMenu(false)} className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left text-sm font-bold active:bg-white/10">
              <Icon name="share" className="h-6 w-6" /> Abrir no YouTube
            </a>
          </div>
        </div>
      ) : null}
      {picker ? <PlaylistPicker track={current} onClose={() => setPicker(false)} /> : null}
    </div>
  );
}

function Frame({ children }: { children: ReactNode }) {
  const [sheet, setSheet] = useState<null | "create" | "track" | "playlist">(null);
  const { current } = useSpotPlayer();
  return (
    <div className="fixed inset-0 z-[60] bg-[#121212] text-white">
      <div className="relative mx-auto flex h-full max-w-2xl flex-col">
        <header className="flex items-center gap-3 px-4 pb-1 pt-[calc(env(safe-area-inset-top)+0.6rem)]">
          <Link href="/app" aria-label="Voltar ao ELOS" className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-base">
            ←
          </Link>
          <Link href="/app/spotcria" aria-label="Spot Cria — início">
            <img src="/spotcria/logo-branco.png" alt="Spotcria" className="h-6 w-auto" draggable={false} />
          </Link>
        </header>

        <div className={`min-h-0 flex-1 overflow-y-auto ${current ? "pb-[calc(env(safe-area-inset-bottom)+58px+80px)]" : "pb-[calc(env(safe-area-inset-bottom)+58px+16px)]"}`}>{children}</div>

        <MiniPlayer />
        <TabBar onCreate={() => setSheet("create")} />
        <NowPlaying />
        <PlayerHost />
        {sheet === "create" ? (
          <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70" onClick={() => setSheet(null)}>
            <div className="w-full max-w-2xl rounded-t-3xl bg-[#282828] p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]" onClick={(e) => e.stopPropagation()}>
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
        ) : null}
        {sheet === "track" ? <AddTrackSheet onClose={() => setSheet(null)} /> : null}
        {sheet === "playlist" ? <NewPlaylistSheet onClose={() => setSheet(null)} /> : null}
      </div>
    </div>
  );
}

export function SpotShell({ children, meta }: { children: ReactNode; meta: SpotMeta }) {
  return (
    <SpotMetaProvider value={meta}>
      <PlayerProvider>
        <Frame>{children}</Frame>
      </PlayerProvider>
    </SpotMetaProvider>
  );
}

