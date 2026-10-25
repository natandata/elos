import { SearchView } from "@/components/spotcria/SearchView";
import { createClient } from "@/lib/supabase/server";
import type { SpotTrack } from "@/lib/spotcria/types";

export const dynamic = "force-dynamic";

export default async function Buscar() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("spot_list_tracks", { p_mode: "recent", p_limit: 60 });
  return <SearchView initial={(data ?? []) as SpotTrack[]} />;
}
