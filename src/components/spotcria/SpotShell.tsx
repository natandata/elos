"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { toggleSpotLike } from "@/lib/actions/spotcria";
import { PlayerHost, PlayerProvider, useSpotPlayer } from "./PlayerProvider";
import { AddTrackSheet, Cover, PlaylistPicker, SpotMetaProvider } from "./ui";

// "App dentro do app": cobre a tela inteira com o visual do Spotify em roxo. O player fica montado aqui,
// então a música continua tocando enquanto a pessoa navega entre Início, Buscar e Sua biblioteca.

const mmss = (s: number) => {
  const t = Math.max(0, Math.floor(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

function TabBar() {
  const pathname = usePathname();
  const tabs = [
    { href: "/app/spotcria", label: "Início", icon: "🏠", match: (p: string) => p === "/app/spotcria" },
    { href: "/app/spotcria/buscar", label: "Buscar", icon: "🔎", match: (p: string) => p.startsWith("/app/spotcria/buscar") },
    { href: "/app/spotcria/biblioteca", label: "Sua biblioteca", icon: "🎶", match: (p: string) => /\/(biblioteca|curtidas|minhas|playlist)/.test(p) },
  ];
  return (
    <nav className="absolute inset-x-0 bottom-0 z-[80] flex h-14 items-stretch border-t border-white/5 bg-[#0f0a1a]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur box-content" aria-label="Spot Cria">
      {tabs.map((t) => {
        const on = t.match(pathname);
        return (
          <Link key={t.href} href={t.href} className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-bold ${on ? "text-white" : "text-[#b8a9d6]"}`}>
            <span className={`text-xl leading-none ${on ? "" : "opacity-70"}`} aria-hidden>
              {t.icon}
            </span>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

function MiniPlayer() {
  const { current, playing, toggle, next, position, duration, setExpanded, error } = useSpotPlayer();
  if (!current) return null;
  const pct = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;
  return (
    <div className="absolute inset-x-2 bottom-[calc(env(safe-area-inset-bottom)+56px+4px)] z-[80] overflow-hidden rounded-xl bg-[#3b1f6b] shadow-xl">
      <div className="flex h-[68px] items-center gap-3 px-2">
        {/* o player de verdade fica por cima deste espaço (PlayerHost) */}
        <button type="button" onClick={() => setExpanded(true)} aria-label="Abrir Tocando agora" className="pointer-events-auto h-[54px] w-24 shrink-0" />
        <button type="button" onClick={() => setExpanded(true)} className="min-w-0 flex-1 text-left">
          <span className="block truncate text-sm font-bold text-white">{current.title}</span>
          <span className="block truncate text-xs text-[#d6c8f5]">{error ?? current.channel}</span>
        </button>
        <button type="button" onClick={toggle} aria-label={playing ? "Pausar" : "Tocar"} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-lg text-[#3b1f6b]">
          {playing ? "❚❚" : "▶"}
        </button>
        <button type="button" onClick={next} aria-label="Próxima" className="grid h-10 w-9 shrink-0 place-items-center text-xl text-white">
          ⏭
        </button>
      </div>
      <div className="h-[3px] bg-white/15">
        <div className="h-full bg-[#c4a0ff]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function NowPlaying() {
  const router = useRouter();
  const { current, queue, index, playing, toggle, next, prev, position, duration, seek, expanded, setExpanded, error, patchTrack, play } = useSpotPlayer();
  const [picker, setPicker] = useState(false);
  const [, start] = useTransition();
  if (!expanded || !current) return null;

  const like = () =>
    start(async () => {
      const liked = await toggleSpotLike(current.id);
      patchTrack(current.id, { liked, like_count: Math.max(0, current.like_count + (liked ? 1 : -1)) });
      router.refresh();
    });

  return (
    <div className="absolute inset-0 z-[82] flex flex-col overflow-y-auto bg-gradient-to-b from-[#5b21b6] via-[#2e1065] to-[#0f0a1a] pb-[calc(env(safe-area-inset-bottom)+1.5rem)] text-white">
      <div className="flex items-center justify-between px-4 pt-4">
        <button type="button" onClick={() => setExpanded(false)} aria-label="Minimizar" className="grid h-10 w-10 place-items-center rounded-full bg-black/25 text-xl">
          ⌄
        </button>
        <p className="text-[11px] font-black uppercase tracking-wider text-white/80">Tocando agora</p>
        <span className="h-10 w-10" aria-hidden />
      </div>

      {/* espaço onde o player (PlayerHost) aparece */}
      <div className="mx-5 mt-4 aspect-video shrink-0" aria-hidden />

      <div className="px-6 pt-5">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-xl font-black leading-snug">{current.title}</p>
            <p className="mt-0.5 truncate text-sm text-[#d6c8f5]">{current.channel}</p>
          </div>
          <button type="button" onClick={like} aria-label={current.liked ? "Remover das curtidas" : "Curtir"} className="grid h-10 w-10 shrink-0 place-items-center text-2xl">
            {current.liked ? "💜" : "🤍"}
          </button>
        </div>
        {error ? <p className="mt-2 text-xs font-bold text-rose-300">{error}</p> : null}

        <input type="range" min={0} max={Math.max(1, Math.floor(duration))} value={Math.min(Math.floor(position), Math.max(1, Math.floor(duration)))} onChange={(e) => seek(Number(e.target.value))} aria-label="Progresso" className="mt-4 h-1.5 w-full accent-[#c4a0ff]" />
        <div className="mt-1 flex justify-between text-[11px] tabular-nums text-[#d6c8f5]">
          <span>{mmss(position)}</span>
          <span>{duration ? mmss(duration) : "--:--"}</span>
        </div>

        <div className="mt-3 flex items-center justify-center gap-6">
          <button type="button" onClick={prev} aria-label="Anterior" className="grid h-12 w-12 place-items-center text-3xl">
            ⏮
          </button>
          <button type="button" onClick={toggle} aria-label={playing ? "Pausar" : "Tocar"} className="grid h-16 w-16 place-items-center rounded-full bg-white text-2xl text-[#2e1065] shadow-lg">
            {playing ? "❚❚" : "▶"}
          </button>
          <button type="button" onClick={next} aria-label="Próxima" className="grid h-12 w-12 place-items-center text-3xl">
            ⏭
          </button>
        </div>

        <div className="mt-4 flex justify-center gap-3">
          <button type="button" onClick={() => setPicker(true)} className="rounded-full bg-white/15 px-4 py-2 text-xs font-black">
            ➕ Adicionar à playlist
          </button>
          <a href={`https://www.youtube.com/watch?v=${current.video_id}`} target="_blank" rel="noopener noreferrer" className="rounded-full bg-white/15 px-4 py-2 text-xs font-black">
            ↗ YouTube
          </a>
        </div>
      </div>

      {queue.length > 1 ? (
        <div className="mt-6 px-4">
          <p className="mb-1 px-2 text-sm font-black">Na fila</p>
          <ul>
            {queue.map((t, i) => (
              <li key={t.id}>
                <button type="button" onClick={() => play(t, queue)} className={`flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left ${i === index ? "bg-white/10" : ""}`}>
                  <Cover videoId={t.video_id} className="h-10 w-10" />
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm font-bold ${i === index ? "text-[#c4a0ff]" : ""}`}>{t.title}</span>
                    <span className="block truncate text-xs text-[#d6c8f5]">{t.channel}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {picker ? <PlaylistPicker track={current} onClose={() => setPicker(false)} /> : null}
    </div>
  );
}

function Frame({ children }: { children: ReactNode }) {
  const [adding, setAdding] = useState(false);
  const { current } = useSpotPlayer();
  return (
    <div className="fixed inset-0 z-[60] bg-[#0f0a1a] text-white">
      <div className="relative mx-auto flex h-full max-w-2xl flex-col">
        <header className="flex items-center gap-3 px-4 pb-2 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
          <Link href="/app" aria-label="Voltar ao ELOS" className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-lg">
            ←
          </Link>
          <Link href="/app/spotcria" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#a855f7] text-base" aria-hidden>
              🎧
            </span>
            <span className="text-lg font-black tracking-tight">Spot Cria</span>
          </Link>
          <button type="button" onClick={() => setAdding(true)} aria-label="Adicionar música" className="ml-auto grid h-9 w-9 place-items-center rounded-full bg-white/10 text-xl font-black">
            +
          </button>
        </header>

        <div className={`min-h-0 flex-1 overflow-y-auto ${current ? "pb-[calc(env(safe-area-inset-bottom)+56px+84px)]" : "pb-[calc(env(safe-area-inset-bottom)+56px+16px)]"}`}>{children}</div>

        <MiniPlayer />
        <TabBar />
        <NowPlaying />
        <PlayerHost />
        {adding ? <AddTrackSheet onClose={() => setAdding(false)} /> : null}
      </div>
    </div>
  );
}

export function SpotShell({ children, isAdmin }: { children: ReactNode; isAdmin: boolean }) {
  return (
    <SpotMetaProvider value={{ isAdmin }}>
      <PlayerProvider>
        <Frame>{children}</Frame>
      </PlayerProvider>
    </SpotMetaProvider>
  );
}
