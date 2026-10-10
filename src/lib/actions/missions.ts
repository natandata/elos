"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUsers } from "@/lib/push-server";
import type { MissionType } from "@/lib/types";

type Result = { error?: string; ok?: boolean };

/** Líder: 1 XP vale na hora; de 2 a 3 XP o admin precisa aprovar (a regra também é imposta no banco: migração 0198). */
const LEADER_FREE_XP = 1;
const LEADER_MAX_XP = 3;

/** Avisa os admins que um líder pediu mais de 1 XP numa missão. Nunca atrapalha o salvamento. */
async function notifyAdminsXpRequest(leaderName: string, title: string, xp: number) {
  try {
    // o líder não enxerga os perfis dos admins: a busca usa a chave de serviço (só no servidor)
    const supabase = createAdminClient() ?? (await createClient());
    const { data } = await supabase.from("profiles").select("id").eq("role", "admin");
    const ids = (data ?? []).map((r) => r.id as string);
    if (ids.length === 0) return;
    await sendPushToUsers(ids, {
      title: "Líder pediu mais XP",
      body: `${(leaderName || "Um líder").trim().split(" ")[0]} pediu ${xp} XP em "${title}". Aprove em Missões.`,
      url: "/app/admin/missoes",
    });
  } catch {
    /* o aviso é opcional */
  }
}

async function currentProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, elo_id, full_name")
    .eq("id", user.id)
    .maybeSingle<{ id: string; role: string; elo_id: string | null; full_name: string }>();

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
  const publishAt = String(formData.get("publish_at") ?? "") || null;
  const target = String(formData.get("target") ?? "crias");
  const eloId = String(formData.get("elo_id") ?? "") || profile.elo_id;
  const criaIds = formData.getAll("cria_ids").map(String).filter(Boolean);
  const leaderIds = formData.getAll("leader_ids").map(String).filter(Boolean);

  if (!title) return { error: "Informe o título da missão." };
  if (!Number.isFinite(xp) || xp < 0) return { error: "XP inválido." };
  if (xp > 25) return { error: "O máximo de XP por missão é 25." };
  if (profile.role === "leader" && xp > LEADER_MAX_XP) {
    return { error: "Líder pode colocar até 3 XP: 1 XP vale na hora e de 2 a 3 XP o admin precisa aprovar." };
  }
  if (target === "leaders" && profile.role !== "admin") {
    return { error: "Só a administração cria Missões da Liderança." };
  }
  if (target === "general" && profile.role !== "admin") {
    return { error: "Só a administração cria Missões Gerais." };
  }
  if (target === "leaders" && leaderIds.length === 0) {
    return { error: "Selecione ao menos um líder." };
  }
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
      // líder: 1 XP vale na hora; de 2 a 3 XP entra como pedido para o admin aprovar (mission_set_xp, logo abaixo)
      xp: profile.role === "leader" ? Math.min(xp, LEADER_FREE_XP) : xp,
      start_date: startDate,
      due_date: dueDate,
      publish_at: publishAt ? new Date(publishAt).toISOString() : null,
      elo_id: target === "all" || target === "leaders" || target === "general" ? null : eloId,
      audience: target === "leaders" ? "leaders" : target === "general" ? "general" : "crias",
    })
    .select("id")
    .single();

  if (error || !mission) return { error: "Não foi possível criar a missão." };

  // resolve os participantes
  let participants: string[] = target === "leaders" || target === "general" ? [] : criaIds;

  if (target === "elo" || target === "all") {
    let query = supabase.from("profiles").select("id").eq("role", "cria");
    if (target === "elo") query = query.eq("elo_id", eloId!);
    const { data: rows } = await query;
    participants = (rows ?? []).map((r) => r.id as string);
  }

  if (target === "leaders") {
    const { data: rows } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "leader")
      .eq("approved", true)
      .in("id", leaderIds);
    participants = (rows ?? []).map((r) => r.id as string);
  }

  if (target === "general") {
    // todo mundo da plataforma, tirando o próprio admin que criou
    const { data: rows } = await supabase
      .from("profiles")
      .select("id")
      .or("role.eq.cria,and(role.eq.leader,approved.eq.true)")
      .neq("id", profile.id);
    participants = (rows ?? []).map((r) => r.id as string);
  }

  // o líder só distribui para os próprios crias (não se aplica a Missão da Liderança/Geral, admin-only)
  if (profile.role === "leader" && target !== "leaders" && target !== "general") {
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

  if (profile.role === "leader" && xp > LEADER_FREE_XP) {
    const { error: xpError } = await supabase.rpc("mission_set_xp", { p_mission: mission.id, p_xp: xp });
    if (xpError) {
      await supabase.from("missions").delete().eq("id", mission.id);
      return { error: "Não foi possível pedir esse XP ao admin." };
    }
    after(async () => {
      await notifyAdminsXpRequest(profile.full_name, title, xp);
    });
  }

  const { error: assignError } = await supabase
    .from("mission_assignments")
    .insert(participants.map((cria_id) => ({ mission_id: mission.id, cria_id })));

  if (assignError) {
    await supabase.from("missions").delete().eq("id", mission.id);
    return { error: "Não foi possível atribuir a missão aos participantes." };
  }

  // 5 XP pro líder que criou — só depois que a missão e os participantes já
  // existem de verdade (nunca antes, senão uma missão descartada por falta
  // de participante já teria rendido XP à toa).
  if (profile.role === "leader") {
    await supabase.rpc("grant_leader_mission_creation_xp", { p_mission_id: mission.id });
  }

  revalidateMissions();

  // Missão Geral vai pra plataforma inteira: esperar dezenas de envios de
  // push travaria o botão "Criar". Sai do caminho da resposta.
  if (profile.role === "admin") {
    after(async () => {
      await sendPushToUsers(participants, {
        title: "Missão do Admin",
        body: title,
        url: "/app",
      });
    });
  }

  return { ok: true };
}

