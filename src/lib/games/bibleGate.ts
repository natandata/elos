import type { SupabaseClient } from "@supabase/supabase-js";

// Sala de Jogos travada até o cria ler a Bíblia por 5 minutos no dia (dia de Brasília: vira à meia-noite).
// O tempo é contado no banco (função record_bible_reading, migração 0216). Só vale para crias.

export const BIBLE_GATE_SECONDS = 300;

/** Data de hoje em Brasília (AAAA-MM-DD), a mesma usada no banco. */
export const todayBR = (): string => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

export type BibleGate = { locked: boolean; seconds: number };

/** Leitura de hoje (segundos e se já completou os 5 min), para cria e líder. */
export async function readingToday(supabase: SupabaseClient, userId: string): Promise<{ seconds: number; done: boolean }> {
  const { data } = await supabase.from("bible_reading_daily").select("seconds, unlocked_at").eq("user_id", userId).eq("day", todayBR()).maybeSingle<{ seconds: number; unlocked_at: string | null }>();
  return { seconds: Math.min(BIBLE_GATE_SECONDS, data?.seconds ?? 0), done: !!data?.unlocked_at };
}

export async function bibleGateFor(supabase: SupabaseClient, profile: { id: string; role: string }): Promise<BibleGate> {
  if (profile.role !== "cria") return { locked: false, seconds: BIBLE_GATE_SECONDS };
  const today = await readingToday(supabase, profile.id);
  return { locked: !today.done, seconds: today.seconds };
}
