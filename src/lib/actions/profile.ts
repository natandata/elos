"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AgeRange, Gender } from "@/lib/types";

const AGES: AgeRange[] = ["12-14", "15-16", "17"];
const GENDERS: Gender[] = ["male", "female"];

/**
 * Completa o cadastro de quem entrou pelo Google (sem gênero/idade).
 * O Elo é preenchido automaticamente pelo trigger do banco.
 */
export async function completeProfile(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const ageRange = String(formData.get("age_range") ?? "") as AgeRange;
  const gender = String(formData.get("gender") ?? "") as Gender;
  const guardianAck = String(formData.get("guardian_ack") ?? "") === "true";

  if (!firstName) return { error: "Informe seu nome." };
  if (!lastName) return { error: "Informe seu sobrenome." };
  if (!AGES.includes(ageRange)) return { error: "Selecione sua faixa etária." };
  if (!GENDERS.includes(gender)) return { error: "Selecione seu gênero." };
  if (!guardianAck) return { error: "Confirme a autorização do responsável para continuar." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      age_range: ageRange,
      gender,
      guardian_ack_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return { error: "Não foi possível salvar. Tente novamente." };

  // revalida o layout raiz também: é ele que decide a cor do tema (data-theme
  // no <html>), e o gênero acabou de mudar agora.
  revalidatePath("/", "layout");
  revalidatePath("/app", "layout");
  redirect("/app");
}

/** Atualização do próprio nome na tela de perfil. */
export async function updateOwnName(
  _prev: { error?: string; ok?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  if (!firstName) return { error: "Informe seu nome." };
  if (!lastName) return { error: "Informe seu sobrenome." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { error } = await supabase
    .from("profiles")
    .update({ first_name: firstName, last_name: lastName })
    .eq("id", user.id);

  if (error) return { error: "Não foi possível salvar." };

  revalidatePath("/app", "layout");
  return { ok: true };
}

/** Liga/desliga o recebimento de e-mails do ELOS (boas-vindas e resumos). */
export async function updateEmailOptIn(
  _prev: { error?: string; ok?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const optIn = String(formData.get("email_opt_in") ?? "") === "true";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { error } = await supabase
    .from("profiles")
    .update({ email_opt_in: optIn })
    .eq("id", user.id);

  if (error) return { error: "Não foi possível salvar." };

  revalidatePath("/app", "layout");
  return { ok: true };
}

/** Revalidação periódica (a cada 15 dias) da autorização do responsável. */
export async function confirmGuardianAck(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const ack = String(formData.get("guardian_ack") ?? "") === "true";
  if (!ack) return { error: "Confirme a autorização do responsável para continuar." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { error } = await supabase
    .from("profiles")
    .update({ guardian_ack_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) return { error: "Não foi possível salvar. Tente novamente." };

  revalidatePath("/app", "layout");
  redirect("/app");
}