export async function updateMission(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase, profile } = await currentProfile();
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const xp = Number(formData.get("xp") ?? 0);

  if (!id || !title) return { error: "Dados incompletos." };
  if (!Number.isFinite(xp) || xp < 0) return { error: "XP inválido." };
  if (xp > 25) return { error: "O máximo de XP por missão é 25." };
  if (profile.role === "leader" && xp > LEADER_MAX_XP) {
    return { error: "Líder pode colocar até 3 XP: 1 XP vale na hora e de 2 a 3 XP o admin precisa aprovar." };
  }

  const publishAt = String(formData.get("publish_at") ?? "") || null;

  // o XP muda só pela função do banco (que aplica a regra de aprovação); aqui ficam os outros campos
  const { error } = await supabase
    .from("missions")
    .update({
      title,
      description: String(formData.get("description") ?? "").trim() || null,
      start_date: String(formData.get("start_date") ?? "") || null,
      due_date: String(formData.get("due_date") ?? "") || null,
      publish_at: publishAt ? new Date(publishAt).toISOString() : null,
    })
    .eq("id", id);

  if (error) return { error: "Não foi possível salvar a missão." };

  const { data: xpRes, error: xpError } = await supabase.rpc("mission_set_xp", { p_mission: id, p_xp: xp });
  if (xpError) return { error: "Salvei a missão, mas não consegui mudar o XP. " + xpError.message };
  if (profile.role === "leader" && (xpRes as { status?: string } | null)?.status === "pending") {
    after(async () => {
      await notifyAdminsXpRequest(profile.full_name, title, xp);
    });
  }

  revalidateMissions();
  return { ok: true };
}

