"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { GuestStatus, Role } from "@/lib/types";

type Result = { error?: string; ok?: boolean };

async function adminClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: Role }>();

  if (data?.role !== "admin") redirect("/app");
  return { supabase, userId: user.id };
}

function revalidateEventos(id?: string) {
  revalidatePath("/app/eventos");
  revalidatePath("/app/agenda");
  if (id) revalidatePath(`/app/eventos/${id}`);
}

// ---------------------------------------------------------------- evento

export async function createPlannedEvent(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase, userId } = await adminClient();
  const title = String(formData.get("title") ?? "").trim();
  const eventDate = String(formData.get("event_date") ?? "");
  if (!title) return { error: "Informe o nome do evento." };
  if (!eventDate) return { error: "Informe a data." };

  const eloField = String(formData.get("elo_id") ?? "");
  const leadersOnly = eloField === "leaders";

  const { data, error } = await supabase
    .from("planned_events")
    .insert({
      title,
      description: String(formData.get("description") ?? "").trim() || null,
      event_date: eventDate,
      event_time: String(formData.get("event_time") ?? "") || null,
      location: String(formData.get("location") ?? "").trim() || null,
      elo_id: leadersOnly ? null : eloField || null,
      leaders_only: leadersOnly,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error || !data) return { error: "Não foi possível criar o planejamento." };

  revalidateEventos();
  redirect(`/app/eventos/${data.id}`);
}

export async function updatePlannedEvent(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase } = await adminClient();
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const eventDate = String(formData.get("event_date") ?? "");
  if (!id) return { error: "Planejamento inválido." };
  if (!title) return { error: "Informe o nome do evento." };
  if (!eventDate) return { error: "Informe a data." };

  const eloField = String(formData.get("elo_id") ?? "");
  const leadersOnly = eloField === "leaders";

  const { error } = await supabase
    .from("planned_events")
    .update({
      title,
      description: String(formData.get("description") ?? "").trim() || null,
      event_date: eventDate,
      event_time: String(formData.get("event_time") ?? "") || null,
      location: String(formData.get("location") ?? "").trim() || null,
      elo_id: leadersOnly ? null : eloField || null,
      leaders_only: leadersOnly,
    })
    .eq("id", id);

  if (error) return { error: "Não foi possível salvar." };

  revalidateEventos(id);
  return { ok: true };
}

export async function deletePlannedEvent(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase } = await adminClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Planejamento inválido." };

  const { error } = await supabase.from("planned_events").delete().eq("id", id);
  if (error) return { error: "Não foi possível excluir." };

  revalidateEventos();
  redirect("/app/eventos");
}

/** Cria (1ª vez) ou sincroniza (já existe) o evento público na Agenda — só
 *  os campos que a Agenda tem; liturgia/lembretes/convidados/repertório
 *  nunca saem daqui. */
export async function syncPlannedEventToAgenda(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase, userId } = await adminClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Planejamento inválido." };

  const { data: plan } = await supabase
    .from("planned_events")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!plan) return { error: "Planejamento não encontrado." };

  const payload = {
    title: plan.title,
    description: plan.description,
    event_date: plan.event_date,
    event_time: plan.event_time,
    location: plan.location,
    elo_id: plan.elo_id,
    leaders_only: plan.leaders_only,
  };

  if (plan.linked_event_id) {
    const { error } = await supabase.from("events").update(payload).eq("id", plan.linked_event_id);
    if (error) return { error: "Não foi possível atualizar o evento na agenda." };
  } else {
    const { data: created, error } = await supabase
      .from("events")
      .insert({ ...payload, created_by: userId })
      .select("id")
      .single();
    if (error || !created) return { error: "Não foi possível inserir na agenda." };

    const { error: linkError } = await supabase
      .from("planned_events")
      .update({ linked_event_id: created.id })
      .eq("id", id);
    if (linkError) return { error: "Evento criado na agenda, mas não foi possível vincular." };
  }

  revalidateEventos(id);
  return { ok: true };
}

// ---------------------------------------------------------------- liturgia

