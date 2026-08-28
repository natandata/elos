"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { StatusLevel } from "@/lib/types";

const LEVELS: StatusLevel[] = ["bad", "ok", "good"];

type SubmitStatusResult = { error?: string; ok?: boolean; bad?: boolean; statusResponseId?: string };

export async function submitStatus(
  _prev: SubmitStatusResult | null,
  formData: FormData,
): Promise<SubmitStatusResult> {
  const emotional = String(formData.get("emotional") ?? "") as StatusLevel;
  const spiritual = String(formData.get("spiritual") ?? "") as StatusLevel;

  if (!LEVELS.includes(emotional) || !LEVELS.includes(spiritual)) {
    return { error: "Responda as duas perguntas." };
  }

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

  revalidatePath("/app", "layout");

  const bad = emotional === "bad" || spiritual === "bad";
  if (!bad) redirect("/app");

  // se "Mal" em alguma pergunta, fica na tela pra oferecer marcar uma conversa
  return { ok: true, bad: true, statusResponseId: data.id };
}
