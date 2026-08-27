import { Card, EmptyState, ErrorState, PageHeader } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, type Elo, type EloEvent } from "@/lib/types";
import { EventAdminControls, EventComposer } from "./EventManager";

export default async function AgendaPage() {
  const { profile } = await requireProfile();
  const supabase = await createClient();
  const isAdmin = profile.role === "admin";

  const [elosRes, eventsRes] = await Promise.all([
    supabase.from("elos").select("*").order("gender").order("age_range"),
    supabase
      .from("events")
      .select("id, title, description, event_date, event_time, location, elo_id, leaders_only")
      .order("event_date"),
  ]);

  if (eventsRes.error) return <ErrorState message={eventsRes.error.message} />;

  const elos = (elosRes.data ?? []) as Elo[];
  const eloName = new Map(elos.map((e) => [e.id, e.name]));
  const all = (eventsRes.data ?? []) as EloEvent[];

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = all.filter((e) => e.event_date >= today);
  const past = all.filter((e) => e.event_date < today).reverse();

  const renderEvent = (event: EloEvent) => (
    <Card key={event.id}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold">{event.title}</p>
          <p className="text-xs text-[var(--muted)]">
            {formatDate(event.event_date)}
            {event.event_time ? ` · ${event.event_time.slice(0, 5)}` : ""}
            {event.location ? ` · ${event.location}` : ""}
          </p>
        </div>
        <span
          className={`chip ${
            event.leaders_only
              ? "border-red-200 bg-red-100 text-red-700"
              : "border-[var(--line)] text-[var(--muted)]"
          }`}
        >
          {event.leaders_only
            ? "Liderança"
            : event.elo_id
              ? (eloName.get(event.elo_id) ?? "Elo")
              : "Todos os ELOS"}
        </span>
      </div>
      {event.description ? (
        <p className="mt-2 text-sm text-[var(--muted)]">{event.description}</p>
      ) : null}
      {isAdmin ? <EventAdminControls event={event} elos={elos} /> : null}
    </Card>
  );

  return (
    <>
      <PageHeader title="Agenda de Eventos" subtitle="Encontros, cultos e atividades dos ELOS." />

      {isAdmin ? <EventComposer elos={elos} /> : null}

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
          Próximos ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <EmptyState>Nenhum evento agendado.</EmptyState>
        ) : (
          <div className="space-y-3">{upcoming.map(renderEvent)}</div>
        )}
      </section>

      {past.length > 0 ? (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
            Realizados ({past.length})
          </h2>
          <div className="space-y-3 opacity-70">{past.slice(0, 10).map(renderEvent)}</div>
        </section>
      ) : null}
    </>
  );
}
