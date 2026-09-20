"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SuggestionStatus } from "@/lib/types";
import { isFrameworkFlowError, NETWORK_ERROR_MESSAGE } from "./errorHandling";

type Result = { error?: string; ok?: boolean };

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  return { supabase, userId: user.id };
}

function revalidateMural() {
  revalidatePath("/app/mural");
  revalidatePath("/app/cria");
}

/** Só cria escreve sugestão (RLS já garante isso — a checagem aqui é só pra
 *  devolver uma mensagem amigável em vez de um erro genérico de permissão). */
export async function createSuggestion(_prev: Result | null, formData: FormData): Promise<Result> {
  try {
    const { supabase, userId } = await currentUser();
    const content = String(formData.get("content") ?? "").trim();

    if (!content) return { error: "Escreva sua sugestão antes de enviar." };
    if (content.length > 300) return { error: "Sugestão muito longa (máx. 300 caracteres)." };

    const { error } = await supabase.from("suggestions").insert({ author_id: userId, content });
    if (error) {
      return {
        error: error.message.includes("row-level security")
          ? "Só crias podem escrever no mural."
          : "Não foi possível enviar sua sugestão.",
      };
    }

    revalidateMural();
    return { ok: true };
  } catch (err) {
    if (isFrameworkFlowError(err)) throw err;
    console.error("createSuggestion falhou:", err);
    return { error: NETWORK_ERROR_MESSAGE };
  }
}

/** Alterna o hype: se a pessoa já curtiu, tira; senão, adiciona. */
export async function toggleHype(_prev: Result | null, formData: FormData): Promise<Result> {
  try {
    const { supabase, userId } = await currentUser();
    const suggestionId = String(formData.get("suggestion_id") ?? "");
    if (!suggestionId) return { error: "Sugestão inválida." };

    const { data: existing } = await supabase
      .from("suggestion_hypes")
      .select("suggestion_id")
      .eq("suggestion_id", suggestionId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("suggestion_hypes")
        .delete()
        .eq("suggestion_id", suggestionId)
        .eq("user_id", userId);
    } else {
      await supabase.from("suggestion_hypes").insert({ suggestion_id: suggestionId, user_id: userId });
    }

    revalidateMural();
    return { ok: true };
  } catch (err) {
    if (isFrameworkFlowError(err)) throw err;
    console.error("toggleHype falhou:", err);
    return { error: NETWORK_ERROR_MESSAGE };
  }
}

const STATUSES: SuggestionStatus[] = ["pending", "planned", "done"];

/** Admin marca o status de uma sugestão (em análise / planejada / feita). */
export async function setSuggestionStatus(_prev: Result | null, formData: FormData): Promise<Result> {
  try {
    const { supabase } = await currentUser();
    const id = String(formData.get("id") ?? "");
    const status = String(formData.get("status") ?? "") as SuggestionStatus;
    if (!id) return { error: "Sugestão inválida." };
    if (!STATUSES.includes(status)) return { error: "Status inválido." };

    const { error } = await supabase.from("suggestions").update({ status }).eq("id", id);
    if (error) return { error: "Não foi possível atualizar — só admin pode fazer isso." };

    revalidateMural();
    return { ok: true };
  } catch (err) {
    if (isFrameworkFlowError(err)) throw err;
    console.error("setSuggestionStatus falhou:", err);
    return { error: NETWORK_ERROR_MESSAGE };
  }
}

/** Admin remove uma sugestão do mural (ex.: conteúdo impróprio). */
export async function deleteSuggestion(_prev: Result | null, formData: FormData): Promise<Result> {
  try {
    const { supabase } = await currentUser();
    const id = String(formData.get("id") ?? "");
    if (!id) return { error: "Sugestão inválida." };

    const { error } = await supabase.from("suggestions").delete().eq("id", id);
    if (error) return { error: "Não foi possível excluir — só admin pode fazer isso." };

    revalidateMural();
    return { ok: true };
  } catch (err) {
    if (isFrameworkFlowError(err)) throw err;
    console.error("deleteSuggestion falhou:", err);
    return { error: NETWORK_ERROR_MESSAGE };
  }
}
