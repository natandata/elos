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

  if (!firstName) return { error: "Informe seu nome." };
  if (!lastName) return { error: "Informe seu sobrenome." };
  if (!AGES.includes(ageRange)) return { error: "Selecione sua faixa etária." };
  if (!GENDERS.includes(gender)) return { error: "Selecione seu gênero." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { error } = await supabase
    .from("profiles")
    .update({ first_name: firstName, last_name: lastName, age_range: ageRange, gender })
    .eq("id", user.id);

  if (error) return { error: "Não foi possível salvar. Tente novamente." };

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
