// Contagem de blocos de 5 s assistidos (client-safe e pura). O player chama `step` a cada ~1 s com a posição atual.
// Só conta avanço contínuo (até ~3 s entre duas leituras): pular para frente não marca o trecho pulado.

export const BLOCK_SEC = 5;

export function blocksBetween(prev: number, cur: number): number[] {
  if (cur < prev || cur - prev > 3) return [Math.floor(cur / BLOCK_SEC)]; // pulo ou volta: só o bloco onde está
  const out: number[] = [];
  for (let b = Math.floor(prev / BLOCK_SEC); b <= Math.floor(cur / BLOCK_SEC); b++) out.push(b);
  return out;
}

export class WatchTracker {
  private prev: number | null = null;
  private pending = new Set<number>();

  /** Chamar com a posição (s) enquanto o vídeo está tocando. */
  step(pos: number) {
    for (const b of blocksBetween(this.prev ?? pos, pos)) this.pending.add(b);
    this.prev = pos;
  }
  /** Ao pausar/pular/voltar: a próxima leitura recomeça a contagem. */
  breakRun() {
    this.prev = null;
  }
  take(): number[] {
    const out = [...this.pending].sort((a, b) => a - b);
    this.pending.clear();
    return out;
  }
  /** Se o aviso ao servidor falhou, devolve os blocos para tentar de novo. */
  giveBack(blocks: number[]) {
    for (const b of blocks) this.pending.add(b);
  }
  get size() {
    return this.pending.size;
  }
}
