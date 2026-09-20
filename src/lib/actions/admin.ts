"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email.server";
import { sendPushToUsers } from "@/lib/push-server";
import type { AgeRange, Gender, Role } from "@/lib/types";
import { isFrameworkFlowError, NETWORK_ERROR_MESSAGE } from "./errorHandling";

type Result = { error?: string; ok?: boolean };

const ROLES: Role[] = ["admin", "leader", "cria", "guardian"];
const AGES: AgeRange[] = ["12-13", "14-15", "16-17"];
const GENDERS: Gender[] = ["male", "female"];

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
  const gender = String(formData.get("gender") ?? "");
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const xpRaw = String(formData.get("xp") ?? "").trim();

  if (!id) return { error: "Usuário inválido." };
  if (!ROLES.includes(role)) return { error: "Perfil inválido." };
  if (!firstName) return { error: "Informe o nome." };
  if (!lastName) return { error: "Informe o sobrenome." };

  let xp: number | undefined;
  if (xpRaw) {
    xp = Number(xpRaw);
    if (!Number.isInteger(xp) || xp < 0) return { error: "XP precisa ser um número inteiro, 0 ou maior." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      role,
      elo_id: eloId || null,
      ...(ageRange ? { age_range: ageRange } : {}),
      ...(gender ? { gender } : {}),
      ...(xp !== undefined ? { xp } : {}),
    })
    .eq("id", id);

  if (error) {
    // O banco recusa Elo incompatível com o gênero; essa mensagem é segura
    // para mostrar direto, o resto vira um aviso genérico.
    return { error: error.message.includes("Elo incompatível") ? error.message : "Não foi possível salvar as alterações." };
  }

  revalidateAdmin();
  return { ok: true };
}

/** Cria uma conta já confirmada, pronta para uso. */
export async function createUser(_prev: Result | null, formData: FormData): Promise<Result> {
  const supabase = await adminClient();

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const gender = String(formData.get("gender") ?? "") as Gender;
  const ageRange = String(formData.get("age_range") ?? "") as AgeRange;
  const role = (String(formData.get("role") ?? "cria") || "cria") as Role;

  if (!firstName) return { error: "Informe o nome." };
  if (!lastName) return { error: "Informe o sobrenome." };
  if (!email) return { error: "Informe o e-mail." };
  if (password.length < 6) return { error: "A senha precisa ter ao menos 6 caracteres." };
  if (!ROLES.includes(role)) return { error: "Perfil inválido." };
  // responsável não tem gênero/faixa etária/Elo
  if (role !== "guardian") {
    if (!GENDERS.includes(gender)) return { error: "Selecione o gênero." };
    if (!AGES.includes(ageRange)) return { error: "Selecione a faixa etária." };
  }

  const { error } = await supabase.rpc("admin_create_user", {
    p_email: email,
    p_password: password,
    p_first_name: firstName,
    p_last_name: lastName,
    p_gender: gender,
    p_age_range: ageRange,
    p_role: role,
  });

  if (error) return { error: error.message };

  revalidateAdmin();
  return { ok: true };
}

/** Exclui a conta e tudo que depende dela (missões, XP, status, vínculos). */
export async function deleteUser(_prev: Result | null, formData: FormData): Promise<Result> {
  const supabase = await adminClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Usuário inválido." };

  const { error } = await supabase.rpc("admin_delete_user", { p_user: id });
  if (error) return { error: error.message };

  revalidateAdmin();
  return { ok: true };
}

/** Zera o XP de todo mundo de uma vez (ex.: início de nova temporada/ranking).
 *  Zera as duas fontes de "XP" que existem no sistema: o XP acumulado de
 *  cada pessoa (profiles.xp, usado no ranking de crias e nos Elos) e o valor
 *  de XP definido em cada missão (missions.xp, usado no ranking de líderes —
 *  "quantas missões criou, o nível/XP delas..."). Zerar só a primeira deixava
 *  o ranking de líderes com números "presos" das missões já criadas. */
