// Música do Modo História: uma trilha por capítulo/cena, sintetizada (sem arquivos de áudio).
// `track` aceita: eden, fields, noah, fall, flood, learn. Cada trilha define escala, andamento, timbre e volume.

type Track = { scale: number[]; tempo: [number, number]; gain: number; type: OscillatorType; drone?: number; dur: number };

const TRACKS: Record<string, Track> = {
  eden: { scale: [392, 440, 523.25, 587.33, 659.25, 784, 880], tempo: [0.9, 1.5], gain: 0.05, type: "sine", dur: 2.4 },
  fields: { scale: [293.66, 329.63, 392, 440, 493.88, 587.33], tempo: [1.1, 1.8], gain: 0.045, type: "triangle", dur: 2.2 },
  noah: { scale: [261.63, 293.66, 329.63, 392, 440, 523.25], tempo: [1.0, 1.7], gain: 0.045, type: "sine", dur: 2.4 },
  fall: { scale: [220, 246.94, 261.63, 329.63, 349.23, 440], tempo: [1.6, 2.6], gain: 0.04, type: "triangle", drone: 110, dur: 3 },
  flood: { scale: [146.83, 174.61, 196, 220, 261.63], tempo: [0.7, 1.3], gain: 0.05, type: "sawtooth", drone: 73.4, dur: 2.6 },
  babel: { scale: [293.66, 349.23, 392, 440, 523.25], tempo: [1.0, 1.6], gain: 0.045, type: "triangle", dur: 2.2 },
  abraao: { scale: [329.63, 392, 440, 493.88, 587.33, 659.25], tempo: [1.1, 1.9], gain: 0.045, type: "sine", dur: 2.6 },
  abraao_noite: { scale: [220, 261.63, 329.63, 392, 523.25], tempo: [1.6, 2.6], gain: 0.04, type: "sine", drone: 110, dur: 3.2 },
  jaco: { scale: [261.63, 311.13, 349.23, 392, 466.16], tempo: [1.0, 1.7], gain: 0.045, type: "triangle", dur: 2.3 },
  jose: { scale: [293.66, 329.63, 369.99, 440, 493.88, 587.33], tempo: [0.9, 1.5], gain: 0.045, type: "sine", dur: 2.3 },
  exodo: { scale: [261.63, 293.66, 311.13, 392, 415.3, 523.25], tempo: [1.1, 1.8], gain: 0.045, type: "triangle", dur: 2.4 },
  exodo_sagrado: { scale: [392, 493.88, 587.33, 783.99], tempo: [1.4, 2.2], gain: 0.05, type: "sine", drone: 98, dur: 3 },
  praga: { scale: [196, 220, 233.08, 293.66, 311.13], tempo: [1.3, 2.2], gain: 0.045, type: "sawtooth", drone: 73.4, dur: 2.6 },
  pascoa: { scale: [220, 246.94, 293.66, 329.63, 392], tempo: [1.2, 2.0], gain: 0.045, type: "sine", dur: 2.8 },
  mar: { scale: [293.66, 349.23, 440, 523.25, 587.33], tempo: [0.9, 1.5], gain: 0.05, type: "triangle", dur: 2.4 },
  deserto: { scale: [233.08, 261.63, 311.13, 349.23, 392, 466.16], tempo: [1.4, 2.3], gain: 0.045, type: "triangle", drone: 116.5, dur: 3 },
  sinai: { scale: [196, 246.94, 293.66, 392, 493.88], tempo: [1.5, 2.4], gain: 0.05, type: "sine", drone: 98, dur: 3.2 },
  sinai_trovao: { scale: [130.81, 146.83, 174.61, 196, 233.08], tempo: [0.6, 1.1], gain: 0.055, type: "sawtooth", drone: 65.4, dur: 2.4 },
  bezerro: { scale: [220, 261.63, 293.66, 329.63, 392], tempo: [1.5, 2.5], gain: 0.04, type: "sine", drone: 110, dur: 3 },
  bezerro_festa: { scale: [329.63, 392, 440, 523.25, 659.25, 783.99], tempo: [0.35, 0.7], gain: 0.028, type: "square", dur: 1.1 },
  learn: { scale: [523.25, 659.25, 783.99, 1046.5], tempo: [0.8, 1.2], gain: 0.04, type: "sine", dur: 2.2 },
};

export class StoryMusic {
  private ctx: AudioContext | null = null;
  private timer: number | null = null;
  private track = "";
  volume = 0.8;
  on = true;
  private drone: { osc: OscillatorNode; gain: GainNode } | null = null;

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

  private note(freq: number, dur: number, type: OscillatorType, vol: number): void {
    const c = this.ensure();
    if (!c) return;
    const t0 = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * this.volume), t0 + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(c.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  play(track: string): void {
    if (track === this.track) return;
    this.track = track;
    this.stop(false);
    const t = TRACKS[track];
    if (!t || !this.on) return;
    let i = Math.floor(t.scale.length / 2);
    const c = this.ensure();
    if (c && t.drone) {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "sine";
      o.frequency.value = t.drone;
      g.gain.value = 0.02 * this.volume;
      o.connect(g).connect(c.destination);
      o.start();
      this.drone = { osc: o, gain: g };
    }
    const step = () => {
      if (this.on) {
        i = Math.max(0, Math.min(t.scale.length - 1, i + Math.floor(Math.random() * 3) - 1));
        this.note(t.scale[i], t.dur, t.type, t.gain);
        if (Math.random() < 0.35) this.note(t.scale[i] * 2, t.dur * 0.6, "sine", t.gain * 0.35);
      }
      this.timer = window.setTimeout(step, (t.tempo[0] + Math.random() * (t.tempo[1] - t.tempo[0])) * 1000);
    };
    step();
  }

  /** Efeitos curtos da campanha. */
  sfx(kind: string): void {
    if (!this.on) return;
    switch (kind) {
      case "quest":
        [523.25, 659.25, 783.99, 1046.5].forEach((f, k) => window.setTimeout(() => this.note(f, 0.5, "triangle", 0.09), k * 130));
        break;
      case "door":
        this.note(90, 0.6, "sawtooth", 0.08);
        break;
      case "rumble":
        this.note(55, 1.6, "sawtooth", 0.1);
        break;
      case "pickup":
        this.note(880, 0.14, "sine", 0.07);
        break;
      case "cry":
        [392, 370, 349, 330].forEach((f, k) => window.setTimeout(() => this.note(f, 0.7, "sine", 0.05), k * 420));
        break;
      case "splash":
        this.note(180, 0.35, "triangle", 0.05);
        break;
      default:
        break;
    }
  }

  setOn(on: boolean, volumePct: number): void {
    this.on = on;
    this.volume = volumePct / 100;
    if (!on) this.stop(false);
    else if (this.track && !this.timer) {
      const t = this.track;
      this.track = "";
      this.play(t);
    }
  }

  stop(clearTrack = true): void {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
    if (this.drone) {
      try {
        this.drone.osc.stop();
      } catch {
        // já parado
      }
      this.drone = null;
    }
    if (clearTrack) this.track = "";
  }

  dispose(): void {
    this.stop();
    void this.ctx?.close();
    this.ctx = null;
  }
}
