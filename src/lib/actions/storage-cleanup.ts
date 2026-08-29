"use server";

import { createClient } from "@/lib/supabase/server";

type OrphanRow = { bucket_id: string; name: string };

/**
 * Remove arquivos órfãos (sem registro correspondente) do Storage.
 *
 * O Supabase não deixa apagar arquivo por SQL, então nem o trigger das 9
 * fotos nem a purga de stories conseguem limpar o arquivo — só a linha.
 * Esta varredura fecha essa lacuna pelo lado do app.
 *
 * A RPC já respeita a permissão de quem chama: admin enxerga tudo, os
 * demais só os próprios arquivos. Roda "de carona" depois de postar, então
 * o acervo se limpa sozinho conforme as pessoas usam o app.
 */
export async function sweepOrphanFiles(): Promise<{ removed: number }> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("orphan_storage_paths");
  const orphans = (data ?? []) as OrphanRow[];
  if (orphans.length === 0) return { removed: 0 };

  const byBucket = new Map<string, string[]>();
  for (const o of orphans) {
    byBucket.set(o.bucket_id, [...(byBucket.get(o.bucket_id) ?? []), o.name]);
  }

  let removed = 0;
  for (const [bucket, paths] of byBucket) {
    const { error } = await supabase.storage.from(bucket).remove(paths);
    if (!error) removed += paths.length;
  }
  return { removed };
}