export async function resetAllXp(_prev: Result | null, _formData: FormData): Promise<Result> {
  const supabase = await adminClient();

  // `.gte(...)` é sempre verdadeiro (nenhum dos dois campos é negativo) — só
  // serve pra dar um filtro à query, já que o Supabase recusa update sem nenhum.
  const [profilesRes, missionsRes] = await Promise.all([
    supabase.from("profiles").update({ xp: 0 }).gte("xp", 0),
    supabase.from("missions").update({ xp: 0 }).gte("xp", 0),
  ]);
  if (profilesRes.error || missionsRes.error) return { error: "Não foi possível zerar o XP." };

  revalidateAdmin();
  revalidatePath("/app/ranking");
  return { ok: true };
}

/** Define o XP TOTAL do Elo (o número que aparece pro Elo em todo lugar) —
 *  o admin digita o valor que quer que o Elo tenha, e a função calcula por
 *  trás quanto de "bônus" (elos.bonus_xp) é preciso pra chegar lá, com base
 *  na soma atual do XP dos crias (recalculada no banco, não no valor que a
 *  tela carregou, pra nunca dessincronizar). */
export async function setEloTotalXp(_prev: Result | null, formData: FormData): Promise<Result> {
  const supabase = await adminClient();
  const eloId = String(formData.get("elo_id") ?? "");
  const totalRaw = String(formData.get("total_xp") ?? "").trim();

  if (!eloId) return { error: "Elo inválido." };
  const totalXp = Number(totalRaw);
  if (!Number.isInteger(totalXp)) return { error: "XP precisa ser um número inteiro." };

  const { error } = await supabase.rpc("admin_set_elo_total_xp", {
    p_elo_id: eloId,
    p_total: totalXp,
  });
  if (error) return { error: "Não foi possível salvar o XP do Elo." };

  revalidateAdmin();
  revalidatePath(`/app/admin/elos/${eloId}`);
  revalidatePath("/app/ranking");
  revalidatePath("/app/lider");
  return { ok: true };
}

/** Dá um bônus de XP pro Elo, somando por cima do que ele já tem — tipo um
 *  presente. Nunca redefine o total, só soma (ou desconta, se o valor digitado
 *  for negativo) em cima do que já está lá. */
export async function giveEloBonusXp(_prev: Result | null, formData: FormData): Promise<Result> {
  const supabase = await adminClient();
  const eloId = String(formData.get("elo_id") ?? "");
  const amountRaw = String(formData.get("amount") ?? "").trim();

  if (!eloId) return { error: "Elo inválido." };
  const amount = Number(amountRaw);
  if (!Number.isInteger(amount) || amount === 0) {
    return { error: "Informe uma quantidade de XP válida." };
  }

  const { error } = await supabase.rpc("admin_add_elo_bonus_xp", {
    p_elo_id: eloId,
    p_amount: amount,
  });
  if (error) return { error: "Não foi possível dar o bônus de XP." };

  revalidateAdmin();
  revalidatePath(`/app/admin/elos/${eloId}`);
  revalidatePath("/app/ranking");
  revalidatePath("/app/lider");
  return { ok: true };
}

/** Redefine a senha de alguém que perdeu o acesso. */
export async function resetPassword(_prev: Result | null, formData: FormData): Promise<Result> {
  const supabase = await adminClient();
  const id = String(formData.get("id") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!id) return { error: "Usuário inválido." };
  if (password.length < 6) return { error: "A senha precisa ter ao menos 6 caracteres." };

  const { error } = await supabase.rpc("admin_set_password", {
    p_user: id,
    p_password: password,
  });
  if (error) return { error: error.message };

  return { ok: true };
}

/** Aplica a senha sugerida por um usuário que pediu redefinição pela tela de login. */
export async function applyPasswordResetRequest(_prev: Result | null, formData: FormData): Promise<Result> {
  const supabase = await adminClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Pedido inválido." };

  const { error } = await supabase.rpc("admin_apply_password_reset", { p_id: id });
  if (error) return { error: error.message };

  revalidateAdmin();
  return { ok: true };
}

