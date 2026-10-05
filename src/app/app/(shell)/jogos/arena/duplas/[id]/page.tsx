import { notFound } from "next/navigation";
import { ArenaDuoRoom } from "@/components/arena/ArenaDuoRoom";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { viewOfDuo, type DuoRow } from "@/lib/arena/settleDuo";
import { createClient } from "@/lib/supabase/server";

export default async function ArenaDuoRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile } = await requireRole("cria", "leader");
  const supabase = await createClient();

  const { data: row } = await supabase.from("arena_duo").select("*").eq("id", id).maybeSingle<DuoRow>();
  const me = row ? row.players.indexOf(profile.id) : -1;
  if (!row || me < 0) notFound();

  const { data: people } = await supabase.from("profiles").select("id, full_name").in("id", row.players);
  const nameOf = new Map(((people ?? []) as { id: string; full_name: string }[]).map((p) => [p.id, p.full_name || "colega"]));
  const names = row.players.map((u) => nameOf.get(u) ?? "colega");

  // convite parado há mais de 1 dia vale como recusado
  const expired = row.status === "invited" && Date.now() - new Date(row.created_at).getTime() > 24 * 3_600_000;
  const status = expired ? "declined" : row.status;

  return (
    <>
      <PageHeader title="👥 Arena em duplas" subtitle="Partida 2x2 em tempo real com colegas do seu Elo." />
      <ArenaDuoRoom
        id={row.id}
        me={me}
        names={names}
        arena={row.arena}
        seed={row.seed}
        decks={row.decks}
        initialStatus={status}
        initialView={expired ? { state: "declined" } : viewOfDuo(row, profile.id)}
      />
    </>
  );
}
