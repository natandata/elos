import { LibraryView } from "@/components/spotcria/LibraryView";
import { createClient } from "@/lib/supabase/server";
import type { SpotPlaylist, SpotTrack } from "@/lib/spotcria/types";

export const dynamic = "force-dynamic";

export default async function Biblioteca() {
  const supabase = await createClient();
  const [lists, all] = await Promise.all([supabase.rpc("spot_my_playlists"), supabase.rpc("spot_list_tracks", { p_mode: "recent", p_limit: 200 })]);
  return <LibraryView playlists={(lists.data ?? []) as SpotPlaylist[]} tracks={(all.data ?? []) as SpotTrack[]} />;
}
