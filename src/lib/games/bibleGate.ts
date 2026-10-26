import type { SupabaseClient } from "@supabase/supabase-js";

// Sala de Jogos travada para o cria até cumprir o desbloqueio do dia (dia de Brasília: vira à meia-noite). Os dois desbloqueios se alternam:
//  - dia de leitura: ler a Bíblia por 5 minutos (tempo contado no banco, função record_bible_reading, migração 0216);
//  - dia de vídeo: assistir um "conteúdo relevante" inteiro no player do app (progresso em video_watch, migração 0238).
// Quem sair para o YouTube sem concluir (em dia de vídeo) fica trancado até concluir o vídeo no app. Só vale para crias.

export const BIBLE_GATE_SECONDS = 300;

/** Data de hoje em Brasília (AAAA-MM-DD), a mesma usada no banco. */
export const todayBR = (): string => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

/** Tipo do desbloqueio do dia: dias pares (desde 01/01/2026) = ler a Bíblia; ímpares = assistir um conteúdo inteiro. Igual ao banco (gate_kind). */
export function gateKindFor(ymd: string): "reading" | "video" {
  const days = Math.round((Date.parse(ymd + "T12:00:00Z") - Date.parse("2026-01-01T12:00:00Z")) / 86_400_000);
  return days % 2 === 0 ? "reading" : "video";
}

/** reading/video: o que libera a Sala hoje; penalty: foi ao YouTube sem terminar e precisa concluir `penaltyVideo` no player do app. */
export type BibleGate = { locked: boolean; seconds: number; kind: "reading" | "video" | "penalty"; penaltyVideo?: string };

/** Leitura de hoje (segundos e se já completou os 5 min), para cria e líder. */
export async function readingToday(supabase: SupabaseClient, userId: string): Promise<{ seconds: number; done: boolean }> {
  const { data } = await supabase.from("bible_reading_daily").select("seconds, unlocked_at").eq("user_id", userId).eq("day", todayBR()).maybeSingle<{ seconds: number; unlocked_at: string | null }>();
  return { seconds: Math.min(BIBLE_GATE_SECONDS, data?.seconds ?? 0), done: !!data?.unlocked_at };
}

/** Situação da trava da Sala de Jogos (só vale para crias). */
export async function bibleGateFor(supabase: SupabaseClient, profile: { id: string; role: string }): Promise<BibleGate> {
  if (profile.role !== "cria") return { locked: false, seconds: BIBLE_GATE_SECONDS, kind: "reading" };
  const today = todayBR();
  const { data: pen } = await supabase.from("video_watch").select("video_id").eq("user_id", profile.id).eq("penalty", true).limit(1).maybeSingle<{ video_id: string }>();
  if (pen) return { locked: true, seconds: 0, kind: "penalty", penaltyVideo: pen.video_id };
  if (gateKindFor(today) === "video") {
    const { data: done } = await supabase.from("video_watch").select("video_id").eq("user_id", profile.id).eq("completed_on", today).limit(1).maybeSingle();
    return { locked: !done, seconds: 0, kind: "video" };
  }
  const r = await readingToday(supabase, profile.id);
  return { locked: !r.done, seconds: r.seconds, kind: "reading" };
}
