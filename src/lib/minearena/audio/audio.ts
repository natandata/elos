// Efeitos sonoros sintetizados (sem arquivos de áudio).
export type Sfx = "break" | "place" | "hit" | "hurt" | "pickup" | "eat" | "bow" | "ui" | "death" | "boss" | "fire" | "wave" | "step";

export class Sound {
  muted = false;
  /** Volume geral (0–1). */
  volume = 1;
  private ctx: AudioContext | null = null;
  private noise: AudioBuffer | null = null;

  private ensure(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
        const len = this.ctx.sampleRate * 0.4;
        const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        this.noise = buf;
      } catch {
        return null;
      }
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slide = 0): void {
    const c = this.ensure();
    if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, c.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), c.currentTime + dur);
    g.gain.setValueAtTime(Math.max(0.0002, vol * this.volume), c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g).connect(c.destination);
    o.start();
    o.stop(c.currentTime + dur);
  }

  private hiss(dur: number, vol: number, freq: number): void {
    const c = this.ensure();
    if (!c || !this.noise) return;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(Math.max(0.0002, vol * this.volume), c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    s.connect(f).connect(g).connect(c.destination);
    s.start();
    s.stop(c.currentTime + dur);
  }

  play(kind: Sfx): void {
    switch (kind) {
      case "break":
        this.hiss(0.18, 0.5, 900);
        this.tone(140, 0.12, "square", 0.12, -60);
        break;
      case "place":
        this.tone(220, 0.09, "triangle", 0.25, -80);
        break;
      case "hit":
        this.hiss(0.1, 0.45, 2200);
        this.tone(180, 0.1, "sawtooth", 0.15, -90);
        break;
      case "hurt":
        this.tone(300, 0.22, "sawtooth", 0.28, -200);
        break;
      case "pickup":
        this.tone(660, 0.08, "sine", 0.18, 400);
        break;
      case "eat":
        this.hiss(0.12, 0.35, 1400);
        break;
      case "bow":
        this.tone(520, 0.14, "triangle", 0.2, -380);
        break;
      case "ui":
        this.tone(480, 0.05, "sine", 0.12);
        break;
      case "death":
        this.tone(260, 0.7, "sawtooth", 0.3, -230);
        break;
      case "boss":
        this.tone(90, 0.7, "sawtooth", 0.35, -30);
        break;
      case "fire":
        this.hiss(0.45, 0.5, 600);
        break;
      case "wave":
        this.hiss(0.6, 0.4, 500);
        this.tone(330, 0.5, "sine", 0.12, 200);
        break;
      case "step":
        this.hiss(0.05, 0.12, 700);
        break;
    }
  }

  dispose(): void {
    void this.ctx?.close();
    this.ctx = null;
  }
}
