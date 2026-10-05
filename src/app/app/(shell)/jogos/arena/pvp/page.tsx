import Link from "next/link";
import { ArenaPvpLobby, type Mate, type PvpItem } from "@/components/arena/ArenaPvpLobby";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { viewOf, type PvpRow } from "@/lib/arena/settlePvp";
import { createClient } from "@/lib/supabase/server";

export default async function ArenaPvpLobbyPage() {
  const { profile } = await requireRole("cria", "leader");
  const supabase = await createClient();

  const [matesRes, pvpRes] = await Promise.all([
    profile.elo_id
      ? supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .eq("elo_id", profile.elo_id)
          .in("role", ["cria", "leader"])
          .neq("id", profile.id)
          .order("full_name")
      : Promise.resolve({ data: [] }),
    supabase.from("arena_pvp").select("*").order("created_at", { ascending: false }).limit(20),
  ]);

  const mates: Mate[] = ((matesRes.data ?? []) as { id: string; full_name: string; avatar_url: string | null }[]).map((m) => ({
    id: m.id,
    name: m.full_name || "Sem nome",
    avatarUrl: m.avatar_url,
  }));
  const nameOf = new Map(mates.map((m) => [m.id, m.name]));
  // medalhas de vitória (as minhas contra cada colega e as dele contra mim)
  const { data: medalRows } = await supabase.from("arena_medals").select("winner_id, loser_id, wins");
  const medals: Record<string, { mine: number; theirs: number }> = {};
  for (const r of (medalRows ?? []) as { winner_id: string; loser_id: string; wins: number }[]) {
    const other = r.winner_id === profile.id ? r.loser_id : r.winner_id;
    medals[other] ??= { mine: 0, theirs: 0 };
    if (r.winner_id === profile.id) medals[other].mine = r.wins;
    else medals[other].theirs = r.wins;
  }
  const dayAgo = Date.now() - 24 * 3_600_000;

  const items: PvpItem[] = ((pvpRes.data ?? []) as PvpRow[])
    .filter((r) => r.status !== "declined" && !((r.status === "invited" || r.status === "accepted") && new Date(r.created_at).getTime() < dayAgo))
    .map((r) => {
      const iAmC = r.challenger_id === profile.id;
      const v = viewOf(r, profile.id);
      return {
        id: r.id,
        other: nameOf.get(iAmC ? r.opponent_id : r.challenger_id) ?? "colega",
        incoming: !iAmC,
        status: r.status,
        result: v.result ?? null,
        trophyDelta: v.rewarded ? (v.trophyDelta ?? 0) : null,
        waiting: v.state === "waiting",
      };
    });

  return (
    <>
      <PageHeader title="⚔️ Arena 1x1" subtitle="Desafie um colega do seu Elo: partida de 3 minutos em tempo real, todo mundo com cartas no nível 1. Quem vence ganha uma 🏅 medalha contra o adversário (não mexe em troféus)." />
      <ArenaPvpLobby mates={mates} items={items} medals={medals} />
      <Link href="/app/jogos/arena" className="btn btn-ghost mt-4 w-full">
        ← Voltar à Arena
      </Link>
    </>
  );
}
