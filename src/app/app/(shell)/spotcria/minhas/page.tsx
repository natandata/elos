import { TrackListView } from "@/components/spotcria/ui";
import { createClient } from "@/lib/supabase/server";
import type { SpotTrack } from "@/lib/spotcria/types";

export const dynamic = "force-dynamic";

export default async function Minhas() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("spot_list_tracks", { p_mode: "added_by_me", p_limit: 200 });
  const tracks = (data ?? []) as SpotTrack[];
  return (
    <TrackListView
      title="Adicionadas por mim"
      subtitle={`${tracks.length} música(s) que você colocou na biblioteca`}
      cover={<span className="grid aspect-square place-items-center rounded-lg bg-gradient-to-br from-[#7e22ce] to-[#f0abfc] text-6xl shadow-xl">📤</span>}
      tracks={tracks}
      empty="Você ainda não adicionou músicas. Toque no “+” lá em cima."
    />
  );
}
