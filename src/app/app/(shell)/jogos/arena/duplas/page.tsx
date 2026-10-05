import Link from "next/link";
import { ArenaDuoLobby, type DuoItem, type Mate } from "@/components/arena/ArenaDuoLobby";
import { ArenaGateBanner } from "@/components/arena/ArenaGateBanner";
import { loadGate } from "@/lib/arena/gateServer";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { viewOfDuo, type DuoRow } from "@/lib/arena/settleDuo";
import { createClient } from "@/lib/supabase/server";

export default async function ArenaDuoLobbyPage() {
  const { profile } = await requireRole("cria", "leader");
  const supabase = await createClient();

  const gate = await loadGate(supabase, profile.id);
  const [matesRes, duoRes] = await Promise.all([
    profile.elo_id
      ? supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .eq("elo_id", profile.elo_id)
          .in("role", ["cria", "leader"])
          .neq("id", profile.id)
          .order("full_name")
      : Promise.resolve({ data: [] }),
    supabase.from("arena_duo").select("*").order("created_at", { ascending: false }).limit(20),
  ]);

  const mates: Mate[] = ((matesRes.data ?? []) as { id: string; full_name: string; avatar_url: string | null }[]).map((m) => ({
    id: m.id,
    name: m.full_name || "Sem nome",
    avatarUrl: m.avatar_url,
  }));
  const nameOf = new Map(mates.map((m) => [m.id, m.name]));
  const dayAgo = Date.now() - 24 * 3_600_000;

  const items: DuoItem[] = ((duoRes.data ?? []) as DuoRow[])
    .filter((r) => r.status !== "declined" && !(r.status === "invited" && new Date(r.created_at).getTime() < dayAgo))
    .map((r) => {
      const idx = r.players.indexOf(profile.id);
      const v = viewOfDuo(r, profile.id);
      return {
        id: r.id,
        status: r.status,
        incoming: idx > 0 && !Array.isArray(r.decks[idx]) && r.status === "invited",
        partner: nameOf.get(r.players[idx < 2 ? 1 - idx : 0]) ?? "colega",
        enemies: (idx < 2 ? [2, 3] : [0, 1]).map((i) => (nameOf.get(r.players[i]) ?? "colega").split(" ")[0]).join(" + "),
        result: v.result ?? null,
        trophyDelta: v.rewarded ? (v.trophyDelta ?? 0) : null,
        host: idx === 0,
      };
    });

  return (
    <>
      <PageHeader title="👥 Arena em duplas" subtitle="Monte uma dupla com um colega do seu Elo e enfrente outra dupla em tempo real (2x2). Todo mundo joga com cartas no nível 1." />
      {gate.locked ? <ArenaGateBanner gate={gate} /> : null}
      <ArenaDuoLobby mates={mates} items={items} locked={gate.locked} />
      <Link href="/app/jogos/arena" className="btn btn-ghost mt-4 w-full">
        ← Voltar à Arena
      </Link>
    </>
  );
}
