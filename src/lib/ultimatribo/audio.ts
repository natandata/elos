// Sons sintetizados de A Última Tribo (sem arquivos de áudio).
export type SfxKind = "pistola" | "espingarda" | "rifle" | "arco" | "melee" | "hit" | "pickup" | "lore" | "dark" | "death" | "win" | "ally";

export class Sfx {
  private ctx: AudioContext | null = null;
  private noise: AudioBuffer | null = null;
  enabled = true;

  /** Só pode começar depois de um toque/clique do jogador. */
  unlock() {
    if (this.ctx) return void this.ctx.resume();
    try {
      this.ctx = new AudioContext();
      const len = this.ctx.sampleRate * 0.5;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch {
      this.ctx = null;
    }
  }

  private tone(freq: number, dur: number, vol: number, type: OscillatorType = "sine", slide = 0) {
    const c = this.ctx!;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, c.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), c.currentTime + dur);
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.connect(g).connect(c.destination);
    o.start();
    o.stop(c.currentTime + dur);
  }
  private bang(dur: number, vol: number, cutoff: number) {
    const c = this.ctx!;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = cutoff;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    s.connect(f).connect(g).connect(c.destination);
    s.start();
    s.stop(c.currentTime + dur);
  }

  /** `vol` de 0 a 1 (quem está longe soa mais baixo). */
  play(kind: SfxKind, vol = 1) {
    if (!this.enabled || !this.ctx || vol <= 0.02) return;
    const v = Math.min(1, vol) * 0.5;
    switch (kind) {
      case "pistola":
        this.bang(0.14, v, 2600);
        this.tone(220, 0.08, v * 0.5, "square", -120);
        break;
      case "espingarda":
        this.bang(0.32, v * 1.2, 1500);
        this.tone(110, 0.16, v * 0.6, "sawtooth", -60);
        break;
      case "rifle":
        this.bang(0.26, v * 1.1, 3400);
        this.tone(160, 0.2, v * 0.5, "square", -100);
        break;
      case "arco":
        this.tone(520, 0.12, v * 0.5, "triangle", -300);
        break;
      case "melee":
        this.bang(0.09, v * 0.5, 900);
        break;
      case "hit":
        this.tone(140, 0.1, v * 0.7, "sine", -80);
        break;
      case "pickup":
        this.tone(620, 0.07, v * 0.5, "triangle", 260);
        break;
      case "ally":
        this.tone(440, 0.12, v * 0.5, "triangle", 220);
        setTimeout(() => this.ctx && this.tone(660, 0.16, v * 0.5, "triangle"), 110);
        break;
      case "lore":
        this.tone(523, 0.3, v * 0.5, "sine");
        setTimeout(() => this.ctx && this.tone(784, 0.5, v * 0.45, "sine"), 160);
        break;
      case "dark":
        this.tone(90, 1.2, v * 0.9, "sawtooth", -40);
        break;
      case "death":
        this.tone(200, 0.6, v * 0.8, "sawtooth", -160);
        break;
      case "win":
        [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.ctx && this.tone(f, 0.35, v * 0.6, "triangle"), i * 140));
        break;
    }
  }
}
