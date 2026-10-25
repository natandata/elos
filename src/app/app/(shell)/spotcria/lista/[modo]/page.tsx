import { notFound } from "next/navigation";
import { TrackListView } from "@/components/spotcria/ui";
import { createClient } from "@/lib/supabase/server";
import type { SpotTrack } from "@/lib/spotcria/types";

export const dynamic = "force-dynamic";

const MODES: Record<string, { title: string; emoji: string; gradient: string; empty: string }> = {
  recent: { title: "Novas no ELOS", emoji: "🆕", gradient: "from-[#be185d] to-[#f472b6]", empty: "Ainda não há músicas." },
  played: { title: "Mais ouvidas", emoji: "🔥", gradient: "from-[#15803d] to-[#86efac]", empty: "Ninguém ouviu nada ainda." },
  liked_top: { title: "Mais curtidas", emoji: "💜", gradient: "from-[#3730a3] to-[#a5b4fc]", empty: "Ainda não há curtidas." },
  my_recent: { title: "Ouvidas por mim", emoji: "🕘", gradient: "from-[#be123c] to-[#fda4af]", empty: "Você ainda não ouviu nenhuma música." },
};

export default async function Lista({ params }: { params: Promise<{ modo: string }> }) {
  const { modo } = await params;
  const cfg = MODES[modo];
  if (!cfg) notFound();
  const supabase = await createClient();
  const { data } = await supabase.rpc("spot_list_tracks", { p_mode: modo, p_limit: 100 });
  let tracks = (data ?? []) as SpotTrack[];
  if (modo === "played") tracks = tracks.filter((t) => t.play_count > 0);
  if (modo === "liked_top") tracks = tracks.filter((t) => t.like_count > 0);
  return (
    <TrackListView
      title={cfg.title}
      subtitle={`${tracks.length} música(s)`}
      cover={<span className={`grid aspect-square place-items-center rounded-lg bg-gradient-to-br ${cfg.gradient} text-6xl shadow-xl`}>{cfg.emoji}</span>}
      tracks={tracks}
      empty={cfg.empty}
    />
  );
}
