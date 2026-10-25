"use server";

import { logGameActivity } from "@/lib/games/activity";
import { VIDEO_SOURCE_LABEL, type VideoSource } from "@/lib/home/videos";
import { createClient } from "@/lib/supabase/server";

/** Registra o toque num vídeo do card "Conteúdo relevante para a sua vida" para o painel do admin ("Atividade recente"). */
export async function logContentClick(videoId: string): Promise<void> {
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { data } = await supabase.from("home_video_picks").select("source, title").eq("video_id", videoId).maybeSingle<{ source: VideoSource; title: string }>();
  if (!data) return;
  await supabase.rpc("home_video_play", { p_video: videoId });
  await logGameActivity(user.id, "conteudo", "click", `${VIDEO_SOURCE_LABEL[data.source] ?? data.source} · ${data.title}`, 60);
}