export async function addLiturgyItem(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase } = await adminClient();
  const plannedEventId = String(formData.get("planned_event_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!plannedEventId || !title) return { error: "Informe o item da liturgia." };

  const { count } = await supabase
    .from("planned_event_liturgy_items")
    .select("id", { count: "exact", head: true })
    .eq("planned_event_id", plannedEventId);

  const durationRaw = String(formData.get("duration_minutes") ?? "").trim();

  const { error } = await supabase.from("planned_event_liturgy_items").insert({
    planned_event_id: plannedEventId,
    position: count ?? 0,
    time: String(formData.get("time") ?? "").trim() || null,
    title,
    item_type: String(formData.get("item_type") ?? "outro") || "outro",
    duration_minutes: durationRaw ? Number(durationRaw) : null,
    responsible: String(formData.get("responsible") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  });

  if (error) return { error: "Não foi possível adicionar." };
  revalidateEventos(plannedEventId);
  return { ok: true };
}

export async function updateLiturgyItem(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase } = await adminClient();
  const id = String(formData.get("id") ?? "");
  const plannedEventId = String(formData.get("planned_event_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!id) return { error: "Item inválido." };
  if (!title) return { error: "Informe o título do item." };

  const durationRaw = String(formData.get("duration_minutes") ?? "").trim();

  const { error } = await supabase
    .from("planned_event_liturgy_items")
    .update({
      time: String(formData.get("time") ?? "").trim() || null,
      title,
      item_type: String(formData.get("item_type") ?? "outro") || "outro",
      duration_minutes: durationRaw ? Number(durationRaw) : null,
      responsible: String(formData.get("responsible") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
    })
    .eq("id", id);

  if (error) return { error: "Não foi possível salvar." };
  revalidateEventos(plannedEventId);
  return { ok: true };
}

export async function deleteLiturgyItem(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase } = await adminClient();
  const id = String(formData.get("id") ?? "");
  const plannedEventId = String(formData.get("planned_event_id") ?? "");
  const { error } = await supabase.from("planned_event_liturgy_items").delete().eq("id", id);
  if (error) return { error: "Não foi possível remover." };
  revalidateEventos(plannedEventId);
  return { ok: true };
}

export async function moveLiturgyItem(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase } = await adminClient();
  const plannedEventId = String(formData.get("planned_event_id") ?? "");
  const id = String(formData.get("id") ?? "");
  const direction = String(formData.get("direction") ?? "");

  const { data: items } = await supabase
    .from("planned_event_liturgy_items")
    .select("id, position")
    .eq("planned_event_id", plannedEventId)
    .order("position");

  await swapPosition(supabase, "planned_event_liturgy_items", items ?? [], id, direction);
  revalidateEventos(plannedEventId);
  return { ok: true };
}

// ---------------------------------------------------------------- lembretes

export async function addReminder(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase } = await adminClient();
  const plannedEventId = String(formData.get("planned_event_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!plannedEventId || !title) return { error: "Escreva o lembrete." };

  const { error } = await supabase.from("planned_event_reminders").insert({
    planned_event_id: plannedEventId,
    title,
    remind_at: String(formData.get("remind_at") ?? "") || null,
  });

  if (error) return { error: "Não foi possível adicionar." };
  revalidateEventos(plannedEventId);
  return { ok: true };
}

export async function toggleReminder(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase } = await adminClient();
  const id = String(formData.get("id") ?? "");
  const plannedEventId = String(formData.get("planned_event_id") ?? "");
  const done = String(formData.get("done") ?? "") === "true";

  const { error } = await supabase.from("planned_event_reminders").update({ done }).eq("id", id);
  if (error) return { error: "Não foi possível atualizar." };
  revalidateEventos(plannedEventId);
  return { ok: true };
}

export async function deleteReminder(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase } = await adminClient();
  const id = String(formData.get("id") ?? "");
  const plannedEventId = String(formData.get("planned_event_id") ?? "");
  const { error } = await supabase.from("planned_event_reminders").delete().eq("id", id);
  if (error) return { error: "Não foi possível remover." };
  revalidateEventos(plannedEventId);
  return { ok: true };
}

// ---------------------------------------------------------------- convidados

export async function addGuest(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase } = await adminClient();
  const plannedEventId = String(formData.get("planned_event_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!plannedEventId || !name) return { error: "Informe o nome do convidado." };

  const { error } = await supabase.from("planned_event_guests").insert({
    planned_event_id: plannedEventId,
    name,
    role_or_reason: String(formData.get("role_or_reason") ?? "").trim() || null,
    contact: String(formData.get("contact") ?? "").trim() || null,
  });

  if (error) return { error: "Não foi possível adicionar." };
  revalidateEventos(plannedEventId);
  return { ok: true };
}

const GUEST_STATUSES: GuestStatus[] = ["suggested", "invited", "confirmed", "declined"];

export async function updateGuestStatus(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase } = await adminClient();
  const id = String(formData.get("id") ?? "");
  const plannedEventId = String(formData.get("planned_event_id") ?? "");
  const status = String(formData.get("status") ?? "") as GuestStatus;
  if (!GUEST_STATUSES.includes(status)) return { error: "Status inválido." };

  const { error } = await supabase.from("planned_event_guests").update({ status }).eq("id", id);
  if (error) return { error: "Não foi possível atualizar." };
  revalidateEventos(plannedEventId);
  return { ok: true };
}

export async function deleteGuest(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase } = await adminClient();
  const id = String(formData.get("id") ?? "");
  const plannedEventId = String(formData.get("planned_event_id") ?? "");
  const { error } = await supabase.from("planned_event_guests").delete().eq("id", id);
  if (error) return { error: "Não foi possível remover." };
  revalidateEventos(plannedEventId);
  return { ok: true };
}

