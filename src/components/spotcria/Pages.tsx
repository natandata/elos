"use client";

import Link from "next/link";
import { useCallback, type ReactNode } from "react";
import { spotHome, spotLibrary, spotListMode, spotPlaylistData } from "@/lib/actions/spotcria";
import { useSpotQuery } from "@/lib/spotcria/store";
import { LibraryView } from "./LibraryView";
import { PlaylistActions, SearchView } from "./SearchView";
import { MyAvatar, PlaylistCover, Shelf, TrackListView } from "./ui";

// Telas do Spot Cria. Cada uma mostra o que já está em cache na hora (ou um esqueleto na primeira vez)
// e atualiza por trás, como o Spotify.

export function Skel({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-white/10 ${className}`} />;
}

function ShelfSkeleton() {
  return (
    <div className="mt-6 px-4">
      <Skel className="h-6 w-48" />
      <div className="mt-3 flex gap-3 overflow-hidden">
        {[0, 1, 2].map((i) => (
          <div key={i} className="w-44 shrink-0">
            <Skel className="aspect-square w-full !rounded-lg" />
            <Skel className="mt-2 h-3 w-12" />
            <Skel className="mt-1.5 h-4 w-36" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <div className="pb-4">
      <div className="flex items-center gap-2 px-4 pb-3 pt-2">
        <Skel className="h-10 w-10 !rounded-full" />
        <Skel className="h-9 w-16 !rounded-full" />
        <Skel className="h-9 w-20 !rounded-full" />
        <Skel className="h-9 w-28 !rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-2 px-4">
        {[0, 1, 2, 3].map((i) => (
          <Skel key={i} className="h-14" />
        ))}
      </div>
      <ShelfSkeleton />
      <ShelfSkeleton />
    </div>
  );
}

export function ListSkeleton() {
  return (
    <div>
      <div className="bg-gradient-to-b from-[#4c1d95]/60 to-transparent px-4 pb-4 pt-6">
        <Skel className="mx-auto aspect-square w-40 !rounded-lg" />
        <Skel className="mt-4 h-7 w-56" />
        <Skel className="mt-2 h-3 w-32" />
      </div>
      <div className="space-y-3 px-4">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skel className="h-12 w-12 shrink-0" />
            <div className="flex-1">
              <Skel className="h-4 w-4/5" />
              <Skel className="mt-1.5 h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SimpleSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3 px-4 pt-4">
      <Skel className="h-9 w-48" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skel className="h-14 w-14 shrink-0" />
          <div className="flex-1">
            <Skel className="h-4 w-3/5" />
            <Skel className="mt-1.5 h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

const tileCls = "flex h-14 items-center gap-3 overflow-hidden rounded-md bg-[#2a2a2a] active:bg-[#333]";

export function HomePage() {
  const { data } = useSpotQuery("home", spotHome);
  if (!data) return <HomeSkeleton />;
  const { recent, played, liked, myRecent, playlists } = data;
  return (
    <div className="pb-4">
      <div className="spot-hscroll flex items-center gap-2 overflow-x-auto px-4 pb-3 pt-2">
        <MyAvatar size={40} />
        <span className="rounded-full bg-[#a855f7] px-4 py-2 text-sm font-bold text-white">Tudo</span>
        <Link href="/app/spotcria/lista/recent" className="rounded-full bg-[#2a2a2a] px-4 py-2 text-sm font-bold">
          Novas
        </Link>
        <Link href="/app/spotcria/lista/played" className="whitespace-nowrap rounded-full bg-[#2a2a2a] px-4 py-2 text-sm font-bold">
          Mais ouvidas
        </Link>
        <Link href="/app/spotcria/curtidas" className="whitespace-nowrap rounded-full bg-[#2a2a2a] px-4 py-2 text-sm font-bold">
          Curtidas
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2 px-4">
        <Link href="/app/spotcria/curtidas" className={tileCls}>
          <span className="grid h-14 w-14 shrink-0 place-items-center bg-gradient-to-br from-[#6d28d9] to-[#c084fc] text-2xl" aria-hidden>
            💜
          </span>
          <span className="line-clamp-2 pr-2 text-sm font-bold leading-tight">Músicas curtidas</span>
        </Link>
        <Link href="/app/spotcria/minhas" className={tileCls}>
          <span className="grid h-14 w-14 shrink-0 place-items-center bg-gradient-to-br from-[#7e22ce] to-[#f0abfc] text-2xl" aria-hidden>
            📤
          </span>
          <span className="line-clamp-2 pr-2 text-sm font-bold leading-tight">Adicionadas por mim</span>
        </Link>
        {playlists.slice(0, 6).map((p) => (
          <Link key={p.id} href={`/app/spotcria/playlist/${p.id}`} className={tileCls}>
            <PlaylistCover covers={p.covers} className="!h-14 !w-14 !rounded-none" />
            <span className="line-clamp-2 pr-2 text-sm font-bold leading-tight">{p.name}</span>
          </Link>
        ))}
      </div>

      {recent.length === 0 ? (
        <div className="mx-4 mt-8 rounded-2xl bg-[#282828] p-6 text-center">
          <p className="text-3xl" aria-hidden>
            🎧
          </p>
          <p className="mt-2 text-base font-black">A biblioteca está vazia</p>
          <p className="mt-1 text-sm text-[#a7a7a7]">Toque em “Criar”, escolha Adicionar música e cole o link de um louvor do YouTube. Ele fica salvo para todo o ELOS ouvir.</p>
        </div>
      ) : null}

      <Shelf title="Volte a ouvir" tracks={myRecent} />
      <Shelf title="Adicionadas recentemente" tracks={recent} />
      <Shelf title="Mais ouvidas no ELOS" tracks={played} hint="O que a galera mais está tocando" />
      <Shelf title="Mais curtidas" tracks={liked} />
    </div>
  );
}

export function LibraryPage() {
  const { data } = useSpotQuery("library", spotLibrary);
  if (!data) return <SimpleSkeleton />;
  return <LibraryView playlists={data.playlists} tracks={data.tracks} />;
}

export function SearchPage() {
  const { data } = useSpotQuery("search-initial", useCallback(() => spotListMode("recent", 60), []));
  if (!data) return <SimpleSkeleton rows={8} />;
  return <SearchView initial={data} />;
}

type Mode = "recent" | "played" | "liked_top" | "my_recent" | "mine_liked" | "added_by_me";

export function ListPage({ mode, title, subtitle, cover, empty }: { mode: Mode; title: string; subtitle?: string; cover: ReactNode; empty: string }) {
  const fetcher = useCallback(() => spotListMode(mode, mode === "mine_liked" || mode === "added_by_me" ? 200 : 100), [mode]);
  const { data } = useSpotQuery(`list:${mode}`, fetcher);
  if (!data) return <ListSkeleton />;
  return <TrackListView title={title} subtitle={(subtitle ?? "{n} música(s)").replace("{n}", String(data.length))} cover={cover} tracks={data} empty={empty} />;
}

export function PlaylistPage({ id }: { id: string }) {
  const fetcher = useCallback(() => spotPlaylistData(id), [id]);
  const { data } = useSpotQuery(`playlist:${id}`, fetcher);
  if (data === undefined) return <ListSkeleton />;
  if (data === null) return <p className="px-6 py-16 text-center text-sm text-[#a7a7a7]">Playlist não encontrada.</p>;
  return (
    <TrackListView
      title={data.name}
      subtitle={`Playlist · ${data.tracks.length} música(s)`}
      cover={<PlaylistCover covers={data.tracks.slice(0, 4).map((t) => t.video_id)} className="w-full shadow-xl" />}
      tracks={data.tracks}
      playlistId={data.id}
      empty="Esta playlist está vazia. Em qualquer música, toque em ⋯ e escolha Adicionar à playlist."
      actions={<PlaylistActions id={data.id} name={data.name} />}
    />
  );
}
