import { Card, EmptyState, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { relativeDay } from "@/lib/types";

type Report = {
  bad_status_week: number;
  elos_without_leader: { id: string; name: string }[];
  inactive_leaders: { id: string; name: string; elo: string | null; last_sign_in: string | null }[];
};

export default async function RelatorioPage() {
  await requireRole("admin");
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("admin_dashboard_report");
  const report = (data ?? null) as Report | null;

  return (
    <>
      <PageHeader
        title="Relatório"
        subtitle="Uma visão agregada do que precisa de atenção agora."
      />

      {error || !report ? (
        <EmptyState>Não foi possível carregar o relatório.</EmptyState>
      ) : (
        <div className="space-y-4">
          <Card>
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
              Status &quot;Mal&quot; nos últimos 7 dias
            </p>
            <p className="mt-1 text-3xl font-black tabular-nums">{report.bad_status_week}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">crias distintos que responderam Mal</p>
          </Card>

          <Card>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
              Elos sem líder aprovado
            </p>
            {report.elos_without_leader.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">Todos os Elos têm líder. 🎉</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {report.elos_without_leader.map((e) => (
                  <li key={e.id} className="chip border-amber-200 bg-amber-100 text-amber-800">
                    {e.name}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
              Líderes inativos (sem login há 14+ dias)
            </p>
            {report.inactive_leaders.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">Todos os líderes estão ativos.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {report.inactive_leaders.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-2">
                    <span>
                      {l.name || "Sem nome"} <span className="text-[var(--muted)]">· {l.elo ?? "sem Elo"}</span>
                    </span>
                    <span className="text-xs text-[var(--muted)]">
                      {l.last_sign_in ? relativeDay(l.last_sign_in) : "nunca entrou"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
