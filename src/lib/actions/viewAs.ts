"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VIEW_AS_COOKIE } from "@/lib/auth";

type Result = { error?: string };

async function requireRealAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle<{ id: string; role: string }>();

  if (!profile || profile.role !== "admin") redirect("/");
  return profile.id;
}

/** Só admin chama — o próprio requireProfile ignora o cookie pra quem não é
 *  admin de verdade, então isso não é uma trava de segurança sozinha, mas
 *  evita setar o cookie à toa por quem não vai usar. */
export async function startViewAs(_prev: Result | null, formData: FormData): Promise<Result> {
  const adminId = await requireRealAdmin();
  const targetId = String(formData.get("user_id") ?? "");
  if (!targetId || targetId === adminId) return { error: "Selecione um usuário válido." };

  const jar = await cookies();
  jar.set(VIEW_AS_COOKIE, targetId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 4,
  });
  redirect("/app");
}

export async function stopViewAs(): Promise<void> {
  await requireRealAdmin();
  const jar = await cookies();
  jar.delete(VIEW_AS_COOKIE);
  redirect("/app/admin/usuarios");
}
