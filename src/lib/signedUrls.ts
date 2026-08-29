import type { SupabaseClient } from "@supabase/supabase-js";

/** Janela de estabilidade da URL: 6h. */
const WINDOW_SECONDS = 6 * 60 * 60;

/**
 * URLs assinadas ESTÁVEIS dentro de uma janela de 6h.
 *
 * `createSignedUrl(path, 3600)` gera um token com validade relativa a
 * "agora", ou seja, uma URL diferente a cada renderização. Como o navegador
 * guarda imagem em cache pela URL, cada visita à tela rebaixava todas as
 * fotos de novo — foi o que estourou a cota de tráfego.
 *
 * Aqui o vencimento é ancorado num múltiplo fixo de 6h, então todo mundo que
 * abrir a tela dentro da mesma janela recebe exatamente a mesma URL, e a
 * segunda visita vem do cache do navegador (tráfego zero).
 */
export async function stableSignedUrls(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  bucket: string,
  paths: string[],
): Promise<Map<string, string | null>> {
  const result = new Map<string, string | null>();
  if (paths.length === 0) return result;

  const nowSec = Math.floor(Date.now() / 1000);
  // fim da janela atual + uma janela de folga (a foto não expira no meio do uso)
  const windowEnd = (Math.floor(nowSec / WINDOW_SECONDS) + 2) * WINDOW_SECONDS;
  const expiresIn = windowEnd - nowSec;

  const { data } = await supabase.storage.from(bucket).createSignedUrls(paths, expiresIn);
  for (const row of data ?? []) {
    if (row.path) result.set(row.path, row.signedUrl ?? null);
  }
  for (const p of paths) if (!result.has(p)) result.set(p, null);
  return result;
}
