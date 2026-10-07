import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Registra uma atividade de jogo para o painel do admin ("Atividade recente").
 * Vale para QUALQUER jogo (use a chave do jogo em `GAME_CATALOG`), inclusive os que guardam tudo no aparelho.
 * Jogos novos já entram sozinhos: `guardGame` (chamado no layout de todo jogo) registra quando alguém abre o jogo.
 * Para eventos com mais detalhe (fase concluída, partida terminada…), chame esta função ou a action `logMyGameActivity`.
 * `dedupeMin` ignora o mesmo registro repetido dentro desse tempo.
 */
export async function logGameActivity(userId: string, game: string, action: string, detail: string, dedupeMin = 0): Promise<void> {
  try {
    const admin = createAdminClient();
    if (!admin) return;
    await admin.rpc("log_game_activity", { p_user: userId, p_game: game, p_action: action, p_detail: detail, p_dedupe_min: dedupeMin });
  } catch {
    // o registro é secundário: nunca atrapalha o jogo
  }
}
