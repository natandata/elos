"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

/** Post de story — conteúdo à parte do Explorar, mesma expiração de 24h. */
export async function createStoryPost(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase, profile } = await currentProfile();
  if (profile.role === "admin") return { error: "Admin não posta story." };

  const imagePath = String(formData.get("image_path") ?? "").trim();
  const caption = String(formData.get("caption") ?? "").trim() || null;
  if (!imagePath) return { error: "Envie uma foto." };

  const { error } = await supabase
    .from("story_posts")
    .insert({ author_id: profile.id, image_path: imagePath, caption });

  if (error) {
    // o arquivo já subiu: sem registro ele viraria lixo invisível no Storage
    await supabase.storage.from("stories").remove([imagePath]);
    return { error: "Não foi possível publicar." };
  }

  revalidatePath("/app", "layout");
  return { ok: true };
}

export async function updateStoryCaption(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase, profile } = await currentProfile();
  const id = String(formData.get("id") ?? "");
  const caption = String(formData.get("caption") ?? "").trim() || null;
  if (!id) return { error: "Story inválido." };
  if (caption && caption.length > 280) return { error: "Legenda muito longa." };

  const { error } = await supabase
    .from("story_posts")
    .update({ caption })
    .eq("id", id)
    .eq("author_id", profile.id);

  if (error) return { error: "Não foi possível salvar." };

  revalidatePath("/app", "layout");
  return { ok: true };
}

export async function deleteStoryPost(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase, profile } = await currentProfile();
  const id = String(formData.get("id") ?? "");
  const imagePath = String(formData.get("image_path") ?? "");
  if (!id) return { error: "Story inválido." };

  const { error } = await supabase
    .from("story_posts")
    .delete()
    .eq("id", id)
    .eq(profile.role === "admin" ? "id" : "author_id", profile.role === "admin" ? id : profile.id);

  if (error) return { error: "Não foi possível excluir." };

  if (imagePath) await supabase.storage.from("stories").remove([imagePath]);

  revalidatePath("/app", "layout");
  return { ok: true };
}
