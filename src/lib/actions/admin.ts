"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

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
  return supabase;
}

function revalidateAdmin() {
  revalidatePath("/app/admin");
  revalidatePath("/app/admin/usuarios");
  revalidatePath("/app/admin/elos");
  revalidatePath("/app/admin/status-equipe");
}

export async function updateUser(_prev: Result | null, formData: FormData): Promise<Result> {
  const supabase = await adminClient();
  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "") as Role;
  const eloId = String(formData.get("elo_id") ?? "");
  const ageRange = String(formData.get("age_range") ?? "");

  if (!id) return { error: "Usuário inválido." };
  if (!["admin", "leader", "cria"].includes(role)) return { error: "Perfil inválido." };

  const { error } = await supabase
    .from("profiles")
    .update({
      role,
      elo_id: eloId || null,
      ...(ageRange ? { age_range: ageRange } : {}),
    })
    .eq("id", id);

  if (error) return { error: "Não foi possível salvar as alterações." };

  revalidateAdmin();
  return { ok: true };
}

/** Define (ou troca) o líder responsável por um cria. */
export async function setLeader(_prev: Result | null, formData: FormData): Promise<Result> {
  const supabase = await adminClient();
  const criaId = String(formData.get("cria_id") ?? "");
  const leaderId = String(formData.get("leader_id") ?? "");

  if (!criaId) return { error: "Cria inválido." };

  const { error: delError } = await supabase.from("leader_crias").delete().eq("cria_id", criaId);
  if (delError) return { error: "Não foi possível atualizar o vínculo." };

  if (leaderId) {
    const { error } = await supabase
      .from("leader_crias")
      .insert({ leader_id: leaderId, cria_id: criaId });
    if (error) return { error: "Não foi possível vincular ao líder." };
  }

  revalidateAdmin();
  return { ok: true };
}

// ---------------------------------------------------------------- eventos

function revalidateAgenda() {
  revalidatePath("/app/agenda");
  revalidatePath("/app/cria");
  revalidatePath("/app/lider");
}

export async function saveEvent(_prev: Result | null, formData: FormData): Promise<Result> {
  const supabase = await adminClient();
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const eventDate = String(formData.get("event_date") ?? "");

  if (!title) return { error: "Informe o nome do evento." };
  if (!eventDate) return { error: "Informe a data." };

  const payload = {
    title,
    description: String(formData.get("description") ?? "").trim() || null,
    event_date: eventDate,
    event_time: String(formData.get("event_time") ?? "") || null,
    location: String(formData.get("location") ?? "").trim() || null,
    elo_id: String(formData.get("elo_id") ?? "") || null,
  };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = id
    ? await supabase.from("events").update(payload).eq("id", id)
    : await supabase.from("events").insert({ ...payload, created_by: user!.id });

  if (error) return { error: "Não foi possível salvar o evento." };

  revalidateAgenda();
  return { ok: true };
}

export async function deleteEvent(_prev: Result | null, formData: FormData): Promise<Result> {
  const supabase = await adminClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Evento inválido." };

  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) return { error: "Não foi possível excluir o evento." };

  revalidateAgenda();
  return { ok: true };
}
