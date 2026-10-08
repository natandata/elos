// Relógio do camarim (servidor): quanto tempo ainda resta pra montar o look.
import "server-only";
import { DRESS_GRACE_SECONDS, DRESS_SECONDS } from "./rules";

/** Milissegundos que faltam (0 se acabou mas ainda cabe enviar), ou null se o tempo e a folga já passaram. */
export function camarimMsLeft(startedAt: string): number | null {
  const left = DRESS_SECONDS * 1000 - (Date.now() - new Date(startedAt).getTime());
  return left <= -DRESS_GRACE_SECONDS * 1000 ? null : Math.max(0, left);
}
