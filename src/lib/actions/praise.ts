"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Extrai o id do vídeo de um link do YouTube (watch, youtu.be, shorts, embed, music.youtube.com). */
export async function youtubeId(raw: string): Promise<string | null> {
  const text = String(raw ?? "").trim();
  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "").replace(/^m\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = u.pathname.split("/")[1] ?? null;
  else if (host === "youtube.com" || host === "music.youtube.com" || host === "youtube-nocookie.com") {
    if (u.pathname === "/watch") id = u.searchParams.get("v");
    else {
      const m = u.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/?#]+)/);
      id = m?.[1] ?? null;
    }
  }
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}

/** Coloca (ou troca) o louvor do dia da pessoa: só link do YouTube; o título vem do próprio YouTube. */
export async function setDailyPraise(link: string): Promise<{ error?: string }> {
  const id = await youtubeId(link);
  if (!id) return { error: "Cole um link do YouTube (youtube.com ou youtu.be)." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Entre na sua conta." };

  let title = "";
  let channel = "";
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return { error: "Não achei esse vídeo no YouTube. Confira o link." };
    const j = (await res.json()) as { title?: string; author_name?: string };
    title = String(j.title ?? "").slice(0, 140);
    channel = String(j.author_name ?? "").slice(0, 80);
  } catch {
    return { error: "Não consegui consultar o YouTube agora. Tente de novo." };
  }
  if (!title) return { error: "Não achei esse vídeo no YouTube. Confira o link." };

  const { error } = await supabase
    .from("daily_praise")
    .upsert({ user_id: user.id, video_id: id, url: `https://www.youtube.com/watch?v=${id}`, title, channel, created_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) return { error: "Não foi possível salvar. Tente de novo." };
  revalidatePath("/app", "layout");
  return {};
}

/** Tira o louvor do dia (a própria pessoa; o admin pode tirar o de qualquer um). */
export async function removeDailyPraise(userId?: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Entre na sua conta." };
  const { error } = await supabase.from("daily_praise").delete().eq("user_id", userId ?? user.id);
  if (error) return { error: "Não foi possível remover." };
  revalidatePath("/app", "layout");
  return {};
}
