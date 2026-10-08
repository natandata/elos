// Regras do "Vista o Herói" (client-safe): tempo do camarim e prêmios.

/** Tempo para montar o look no camarim, como a rodada de vestir do Dress to Impress. */
export const DRESS_SECONDS = 240;
/** Folga do servidor para a internet lenta (o relógio da tela é quem manda). */
export const DRESS_GRACE_SECONDS = 45;
/** Bilhetes por publicar o look do dia (mais metade da nota do júri bíblico). */
export const PUBLISH_TICKETS = 5;
export const RUNWAY_PRIZES = [30, 20, 10] as const;
export const MAX_RATING_TICKETS = 5;

export const fmtClock = (s: number): string => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, Math.floor(s) % 60)).padStart(2, "0")}`;
