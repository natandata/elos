"use server";

import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type ReadingPing = { seconds: number; required: number; unlocked: boolean; xp: number } | null;

/**
 * A tela da Bíblia chama a cada ~15 s enquanto a pessoa está lendo; quem conta o tempo é o banco.
 * `resume`: "acabei de voltar" (entrou na Bíblia ou a aba voltou): só marca o instante, sem creditar o tempo em que esteve fora.
 */
export async function pingBibleReading(resume = false): Promise<ReadingPing> {
  const { viewingAs } = await requireProfile();
  if (viewingAs) return null; // admin "vendo como" um cria não conta leitura no lugar dele
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("record_bible_reading", { p_resume: resume });
  if (error || !data) return null;
  return data as { seconds: number; required: number; unlocked: boolean; xp: number };
}
