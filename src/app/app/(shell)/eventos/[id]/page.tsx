import Link from "next/link";
import { notFound } from "next/navigation";
import { ErrorState, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type {
  Elo,
  EventGuest,
  EventReminder,
  LiturgyItem,
  PlannedEvent,
  SetlistItem,
} from "@/lib/types";
import { PlannedEventHeader } from "./PlannedEventHeader";
import { EventPlanTabs } from "./EventPlanTabs";

export default async function PlannedEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile } = await requireRole("admin", "leader");
  const isAdmin = profile.role === "admin";
  const supabase = await createClient();

  const [planRes, elosRes, liturgyRes, remindersRes, guestsRes, setlistRes] = await Promise.all([
    supabase.from("planned_events").select("*").eq("id", id).maybeSingle(),
    supabase.from("elos").select("*").order("gender").order("age_range"),
    supabase.from("planned_event_liturgy_items").select("*").eq("planned_event_id", id).order("position"),
    supabase.from("planned_event_reminders").select("*").eq("planned_event_id", id).order("remind_at"),
    supabase.from("planned_event_guests").select("*").eq("planned_event_id", id).order("created_at"),
    supabase.from("planned_event_setlist").select("*").eq("planned_event_id", id).order("position"),
  ]);

  if (planRes.error) return <ErrorState message={planRes.error.message} />;
  const plan = planRes.data as PlannedEvent | null;
  if (!plan) notFound();

  const elos = (elosRes.data ?? []) as Elo[];

  return (
    <>
      <Link
        href="/app/eventos"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent-strong)]"
      >
        ← Voltar para Todos os eventos
      </Link>
      <PageHeader title={plan.title} subtitle="Planejamento do evento" />

      <PlannedEventHeader plan={plan} elos={elos} isAdmin={isAdmin} />

      <EventPlanTabs
        plannedEventId={plan.id}
        isAdmin={isAdmin}
        liturgy={(liturgyRes.data ?? []) as LiturgyItem[]}
        reminders={(remindersRes.data ?? []) as EventReminder[]}
        guests={(guestsRes.data ?? []) as EventGuest[]}
        setlist={(setlistRes.data ?? []) as SetlistItem[]}
      />
    </>
  );
}
