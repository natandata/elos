import Link from "next/link";
import { PlaylistCover, Shelf } from "@/components/spotcria/ui";
import { createClient } from "@/lib/supabase/server";
import type { SpotPlaylist, SpotTrack } from "@/lib/spotcria/types";

export const dynamic = "force-dynamic";

function greeting(): string {
  const h = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hour12: false, timeZone: "America/Sao_Paulo" }).format(new Date()));
  return h < 5 ? "Boa madrugada" : h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

export default async function SpotCriaHome() {
  const supabase = await createClient();
  const [recent, played, liked, lists] = await Promise.all([
    supabase.rpc("spot_list_tracks", { p_mode: "recent", p_limit: 20 }),
    supabase.rpc("spot_list_tracks", { p_mode: "played", p_limit: 12 }),
    supabase.rpc("spot_list_tracks", { p_mode: "liked_top", p_limit: 12 }),
    supabase.rpc("spot_my_playlists"),
  ]);
  const recentTracks = (recent.data ?? []) as SpotTrack[];
  const playedTracks = ((played.data ?? []) as SpotTrack[]).filter((t) => t.play_count > 0);
  const likedTracks = ((liked.data ?? []) as SpotTrack[]).filter((t) => t.like_count > 0);
  const playlists = (lists.data ?? []) as SpotPlaylist[];

  return (
    <div className="pb-4">
      <div className="bg-gradient-to-b from-[#4c1d95]/70 to-transparent px-4 pb-2 pt-4">
        <h1 className="text-2xl font-black">{greeting()}</h1>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link href="/app/spotcria/curtidas" className="flex h-14 items-center gap-3 overflow-hidden rounded-md bg-white/10 active:bg-white/15">
            <span className="grid h-14 w-14 shrink-0 place-items-center bg-gradient-to-br from-[#6d28d9] to-[#c084fc] text-2xl" aria-hidden>
              💜
            </span>
            <span className="line-clamp-2 pr-2 text-sm font-bold leading-tight">Músicas curtidas</span>
          </Link>
          <Link href="/app/spotcria/minhas" className="flex h-14 items-center gap-3 overflow-hidden rounded-md bg-white/10 active:bg-white/15">
            <span className="grid h-14 w-14 shrink-0 place-items-center bg-gradient-to-br from-[#7e22ce] to-[#f0abfc] text-2xl" aria-hidden>
              📤
            </span>
            <span className="line-clamp-2 pr-2 text-sm font-bold leading-tight">Adicionadas por mim</span>
          </Link>
          {playlists.slice(0, 4).map((p) => (
            <Link key={p.id} href={`/app/spotcria/playlist/${p.id}`} className="flex h-14 items-center gap-3 overflow-hidden rounded-md bg-white/10 active:bg-white/15">
              <PlaylistCover covers={p.covers} className="!h-14 !w-14 !rounded-none" />
              <span className="line-clamp-2 pr-2 text-sm font-bold leading-tight">{p.name}</span>
            </Link>
          ))}
        </div>
      </div>

      {recentTracks.length === 0 ? (
        <div className="mx-4 mt-8 rounded-2xl bg-[#1b1230] p-6 text-center">
          <p className="text-3xl" aria-hidden>
            🎧
          </p>
          <p className="mt-2 text-base font-black">A biblioteca está vazia</p>
          <p className="mt-1 text-sm text-[#b8a9d6]">Toque no “+” lá em cima e cole o link de um louvor do YouTube. Ele fica salvo para todo o ELOS ouvir.</p>
        </div>
      ) : null}

      <Shelf title="Adicionadas recentemente" tracks={recentTracks} />
      <Shelf title="Mais ouvidas no ELOS" tracks={playedTracks} hint="O que a galera mais está tocando" />
      <Shelf title="Mais curtidas" tracks={likedTracks} />
    </div>
  );
}
