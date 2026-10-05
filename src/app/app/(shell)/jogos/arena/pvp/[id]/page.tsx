import { notFound } from "next/navigation";
import { ArenaPvpRoom } from "@/components/arena/ArenaPvpRoom";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { viewOf, viewWithMedals, type PvpRow } from "@/lib/arena/settlePvp";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function ArenaPvpRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile } = await requireRole("cria", "leader");
  const supabase = await createClient();

  const { data: row } = await supabase.from("arena_pvp").select("*").eq("id", id).maybeSingle<PvpRow>();
  if (!row || (row.challenger_id !== profile.id && row.opponent_id !== profile.id)) notFound();

  const meSide = row.challenger_id === profile.id ? 0 : 1;
  const otherId = meSide === 0 ? row.opponent_id : row.challenger_id;
  // partida de torneio pode ser contra alguém de outro Elo (o perfil não é legível pela sessão)
  let tournamentId: string | null = null;
  let other: { full_name: string } | null = null;
  if (row.rank_duel && !row.tournament_match_id) {
    const admin = createAdminClient();
    if (admin) other = (await admin.from("profiles").select("full_name").eq("id", otherId).maybeSingle<{ full_name: string }>()).data;
  } else if (row.tournament_match_id) {
    const admin = createAdminClient();
    if (admin) {
      const [{ data: m }, { data: o }] = await Promise.all([
        admin.from("arena_tournament_matches").select("tournament_id").eq("id", row.tournament_match_id).maybeSingle<{ tournament_id: string }>(),
        admin.from("profiles").select("full_name").eq("id", otherId).maybeSingle<{ full_name: string }>(),
      ]);
      tournamentId = m?.tournament_id ?? null;
      other = o;
    }
  } else {
    const { data } = await supabase.from("profiles").select("full_name").eq("id", otherId).maybeSingle<{ full_name: string }>();
    other = data;
  }
  const opponentName = other?.full_name || "seu adversário";

  // convite parado há mais de 1 dia vale como recusado
  const expired = row.status === "invited" && Date.now() - new Date(row.created_at).getTime() > 24 * 3_600_000;
  const status = expired ? "declined" : row.status;
  const adminDb = createAdminClient();
  const initial = expired ? ({ state: "declined" } as const) : adminDb ? await viewWithMedals(adminDb, row, profile.id) : viewOf(row, profile.id);

  return (
    <>
      <PageHeader title={tournamentId ? "🏆 Torneio · 1x1" : row.rank_duel ? "👑 Duelo de posição" : "🏰 Arena 1x1"} subtitle={tournamentId ? "Partida do torneio, em tempo real." : row.rank_duel ? "Vizinhos do Top 3: se o de baixo vencer, os dois trocam de lugar e de troféus." : "Partida em tempo real contra um colega do seu Elo."} />
      <ArenaPvpRoom
        id={row.id}
        meSide={meSide}
        opponentName={opponentName}
        arena={row.arena}
        seed={row.seed}
        decks={[row.challenger_deck, row.opponent_deck]}
        initialStatus={status}
        initialView={initial}
        tournamentId={tournamentId}
        myId={profile.id}
      />
    </>
  );
}