/** Recusa um pedido de redefinição sem aplicar a senha sugerida. */
export async function dismissPasswordResetRequest(_prev: Result | null, formData: FormData): Promise<Result> {
  const supabase = await adminClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Pedido inválido." };

  const { error } = await supabase.rpc("admin_dismiss_password_reset", { p_id: id });
  if (error) return { error: error.message };

  revalidateAdmin();
  return { ok: true };
}

/** Envia uma notificação por e-mail para o endereço cadastrado de um usuário. */
export async function sendUserEmail(_prev: Result | null, formData: FormData): Promise<Result> {
  const supabase = await adminClient();
  const id = String(formData.get("id") ?? "");
  const subject = String(formData.get("subject") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!id) return { error: "Usuário inválido." };
  if (!subject) return { error: "Informe o assunto." };
  if (!message) return { error: "Escreva a mensagem." };

  const { data: email, error: emailError } = await supabase.rpc("admin_get_user_email", {
    p_user: id,
  });
  if (emailError || !email) return { error: "Não foi possível encontrar o e-mail deste usuário." };

  const html = `
    <div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:480px;margin:0 auto">
      <div style="background:#7c3aed;color:#fff;font-weight:800;font-size:20px;padding:20px 24px;border-radius:12px 12px 0 0">
        ELOS
      </div>
      <div style="border:1px solid #e6e8f0;border-top:0;border-radius:0 0 12px 12px;padding:24px">
        <p style="white-space:pre-wrap;line-height:1.6;color:#14142b;margin:0">${escapeHtml(message)}</p>
        <p style="margin-top:24px;padding-top:16px;border-top:1px solid #e6e8f0;color:#6b7280;font-size:12px">
          Mensagem enviada pela administração do ELOS.
        </p>
      </div>
    </div>
  `;

  const result = await sendEmail({ to: email, subject, html });
  if (!result.ok) return { error: result.error };

  return { ok: true };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Libera (ou recusa) uma conta de líder criada pelo cadastro público. */
export async function approveLeader(_prev: Result | null, formData: FormData): Promise<Result> {
  const supabase = await adminClient();
  const id = String(formData.get("id") ?? "");
  const approve = String(formData.get("approve") ?? "true") === "true";
  if (!id) return { error: "Usuário inválido." };

  const { error } = await supabase.rpc("admin_approve_leader", {
    p_user: id,
    p_approve: approve,
  });
  if (error) return { error: error.message };

  revalidateAdmin();
  revalidatePath("/app", "layout");
  return { ok: true };
}

/** Define (ou troca) o líder responsável por um cria. */
// A responsabilidade do líder sobre os crias segue o Elo automaticamente
// (triggers no banco — ver migrations 0020/0021). Não existe mais atribuição
// manual de "líder responsável" avulsa: trocar o Elo do líder ou do cria já
// resolve o vínculo sozinho, nos dois sentidos.

/** Check-in de presença: qualquer pessoa confirma a própria presença num evento que vê. */
export async function checkInToEvent(_prev: Result | null, formData: FormData): Promise<Result> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/");

    const eventId = String(formData.get("event_id") ?? "");
    if (!eventId) return { error: "Evento inválido." };

    const { error } = await supabase
      .from("event_attendance")
      .upsert({ event_id: eventId, user_id: user.id }, { onConflict: "event_id,user_id" });

    if (error) return { error: "Não foi possível confirmar presença." };

    revalidatePath("/app/agenda");
    return { ok: true };
  } catch (err) {
    if (isFrameworkFlowError(err)) throw err;
    console.error("checkInToEvent falhou:", err);
    return { error: NETWORK_ERROR_MESSAGE };
  }
}

/** Desfaz o check-in — a pessoa pode voltar atrás na própria confirmação. */
export async function cancelEventCheckIn(_prev: Result | null, formData: FormData): Promise<Result> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/");

    const eventId = String(formData.get("event_id") ?? "");
    if (!eventId) return { error: "Evento inválido." };

    const { error } = await supabase
      .from("event_attendance")
      .delete()
      .eq("event_id", eventId)
      .eq("user_id", user.id);

    if (error) return { error: "Não foi possível desfazer a confirmação." };

    revalidatePath("/app/agenda");
    return { ok: true };
  } catch (err) {
    if (isFrameworkFlowError(err)) throw err;
    console.error("cancelEventCheckIn falhou:", err);
    return { error: NETWORK_ERROR_MESSAGE };
  }
}

