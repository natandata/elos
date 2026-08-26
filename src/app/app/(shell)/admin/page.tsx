import { Bar, Card, PageHeader, StatCard } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABEL, type StatusLevel } from "@/lib/types";

export default async function AdminDashboard() {
  await requireRole("admin");
  const supabase = await createClient();

  const [
    users,
    crias,
    leaders,
    elos,
    missions,
    awaiting,
    approved,
    rejected,
    statuses,
    eloRows,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "cria"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "leader"),
    supabase.from("elos").select("id", { count: "exact", head: true }),
    supabase.from("missions").select("id", { count: "exact", head: true }),
    supabase
      .from("mission_assignments")
      .select("id", { count: "exact", head: true })
      .eq("status", "awaiting_approval"),
    supabase
      .from("mission_assignments")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved"),
    supabase
      .from("mission_assignments")
      .select("id", { count: "exact", head: true })
      .eq("status", "rejected"),
    supabase.from("v_latest_status").select("emotional_status, spiritual_status"),
    supabase.from("elos").select("id, name, profiles:profiles(id, role)"),
  ]);

  const rows = (statuses.data ?? []) as {
    emotional_status: StatusLevel;
    spiritual_status: StatusLevel;
  }[];

  const tally = (key: "emotional_status" | "spiritual_status") => {
    const acc: Record<StatusLevel, number> = { bad: 0, ok: 0, good: 0 };
    rows.forEach((r) => (acc[r[key]] += 1));
    return acc;
  };

  const emotional = tally("emotional_status");
  const spiritual = tally("spiritual_status");

  const elosWithCounts = (
    (eloRows.data ?? []) as { id: string; name: string; profiles: { id: string; role: string }[] }[]
  ).map((e) => ({
    id: e.id,
    name: e.name,
    crias: e.profiles.filter((p) => p.role === "cria").length,
    leaders: e.profiles.filter((p) => p.role === "leader").length,
  }));

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Visão geral dos ELOS." />

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
          Usuários
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Total" value={users.count ?? 0} href="/app/admin/usuarios" />
          <StatCard label="Crias" value={crias.count ?? 0} href="/app/admin/usuarios" />
          <StatCard label="Líderes" value={leaders.count ?? 0} href="/app/admin/usuarios" />
          <StatCard label="ELOS" value={elos.count ?? 0} href="/app/admin/elos" />
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
          Missões
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Criadas" value={missions.count ?? 0} href="/app/admin/missoes" />
          <StatCard
            label="Aguardando aprovação"
            value={awaiting.count ?? 0}
            href="/app/admin/missoes"
          />
          <StatCard label="Aprovadas" value={approved.count ?? 0} />
          <StatCard label="Recusadas" value={rejected.count ?? 0} />
        </div>
      </section>

      <section className="mb-6 grid gap-3 md:grid-cols-2">
        {(
          [
            ["Status emocional", emotional],
            ["Status espiritual", spiritual],
          ] as const
        ).map(([title, data]) => (
          <Card key={title}>
            <h3 className="mb-3 text-sm font-bold">{title}</h3>
            {rows.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">Nenhuma resposta registrada ainda.</p>
            ) : (
              <div className="space-y-3">
                {(["good", "ok", "bad"] as StatusLevel[]).map((level) => (
                  <div key={level}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="font-semibold">{STATUS_LABEL[level]}</span>
                      <span className="text-[var(--muted)] tabular-nums">{data[level]}</span>
                    </div>
                    <Bar value={data[level]} total={rows.length} />
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
          ELOS
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {elosWithCounts.map((e) => (
            <Card key={e.id}>
              <p className="font-bold">{e.name}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {e.crias} crias · {e.leaders} líder(es)
              </p>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}
