"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { StatusLevel } from "@/lib/types";

const LEVELS: StatusLevel[] = ["bad", "ok", "good"];

export async function submitStatus(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
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

  const { error } = await supabase.from("status_responses").insert({
    user_id: user.id,
    emotional_status: emotional,
    spiritual_status: spiritual,
  });

  if (error) return { error: "Não foi possível salvar sua resposta. Tente novamente." };

  revalidatePath("/app", "layout");
  redirect("/app");
}