// ---------------------------------------------------------------- repertório

export async function addSetlistItem(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase } = await adminClient();
  const plannedEventId = String(formData.get("planned_event_id") ?? "");
  const songTitle = String(formData.get("song_title") ?? "").trim();
  if (!plannedEventId || !songTitle) return { error: "Informe o nome da música." };

  const { count } = await supabase
    .from("planned_event_setlist")
    .select("id", { count: "exact", head: true })
    .eq("planned_event_id", plannedEventId);

  const { error } = await supabase.from("planned_event_setlist").insert({
    planned_event_id: plannedEventId,
    position: count ?? 0,
    song_title: songTitle,
    link: String(formData.get("link") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  });

  if (error) return { error: "Não foi possível adicionar." };
  revalidateEventos(plannedEventId);
  return { ok: true };
}

export async function deleteSetlistItem(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase } = await adminClient();
  const id = String(formData.get("id") ?? "");
  const plannedEventId = String(formData.get("planned_event_id") ?? "");
  const { error } = await supabase.from("planned_event_setlist").delete().eq("id", id);
  if (error) return { error: "Não foi possível remover." };
  revalidateEventos(plannedEventId);
  return { ok: true };
}

export async function moveSetlistItem(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase } = await adminClient();
  const plannedEventId = String(formData.get("planned_event_id") ?? "");
  const id = String(formData.get("id") ?? "");
  const direction = String(formData.get("direction") ?? "");

  const { data: items } = await supabase
    .from("planned_event_setlist")
    .select("id, position")
    .eq("planned_event_id", plannedEventId)
    .order("position");

  await swapPosition(supabase, "planned_event_setlist", items ?? [], id, direction);
  revalidateEventos(plannedEventId);
  return { ok: true };
}

// ---------------------------------------------------------------- helper

async function swapPosition(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: "planned_event_liturgy_items" | "planned_event_setlist",
  items: { id: string; position: number }[],
  id: string,
  direction: string,
) {
  const index = items.findIndex((i) => i.id === id);
  if (index === -1) return;
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= items.length) return;

  const a = items[index];
  const b = items[swapWith];
  await Promise.all([
    supabase.from(table).update({ position: b.position }).eq("id", a.id),
    supabase.from(table).update({ position: a.position }).eq("id", b.id),
  ]);
}
