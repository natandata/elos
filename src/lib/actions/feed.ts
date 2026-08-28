"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendPushToUsers } from "@/lib/push-server";

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
  await supabase.rpc("check_and_grant_achievements", { p_user: profile.id });

  const { data: targets } = await supabase.rpc("feed_push_targets", { p_exclude: profile.id });
  await sendPushToUsers(
    ((targets ?? []) as { id: string }[]).map((t) => t.id),
    { title: "Novo post no Feed", body: "Alguém postou uma foto agora — some em 24h.", url: "/app/feed" },
  );

  return { ok: true };
}

export async function updateFeedCaption(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase, profile } = await currentProfile();
  const id = String(formData.get("id") ?? "");
  const caption = String(formData.get("caption") ?? "").trim() || null;
  if (!id) return { error: "Post inválido." };
  if (caption && caption.length > 280) return { error: "Legenda muito longa." };

  const { error } = await supabase
    .from("feed_posts")
    .update({ caption })
    .eq("id", id)
    .eq("author_id", profile.id);

  if (error) return { error: "Não foi possível salvar." };

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

const REACTION_KINDS = ["like", "pray", "fire", "clap"];

/**
 * Reação rápida (👍🙏🔥👏): clicar na mesma reação remove; clicar numa
 * diferente troca; se não tinha nenhuma, cria. Substituiu o antigo "curtir"
 * único — mais fácil de interagir sem precisar digitar um comentário.
 */
export async function toggleFeedLike(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase, profile } = await currentProfile();
  if (profile.role === "admin") return { error: "Admin não interage no feed." };

  const postId = String(formData.get("post_id") ?? "");
  const kind = String(formData.get("kind") ?? "like");
  if (!postId) return { error: "Post inválido." };
  if (!REACTION_KINDS.includes(kind)) return { error: "Reação inválida." };

  const { data: existing } = await supabase
    .from("feed_likes")
    .select("kind")
    .eq("post_id", postId)
    .eq("user_id", profile.id)
    .maybeSingle();

  if (existing?.kind === kind) {
    await supabase.from("feed_likes").delete().eq("post_id", postId).eq("user_id", profile.id);
  } else if (existing) {
    await supabase
      .from("feed_likes")
      .update({ kind })
      .eq("post_id", postId)
      .eq("user_id", profile.id);
  } else {
    const { error } = await supabase
      .from("feed_likes")
      .insert({ post_id: postId, user_id: profile.id, kind });
    if (error) return { error: "Não foi possível reagir." };
    await supabase.rpc("notify_feed_interaction", { p_post_id: postId, p_kind: "like" });
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
  await supabase.rpc("notify_feed_interaction", { p_post_id: postId, p_kind: "comment" });

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
