"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendPushToUsers } from "@/lib/push-server";
import { mentionIds, plainMentions } from "@/lib/mentions";
import { MAX_MENTIONS_POST, notifyElogramMentions } from "@/lib/mentionNotify";

type Result = { error?: string; ok?: boolean; /** Tema em dupla: "waiting" = falta a dupla postar; "awarded" = XP dado. */ pair?: string };

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

/** Confere o tamanho do que a pessoa vê (a marcação @[Nome](id) guarda mais caracteres) e quantas pessoas foram marcadas. */
function checkTextAndMentions(text: string, maxVisible: number): string | null {
  if (plainMentions(text).length > maxVisible) return "Texto muito longo.";
  if (mentionIds(text).length > MAX_MENTIONS_POST) return `Marque até ${MAX_MENTIONS_POST} pessoas.`;
  return null;
}

async function senderName(supabase: Awaited<ReturnType<typeof createClient>>, id: string): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("full_name, username")
    .eq("id", id)
    .maybeSingle<{ full_name: string; username: string | null }>();
  return data?.username || data?.full_name || "Alguém";
}

function revalidateFeed() {
  revalidatePath("/app/elogram");
}

/** O upload da imagem já aconteceu no navegador; aqui só registra o post. */
export async function createFeedPost(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase, profile } = await currentProfile();
  if (profile.role === "admin") return { error: "Admin não posta no feed, só modera." };

  const imagePath = String(formData.get("image_path") ?? "").trim();
  const caption = String(formData.get("caption") ?? "").trim() || null;
  const themeConfirmed = formData.get("theme_confirmed") === "true";
  if (!imagePath) return { error: "Envie uma foto." };
  if (caption) {
    const bad = checkTextAndMentions(caption, 280);
    if (bad) return { error: bad === "Texto muito longo." ? "Legenda muito longa." : bad };
  }

  // carrossel: até 9 fotos extras depois da capa — todas precisam estar na pasta de quem posta
  let extraPaths: string[] = [];
  try {
    const raw = JSON.parse(String(formData.get("extra_paths") ?? "[]"));
    if (Array.isArray(raw)) extraPaths = raw.map((p) => String(p));
  } catch {
    extraPaths = [];
  }
  const own = (p: string) => p.startsWith(`${profile.id}/`) && !p.includes("..");
  extraPaths = Array.from(new Set(extraPaths)).filter((p) => p !== imagePath);
  if (!own(imagePath) || extraPaths.some((p) => !own(p))) return { error: "Foto inválida." };
  if (extraPaths.length > 9) return { error: "Um carrossel tem até 10 fotos." };

  const { data: post, error } = await supabase
    .from("feed_posts")
    .insert({
      author_id: profile.id,
      image_path: imagePath,
      extra_image_paths: extraPaths,
      caption,
      theme_confirmed: themeConfirmed,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !post) {
    // os arquivos já subiram: sem registro eles viraram lixo invisível no Storage
    await supabase.storage.from("feed").remove([imagePath, ...extraPaths]);
    return { error: "Não foi possível publicar." };
  }

  // XP do tema entra já na resposta (não em `after`): é o que acende o
  // "+1 XP" na tela pra quem confirmou — não pode depender de um passo que
  // roda só depois que a tela já respondeu.
  let themeStatus: string | undefined;
  if (themeConfirmed) {
    try {
      const { data: status } = await supabase.rpc("award_feed_theme_xp", { p_post_id: post.id });
      themeStatus = typeof status === "string" ? status : undefined;
    } catch (err) {
      console.error("award_feed_theme_xp falhou (post já publicado):", err);
    }
  }

  revalidateFeed();

  // Conquistas, ofensiva e push saem do caminho da resposta: com ~60 pessoas,
  // esperar por dezenas de envios de push deixaria "Publicar" travado por
  // segundos. `after` roda isso depois que a tela já respondeu.
  after(async () => {
    if (caption && mentionIds(caption).length > 0) {
      try {
        await notifyElogramMentions({
          text: caption,
          senderId: profile.id,
          senderName: await senderName(supabase, profile.id),
          postId: post.id,
          inComment: false,
        });
      } catch (err) {
        console.error("aviso de marcação falhou (post já publicado):", err);
      }
    }
    // record_feed_streak() já chama check_and_grant_achievements por dentro
    // — numa tentativa própria: se ela falhar (ex.: rede), o post em si já
    // foi publicado acima, e o envio de push abaixo não pode ficar refém disso.
    try {
      await supabase.rpc("record_feed_streak");
    } catch (err) {
      console.error("record_feed_streak falhou (post já publicado):", err);
    }
    const { data: targets } = await supabase.rpc("feed_push_targets", { p_exclude: profile.id });
    await sendPushToUsers(
      ((targets ?? []) as { id: string }[]).map((t) => t.id),
      { title: "Novo post no Elogram", body: "Alguém acabou de postar uma foto.", url: "/app/elogram" },
    );
  });

  return { ok: true, pair: themeStatus };
}

