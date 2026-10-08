/** Rejeita se a promessa demorar mais que `ms` (rede lenta ou ação do servidor travada). */
export function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

/** Tempo máximo para o servidor criar a partida. */
export const START_TIMEOUT_MS = 30_000;
