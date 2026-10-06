/** Liberação de jogos por data (Brasília, UTC-3 o ano todo). Client-safe: a checagem de verdade é sempre no servidor. */

export const GAME_RELEASES = {
  /** Vista o Herói (Dress to Impress bíblico): abre à 00:00 de 09/10/2026. */
  dress: "2026-10-09T00:00:00-03:00",
  /** MineArena (sandbox voxel 3D): abre à 00:00 de 01/11/2026. */
  minearena: "2026-11-01T00:00:00-03:00",
} as const;

export type ReleasedGame = keyof typeof GAME_RELEASES;

export const releaseAt = (game: ReleasedGame): number => new Date(GAME_RELEASES[game]).getTime();

/** Contas de teste passam antes da data (pra testar sem expor o jogo). */
export function isReleased(game: ReleasedGame, isTestAccount = false, now = Date.now()): boolean {
  return isTestAccount || now >= releaseAt(game);
}

export const msUntilRelease = (game: ReleasedGame, now = Date.now()): number => Math.max(0, releaseAt(game) - now);
