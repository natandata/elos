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

function revalidateFeed() {
  revalidatePath("/app/feed");
}

/** O upload da imagem já aconteceu no navegador; aqui só registra o post. */
export async function createFeedPost(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase, profile } = await currentProfile();
  if (profile.role === "admin") return { error: "Admin não posta no feed, só modera." };

  const imagePath = String(formData.get("image_path") ?? "").trim();
  const caption = String(formData.get("caption") ?? "").trim() || null;
  if (!imagePath) return { error: "Envie uma foto." };

  const { error } = await supabase
    .from("feed_posts")
    .insert({ author_id: profile.id, image_path: imagePath, caption });

  if (error) return { error: "Não foi possível publicar." };

  revalidateFeed();
  return { ok: true };
}

export async function deleteFeedPost(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase } = await currentProfile();
  const id = String(formData.get("id") ?? "");
  const imagePath = String(formData.get("image_path") ?? "");
  if (!id) return { error: "Post inválido." };

  const { error } = await supabase.from("feed_posts").delete().eq("id", id);
  if (error) return { error: "Não foi possível excluir." };

  if (imagePath) await supabase.storage.from("feed").remove([imagePath]);

  revalidateFeed();
  return { ok: true };
}

/** Curtir/descurtir num único botão: insere se não curtiu, remove se já curtiu. */
export async function toggleFeedLike(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase, profile } = await currentProfile();
  if (profile.role === "admin") return { error: "Admin não interage no feed." };

  const postId = String(formData.get("post_id") ?? "");
  if (!postId) return { error: "Post inválido." };

  const { data: existing } = await supabase
    .from("feed_likes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", profile.id)
    .maybeSingle();

  if (existing) {
    await supabase.from("feed_likes").delete().eq("post_id", postId).eq("user_id", profile.id);
  } else {
    const { error } = await supabase
      .from("feed_likes")
      .insert({ post_id: postId, user_id: profile.id });
    if (error) return { error: "Não foi possível curtir." };
  }

  revalidateFeed();
  return { ok: true };
}

export async function addFeedComment(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase, profile } = await currentProfile();
  if (profile.role === "admin") return { error: "Admin não comenta no feed." };

  const postId = String(formData.get("post_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!postId) return { error: "Post inválido." };
  if (!body) return { error: "Escreva um comentário." };
  if (body.length > 500) return { error: "Comentário muito longo." };

  const { error } = await supabase
    .from("feed_comments")
    .insert({ post_id: postId, author_id: profile.id, body });

  if (error) return { error: "Não foi possível comentar." };

  revalidateFeed();
  return { ok: true };
}

export async function deleteFeedComment(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase } = await currentProfile();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Comentário inválido." };

  const { error } = await supabase.from("feed_comments").delete().eq("id", id);
  if (error) return { error: "Não foi possível excluir o comentário." };

  revalidateFeed();
  return { ok: true };
}
