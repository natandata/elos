/** Liberação de jogos por data (Brasília, UTC-3 o ano todo). Client-safe: a checagem de verdade é sempre no servidor. */

export const GAME_RELEASES = {
  /** Vista o Herói (Dress to Impress bíblico): abre à 00:00 de 09/10/2026. */
  dress: "2026-10-09T00:00:00-03:00",
  /** MineArena (sandbox voxel 3D): abre à 00:00 de 01/11/2026. */
  minearena: "2026-11-01T00:00:00-03:00",
  /** Bible Rush (gerenciamento de tempo bíblico): abre à 00:00 de 01/11/2026. */
  biblerush: "2026-11-01T00:00:00-03:00",
  /** ArenaSoccer (futebol arcade 2D): à venda na Loja a partir de 00:00 de 01/11/2026. */
  arenasoccer: "2026-11-01T00:00:00-03:00",
  /** Campanha da Arena dos Heróis: só abre quando o admin liberar (sem data; acesso antecipado por pessoa ou "visível" para todos). */
  arenacampanha: "2099-01-01T00:00:00-03:00",
} as const;

/** Antes da data, aparece um cartão "em breve" para os jogadores? O Bible Rush fica invisível até abrir. */
export const GAME_TEASER: Record<keyof typeof GAME_RELEASES, boolean> = { dress: true, minearena: true, biblerush: false, arenasoccer: false, arenacampanha: false };

export type ReleasedGame = keyof typeof GAME_RELEASES;

/** Datas de abertura de cada jogo (as do código, ou as que o admin ajustou). */
export type ReleaseDates = Record<ReleasedGame, string>;

/** Sem data (o admin é quem abre): usado pela Campanha da Arena. */
export const NO_DATE_YEAR = 2090;
export const hasDate = (iso: string): boolean => new Date(iso).getFullYear() < NO_DATE_YEAR;

export const releaseAt = (game: ReleasedGame, dates: ReleaseDates = GAME_RELEASES): number => new Date(dates[game]).getTime();

/** Contas de teste passam antes da data (pra testar sem expor o jogo). */
export function isReleased(game: ReleasedGame, isTestAccount = false, now = Date.now(), dates: ReleaseDates = GAME_RELEASES): boolean {
  return isTestAccount || now >= releaseAt(game, dates);
}

export const msUntilRelease = (game: ReleasedGame, now = Date.now(), dates: ReleaseDates = GAME_RELEASES): number => Math.max(0, releaseAt(game, dates) - now);

/** Já abriu agora (com as datas em vigor)? Esconde o relógio para poder usar em páginas do servidor. */
export const releasedNow = (game: ReleasedGame, dates: ReleaseDates = GAME_RELEASES, isTestAccount = false): boolean => isReleased(game, isTestAccount, Date.now(), dates);
