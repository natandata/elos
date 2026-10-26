"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { logGameActivity } from "@/lib/games/activity";
import { gateKindFor, todayBR } from "@/lib/games/bibleGate";
import { VIDEO_SOURCE_LABEL, type VideoSource } from "@/lib/home/videos";
import { createClient } from "@/lib/supabase/server";

// Progresso de vídeo do "Conteúdo relevante" no player do app. Quem confere e guarda é o banco (migração 0238).

const ID = /^[A-Za-z0-9_-]{11}$/;

export type VideoProgress = {
  pct: number;
  lastPos: number;
  duration: number;
  completedToday: boolean;
  /** hoje o desbloqueio da Sala é por vídeo (ou há pendência por ter ido ao YouTube) */
  gateDay: boolean;
};
export type VideoPingResult = { pct: number; lastPos: number; done: boolean; completedToday: boolean; gapSec: number | null; duration: number } | null;

export async function videoProgress(videoId: string): Promise<VideoProgress> {
  const empty: VideoProgress = { pct: 0, lastPos: 0, duration: 0, completedToday: false, gateDay: gateKindFor(todayBR()) === "video" };
  if (!ID.test(videoId)) return empty;
  const { profile } = await requireProfile();
  const supabase = await createClient();
  const { data } = await supabase
    .from("video_watch")
    .select("duration, covered, last_pos, completed_on, penalty")
    .eq("user_id", profile.id)
    .eq("video_id", videoId)
    .maybeSingle<{ duration: number; covered: number[]; last_pos: number; completed_on: string | null; penalty: boolean }>();
  if (!data) return empty;
  const total = Math.max(1, Math.ceil(data.duration / 5));
  return {
    pct: Math.min(100, Math.round((data.covered.length / total) * 100)),
    lastPos: data.last_pos,
    duration: data.duration,
    completedToday: data.completed_on === todayBR(),
    gateDay: empty.gateDay || data.penalty,
  };
}

/** Aviso periódico do player: blocos de 5 s vistos desde o último aviso. */
export async function videoPing(videoId: string, pos: number, duration: number, blocks: number[], ended: boolean): Promise<VideoPingResult> {
  if (!ID.test(videoId)) return null;
  const { profile, viewingAs } = await requireProfile();
  if (viewingAs) return null; // admin "vendo como" um cria não assiste no lugar dele
  const supabase = await createClient();
  const clean = [...new Set(blocks.map((b) => Math.floor(Number(b))).filter((b) => Number.isFinite(b) && b >= 0 && b < 3000))].slice(0, 40);
  const { data, error } = await supabase.rpc("video_watch_ping", { p_video: videoId, p_pos: Math.floor(pos) || 0, p_dur: Math.floor(duration) || 0, p_blocks: clean, p_ended: ended });
  if (error || !data) return null;
  const r = data as { pct: number; last_pos: number; done: boolean; completed_today: boolean | null; gap_sec: number | null; duration: number };
  if (r.done) {
    const { data: pick } = await supabase.from("home_video_picks").select("source, title").eq("video_id", videoId).maybeSingle<{ source: VideoSource; title: string }>();
    await logGameActivity(profile.id, "conteudo", "watch", `Assistiu inteiro · ${pick ? `${VIDEO_SOURCE_LABEL[pick.source] ?? pick.source} · ${pick.title}` : videoId}`, 600);
    revalidatePath("/app/jogos"); // a Sala é pré-carregada: limpa a cópia "travada"
  }
  return { pct: r.pct, lastPos: r.last_pos, done: r.done, completedToday: !!r.completed_today, gapSec: r.gap_sec, duration: r.duration };
}

/** "Voltar do início". */
export async function videoReset(videoId: string): Promise<void> {
  if (!ID.test(videoId)) return;
  const { viewingAs } = await requireProfile();
  if (viewingAs) return;
  await (await createClient()).rpc("video_watch_reset", { p_video: videoId });
}

/** Foi assistir no YouTube: em dia de vídeo (e sem ter concluído) a Sala fica trancada até concluir no player do app. */
export async function videoExternal(videoId: string): Promise<{ penalty: boolean }> {
  if (!ID.test(videoId)) return { penalty: false };
  const { profile, viewingAs } = await requireProfile();
  if (viewingAs || profile.role !== "cria") return { penalty: false };
  const supabase = await createClient();
  const { data } = await supabase.rpc("video_watch_external", { p_video: videoId });
  const penalty = !!(data as { penalty?: boolean } | null)?.penalty;
  if (penalty) {
    await logGameActivity(profile.id, "conteudo", "external", `Foi ao YouTube sem concluir (${videoId}): Sala de Jogos trancada até concluir no app`, 600);
    revalidatePath("/app/jogos");
  }
  return { penalty };
}