// ---------------------------------------------------------------- eventos

function revalidateAgenda() {
  revalidatePath("/app/agenda");
  revalidatePath("/app/cria");
  revalidatePath("/app/lider");
}

const RECURRENCE_STEP_DAYS: Record<string, number> = { weekly: 7, biweekly: 14 };
// trava de segurança: nunca gera mais que isso numa tacada só, mesmo que a
// data final peça mais (evita um "até" digitado errado lotar a agenda).
const MAX_RECURRENCE_OCCURRENCES = 52;

/** Soma dias a uma data "YYYY-MM-DD" sem passar por fuso horário. */
function addDaysToDate(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/** Mesmo dia do mês seguinte — se o mês não tiver esse dia (ex. 31),
 *  Date() já rola pro mês depois sozinho; aceitável pra uma agenda de igreja. */
function addMonthToDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m, d));
  return dt.toISOString().slice(0, 10);
}

/** Gera as datas de uma série recorrente, a partir da primeira, até `until`
 *  (inclusive) — sempre inclui a data inicial, mesmo sem repetição alguma. */
function buildRecurrenceDates(start: string, rule: string, until: string | null): string[] {
  const dates = [start];
  const isKnownRule = rule in RECURRENCE_STEP_DAYS || rule === "monthly";
  if (!until || !isKnownRule) return dates;

  let current = start;
  while (dates.length < MAX_RECURRENCE_OCCURRENCES) {
    current = rule === "monthly" ? addMonthToDate(current) : addDaysToDate(current, RECURRENCE_STEP_DAYS[rule]);
    if (current > until) break;
    dates.push(current);
  }
  return dates;
}

