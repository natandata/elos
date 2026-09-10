/**
 * `redirect()`/`notFound()` do Next.js funcionam jogando uma exceção especial
 * (identificável pelo `.digest`) que o framework intercepta lá em cima, fora
 * do nosso código. Se uma action envolve a chamada inteira num try/catch pra
 * pegar falha de rede, esse catch também pegaria essa exceção "de propósito"
 * e quebraria o redirecionamento (a página trava em vez de navegar).
 *
 * Checa o prefixo do digest (mesma técnica que `next/dist/.../isRedirectError`
 * usa por baixo) em vez de importar de um caminho interno do Next — evita
 * depender de um caminho não público que pode mudar entre versões.
 */
export function isFrameworkFlowError(err: unknown): boolean {
  const digest = (err as { digest?: unknown } | null)?.digest;
  if (typeof digest !== "string") return false;
  return digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_HTTP_ERROR_FALLBACK");
}

/** Mensagem padrão quando a action falha por algo que não é um erro do
 *  Supabase (rede caiu, timeout, etc.) — sem isso a pessoa via a tela ficar
 *  quieta sem saber se salvou ou não. */
export const NETWORK_ERROR_MESSAGE =
  "Não foi possível conectar ao servidor. Verifique sua internet e tente de novo.";
