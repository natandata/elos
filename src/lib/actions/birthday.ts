"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validBirth } from "@/lib/birthday";

/** Salva a data de nascimento de quem está logado (todo usuário, de qualquer perfil). */
export async function saveBirthDate(iso: string): Promise<{ error?: string }> {
  if (!validBirth(String(iso))) return { error: "Confira a data: dia, mês e ano de nascimento." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Entre de novo." };
  const { error } = await supabase.from("profiles").update({ birth_date: iso }).eq("id", user.id);
  if (error) return { error: "Não foi possível salvar. Tente de novo." };
  revalidatePath("/app", "layout");
  return {};
}
