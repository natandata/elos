import Link from "next/link";
import { Card, EmptyState, ErrorState, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, type Elo, type PlannedEvent } from "@/lib/types";
import { PlannedEventComposer } from "./PlannedEventComposer";

export default async function EventosPage() {
  const { profile } = await requireRole("admin", "leader");
  const isAdmin = profile.role === "admin";
  const supabase = await createClient();

  const [elosRes, plansRes] = await Promise.all([
    supabase.from("elos").select("*").order("gender").order("age_range"),
    supabase.from("planned_events").select("*").order("event_date"),
  ]);

  if (plansRes.error) return <ErrorState message={plansRes.error.message} />;

  const elos = (elosRes.data ?? []) as Elo[];
  const eloName = new Map(elos.map((e) => [e.id, e.name]));
  const all = (plansRes.data ?? []) as PlannedEvent[];

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = all.filter((e) => e.event_date >= today);
  const past = all.filter((e) => e.event_date < today).reverse();

  const renderPlan = (plan: PlannedEvent) => (
    <Link key={plan.id} href={`/app/eventos/${plan.id}`}>
      <Card className="transition hover:border-[var(--accent)]">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-bold">{plan.title}</p>
            <p className="text-xs text-[var(--muted)]">
              {formatDate(plan.event_date)}
              {plan.event_time ? ` · ${plan.event_time.slice(0, 5)}` : ""}
              {plan.location ? ` · ${plan.location}` : ""}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
            <span
              className={`chip ${
                plan.leaders_only
                  ? "border-red-200 bg-red-100 text-red-700"
                  : "border-[var(--line)] text-[var(--muted)]"
              }`}
            >
              {plan.leaders_only
                ? "Liderança"
                : plan.elo_id
                  ? (eloName.get(plan.elo_id) ?? "Elo")
                  : "Todos os ELOS"}
            </span>
            {plan.linked_event_id ? (
              <span className="chip border-emerald-200 bg-emerald-100 text-emerald-800">
                Na agenda ✓
              </span>
            ) : null}
          </div>
        </div>
      </Card>
    </Link>
  );

  return (
    <>
      <PageHeader
        title="Eventos"
        subtitle="Planeje a produção — liturgia, lembretes, convidados e repertório — antes de publicar na Agenda."
      />

      {isAdmin ? <PlannedEventComposer elos={elos} /> : null}

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
          Próximos ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <EmptyState>Nenhum planejamento ainda.</EmptyState>
        ) : (
          <div className="space-y-3">{upcoming.map(renderPlan)}</div>
        )}
      </section>

      {past.length > 0 ? (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
            Realizados ({past.length})
          </h2>
          <div className="space-y-3 opacity-70">{past.slice(0, 10).map(renderPlan)}</div>
        </section>
      ) : null}
    </>
  );
}
