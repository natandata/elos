import { notFound } from "next/navigation";
import { ArenaDuoRoom } from "@/components/arena/ArenaDuoRoom";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { viewOfDuo, type DuoRow } from "@/lib/arena/settleDuo";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function ArenaDuoRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile } = await requireRole("cria", "leader", "admin");
  const supabase = await createClient();

  const { data: row } = await supabase.from("arena_duo").select("*").eq("id", id).maybeSingle<DuoRow>();
  const me = row ? row.players.indexOf(profile.id) : -1;
  if (!row || me < 0) notFound();

  // partida de torneio tem gente de outros Elos (perfil não legível pela sessão)
  let tournamentId: string | null = null;
  let people: { id: string; full_name: string }[] | null = null;
  if (row.tournament_match_id) {
    const admin = createAdminClient();
    if (admin) {
      const [{ data: m }, { data: ps }] = await Promise.all([
        admin.from("arena_tournament_matches").select("tournament_id").eq("id", row.tournament_match_id).maybeSingle<{ tournament_id: string }>(),
        admin.from("profiles").select("id, full_name").in("id", row.players),
      ]);
      tournamentId = m?.tournament_id ?? null;
      people = ps as { id: string; full_name: string }[] | null;
    }
  } else {
    const { data } = await supabase.from("profiles").select("id, full_name").in("id", row.players);
    people = data as { id: string; full_name: string }[] | null;
  }
  const nameOf = new Map((people ?? []).map((p) => [p.id, p.full_name || "colega"]));
  const names = row.players.map((u) => nameOf.get(u) ?? "colega");

  // convite parado há mais de 1 dia vale como recusado
  const expired = row.status === "invited" && Date.now() - new Date(row.created_at).getTime() > 24 * 3_600_000;
  const status = expired ? "declined" : row.status;

  return (
    <>
      <PageHeader title={tournamentId ? "🏆 Torneio · duplas" : "👥 Arena em duplas"} subtitle={tournamentId ? "Partida do torneio, em tempo real." : "Partida 2x2 em tempo real com colegas do seu Elo."} />
      <ArenaDuoRoom
        id={row.id}
        me={me}
        names={names}
        arena={row.arena}
        seed={row.seed}
        decks={row.decks}
        levels={row.levels}
        initialStatus={status}
        initialView={expired ? { state: "declined" } : viewOfDuo(row, profile.id)}
        tournamentId={tournamentId}
        myId={profile.id}
      />
    </>
  );
}
