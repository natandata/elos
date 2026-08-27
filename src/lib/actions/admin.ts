"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email.server";
import type { AgeRange, Gender, Role } from "@/lib/types";

type Result = { error?: string; ok?: boolean };

const ROLES: Role[] = ["admin", "leader", "cria"];
const AGES: AgeRange[] = ["12-14", "15-16", "17"];
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

  if (!id) return { error: "Usuário inválido." };
  if (!ROLES.includes(role)) return { error: "Perfil inválido." };
  if (!firstName) return { error: "Informe o nome." };
  if (!lastName) return { error: "Informe o sobrenome." };

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      role,
      elo_id: eloId || null,
      ...(ageRange ? { age_range: ageRange } : {}),
      ...(gender ? { gender } : {}),
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
  if (!GENDERS.includes(gender)) return { error: "Selecione o gênero." };
  if (!AGES.includes(ageRange)) return { error: "Selecione a faixa etária." };
  if (!ROLES.includes(role)) return { error: "Perfil inválido." };

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
