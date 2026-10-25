import Link from "next/link";
import { MyAvatar, PlaylistCover, Shelf } from "@/components/spotcria/ui";
import { createClient } from "@/lib/supabase/server";
import type { SpotPlaylist, SpotTrack } from "@/lib/spotcria/types";

export const dynamic = "force-dynamic";

const tileCls = "flex h-14 items-center gap-3 overflow-hidden rounded-md bg-[#2a2a2a] active:bg-[#333]";

export default async function SpotCriaHome() {
  const supabase = await createClient();
  const [recent, played, liked, mine, lists] = await Promise.all([
    supabase.rpc("spot_list_tracks", { p_mode: "recent", p_limit: 20 }),
    supabase.rpc("spot_list_tracks", { p_mode: "played", p_limit: 12 }),
    supabase.rpc("spot_list_tracks", { p_mode: "liked_top", p_limit: 12 }),
    supabase.rpc("spot_list_tracks", { p_mode: "my_recent", p_limit: 12 }),
    supabase.rpc("spot_my_playlists"),
  ]);
  const recentTracks = (recent.data ?? []) as SpotTrack[];
  const playedTracks = ((played.data ?? []) as SpotTrack[]).filter((t) => t.play_count > 0);
  const likedTracks = ((liked.data ?? []) as SpotTrack[]).filter((t) => t.like_count > 0);
  const myRecent = (mine.data ?? []) as SpotTrack[];
  const playlists = (lists.data ?? []) as SpotPlaylist[];

  return (
    <div className="pb-4">
      <div className="flex items-center gap-2 overflow-x-auto px-4 pb-3 pt-2">
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

      {recentTracks.length === 0 ? (
        <div className="mx-4 mt-8 rounded-2xl bg-[#282828] p-6 text-center">
          <p className="text-3xl" aria-hidden>
            🎧
          </p>
          <p className="mt-2 text-base font-black">A biblioteca está vazia</p>
          <p className="mt-1 text-sm text-[#a7a7a7]">Toque em “Criar”, escolha Adicionar música e cole o link de um louvor do YouTube. Ele fica salvo para todo o ELOS ouvir.</p>
        </div>
      ) : null}

      <Shelf title="Volte a ouvir" tracks={myRecent} />
      <Shelf title="Adicionadas recentemente" tracks={recentTracks} />
      <Shelf title="Mais ouvidas no ELOS" tracks={playedTracks} hint="O que a galera mais está tocando" />
      <Shelf title="Mais curtidas" tracks={likedTracks} />
    </div>
  );
}
