import type { Arrival, Generator, SpeciesId } from "../core/types";

/** Controla quem chega e quando: lista fixa da fase ou gerador com ritmo crescente (modo desafio). */
export class CustomerManager {
  private idx = 0;
  /** chegaram, mas esperam vaga na fila (a paciência só corre depois que sentam) */
  waiting: Arrival[] = [];
  private nextGen: number;
  private interval: number;

  constructor(
    private schedule: Arrival[],
    private gen: Generator | undefined,
    private rng: () => number,
  ) {
    this.nextGen = gen?.first ?? 0;
    this.interval = gen?.start ?? 0;
  }

  private pick(): SpeciesId {
    const pool = this.gen!.pool;
    return pool[Math.floor(this.rng() * pool.length)];
  }

  update(t: number): void {
    if (this.gen) {
      while (t >= this.nextGen) {
        this.waiting.push({ at: this.nextGen, species: this.pick() });
        this.interval = Math.max(this.gen.min, this.interval - this.gen.accel);
        this.nextGen += this.interval;
      }
      return;
    }
    while (this.idx < this.schedule.length && this.schedule[this.idx].at <= t) this.waiting.push(this.schedule[this.idx++]);
  }

  /** puxa já os próximos n da lista (evento de multidão) */
  pullForward(n: number): void {
    for (let i = 0; i < n; i++) {
      if (this.gen) this.waiting.push({ at: 0, species: this.pick() });
      else if (this.idx < this.schedule.length) this.waiting.push(this.schedule[this.idx++]);
    }
  }

  take(): Arrival | undefined {
    return this.waiting.shift();
  }

  get exhausted(): boolean {
    return !this.gen && this.idx >= this.schedule.length && this.waiting.length === 0;
  }
}
