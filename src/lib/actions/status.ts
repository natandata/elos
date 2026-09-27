"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { StatusLevel } from "@/lib/types";
import { isFrameworkFlowError, NETWORK_ERROR_MESSAGE } from "./errorHandling";

const LEVELS: StatusLevel[] = ["bad", "ok", "good"];

type SubmitStatusResult = {
  error?: string;
  ok?: boolean;
  bad?: boolean;
  statusResponseId?: string;
  showPushPrompt?: boolean;
};

/** O admin liga essa campanha (togglePushActivationCampaign) pra pedir, logo
 *  após o status do dia, que quem ainda não tem push ative — só mostra pra
 *  quem realmente ainda não tem nenhuma inscrição salva. */
async function shouldShowPushPrompt(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<boolean> {
  const [{ data: campaign }, { count }] = await Promise.all([
    supabase.from("push_activation_campaign").select("active").eq("id", true).maybeSingle(),
    supabase
      .from("push_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);
  return Boolean(campaign?.active) && (count ?? 0) === 0;
}

export async function submitStatus(
  _prev: SubmitStatusResult | null,
  formData: FormData,
): Promise<SubmitStatusResult> {
  const emotional = String(formData.get("emotional") ?? "") as StatusLevel;
  const spiritual = String(formData.get("spiritual") ?? "") as StatusLevel;

  if (!LEVELS.includes(emotional) || !LEVELS.includes(spiritual)) {
    return { error: "Responda as duas perguntas." };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/");

    const { data, error } = await supabase
      .from("status_responses")
      .insert({
        user_id: user.id,
        emotional_status: emotional,
        spiritual_status: spiritual,
      })
      .select("id")
      .single();

    if (error || !data) return { error: "Não foi possível salvar sua resposta. Tente novamente." };

    // streak de dias seguidos respondendo — some quando pula um dia
    await supabase.rpc("record_status_streak");

    const bad = emotional === "bad" || spiritual === "bad";
    const showPushPrompt = await shouldShowPushPrompt(supabase, user.id);

    if (!bad && !showPushPrompt) {
      revalidatePath("/app", "layout");
      redirect("/app");
    }

    // "Mal" oferece marcar uma conversa; sem push ativado (com a campanha
    // ligada) oferece ativar — os dois casos ficam na tela em vez de sair.
    return { ok: true, bad, statusResponseId: data.id, showPushPrompt };
  } catch (err) {
    if (isFrameworkFlowError(err)) throw err;
    console.error("submitStatus falhou:", err);
    return { error: NETWORK_ERROR_MESSAGE };
  }
}
