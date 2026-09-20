"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendPushToUsers } from "@/lib/push-server";
import { isFrameworkFlowError, NETWORK_ERROR_MESSAGE } from "./errorHandling";

type Result = { error?: string; ok?: boolean };

async function currentProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", user.id)
    .maybeSingle<{ id: string; role: string; full_name: string }>();
  if (!profile) redirect("/");
  return { supabase, profile };
}

function revalidateHelpChat(criaId: string) {
  revalidatePath("/app/chat/ajuda");
  revalidatePath(`/app/chat/ajuda/${criaId}`);
  revalidatePath(`/app/admin/ajuda/${criaId}`);
}

/** Cria escreve na própria thread, ou líder responde na de um cria seu — a
 *  RLS (help_chat_insert) já barra qualquer outra combinação. */
export async function sendHelpMessage(_prev: Result | null, formData: FormData): Promise<Result> {
  try {
    const { supabase, profile } = await currentProfile();
    const criaId = String(formData.get("cria_id") ?? "");
    const body = String(formData.get("body") ?? "").trim();

    if (!criaId) return { error: "Conversa inválida." };
    if (!body) return { error: "Escreva uma mensagem." };
    if (body.length > 2000) return { error: "Mensagem muito longa." };

    const { error } = await supabase
      .from("help_chat_messages")
      .insert({ cria_id: criaId, sender_id: profile.id, body });
    if (error) return { error: "Não foi possível enviar — verifique se você faz parte dessa conversa." };

    // Notifica quem NÃO mandou: cria escreveu → avisa o(s) líder(es) do Elo
    // dele; líder respondeu → avisa o cria. É pra isso que o botão existe —
    // um pedido de ajuda precisa chegar rápido.
    const isFromCria = profile.id === criaId;
    if (isFromCria) {
      const { data: criaProfile } = await supabase
        .from("profiles")
        .select("elo_id, full_name")
        .eq("id", criaId)
        .maybeSingle<{ elo_id: string | null; full_name: string }>();
      if (criaProfile?.elo_id) {
        const { data: leaders } = await supabase
          .from("profiles")
          .select("id")
          .eq("elo_id", criaProfile.elo_id)
          .eq("role", "leader");
        const leaderIds = (leaders ?? []).map((l) => l.id as string);
        if (leaderIds.length > 0) {
          const title = `🆘 ${criaProfile.full_name || "Um cria"} precisa de ajuda`;
          await supabase.rpc("notify_help_chat", {
            p_cria_id: criaId,
            p_recipient_ids: leaderIds,
            p_title: title,
            p_body: body,
            p_link: `/app/chat/ajuda/${criaId}`,
          });
          await sendPushToUsers(leaderIds, { title, body, url: `/app/chat/ajuda/${criaId}` });
        }
      }
    } else {
      const title = `${profile.full_name || "Seu líder"} respondeu`;
      await supabase.rpc("notify_help_chat", {
        p_cria_id: criaId,
        p_recipient_ids: [criaId],
        p_title: title,
        p_body: body,
        p_link: "/app/chat/ajuda",
      });
      await sendPushToUsers([criaId], { title, body, url: "/app/chat/ajuda" });
    }

    revalidateHelpChat(criaId);
    return { ok: true };
  } catch (err) {
    if (isFrameworkFlowError(err)) throw err;
    console.error("sendHelpMessage falhou:", err);
    return { error: NETWORK_ERROR_MESSAGE };
  }
}

/** Só admin apaga — moderação/monitoramento do chat de ajuda. */
export async function deleteHelpMessage(_prev: Result | null, formData: FormData): Promise<Result> {
  try {
    const { supabase } = await currentProfile();
    const id = String(formData.get("id") ?? "");
    const criaId = String(formData.get("cria_id") ?? "");
    if (!id) return { error: "Mensagem inválida." };

    const { error } = await supabase.from("help_chat_messages").delete().eq("id", id);
    if (error) return { error: "Não foi possível excluir — só admin pode fazer isso." };

    if (criaId) revalidateHelpChat(criaId);
    return { ok: true };
  } catch (err) {
    if (isFrameworkFlowError(err)) throw err;
    console.error("deleteHelpMessage falhou:", err);
    return { error: NETWORK_ERROR_MESSAGE };
  }
}