/** Excluir a missão nunca pode tirar de quem já teve ela aprovada o que já
 *  ganhou: só as atribuições sem XP garantido (pendente/aguardando/recusada)
 *  são removidas aqui — as aprovadas ficam (mission_id vira null quando a
 *  missão for apagada logo abaixo, via "on delete set null"), preservando o
 *  histórico de quem já recebeu. */
export async function deleteMission(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase } = await currentProfile();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missão inválida." };

  await supabase.from("mission_assignments").delete().eq("mission_id", id).neq("status", "approved");

  const { error } = await supabase.from("missions").delete().eq("id", id);
  if (error) return { error: "Não foi possível excluir a missão." };

  revalidateMissions();
  return { ok: true };
}

/**
 * Toda missão criada já serve de "template": duplicar cria uma missão nova
 * com o mesmo título/descrição/XP/tipo/Elo e os mesmos participantes,
 * pronta pra só ajustar as datas.
 */
export async function duplicateMission(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase, profile } = await currentProfile();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missão inválida." };

  const { data: original } = await supabase
    .from("missions")
    .select("title, description, type, xp, elo_id, created_by, audience, mission_assignments(cria_id)")
    .eq("id", id)
    .maybeSingle<{
      title: string;
      description: string | null;
      type: string;
      xp: number;
      elo_id: string | null;
      created_by: string;
      audience: string;
      mission_assignments: { cria_id: string }[];
    }>();

  if (!original) return { error: "Missão original não encontrada." };
  if (!(profile.role === "admin" || original.created_by === profile.id)) {
    return { error: "Sem permissão para duplicar esta missão." };
  }

  const { data: copy, error } = await supabase
    .from("missions")
    .insert({
      created_by: profile.id,
      title: original.title,
      description: original.description,
      type: original.type,
      xp: profile.role === "leader" ? Math.min(original.xp, LEADER_FREE_XP) : original.xp,
      elo_id: original.elo_id,
      audience: original.audience,
    })
    .select("id")
    .single();

  if (error || !copy) return { error: "Não foi possível duplicar a missão." };

  if (profile.role === "leader" && original.xp > LEADER_FREE_XP) {
    // a cópia entra com 1 XP e o XP maior (até 3) volta a ser um pedido para o admin
    const want = Math.min(original.xp, LEADER_MAX_XP);
    await supabase.rpc("mission_set_xp", { p_mission: copy.id, p_xp: want });
  }

  const participants = original.mission_assignments.map((a) => a.cria_id);
  if (participants.length > 0) {
    const { error: assignError } = await supabase
      .from("mission_assignments")
      .insert(participants.map((cria_id) => ({ mission_id: copy.id, cria_id })));
    if (assignError) {
      await supabase.from("missions").delete().eq("id", copy.id);
      return { error: "Não foi possível atribuir a missão duplicada." };
    }
  }

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

