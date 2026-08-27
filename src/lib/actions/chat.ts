"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Result = { error?: string; ok?: boolean };

async function currentProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, elo_id, approved")
    .eq("id", user.id)
    .maybeSingle<{ id: string; role: string; elo_id: string | null; approved: boolean }>();

  if (!profile) redirect("/");
  return { supabase, profile };
}

/** Líder e crias enviam mensagem no chat do próprio Elo. Admin só monitora. */
export async function sendChatMessage(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase, profile } = await currentProfile();

  if (profile.role === "admin") return { error: "Admin apenas monitora o chat." };
  if (profile.role === "leader" && !profile.approved) {
    return { error: "Sua conta de líder ainda não foi aprovada." };
  }
  if (!profile.elo_id) return { error: "Você não pertence a nenhum Elo ainda." };

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Escreva uma mensagem." };
  if (body.length > 2000) return { error: "Mensagem muito longa." };

  const { error } = await supabase.from("chat_messages").insert({
    elo_id: profile.elo_id,
    sender_id: profile.id,
    body,
  });

  if (error) return { error: "Não foi possível enviar a mensagem." };

  revalidatePath("/app/chat");
  return { ok: true };
}

/** Marca o chat do Elo como lido para zerar o badge de mensagens novas no menu. */
export async function markChatRead(): Promise<void> {
  const { supabase, profile } = await currentProfile();
  if (!profile.elo_id) return;

  await supabase
    .from("profiles")
    .update({ chat_last_read_at: new Date().toISOString() })
    .eq("id", profile.id);

  revalidatePath("/app", "layout");
}
