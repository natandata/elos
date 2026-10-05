import { notFound } from "next/navigation";
import { ArenaPvpRoom } from "@/components/arena/ArenaPvpRoom";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { viewOf, type PvpRow } from "@/lib/arena/settlePvp";
import { createClient } from "@/lib/supabase/server";

export default async function ArenaPvpRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile } = await requireRole("cria", "leader");
  const supabase = await createClient();

  const { data: row } = await supabase.from("arena_pvp").select("*").eq("id", id).maybeSingle<PvpRow>();
  if (!row || (row.challenger_id !== profile.id && row.opponent_id !== profile.id)) notFound();

  const meSide = row.challenger_id === profile.id ? 0 : 1;
  const otherId = meSide === 0 ? row.opponent_id : row.challenger_id;
  const { data: other } = await supabase.from("profiles").select("full_name").eq("id", otherId).maybeSingle<{ full_name: string }>();
  const opponentName = other?.full_name || "seu colega";

  // convite parado há mais de 1 dia vale como recusado
  const expired = row.status === "invited" && Date.now() - new Date(row.created_at).getTime() > 24 * 3_600_000;
  const status = expired ? "declined" : row.status;

  return (
    <>
      <PageHeader title="🏰 Arena 1x1" subtitle="Partida em tempo real contra um colega do seu Elo." />
      <ArenaPvpRoom
        id={row.id}
        meSide={meSide}
        opponentName={opponentName}
        arena={row.arena}
        seed={row.seed}
        decks={[row.challenger_deck, row.opponent_deck]}
        initialStatus={status}
        initialView={expired ? { state: "declined" } : viewOf(row, profile.id)}
      />
    </>
  );
}
