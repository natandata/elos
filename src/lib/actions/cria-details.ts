"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Result = { error?: string; ok?: boolean };

/** Ficha opcional do cria (contato de responsável, observações) — só ele e o(s) líder(es) do Elo veem. */
export async function saveGuardianDetails(_prev: Result | null, formData: FormData): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const payload = {
    id: user.id,
    guardian_name: String(formData.get("guardian_name") ?? "").trim() || null,
    guardian_phone: String(formData.get("guardian_phone") ?? "").trim() || null,
    guardian_relationship: String(formData.get("guardian_relationship") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("cria_profile_details").upsert(payload);
  if (error) return { error: "Não foi possível salvar." };

  revalidatePath("/app/perfil");
  return { ok: true };
}
