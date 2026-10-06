import type { PatienceState } from "../core/types";

/** 100–70% feliz, 69–40% esperando, 39–15% impaciente, abaixo disso o animal vai embora. */
export function patienceState(p: number): PatienceState {
  if (p >= 0.7) return "happy";
  if (p >= 0.4) return "waiting";
  if (p >= 0.15) return "impatient";
  return "gone";
}

export const PATIENCE_FACE: Record<PatienceState, string> = { happy: "😊", waiting: "😐", impatient: "😠", gone: "😱" };
export const PATIENCE_LABEL: Record<PatienceState, string> = { happy: "Feliz", waiting: "Esperando", impatient: "Impaciente", gone: "Vai embora!" };

export type DrainMods = { storm: boolean; restless: boolean };

/** Fração de paciência perdida por segundo. */
export function drainPerSecond(patienceSeconds: number, m: DrainMods): number {
  return (1 / patienceSeconds) * (m.storm ? 1.45 : 1) * (m.restless ? 2.1 : 1);
}