/** Cria retira do envio uma missão enviada sem querer (só antes da avaliação). */
export async function withdrawAssignment(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase } = await currentProfile();
  const id = String(formData.get("assignment_id") ?? "");
  if (!id) return { error: "Missão inválida." };

  const { error } = await supabase.rpc("withdraw_assignment", { p_assignment: id });
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
  const { supabase, profile } = await currentProfile();
  const id = String(formData.get("assignment_id") ?? "");
  const approve = String(formData.get("approve") ?? "") === "true";
  const reason = String(formData.get("reason") ?? "").trim() || null;

  if (!id) return { error: "Missão inválida." };

  const { data: assignment } = await supabase
    .from("mission_assignments")
    .select("cria_id, missions:mission_id(title)")
    .eq("id", id)
    .maybeSingle<{ cria_id: string; missions: { title: string } | null }>();

  // Posição do Elo do cria no ranking geral ANTES de creditar o XP — só pra
  // comparar depois e saber se ele subiu com essa aprovação específica.
  let criaEloId: string | null = null;
  let rankBefore: number | null = null;
  if (approve && assignment?.cria_id) {
    const { data: criaProfile } = await supabase
      .from("profiles")
      .select("elo_id")
      .eq("id", assignment.cria_id)
      .maybeSingle<{ elo_id: string | null }>();
    criaEloId = criaProfile?.elo_id ?? null;
    if (criaEloId) {
      const { data: before } = await supabase.rpc("elo_rankings");
      rankBefore =
        ((before ?? []) as { elo_id: string; rank_position: number }[]).find(
          (r) => r.elo_id === criaEloId,
        )?.rank_position ?? null;
    }
  }

  const { error } = await supabase.rpc("review_assignment", {
    p_assignment: id,
    p_approve: approve,
    p_reason: reason,
  });
  if (error) return { error: error.message };

  if (approve && assignment?.cria_id) {
    await supabase.rpc("check_and_grant_achievements", { p_user: assignment.cria_id });

    // Gancho de curiosidade: o push esconde o valor exato do XP (só sabendo
    // abrindo o app) — a notificação de dentro do app (criada pela própria
    // review_assignment RPC) já mostra "+N XP — título", informação completa
    // pra quem já está lá dentro.
    const missionTitle = assignment.missions?.title ?? "sua missão";
    const approverFirstName = (profile.full_name || "Seu líder").trim().split(" ")[0];
    await sendPushToUsers([assignment.cria_id], {
      title: `${approverFirstName} aprovou "${missionTitle}"!`,
      body: "Veja quanto XP você ganhou 👀",
      url: "/app/cria/missoes",
    });

    // O Elo subiu no ranking geral por causa dessa aprovação? Avisa todo mundo.
    if (criaEloId && rankBefore !== null) {
      const { data: afterRanking } = await supabase.rpc("elo_rankings");
      const rankAfter =
        ((afterRanking ?? []) as { elo_id: string; rank_position: number }[]).find(
          (r) => r.elo_id === criaEloId,
        )?.rank_position ?? null;

      if (rankAfter !== null && rankAfter < rankBefore) {
        const title = "Seu Elo subiu no ranking! 🚀";
        const body = `Agora está em ${rankAfter}º lugar no ranking geral.`;
        await supabase.rpc("notify_elo_members", {
          p_elo_id: criaEloId,
          p_title: title,
          p_body: body,
          p_link: "/app/ranking",
          p_category: "elo",
        });
        const { data: members } = await supabase
          .from("profiles")
          .select("id")
          .eq("elo_id", criaEloId)
          .in("role", ["cria", "leader"]);
        const memberIds = (members ?? []).map((m) => m.id as string);
        if (memberIds.length > 0) {
          await sendPushToUsers(memberIds, { title, body, url: "/app/ranking" });
        }
      }
    }
  }

  revalidateMissions();
  revalidatePath("/app/ranking");
  return { ok: true };
}

/** Admin aprova ou recusa o XP (2 a 3) que um líder pediu numa missão. */
export async function reviewMissionXp(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase, profile } = await currentProfile();
  if (profile.role !== "admin") return { error: "Só a administração aprova XP de missão." };
  const id = String(formData.get("id") ?? "");
  const approve = String(formData.get("approve") ?? "") === "true";
  if (!id) return { error: "Missão inválida." };

  const { data, error } = await supabase.rpc("admin_review_mission_xp", { p_mission: id, p_approve: approve });
  if (error) return { error: error.message.includes("pendente") ? "Esse pedido já foi respondido." : "Não foi possível responder ao pedido." };

  const r = data as { created_by?: string; title?: string; xp?: number } | null;
  if (r?.created_by) {
    const to = r.created_by;
    after(async () => {
      await sendPushToUsers([to], {
        title: approve ? "XP aprovado!" : "XP não aprovado",
        body: approve ? `O admin aprovou ${r.xp} XP em "${r.title}".` : `O admin manteve "${r.title}" com ${r.xp} XP.`,
        url: "/app/lider/missoes",
      });
    });
  }
  revalidateMissions();
  return { ok: true };
}
