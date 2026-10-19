"use server";

import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type ReadingPing = { seconds: number; required: number; unlocked: boolean } | null;

/** A tela da Bíblia chama a cada ~15 s enquanto a pessoa está lendo; quem conta o tempo é o banco. */
export async function pingBibleReading(): Promise<ReadingPing> {
  const { viewingAs } = await requireProfile();
  if (viewingAs) return null; // admin "vendo como" um cria não conta leitura no lugar dele
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("record_bible_reading");
  if (error || !data) return null;
  return data as { seconds: number; required: number; unlocked: boolean };
}
