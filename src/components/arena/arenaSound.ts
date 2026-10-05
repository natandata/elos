// Efeitos sonoros da Arena, sintetizados com WebAudio (sem arquivos).
// Só áudio: nada aqui mexe no jogo. O navegador só libera o som depois de um
// toque do jogador, então o contexto é criado/retomado nos toques da partida.

import type { GameEvent } from "@/lib/arena/core";

const MUTE_KEY = "arena-mute";

export function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeMuted(m: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, m ? "1" : "0");
  } catch {
    // sem armazenamento: vale só nesta sessão
  }
}

export class ArenaSound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private last: Record<string, number> = {};
  muted = false;

  constructor() {
    this.muted = readMuted();
  }

  /** Cria/retoma o áudio. Chame dentro de um toque do jogador. */
  unlock() {
    if (typeof window === "undefined") return;
    try {
      if (!this.ctx) {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.28;
        this.master.connect(this.ctx.destination);
        const len = this.ctx.sampleRate;
        this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noise.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      }
      if (this.ctx.state === "suspended") void this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  setMuted(m: boolean) {
    this.muted = m;
    writeMuted(m);
  }

  close() {
    try {
      void this.ctx?.close();
    } catch {
      // nada
    }
    this.ctx = null;
  }

  private ok(kind: string, gap: number): boolean {
    if (this.muted || !this.ctx || !this.master || this.ctx.state !== "running") return false;
    const now = this.ctx.currentTime;
    if (now - (this.last[kind] ?? -9) < gap) return false;
    this.last[kind] = now;
    return true;
  }

  private tone(type: OscillatorType, f0: number, f1: number, dur: number, vol: number, delay = 0) {
    const c = this.ctx!;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private burst(dur: number, vol: number, f0: number, f1: number, q = 0.8, delay = 0) {
    const c = this.ctx!;
    const t = c.currentTime + delay;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    const filt = c.createBiquadFilter();
    filt.type = "lowpass";
    filt.Q.value = q;
    filt.frequency.setValueAtTime(f0, t);
    filt.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(filt).connect(g).connect(this.master!);
    s.start(t);
    s.stop(t + dur + 0.02);
  }

  // ------------------------------------------------------------ efeitos
  deploy(mine: boolean) {
    if (!this.ok("deploy", 0.05)) return;
    const v = mine ? 0.5 : 0.28;
    this.tone("triangle", 180, 420, 0.14, v);
    this.burst(0.12, v * 0.5, 900, 200);
  }

  ranged() {
    if (!this.ok("ranged", 0.09)) return;
    this.tone("sine", 820, 320, 0.09, 0.22);
  }

  melee() {
    if (!this.ok("melee", 0.08)) return;
    this.burst(0.07, 0.3, 1400, 300);
    this.tone("square", 150, 90, 0.06, 0.1);
  }

  hit(dmg: number) {
    if (dmg < 50 || !this.ok("hit", 0.12)) return;
    this.burst(0.12, Math.min(0.6, 0.2 + dmg / 400), 800, 120);
  }

  heal() {
    if (!this.ok("heal", 0.35)) return;
    this.tone("sine", 520, 780, 0.18, 0.16);
    this.tone("sine", 780, 1040, 0.18, 0.12, 0.09);
  }

  spell(key: string) {
    if (!this.ok("spell", 0.15)) return;
    if (key === "fogo") {
      this.tone("sawtooth", 900, 70, 0.55, 0.3);
      this.burst(0.7, 0.7, 1800, 80, 1.2, 0.35);
      this.tone("sine", 90, 40, 0.5, 0.5, 0.35);
    } else if (key === "mar") {
      this.burst(1.0, 0.45, 300, 1600, 0.9);
      this.burst(0.9, 0.35, 1600, 250, 0.9, 0.5);
    } else {
      // trombetas: dois metais juntos
      for (const [f, d] of [[392, 0], [494, 0.12], [587, 0.26]] as const) {
        this.tone("sawtooth", f, f * 1.01, 0.34, 0.2, d);
        this.tone("square", f / 2, f / 2, 0.34, 0.1, d);
      }
    }
  }

  death(tower: boolean) {
    if (tower) {
      if (!this.ok("tower", 0.3)) return;
      this.burst(0.9, 0.9, 1400, 60, 1.1);
      this.tone("sine", 120, 35, 0.8, 0.6);
    } else {
      if (!this.ok("death", 0.1)) return;
      this.tone("triangle", 380, 110, 0.18, 0.2);
    }
  }

  win() {
    if (this.muted || !this.ctx) return;
    [523, 659, 784, 1046].forEach((f, i) => this.tone("triangle", f, f, 0.28, 0.35, i * 0.14));
  }

  lose() {
    if (this.muted || !this.ctx) return;
    [392, 330, 262, 196].forEach((f, i) => this.tone("triangle", f, f * 0.98, 0.32, 0.3, i * 0.18));
  }

  /** Converte um evento do motor em som. */
  onEvent(e: GameEvent) {
    switch (e.t) {
      case "attack":
        if (e.ranged) this.ranged();
        else this.melee();
        break;
      case "hit":
        this.hit(e.dmg);
        break;
      case "heal":
        this.heal();
        break;
      case "spell":
        this.spell(e.key);
        break;
      case "death":
        this.death(e.tower);
        break;
      case "spawn":
        this.deploy(true);
        break;
    }
  }
}
