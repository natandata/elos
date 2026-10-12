"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendPushToUsers } from "@/lib/push-server";

type SendResult = { error?: string; threadId?: string };

/** Mensagens que o banco escreve em português — o resto vira um aviso genérico. */
const KNOWN =
  /^(Faça login|Sua conta|Escreva uma mensagem|Destinatário|Essa pessoa|Muitas mensagens|Apenas a liderança)/;

/** Envia uma mensagem direta (cria a conversa na primeira vez). */
export async function sendDm(toUserId: string, body: string): Promise<SendResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data, error } = await supabase.rpc("dm_send", { p_to: toUserId, p_body: body });
  if (error) return { error: KNOWN.test(error.message) ? error.message : "Não foi possível enviar agora." };
  const threadId = String(data);

  // o aviso no celular sai depois da resposta, pra "Enviar" não esperar
  after(async () => {
    const { data: me } = await supabase
      .from("profiles")
      .select("full_name, username")
      .eq("id", user.id)
      .maybeSingle<{ full_name: string; username: string | null }>();
    await sendPushToUsers([toUserId], {
      title: me?.username || me?.full_name || "Nova mensagem",
      body: "Enviou uma mensagem no Elogram.",
      url: `/app/elogram/mensagens/${threadId}`,
    });
  });

  revalidatePath("/app/elogram/mensagens");
  return { threadId };
}

/** Liderança/admin apaga uma mensagem imprópria. */
export async function deleteDmMessage(messageId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("dm_delete_message", { p_message: messageId });
  if (error) return { error: "Não foi possível apagar." };
  return {};
}
