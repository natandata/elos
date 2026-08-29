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

  if (error) return { error: "Não foi possível publicar." };

  revalidatePath("/app", "layout");
  return { ok: true };
}
