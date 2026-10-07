// ArenaSoccer: efeitos sonoros sintetizados (sem arquivos de áudio).
export class Sfx {
  private ctx: AudioContext | null = null;
  muted = false;

  private ac(): AudioContext | null {
    if (this.muted || typeof window === "undefined") return null;
    if (!this.ctx) {
      const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!C) return null;
      this.ctx = new C();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slide = 0, delay = 0): void {
    const c = this.ac();
    if (!c) return;
    const t0 = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(c.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  kick(power: number): void {
    this.tone(180 + Math.min(power, 1000) * 0.12, 0.11, "square", 0.12, -90);
  }
  wall(v: number): void {
    this.tone(120, 0.07, "triangle", Math.min(0.12, v / 6000));
  }
  tick(): void {
    this.tone(660, 0.12, "sine", 0.12);
  }
  whistle(): void {
    this.tone(1250, 0.22, "sine", 0.12);
    this.tone(1250, 0.3, "sine", 0.1, 0, 0.26);
  }
  goal(): void {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.28, "triangle", 0.14, 0, i * 0.11));
  }
  end(): void {
    [784, 659, 523].forEach((f, i) => this.tone(f, 0.35, "sine", 0.12, 0, i * 0.16));
  }
}
