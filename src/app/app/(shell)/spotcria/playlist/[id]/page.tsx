import { notFound } from "next/navigation";
import { PlaylistActions } from "@/components/spotcria/SearchView";
import { PlaylistCover, TrackListView } from "@/components/spotcria/ui";
import { createClient } from "@/lib/supabase/server";
import type { SpotTrack } from "@/lib/spotcria/types";

export const dynamic = "force-dynamic";

export default async function PlaylistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: pl } = await supabase.from("spot_playlists").select("id, name").eq("id", id).maybeSingle<{ id: string; name: string }>();
  if (!pl) notFound();
  const { data } = await supabase.rpc("spot_playlist_items", { p_playlist: id });
  const tracks = (data ?? []) as SpotTrack[];
  return (
    <TrackListView
      title={pl.name}
      subtitle={`Playlist · ${tracks.length} música(s)`}
      cover={<PlaylistCover covers={tracks.slice(0, 4).map((t) => t.video_id)} className="w-full shadow-xl" />}
      tracks={tracks}
      playlistId={pl.id}
      empty="Esta playlist está vazia. Em qualquer música, toque em ⋯ e escolha Adicionar à playlist."
      actions={<PlaylistActions id={pl.id} name={pl.name} />}
    />
  );
}
