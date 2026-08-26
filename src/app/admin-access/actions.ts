"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ADMIN_EMAIL } from "@/lib/config.server";

/**
 * Acesso administrativo.
 * A senha nunca vai para o bundle do navegador: o formulário envia o valor
 * digitado para cá e quem valida é o Supabase Auth, autenticando a conta
 * definida em ADMIN_EMAIL. Trocar a senha = trocar a senha desse usuário
 * no Supabase, sem mexer no código.
 */
export async function adminSignIn(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const password = String(formData.get("password") ?? "");
  const email = ADMIN_EMAIL;

  if (!password) return { error: "Informe a senha administrativa." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Senha administrativa inválida." };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    await supabase.auth.signOut();
    return { error: "Esta conta não possui perfil administrativo." };
  }

  redirect("/app/admin");
}
