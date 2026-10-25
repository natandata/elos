import Link from "next/link";
import { NewPlaylistButton } from "@/components/spotcria/SearchView";
import { PlaylistCover } from "@/components/spotcria/ui";
import { createClient } from "@/lib/supabase/server";
import type { SpotPlaylist } from "@/lib/spotcria/types";

export const dynamic = "force-dynamic";

export default async function Biblioteca() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("spot_my_playlists");
  const playlists = (data ?? []) as SpotPlaylist[];
  return (
    <div className="px-4 pb-4 pt-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">Sua biblioteca</h1>
        <NewPlaylistButton />
      </div>
      <ul className="mt-4 space-y-1">
        <li>
          <Link href="/app/spotcria/curtidas" className="flex items-center gap-3 rounded-xl p-1.5 active:bg-white/5">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-md bg-gradient-to-br from-[#6d28d9] to-[#c084fc] text-2xl" aria-hidden>
              💜
            </span>
            <span>
              <span className="block text-sm font-bold">Músicas curtidas</span>
              <span className="block text-xs text-[#b8a9d6]">Playlist automática</span>
            </span>
          </Link>
        </li>
        <li>
          <Link href="/app/spotcria/minhas" className="flex items-center gap-3 rounded-xl p-1.5 active:bg-white/5">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-md bg-gradient-to-br from-[#7e22ce] to-[#f0abfc] text-2xl" aria-hidden>
              📤
            </span>
            <span>
              <span className="block text-sm font-bold">Adicionadas por mim</span>
              <span className="block text-xs text-[#b8a9d6]">O que você colocou na biblioteca</span>
            </span>
          </Link>
        </li>
        {playlists.map((p) => (
          <li key={p.id}>
            <Link href={`/app/spotcria/playlist/${p.id}`} className="flex items-center gap-3 rounded-xl p-1.5 active:bg-white/5">
              <PlaylistCover covers={p.covers} className="h-14 w-14" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold">{p.name}</span>
                <span className="block text-xs text-[#b8a9d6]">Playlist · {p.track_count} música(s)</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {playlists.length === 0 ? <p className="mt-6 text-center text-sm text-[#b8a9d6]">Crie sua primeira playlist com o botão “Criar”.</p> : null}
    </div>
  );
}
