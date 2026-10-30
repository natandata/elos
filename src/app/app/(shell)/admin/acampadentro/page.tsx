import { EventAdmin, type AdminMember, type AdminMission, type AdminPoint, type AdminTribe } from "@/components/event/EventAdmin";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { isTribeKey, type EventState } from "@/lib/event/tribes";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Acampadentro · tribos" };

export default async function AcampadentroAdminPage() {
  await requireRole("admin");
  const supabase = await createClient();
  const [settingsRes, stateRes, memRes, profRes, eloRes, misRes, ptsRes] = await Promise.all([
    supabase.from("event_settings").select("active, drawn_at").eq("id", true).maybeSingle(),
    supabase.rpc("event_state"),
    supabase.from("event_members").select("user_id, tribe").limit(1000),
    supabase.from("profiles").select("id, full_name, role, elo_id, approved, is_test_account").in("role", ["cria", "leader"]).order("full_name"),
    supabase.from("elos").select("id, name"),
    supabase.from("event_missions").select("id, title, description, points, active").order("created_at", { ascending: false }),
    supabase.from("event_points").select("id, tribe, points, reason, created_at").order("created_at", { ascending: false }).limit(30),
  ]);
  const settings = (settingsRes.data ?? { active: false, drawn_at: null }) as { active: boolean; drawn_at: string | null };
  const state = (stateRes.data ?? { visible: false }) as EventState;
  const tribes: AdminTribe[] = (state.tribes ?? []).map((t) => ({ key: t.key, points: t.points, members: t.members, rank: t.rank }));
  const byUser = new Map(((memRes.data ?? []) as { user_id: string; tribe: string }[]).map((m) => [m.user_id, m.tribe]));
  const elos = new Map(((eloRes.data ?? []) as { id: string; name: string }[]).map((e) => [e.id, e.name.replace("Elo ", "")]));
  const members: AdminMember[] = ((profRes.data ?? []) as { id: string; full_name: string; role: string; elo_id: string | null; approved: boolean; is_test_account: boolean | null }[])
    .filter((p) => !p.is_test_account && (p.role === "cria" || p.approved))
    .map((p) => ({ id: p.id, name: p.full_name || "Sem nome", role: p.role, elo: p.elo_id ? (elos.get(p.elo_id) ?? "Elo") : "sem Elo", tribe: isTribeKey(byUser.get(p.id)) ? (byUser.get(p.id) as AdminMember["tribe"]) : null }));
  const missions = (misRes.data ?? []) as AdminMission[];
  const points: AdminPoint[] = ((ptsRes.data ?? []) as { id: string; tribe: string; points: number; reason: string; created_at: string }[])
    .filter((p) => isTribeKey(p.tribe))
    .map((p) => ({ id: p.id, tribe: p.tribe as AdminPoint["tribe"], points: p.points, reason: p.reason, at: p.created_at }));

  return (
    <>
      <PageHeader title="Acampadentro · tribos" subtitle="Feras, Bravos e Relíquias: sorteio, missões especiais e pontos. Termina em 13/11 às 23h59." />
      <EventAdmin active={settings.active} drawn={!!settings.drawn_at} tribes={tribes} members={members} missions={missions} points={points} daysLeft={state.days_left ?? 0} />
    </>
  );
}
