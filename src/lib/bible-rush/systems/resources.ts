import type { FeedId } from "../core/types";

export const STOCK_MAX = 8;
export const REFILL_SECONDS = 2.2;
export const REFILL_AMOUNT = 4;

export type StockState = { n: number; refill: number };

/** Estoque de alimentos: consumido ao alimentar, produzido ao reabastecer (leva alguns segundos). */
export class ResourceManager {
  stock = {} as Record<FeedId, StockState>;
  /** unidades que passaram do limite ao reabastecer (desperdício) */
  overflow = 0;

  constructor(feeds: FeedId[], initial: Record<FeedId, number>) {
    for (const f of feeds) this.stock[f] = { n: Math.min(STOCK_MAX, initial[f] ?? 0), refill: 0 };
  }

  has(f: FeedId): boolean {
    return (this.stock[f]?.n ?? 0) > 0;
  }
  busy(f: FeedId): boolean {
    return (this.stock[f]?.refill ?? 0) > 0;
  }
  take(f: FeedId): boolean {
    const s = this.stock[f];
    if (!s || s.n <= 0) return false;
    s.n -= 1;
    return true;
  }
  startRefill(f: FeedId): boolean {
    const s = this.stock[f];
    if (!s || s.refill > 0) return false;
    s.refill = REFILL_SECONDS;
    return true;
  }
  update(dt: number): FeedId[] {
    const done: FeedId[] = [];
    for (const [f, s] of Object.entries(this.stock) as [FeedId, StockState][]) {
      if (s.refill <= 0) continue;
      s.refill -= dt;
      if (s.refill <= 0) {
        s.refill = 0;
        const room = STOCK_MAX - s.n;
        const add = Math.min(room, REFILL_AMOUNT);
        this.overflow += REFILL_AMOUNT - add;
        s.n += add;
        done.push(f);
      }
    }
    return done;
  }
  total(): number {
    return Object.values(this.stock).reduce((a, s) => a + s.n, 0);
  }
}
