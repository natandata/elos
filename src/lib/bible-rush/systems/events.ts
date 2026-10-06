import type { LevelEvent } from "../core/types";

/** Eventos especiais: modificam a dificuldade por um tempo. */
export class EventManager {
  private next = 0;
  stormLeft = 0;
  banner: { text: string; left: number } | null = null;

  constructor(private events: LevelEvent[]) {}

  /** devolve os eventos que disparam neste instante */
  update(t: number, dt: number): LevelEvent[] {
    const fired: LevelEvent[] = [];
    while (this.next < this.events.length && this.events[this.next].at <= t) fired.push(this.events[this.next++]);
    for (const e of fired) {
      this.banner = { text: e.text, left: 4.5 };
      if (e.kind === "storm") this.stormLeft = 18;
    }
    if (this.banner) {
      this.banner.left -= dt;
      if (this.banner.left <= 0) this.banner = null;
    }
    if (this.stormLeft > 0) this.stormLeft = Math.max(0, this.stormLeft - dt);
    return fired;
  }

  get storm(): boolean {
    return this.stormLeft > 0;
  }
}