export async function saveEvent(_prev: Result | null, formData: FormData): Promise<Result> {
  const supabase = await adminClient();
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const eventDate = String(formData.get("event_date") ?? "");

  if (!title) return { error: "Informe o nome do evento." };
  if (!eventDate) return { error: "Informe a data." };

  // "Liderança" e "Só admin" são valores especiais no mesmo seletor de Elo:
  // não são um Elo de verdade, só restringem quem enxerga o evento.
  const eloField = String(formData.get("elo_id") ?? "");
  const leadersOnly = eloField === "leaders";
  const adminOnly = eloField === "admin";

  const basePayload = {
    title,
    description: String(formData.get("description") ?? "").trim() || null,
    event_time: String(formData.get("event_time") ?? "") || null,
    location: String(formData.get("location") ?? "").trim() || null,
    elo_id: leadersOnly || adminOnly ? null : eloField || null,
    leaders_only: leadersOnly,
    admin_only: adminOnly,
  };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (id) {
    // edição: sempre a ocorrência única — recorrência só se aplica na criação.
    const { error } = await supabase.from("events").update({ ...basePayload, event_date: eventDate }).eq("id", id);
    if (error) return { error: "Não foi possível salvar o evento." };
    revalidateAgenda();
    return { ok: true };
  }

  const recurrence = String(formData.get("recurrence") ?? "none");
  const recurrenceUntil = String(formData.get("recurrence_until") ?? "") || null;
  const dates =
    recurrence === "none" ? [eventDate] : buildRecurrenceDates(eventDate, recurrence, recurrenceUntil);
  const groupId = dates.length > 1 ? crypto.randomUUID() : null;

  const { error } = await supabase.from("events").insert(
    dates.map((event_date) => ({
      ...basePayload,
      event_date,
      created_by: user!.id,
      recurrence_group_id: groupId,
      recurrence_rule: groupId ? recurrence : null,
    })),
  );

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

// ---------------------------------------------------------------- desafio entre Elos

function revalidateChallenge() {
  revalidatePath("/app/admin/elos");
  revalidatePath("/app/ranking");
  revalidatePath("/app/cria");
  revalidatePath("/app/lider");
}

/** Propõe um desafio entre Elos — só um em aberto por vez. */
export async function createEloChallenge(_prev: Result | null, formData: FormData): Promise<Result> {
  const supabase = await adminClient();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const bonusXp = Number(String(formData.get("bonus_xp") ?? "").trim());

  if (!title) return { error: "Dê um nome ao desafio." };
  if (!Number.isInteger(bonusXp) || bonusXp < 0) {
    return { error: "XP precisa ser um número inteiro, 0 ou maior." };
  }

  const { count } = await supabase
    .from("elo_challenges")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");
  if ((count ?? 0) > 0) {
    return { error: "Já existe um desafio em andamento — encerre-o antes de criar outro." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("elo_challenges")
    .insert({ title, description, bonus_xp: bonusXp, created_by: user?.id ?? null });
  if (error) return { error: "Não foi possível criar o desafio." };

  const { data: everyone } = await supabase.from("profiles").select("id").in("role", ["cria", "leader"]);
  const ids = (everyone ?? []).map((p) => p.id as string);
  if (ids.length > 0) {
    await sendPushToUsers(ids, {
      title: "Novo desafio entre os Elos! 🏆",
      body: title,
      url: "/app/ranking",
    });
  }

  revalidateChallenge();
  return { ok: true };
}

/** Encerra o desafio em aberto, declara o Elo vencedor e credita o bônus
 *  pra cada cria dele — de uma vez, via RPC (soma XP, não substitui). */
export async function finishEloChallenge(_prev: Result | null, formData: FormData): Promise<Result> {
  const supabase = await adminClient();
  const id = String(formData.get("id") ?? "");
  const winnerEloId = String(formData.get("winner_elo_id") ?? "");
  if (!id || !winnerEloId) return { error: "Selecione o Elo vencedor." };

  const { data: challenge } = await supabase
    .from("elo_challenges")
    .select("title, bonus_xp, status")
    .eq("id", id)
    .maybeSingle<{ title: string; bonus_xp: number; status: string }>();
  if (!challenge) return { error: "Desafio não encontrado." };
  if (challenge.status === "finished") return { error: "Esse desafio já foi encerrado." };

  const { error: updateError } = await supabase
    .from("elo_challenges")
    .update({ status: "finished", winner_elo_id: winnerEloId, finished_at: new Date().toISOString() })
    .eq("id", id);
  if (updateError) return { error: "Não foi possível encerrar o desafio." };

  if (challenge.bonus_xp > 0) {
    await supabase.rpc("award_elo_challenge_bonus", { p_elo_id: winnerEloId, p_amount: challenge.bonus_xp });
  }

  const title = "Seu Elo venceu o desafio! 🏆";
  const body =
    challenge.bonus_xp > 0
      ? `"${challenge.title}" — +${challenge.bonus_xp} XP pra todo mundo do Elo!`
      : `"${challenge.title}"`;
  await supabase.rpc("notify_elo_members", {
    p_elo_id: winnerEloId,
    p_title: title,
    p_body: body,
    p_link: "/app/ranking",
    p_category: "elo",
  });
  const { data: winners } = await supabase
    .from("profiles")
    .select("id")
    .eq("elo_id", winnerEloId)
    .in("role", ["cria", "leader"]);
  const winnerIds = (winners ?? []).map((p) => p.id as string);
  if (winnerIds.length > 0) {
    await sendPushToUsers(winnerIds, { title, body, url: "/app/ranking" });
  }

  revalidateChallenge();
  return { ok: true };
}

/** Cancela um desafio em aberto sem declarar vencedor (ex.: criado por engano). */
export async function cancelEloChallenge(_prev: Result | null, formData: FormData): Promise<Result> {
  const supabase = await adminClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Desafio inválido." };

  const { error } = await supabase.from("elo_challenges").delete().eq("id", id).eq("status", "open");
  if (error) return { error: "Não foi possível cancelar o desafio." };

  revalidateChallenge();
  return { ok: true };
}
