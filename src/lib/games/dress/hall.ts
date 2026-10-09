// Presença no salão (client-safe): enquanto há espectadoras na sala, cada jogadora manda a própria posição (e o look do momento)
// por um canal de broadcast do Supabase Realtime. Quem assiste desenha as jogadoras andando. É só visual: nada aqui vale ponto.
import type { Look } from "./items";

/** Nome do canal de uma rodada. */
/** Salão de espera do Mega Desfile: um canal só, para quem está esperando. */
export const loungeChannel = (code: string): string => `dress-lounge:${code}`;
export const hallChannel = (code: string, round: number): string => `dress-hall:${code}:${round}`;

/** Mensagem de posição de uma jogadora. */
export type HallMsg = { id: string; name: string; x: number; z: number; fx: 1 | -1; mv: number; y?: number; s?: 0 | 1; look: Look; beauty: unknown; pose: string };

/** Quem aparece no salão (muda só quando o look muda). */
export type HallRoster = { id: string; name: string; look: Look; beauty: unknown };

/** Onde cada jogadora está agora (atualizado direto, sem renderizar a tela). */
export type HallPos = { x: number; z: number; fx: 1 | -1; mv: number; t: number; y?: number; s?: 0 | 1 };

/** Mensagem do chat do salão. */
export type ChatMsg = { id: string; name: string; text: string };

const BAD = /\b(porra|caralho|merda|bosta|puta|viado|buceta|cu|foda|fdp|pqp|vsf|vtnc)\b/gi;
/** Texto do chat: tira espaços sobrando, limita o tamanho e esconde palavrão. */
export const cleanChat = (raw: string): string => raw.replace(/\s+/g, " ").trim().slice(0, 120).replace(BAD, (m) => "*".repeat(m.length));
