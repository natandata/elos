import type { SoundKind } from "../core/engine";
import type { GuestId } from "../core/types";

// Sons sintetizados (placeholders, sem arquivos de áudio nem músicas de terceiros).
// O navegador só libera o som depois de um toque, então tudo nasce a partir de um gesto.

/** Tom da voz do convidado: sai do próprio id, então cada um soa diferente. */
const pitchOf = (id: GuestId): number => 200 + ([...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 700, 7));

export class RushAudio {
  private ctx: AudioContext | null = null;
  volume = 0.8;
  sfxOn = true;
  musicOn = true;
  private musicTimer: number | null = null;
  private tense = false;

  configure(volumePct: number, sfx: boolean, music: boolean): void {
    this.volume = volumePct / 100;
    this.sfxOn = sfx;
    this.musicOn = music;
    if (!music) this.stopMusic();
  }

  private ensure(): AudioContext | null {
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slide = 0, delay = 0): void {
    const c = this.ensure();
    if (!c) return;
    const t0 = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * this.volume), t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(c.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  play(k: SoundKind, guest?: GuestId): void {
    if (!this.sfxOn) return;
    switch (k) {
      case "arrive":
        this.tone(guest ? pitchOf(guest) : 440, 0.16, "triangle", 0.16, guest ? -pitchOf(guest) * 0.25 : 0);
        this.tone(660, 0.08, "sine", 0.1, 0, 0.12);
        break;
      case "ok":
        this.tone(520, 0.1, "sine", 0.2, 120);
        break;
      case "select":
        this.tone(760, 0.05, "square", 0.07);
        break;
      case "err":
        this.tone(150, 0.2, "sawtooth", 0.15, -50);
        break;
      case "reward":
        this.tone(660, 0.09, "triangle", 0.2);
        this.tone(880, 0.12, "triangle", 0.2, 0, 0.09);
        this.tone(1320, 0.18, "sine", 0.16, 0, 0.18);
        break;
      case "cook":
        this.tone(220, 0.22, "sawtooth", 0.05, 120);
        this.tone(330, 0.12, "triangle", 0.08, 0, 0.05);
        break;
      case "ready":
        this.tone(988, 0.1, "sine", 0.16);
        this.tone(1319, 0.16, "sine", 0.14, 0, 0.1);
        break;
      case "burn":
        this.tone(180, 0.35, "sawtooth", 0.14, -90);
        this.tone(120, 0.3, "square", 0.08, -40, 0.1);
        break;
      case "tick":
        this.tone(1500, 0.03, "square", 0.05);
        break;
      case "event":
        this.tone(392, 0.2, "triangle", 0.18);
        this.tone(330, 0.3, "triangle", 0.18, 0, 0.2);
        break;
      case "win":
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.28, "triangle", 0.22, 0, i * 0.14));
        break;
      case "lose":
        [392, 330, 262].forEach((f, i) => this.tone(f, 0.3, "triangle", 0.2, 0, i * 0.18));
        break;
    }
  }

  /** Música ambiente: notas de harpa em escala pentatônica; mais rápida quando o tempo está acabando. */
  startMusic(): void {
    this.stopMusic();
    if (!this.musicOn) return;
    const scale = [293.66, 329.63, 369.99, 440, 493.88, 587.33];
    let i = 2;
    const step = () => {
      if (this.musicOn) {
        i = Math.max(0, Math.min(scale.length - 1, i + Math.floor(Math.random() * 3) - 1));
        this.tone(scale[i], 1.4, "sine", this.tense ? 0.05 : 0.035);
        if (Math.random() < 0.4) this.tone(scale[i] * 2, 0.8, "sine", 0.015, 0, 0.05);
      }
      this.musicTimer = window.setTimeout(step, this.tense ? 380 : 900 + Math.random() * 500);
    };
    step();
  }

  setTense(t: boolean): void {
    this.tense = t;
  }

  stopMusic(): void {
    if (this.musicTimer !== null) window.clearTimeout(this.musicTimer);
    this.musicTimer = null;
  }

  dispose(): void {
    this.stopMusic();
    void this.ctx?.close();
    this.ctx = null;
  }
}
