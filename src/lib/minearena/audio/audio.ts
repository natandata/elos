// Efeitos sonoros sintetizados (sem arquivos de áudio).
export type Sfx = "break" | "place" | "hit" | "hurt" | "pickup" | "eat" | "bow" | "ui" | "death" | "boss" | "fire" | "wave" | "step";

export class Sound {
  muted = false;
  /** Música de fundo (harpa) ligada? */
  musicOn = true;
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

  /** Passo conforme o chão: pedra, terra, madeira, areia, vidro, folhas. */
  step(ground: string, hard = false): void {
    const k = hard ? 1.8 : 1;
    switch (ground) {
      case "stone":
        this.hiss(0.06, 0.14 * k, 1200);
        this.tone(110, 0.05, "square", 0.05 * k, -30);
        break;
      case "wood":
        this.tone(180, 0.06, "triangle", 0.12 * k, -60);
        this.hiss(0.04, 0.08 * k, 900);
        break;
      case "sand":
        this.hiss(0.1, 0.1 * k, 2600);
        break;
      case "glass":
        this.tone(1100, 0.08, "sine", 0.06 * k, -200);
        break;
      case "leaf":
        this.hiss(0.09, 0.07 * k, 1800);
        break;
      default:
        this.hiss(0.06, 0.14 * k, 500);
    }
  }

  /** Sons de ambiente: pássaros, grilos, vento, goteiras, brasas, respingos. */
  ambient(kind: "bird" | "cricket" | "wind" | "drip" | "crackle" | "splash" | "rumble"): void {
    switch (kind) {
      case "bird": {
        const f = 1800 + Math.random() * 900;
        this.tone(f, 0.07, "sine", 0.05, 500);
        setTimeout(() => this.tone(f * 1.2, 0.08, "sine", 0.045, 400), 110);
        if (Math.random() < 0.6) setTimeout(() => this.tone(f * 0.9, 0.09, "sine", 0.04, 300), 240);
        break;
      }
      case "cricket":
        for (let i = 0; i < 5; i++) setTimeout(() => this.tone(4200, 0.03, "triangle", 0.025), i * 70);
        break;
      case "wind":
        this.hiss(2.2, 0.07, 380);
        break;
      case "drip":
        this.tone(1300, 0.12, "sine", 0.06, -700);
        break;
      case "crackle":
        for (let i = 0; i < 4; i++) setTimeout(() => this.hiss(0.05, 0.12, 2400), i * 90 + Math.random() * 60);
        break;
      case "splash":
        this.hiss(0.25, 0.22, 1600);
        break;
      case "rumble":
        this.tone(60, 1.4, "sawtooth", 0.06, -10);
        break;
    }
  }

  /** Uma nota de harpa (kinnor): seno com harmônico e queda longa. */
  harp(freq: number, delay: number, vol: number): void {
    const c = this.ensure();
    if (!c || !this.musicOn) return;
    const t0 = c.currentTime + delay;
    for (const [mul, v] of [[1, 1], [2, 0.25]] as const) {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "sine";
      o.frequency.value = freq * mul;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * v * this.volume), t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.4);
      o.connect(g).connect(c.destination);
      o.start(t0);
      o.stop(t0 + 2.5);
    }
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

  private rainNode: { src: AudioBufferSourceNode; gain: GainNode } | null = null;

  /** Som contínuo de chuva (0 = silêncio). */
  setRain(v: number): void {
    const c = this.rainNode ? this.ctx : v > 0.02 ? this.ensure() : null;
    if (!c || !this.noise) return;
    if (!this.rainNode) {
      const src = c.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const f = c.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = 1800;
      f.Q.value = 0.4;
      const gain = c.createGain();
      gain.gain.value = 0;
      src.connect(f).connect(gain).connect(c.destination);
      src.start();
      this.rainNode = { src, gain };
    }
    this.rainNode.gain.gain.setTargetAtTime(this.muted ? 0 : v * 0.16 * this.volume, c.currentTime, 0.4);
  }

  thunder(): void {
    this.tone(55, 1.8, "sawtooth", 0.3, -15);
    this.hiss(1.4, 0.5, 320);
  }

  dispose(): void {
    try {
      this.rainNode?.src.stop();
    } catch {
      // já parado
    }
    this.rainNode = null;
    void this.ctx?.close();
    this.ctx = null;
  }
}
