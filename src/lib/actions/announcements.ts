"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Result = { error?: string; ok?: boolean };

async function adminCtx() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (data?.role !== "admin") redirect("/app");
  return { supabase, userId: user.id };
}

function refresh() {
  revalidatePath("/app/admin/avisos");
  revalidatePath("/app", "layout");
}

/** Cria (sem id) ou edita (com id) um aviso. Republicar zera quem já viu. */
export async function saveAnnouncement(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase, userId } = await adminCtx();
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const active = formData.get("active") === "on";
  const republish = formData.get("republish") === "on";

  if (!title) return { error: "Informe o título do aviso." };
  if (!body) return { error: "Escreva o texto do aviso." };
  if (title.length > 120) return { error: "Título muito longo (máx. 120 caracteres)." };
  if (body.length > 1500) return { error: "Texto muito longo (máx. 1500 caracteres)." };

  if (!id) {
    const { error } = await supabase
      .from("announcements")
      .insert({ title, body, active, created_by: userId });
    if (error) return { error: "Não foi possível criar o aviso." };
  } else {
    const { data: current } = await supabase
      .from("announcements")
      .select("version")
      .eq("id", id)
      .maybeSingle<{ version: number }>();
    if (!current) return { error: "Aviso não encontrado." };

    const { error } = await supabase
      .from("announcements")
      .update({
        title,
        body,
        active,
        version: republish ? current.version + 1 : current.version,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) return { error: "Não foi possível salvar o aviso." };
  }

  refresh();
  return { ok: true };
}

export async function deleteAnnouncement(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase } = await adminCtx();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Aviso inválido." };
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) return { error: "Não foi possível excluir o aviso." };
  refresh();
  return { ok: true };
}

/** Usuário dispensa o aviso na versão atual — não volta a aparecer. */
export async function dismissAnnouncement(announcementId: string, version: number): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !announcementId) return;

  await supabase.from("announcement_seen").upsert(
    {
      announcement_id: announcementId,
      user_id: user.id,
      seen_version: version,
      seen_at: new Date().toISOString(),
    },
    { onConflict: "announcement_id,user_id" },
  );
  revalidatePath("/app", "layout");
}
