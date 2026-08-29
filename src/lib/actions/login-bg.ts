"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

type Result = { error?: string; ok?: boolean };

const MAX_IMAGES = 12;

/** O upload já aconteceu no navegador (bucket público); aqui só registra. */
export async function addLoginBgImage(_prev: Result | null, formData: FormData): Promise<Result> {
  await requireRole("admin");
  const supabase = await createClient();

  const imagePath = String(formData.get("image_path") ?? "").trim();
  if (!imagePath) return { error: "Envie uma foto." };

  const { count } = await supabase
    .from("login_background_images")
    .select("id", { count: "exact", head: true });
  if ((count ?? 0) >= MAX_IMAGES) {
    await supabase.storage.from("login_bg").remove([imagePath]);
    return { error: `Máximo de ${MAX_IMAGES} imagens — remova uma antes de adicionar outra.` };
  }

  const { error } = await supabase
    .from("login_background_images")
    .insert({ image_path: imagePath, position: count ?? 0 });

  if (error) {
    await supabase.storage.from("login_bg").remove([imagePath]);
    return { error: "Não foi possível adicionar." };
  }

  revalidatePath("/");
  revalidatePath("/app/admin/geral");
  return { ok: true };
}

export async function deleteLoginBgImage(_prev: Result | null, formData: FormData): Promise<Result> {
  await requireRole("admin");
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  const imagePath = String(formData.get("image_path") ?? "");
  if (!id) return { error: "Imagem inválida." };

  const { error } = await supabase.from("login_background_images").delete().eq("id", id);
  if (error) return { error: "Não foi possível remover." };

  if (imagePath) await supabase.storage.from("login_bg").remove([imagePath]);

  revalidatePath("/");
  revalidatePath("/app/admin/geral");
  return { ok: true };
}
