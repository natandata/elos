// Presença no salão (client-safe): enquanto há espectadoras na sala, cada jogadora manda a própria posição (e o look do momento)
// por um canal de broadcast do Supabase Realtime. Quem assiste desenha as jogadoras andando. É só visual: nada aqui vale ponto.
import type { Look } from "./items";

/** Nome do canal de uma rodada. */
export const hallChannel = (code: string, round: number): string => `dress-hall:${code}:${round}`;

/** Mensagem de posição de uma jogadora. */
export type HallMsg = { id: string; name: string; x: number; z: number; fx: 1 | -1; mv: number; look: Look; beauty: unknown; pose: string };

/** Quem aparece no salão (muda só quando o look muda). */
export type HallRoster = { id: string; name: string; look: Look; beauty: unknown };

/** Onde cada jogadora está agora (atualizado direto, sem renderizar a tela). */
export type HallPos = { x: number; z: number; fx: 1 | -1; mv: number; t: number };