export async function updateFeedCaption(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase, profile } = await currentProfile();
  const id = String(formData.get("id") ?? "");
  const caption = String(formData.get("caption") ?? "").trim() || null;
  if (!id) return { error: "Post inválido." };
  if (caption) {
    const bad = checkTextAndMentions(caption, 280);
    if (bad) return { error: bad === "Texto muito longo." ? "Legenda muito longa." : bad };
  }

  // quem já foi marcado antes não é avisado de novo
  const { data: before } = await supabase
    .from("feed_posts")
    .select("caption")
    .eq("id", id)
    .eq("author_id", profile.id)
    .maybeSingle<{ caption: string | null }>();

  const { error } = await supabase
    .from("feed_posts")
    .update({ caption })
    .eq("id", id)
    .eq("author_id", profile.id);

  if (error) return { error: "Não foi possível salvar." };

  if (caption && mentionIds(caption).length > 0) {
    const already = mentionIds(before?.caption ?? "");
    after(async () => {
      try {
        await notifyElogramMentions({
          text: caption,
          senderId: profile.id,
          senderName: await senderName(supabase, profile.id),
          postId: id,
          inComment: false,
          skip: already,
        });
      } catch (err) {
        console.error("aviso de marcação falhou:", err);
      }
    });
  }

  revalidateFeed();
  return { ok: true };
}

export async function deleteFeedPost(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase } = await currentProfile();
  const id = String(formData.get("id") ?? "");
  const imagePath = String(formData.get("image_path") ?? "");
  if (!id) return { error: "Post inválido." };

  // os arquivos a apagar vêm do próprio post (não do que o navegador mandou), inclusive as fotos do carrossel
  const { data: row } = await supabase
    .from("feed_posts")
    .select("image_path, extra_image_paths")
    .eq("id", id)
    .maybeSingle<{ image_path: string; extra_image_paths: string[] | null }>();

  const { error } = await supabase.from("feed_posts").delete().eq("id", id);
  if (error) return { error: "Não foi possível excluir." };

  const files = row ? [row.image_path, ...(row.extra_image_paths ?? [])] : imagePath ? [imagePath] : [];
  if (files.length > 0) await supabase.storage.from("feed").remove(files);

  revalidateFeed();
  return { ok: true };
}

const REACTION_KINDS = ["like", "laugh", "pray", "fire", "clap"];
const REACTION_EMOJI: Record<string, string> = { like: "❤️", laugh: "😂", pray: "🙏", fire: "🔥", clap: "👏" };

/**
 * Reação rápida (❤️😂🙏🔥👏): clicar na mesma reação remove; clicar numa
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
    const { error } = await supabase.from("feed_likes").update({ kind }).eq("post_id", postId).eq("user_id", profile.id);
    if (error) return { error: "Não foi possível trocar a reação. Tente de novo." };
  } else {
    const { error } = await supabase
      .from("feed_likes")
      .insert({ post_id: postId, user_id: profile.id, kind });
    if (error) {
      // 23503 = a foto já expirou (24h) e foi apagada enquanto a tela estava aberta
      return { error: error.code === "23503" ? "Essa foto já saiu do ar. Atualize a página." : "Não foi possível reagir. Tente de novo." };
    }
    // aviso e push saem depois da resposta: a reação aparece na hora, sem esperar o envio
    after(async () => {
      try {
        const { data: authorId } = await supabase.rpc("notify_feed_interaction", { p_post_id: postId, p_kind: "like" });
        if (authorId) {
          await sendPushToUsers([authorId as string], {
            title: "Reagiram na sua foto",
            body: `${REACTION_EMOJI[kind] ?? "❤️"} Alguém reagiu à sua foto no Elogram.`,
            url: "/app/elogram",
          });
        }
      } catch {
        // aviso é secundário
      }
    });
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
  if (plainMentions(body).length > 500) return { error: "Comentário muito longo." };
  if (mentionIds(body).length > MAX_MENTIONS_POST) return { error: `Marque até ${MAX_MENTIONS_POST} pessoas.` };

  const { error } = await supabase
    .from("feed_comments")
    .insert({ post_id: postId, author_id: profile.id, body });

  if (error) return { error: "Não foi possível comentar." };
  const { data: authorId } = await supabase.rpc("notify_feed_interaction", {
    p_post_id: postId,
    p_kind: "comment",
  });
  if (mentionIds(body).length > 0) {
    after(async () => {
      try {
        await notifyElogramMentions({
          text: body,
          senderId: profile.id,
          senderName: await senderName(supabase, profile.id),
          postId,
          inComment: true,
        });
      } catch (err) {
        console.error("aviso de marcação falhou:", err);
      }
    });
  }
  if (authorId) {
    const plain = plainMentions(body);
    await sendPushToUsers([authorId as string], {
      title: "Comentaram na sua foto",
      body: plain.length > 80 ? `${plain.slice(0, 80)}…` : plain,
      url: "/app/elogram",
    });
  }

  revalidateFeed();
  return { ok: true };
}

/** Admin revoga o XP do tema quando o post não é coerente com o tema do dia. */
export async function revokeFeedThemeXp(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase, profile } = await currentProfile();
  if (profile.role !== "admin") return { error: "Só o admin revoga XP do tema." };

  const postId = String(formData.get("post_id") ?? "");
  if (!postId) return { error: "Post inválido." };

  const { data: post } = await supabase
    .from("feed_posts")
    .select("author_id")
    .eq("id", postId)
    .maybeSingle<{ author_id: string }>();

  const { error } = await supabase.rpc("revoke_feed_theme_xp", { p_post_id: postId });
  if (error) return { error: "Não foi possível revogar o XP." };

  if (post?.author_id) {
    await sendPushToUsers([post.author_id], {
      title: "XP do tema revogado",
      body: "Uma das suas fotos no Elogram não pareceu coerente com o tema do dia.",
      url: "/app/elogram",
    });
  }

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
