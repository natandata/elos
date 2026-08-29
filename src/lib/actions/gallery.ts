"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sweepOrphanFiles } from "@/lib/actions/storage-cleanup";

type Result = { error?: string; ok?: boolean };

async function currentProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle<{ id: string; role: string }>();

  if (!profile) redirect("/");
  return { supabase, profile };
}

/** O upload já aconteceu no navegador; aqui só registra na galeria (máx. 3, travado no banco). */
export async function addGalleryPost(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase, profile } = await currentProfile();
  if (profile.role === "admin") return { error: "Admin não tem galeria no perfil." };

  const imagePath = String(formData.get("image_path") ?? "").trim();
  const caption = String(formData.get("caption") ?? "").trim() || null;
  if (!imagePath) return { error: "Envie uma foto." };

  const { error } = await supabase
    .from("profile_gallery_posts")
    .insert({ user_id: profile.id, image_path: imagePath, caption });

  if (error) {
    // o arquivo já subiu: sem registro ele viraria lixo invisível no Storage
    await supabase.storage.from("profile_gallery").remove([imagePath]);
    return { error: error.message.includes("galeria já tem") ? error.message : "Não foi possível adicionar." };
  }

  revalidatePath("/app/perfil");
  await sweepOrphanFiles();
  return { ok: true };
}

export async function deleteGalleryPost(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase, profile } = await currentProfile();
  const id = String(formData.get("id") ?? "");
  const imagePath = String(formData.get("image_path") ?? "");
  if (!id) return { error: "Foto inválida." };

  const { error } = await supabase
    .from("profile_gallery_posts")
    .delete()
    .eq("id", id)
    .eq("user_id", profile.id);
  if (error) return { error: "Não foi possível remover." };

  if (imagePath) await supabase.storage.from("profile_gallery").remove([imagePath]);

  revalidatePath("/app/perfil");
  return { ok: true };
}
