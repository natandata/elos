import { TrackListView } from "@/components/spotcria/ui";
import { createClient } from "@/lib/supabase/server";
import type { SpotTrack } from "@/lib/spotcria/types";

export const dynamic = "force-dynamic";

export default async function Curtidas() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("spot_list_tracks", { p_mode: "mine_liked", p_limit: 200 });
  const tracks = (data ?? []) as SpotTrack[];
  return (
    <TrackListView
      title="Músicas curtidas"
      subtitle={`${tracks.length} música(s)`}
      cover={<span className="grid aspect-square place-items-center rounded-lg bg-gradient-to-br from-[#6d28d9] to-[#c084fc] text-6xl shadow-xl">💜</span>}
      tracks={tracks}
      empty="Você ainda não curtiu nenhuma música. Toque em ⋯ e escolha Curtir."
    />
  );
}
