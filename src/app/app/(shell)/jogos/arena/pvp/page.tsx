import Link from "next/link";
import { ArenaPvpLobby, type Mate, type PvpItem } from "@/components/arena/ArenaPvpLobby";
import { ArenaGateBanner } from "@/components/arena/ArenaGateBanner";
import { loadGate } from "@/lib/arena/gateServer";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { viewOf, type PvpRow } from "@/lib/arena/settlePvp";
import { createClient } from "@/lib/supabase/server";

export default async function ArenaPvpLobbyPage() {
  const { profile } = await requireRole("cria", "leader");
  const supabase = await createClient();

  const gate = await loadGate(supabase, profile.id);
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
      <PageHeader title="⚔️ Arena 1x1" subtitle="Desafie um colega do seu Elo: partida de 3 minutos em tempo real, todo mundo com cartas no nível 1." />
      {gate.locked ? <ArenaGateBanner gate={gate} /> : null}
      <ArenaPvpLobby mates={mates} items={items} locked={gate.locked} />
      <Link href="/app/jogos/arena" className="btn btn-ghost mt-4 w-full">
        ← Voltar à Arena
      </Link>
    </>
  );
}
