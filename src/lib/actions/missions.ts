"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { MissionType } from "@/lib/types";

type Result = { error?: string; ok?: boolean };

async function currentProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, elo_id")
    .eq("id", user.id)
    .maybeSingle<{ id: string; role: string; elo_id: string | null }>();

  if (!profile) redirect("/");
  return { supabase, profile };
}

function revalidateMissions() {
  revalidatePath("/app/admin/missoes");
  revalidatePath("/app/lider/missoes");
  revalidatePath("/app/cria/missoes");
  revalidatePath("/app/admin");
  revalidatePath("/app/lider");
  revalidatePath("/app/cria");
}

/**
 * Cria a missão e distribui as atribuições.
 * target: "crias" (ids selecionados) | "elo" (todos os crias do Elo) | "all" (admin).
 */
export async function createMission(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase, profile } = await currentProfile();
  if (profile.role === "cria") return { error: "Sem permissão para criar missões." };

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const type = (String(formData.get("type") ?? "individual") as MissionType) ?? "individual";
  const xp = Number(formData.get("xp") ?? 0);
  const startDate = String(formData.get("start_date") ?? "") || null;
  const dueDate = String(formData.get("due_date") ?? "") || null;
  const target = String(formData.get("target") ?? "crias");
  const eloId = String(formData.get("elo_id") ?? "") || profile.elo_id;
  const criaIds = formData.getAll("cria_ids").map(String).filter(Boolean);

  if (!title) return { error: "Informe o título da missão." };
  if (!Number.isFinite(xp) || xp < 0) return { error: "XP inválido." };
  if (target === "crias" && criaIds.length === 0) {
    return { error: "Selecione ao menos um participante." };
  }
  if (target === "elo" && !eloId) return { error: "Selecione um Elo." };

  const { data: mission, error } = await supabase
    .from("missions")
    .insert({
      created_by: profile.id,
      title,
      description,
      type,
      xp,
      start_date: startDate,
      due_date: dueDate,
      elo_id: target === "all" ? null : eloId,
    })
    .select("id")
    .single();

  if (error || !mission) return { error: "Não foi possível criar a missão." };

  // resolve os participantes
  let participants: string[] = criaIds;

  if (target === "elo" || target === "all") {
    let query = supabase.from("profiles").select("id").eq("role", "cria");
    if (target === "elo") query = query.eq("elo_id", eloId!);
    const { data: rows } = await query;
    participants = (rows ?? []).map((r) => r.id as string);
  }

  // o líder só distribui para os próprios crias
  if (profile.role === "leader") {
    const { data: mine } = await supabase
      .from("leader_crias")
      .select("cria_id")
      .eq("leader_id", profile.id);
    const allowed = new Set((mine ?? []).map((r) => r.cria_id as string));
    participants = participants.filter((id) => allowed.has(id));
  }

  if (participants.length === 0) {
    await supabase.from("missions").delete().eq("id", mission.id);
    return { error: "Nenhum participante elegível para esta missão." };
  }

  const { error: assignError } = await supabase
    .from("mission_assignments")
    .insert(participants.map((cria_id) => ({ mission_id: mission.id, cria_id })));

  if (assignError) {
    await supabase.from("missions").delete().eq("id", mission.id);
    return { error: "Não foi possível atribuir a missão aos participantes." };
  }

  revalidateMissions();
  return { ok: true };
}

export async function updateMission(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase } = await currentProfile();
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const xp = Number(formData.get("xp") ?? 0);

  if (!id || !title) return { error: "Dados incompletos." };
  if (!Number.isFinite(xp) || xp < 0) return { error: "XP inválido." };

  const { error } = await supabase
    .from("missions")
    .update({
      title,
      description: String(formData.get("description") ?? "").trim() || null,
      xp,
      start_date: String(formData.get("start_date") ?? "") || null,
      due_date: String(formData.get("due_date") ?? "") || null,
    })
    .eq("id", id);

  if (error) return { error: "Não foi possível salvar a missão." };

  revalidateMissions();
  return { ok: true };
}

export async function deleteMission(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase } = await currentProfile();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missão inválida." };

  const { error } = await supabase.from("missions").delete().eq("id", id);
  if (error) return { error: "Não foi possível excluir a missão." };

  revalidateMissions();
  return { ok: true };
}

/** Cria envia a missão para aprovação (XP só depois da aprovação). */
export async function submitAssignment(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase } = await currentProfile();
  const id = String(formData.get("assignment_id") ?? "");
  if (!id) return { error: "Missão inválida." };

  const { error } = await supabase.rpc("submit_assignment", { p_assignment: id });
  if (error) return { error: error.message };

  revalidateMissions();
  return { ok: true };
}

/** Líder/Admin aprova ou recusa. O XP é creditado no banco, uma única vez. */
/** Cada líder decide se quer ver a lista de missões de outros líderes. */
export async function toggleLeaderMissionsVisibility(
  _prev: Result | null,
  formData: FormData,
): Promise<Result> {
  const { supabase, profile } = await currentProfile();
  const show = String(formData.get("show") ?? "true") === "true";

  const { error } = await supabase
    .from("profiles")
    .update({ show_other_leader_missions: show })
    .eq("id", profile.id);

  if (error) return { error: "Não foi possível salvar a preferência." };

  revalidatePath("/app/lider/missoes");
  return { ok: true };
}

export async function reviewAssignment(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase } = await currentProfile();
  const id = String(formData.get("assignment_id") ?? "");
  const approve = String(formData.get("approve") ?? "") === "true";
  const reason = String(formData.get("reason") ?? "").trim() || null;

  if (!id) return { error: "Missão inválida." };

  const { error } = await supabase.rpc("review_assignment", {
    p_assignment: id,
    p_approve: approve,
    p_reason: reason,
  });
  if (error) return { error: error.message };

  revalidateMissions();
  revalidatePath("/app/ranking");
  return { ok: true };
}
