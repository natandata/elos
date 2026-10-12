"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { hasMentionAll, mentionIds, plainMentions } from "@/lib/mentions";
import { MAX_MENTIONS_CHAT, notifyChatMentions } from "@/lib/mentionNotify";
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
    .select("id, role, elo_id, approved, full_name")
    .eq("id", user.id)
    .maybeSingle<{ id: string; role: string; elo_id: string | null; approved: boolean; full_name: string }>();

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
  if (plainMentions(body).length > 2000) return { error: "Mensagem muito longa." };
  if (mentionIds(body).length > MAX_MENTIONS_CHAT) return { error: `Marque até ${MAX_MENTIONS_CHAT} pessoas.` };

  // @todos avisa o Elo inteiro: no máximo uma vez a cada 5 minutos por pessoa
  const tagsAll = hasMentionAll(body);
  if (tagsAll) {
    const { count } = await supabase
      .from("chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("sender_id", profile.id)
      .ilike("body", "%@todos%")
      .gt("created_at", new Date(Date.now() - 5 * 60_000).toISOString());
    if ((count ?? 0) > 0) return { error: "Você marcou todos há pouco. Espere alguns minutos pra marcar de novo." };
  }

  const { error } = await supabase.from("chat_messages").insert({
    elo_id: profile.elo_id,
    sender_id: profile.id,
    body,
  });

  if (error) return { error: "Não foi possível enviar a mensagem." };

  if (tagsAll || mentionIds(body).length > 0) {
    after(async () => {
      try {
        await notifyChatMentions({
          text: body,
          senderId: profile.id,
          senderName: profile.full_name || "Alguém",
          eloId: profile.elo_id!,
        });
      } catch (err) {
        console.error("aviso de marcação no chat falhou:", err);
      }
    });
  }

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
