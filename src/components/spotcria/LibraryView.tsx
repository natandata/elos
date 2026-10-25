"use client";

import Link from "next/link";
import { useState } from "react";
import type { SpotPlaylist, SpotTrack } from "@/lib/spotcria/types";
import { NewPlaylistButton } from "./SearchView";
import { CoverArt, Icon, MyAvatar, PlaylistCover, TrackRow, useSpotMeta } from "./ui";

/** Sua Biblioteca: filtros (Playlists / Músicas), lista com capa e legenda "Playlist • Nome", como no Spotify. */
export function LibraryView({ playlists, tracks }: { playlists: SpotPlaylist[]; tracks: SpotTrack[] }) {
  const { name } = useSpotMeta();
  const first = name.split(" ")[0] || "Você";
  const [tab, setTab] = useState<"playlists" | "musicas">("playlists");
  const chip = (on: boolean) => `whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${on ? "bg-[#a855f7] text-white" : "bg-[#2a2a2a]"}`;

  return (
    <div className="px-4 pb-4 pt-2">
      <div className="flex items-center gap-3">
        <MyAvatar size={40} />
        <h1 className="flex-1 text-2xl font-black tracking-tight">Sua Biblioteca</h1>
        <Link href="/app/spotcria/buscar" aria-label="Buscar" className="grid h-10 w-10 place-items-center">
          <Icon name="search" className="h-7 w-7" />
        </Link>
        <NewPlaylistButton />
      </div>

      <div className="mt-4 flex gap-2">
        <button type="button" onClick={() => setTab("playlists")} className={chip(tab === "playlists")}>
          Playlists
        </button>
        <button type="button" onClick={() => setTab("musicas")} className={chip(tab === "musicas")}>
          Músicas
        </button>
      </div>

      {tab === "playlists" ? (
        <ul className="mt-4 space-y-1">
          <li>
            <Link href="/app/spotcria/curtidas" className="flex items-center gap-3 rounded-md p-1.5 active:bg-white/5">
              <CoverArt kind="liked" className="h-16 w-16" />
              <span>
                <span className="block text-base font-bold">Músicas curtidas</span>
                <span className="block text-sm text-[#a7a7a7]">Playlist • {first}</span>
              </span>
            </Link>
          </li>
          <li>
            <Link href="/app/spotcria/minhas" className="flex items-center gap-3 rounded-md p-1.5 active:bg-white/5">
              <CoverArt kind="mine" className="h-16 w-16" />
              <span>
                <span className="block text-base font-bold">Adicionadas por mim</span>
                <span className="block text-sm text-[#a7a7a7]">Playlist • {first}</span>
              </span>
            </Link>
          </li>
          {playlists.map((p) => (
            <li key={p.id}>
              <Link href={`/app/spotcria/playlist/${p.id}`} className="flex items-center gap-3 rounded-md p-1.5 active:bg-white/5">
                <PlaylistCover covers={p.covers} className="h-16 w-16" />
                <span className="min-w-0">
                  <span className="block truncate text-base font-bold">{p.name}</span>
                  <span className="block text-sm text-[#a7a7a7]">
                    Playlist • {first} • {p.track_count} música(s)
                  </span>
                </span>
              </Link>
            </li>
          ))}
          {playlists.length === 0 ? <li className="px-1 pt-4 text-sm text-[#a7a7a7]">Toque no “+” para criar sua primeira playlist.</li> : null}
        </ul>
      ) : (
        <ul className="mt-3">
          {tracks.map((t) => (
            <TrackRow key={t.id} track={t} queue={tracks} />
          ))}
          {tracks.length === 0 ? <li className="px-1 pt-4 text-sm text-[#a7a7a7]">Nenhuma música ainda.</li> : null}
        </ul>
      )}
    </div>
  );
}
