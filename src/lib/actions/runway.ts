"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// O Vista o Herói agora só se joga com as amigas (salas ao vivo: dressLive.ts). O desfile solo, o treino e a
// avaliação assíncrona foram desligados; sobrou só a moderação dos looks antigos.

/** Admin: esconde (ou volta a mostrar) um look da Passarela. */
export async function hideRunwayLook(lookId: string, hidden: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle<{ role: string }>();
  if (me?.role !== "admin") return { error: "Só o admin pode fazer isso." };
  const admin = createAdminClient();
  if (!admin) return { error: "Indisponível no momento." };
  const { error } = await admin.from("dress_runway_looks").update({ hidden }).eq("id", lookId);
  if (error) return { error: "Não foi possível atualizar." };
  revalidatePath("/app/admin/passarela");
  return {};
}
