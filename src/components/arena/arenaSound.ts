// Efeitos sonoros da Arena. Usa a biblioteca open source ZzFX (MIT, Frank Force):
// sintetizador de efeitos de jogo, sem arquivos de áudio. Cada efeito é uma
// lista de parâmetros; os sons são gerados uma vez e guardados.
// Só áudio: nada daqui mexe no jogo. O navegador só libera o som depois de um
// toque do jogador, então tudo é carregado/retomado nos toques da partida.

import { ARENA_CARD_BY_KEY } from "@/lib/arena/cards";
import { H, W, type GameEvent } from "@/lib/arena/core";

type Zz = typeof import("zzfx").ZZFX;
type Params = (number | undefined)[];

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

// ZzFX: [volume, aleatoriedade, frequência, ataque, sustentação, queda, forma, curva,
//        deslizar, deslizar², salto, tempo do salto, repetição, ruído, modulação,
//        bitcrush, eco, volume sust., decaimento, tremolo, filtro]
export const SOUND_PARAMS: Record<string, Params> = {
  // interface
  select: [0.5, 0, 990, 0, 0.005, 0.03, 1, 1],
  deny: [0.5, 0, 140, 0, 0.02, 0.1, 2, 1, -2],
  doubleMana: [1, 0, 539, 0, 0.04, 0.29, 1, 1.92, , , 567, 0.02, 0.02, , , , 0.04],
  tick: [0.35, 0, 1300, 0, 0.004, 0.025, 1],
  tickFinal: [0.55, 0, 1750, 0, 0.006, 0.06, 1],
  // entrada em campo
  spawnLight: [0.9, 0, 330, 0.005, 0.03, 0.1, 1, 1.2, 9, , , , , , , , , 0.75, 0.02],
  spawnHeavy: [1.2, 0, 85, 0.005, 0.05, 0.22, 0, 2.2, -4, , , , , 0.15, , , , 0.85, 0.03],
  spawnFly: [0.6, 0, 740, 0.03, 0.1, 0.4, 0, 1, 3, , , , 0.08, , , , , 0.8, 0.06, 0.5],
  // golpes e tiros
  slash: [0.7, 0.05, 420, 0, 0.01, 0.07, 3, 1.6, -18, , , , , 0.15, , , , 0.5, 0.01],
  slashHeavy: [1, 0.05, 200, 0, 0.02, 0.12, 4, 2.2, -8, , , , , 0.4, , 0.1, , 0.6, 0.02],
  sling: [0.55, 0.05, 560, 0, 0.01, 0.1, 1, 1.3, -22, , , , , , , , , 0.6, 0.01],
  arrow: [0.45, 0.05, 880, 0, 0.005, 0.1, 0, 1, -12, , 40, 0.02, , , , , , 0.5, 0.01],
  magic: [0.5, 0.03, 980, 0.01, 0.05, 0.22, 0, 1, 9, , 60, 0.05, , , , , 0.05, 0.6, 0.03, 0.35],
  // impactos
  hitSmall: [0.7, 0.1, 220, 0, 0.005, 0.07, 4, 1.6, -5, , , , , 0.5, , , , 0.6, 0.01],
  hitBig: [1.1, 0.05, 110, 0, 0.02, 0.16, 4, 2, -6, , , , , 0.35, , 0.15, , 0.8, 0.02],
  // cura e mortes
  heal: [0.55, 0, 1175, 0.01, 0.08, 0.28, 0, 1, , , , , , , , , 0.07, 0.8, 0.08],
  healUp: [0.5, 0, 1568, 0.01, 0.06, 0.25, 0, 1, , , , , , , , , 0.06, 0.8, 0.07],
  death: [0.8, 0.05, 320, 0, 0.02, 0.2, 2, 1.2, -26, , , , , 0.1, , , , 0.6, 0.02],
  towerDown: [1.6, 0.05, 60, 0.02, 0.18, 1.2, 4, 2.4, -1.5, , , , , 0.7, , 0.7, 0.09, 0.9, 0.12],
  // poderes
  fogoFall: [0.8, 0.05, 1500, 0.12, 0.1, 0.4, 2, 1.4, -45, , , , , , , , , 0.8, 0.08],
  fogoBoom: [1.6, 0.03, 100, 0, 0.1, 0.95, 4, 1.9, -2.5, , , , , 0.55, , 0.55, 0.08, 0.85, 0.06],
  marSwell: [0.7, 0, 170, 0.35, 0.5, 0.8, 4, 1, , , , , , 0.5, , , , 0.9, 0.1, , 350],
  marCrash: [0.9, 0.03, 140, 0.02, 0.1, 0.6, 4, 1.5, -2, , , , , 0.6, , 0.2, 0.06, 0.8, 0.05, , 900],
  // coroas
  crownMine: [0.9, 0, 659, 0.01, 0.08, 0.3, 1, 1, , , 196, 0.07, , , , , 0.05, 0.8, 0.05],
  crownTheirs: [0.8, 0, 262, 0.01, 0.1, 0.35, 2, 1, -2, , -60, 0.07, , , , , 0.05, 0.8, 0.05],
};

/** Notas (semitons a partir do Lá 440). */
const NOTE = { G3: -14, C4: -9, Eb4: -6, G4: -2, C5: 3, E5: 7, G5: 10, C6: 15, D5: 5, A5: 12 };

const MAX_VOICES = 12;

export class ArenaSound {
  private Z: Zz | null = null;
  private loading = false;
  private cache = new Map<string, Float32Array>();
  private last: Record<string, number> = {};
  private voices = 0;
  muted = false;

  constructor() {
    this.muted = readMuted();
  }

  /** Carrega a biblioteca e retoma o áudio. Chame dentro de um toque do jogador. */
  unlock() {
    if (typeof window === "undefined") return;
    if (this.Z) {
      if (this.Z.audioContext.state === "suspended") void this.Z.audioContext.resume();
      return;
    }
    if (this.loading) return;
    this.loading = true;
    // a biblioteca cria o AudioContext ao carregar: por isso só aqui, num toque
    void import("zzfx")
      .then((m) => {
        this.Z = m.ZZFX;
        this.Z.volume = 0.32;
        if (this.Z.audioContext.state === "suspended") void this.Z.audioContext.resume();
      })
      .catch(() => {
        this.loading = false;
      });
  }

  setMuted(m: boolean) {
    this.muted = m;
    writeMuted(m);
  }

  close() {
    // o contexto é compartilhado da biblioteca: não fecha, só para de tocar novos sons
    this.Z = null;
    this.loading = false;
  }

  // ------------------------------------------------------------ base
  private ready(): boolean {
    return !this.muted && !!this.Z && this.Z.audioContext.state === "running";
  }

  private gap(kind: string, secs: number): boolean {
    const now = this.Z!.audioContext.currentTime;
    if (now - (this.last[kind] ?? -9) < secs) return false;
    this.last[kind] = now;
    return true;
  }

  private samples(name: string, params: Params): Float32Array {
    let s = this.cache.get(name);
    if (!s) {
      s = this.Z!.buildSamples(...params.slice(0, 1), 0, ...params.slice(2)); // sem aleatoriedade: a variação vem da velocidade
      this.cache.set(name, s);
    }
    return s;
  }

  /**
   * Toca um efeito. `x` (0–W) vira posição estéreo; `y` (0–H) diz se é do lado
   * do outro jogador (mais baixinho). `pitch` varia o tom.
   */
  private play(name: string, opts: { gap?: number; vol?: number; pitch?: number; x?: number; y?: number; params?: Params; key?: string; priority?: boolean } = {}) {
    if (!this.ready()) return;
    const key = opts.key ?? name;
    if (opts.gap && !this.gap(key, opts.gap)) return;
    if (this.voices >= MAX_VOICES && !opts.priority) return;
    const params = opts.params ?? SOUND_PARAMS[name];
    if (!params) return;
    const far = opts.y !== undefined && opts.y < H / 2 ? 0.6 : 1;
    const pan = opts.x !== undefined ? Math.max(-0.8, Math.min(0.8, (opts.x / W - 0.5) * 1.4)) : 0;
    const rate = (opts.pitch ?? 1) * (1 + (Math.random() - 0.5) * 0.1);
    try {
      const src = this.Z!.playSamples([this.samples(key, params)], (opts.vol ?? 1) * far, rate, pan);
      this.voices++;
      src.onended = () => {
        this.voices = Math.max(0, this.voices - 1);
      };
    } catch {
      // áudio indisponível: segue o jogo
    }
  }

  private later(ms: number, fn: () => void) {
    setTimeout(() => {
      if (this.ready()) fn();
    }, ms);
  }

  private note(semi: number, shape: number, vol: number, sustain: number, release: number, delay = 0, extra: Params = []) {
    const f = this.Z!.getNote(semi);
    const params: Params = [vol, 0, f, 0.012, sustain, release, shape, 1, , , , , , , , , 0.04, 0.8, 0.03, ...extra];
    const key = `note:${semi}:${shape}:${sustain}:${release}`;
    this.later(delay, () => this.play(key, { params, priority: true }));
  }

  // ------------------------------------------------------------ interface
  select() {
    this.play("select", { gap: 0.05 });
  }

  deny() {
    this.play("deny", { gap: 0.2 });
  }

  doubleMana() {
    this.play("doubleMana", { priority: true });
  }

  /** Contagem dos últimos 10 segundos (n = segundos que faltam). */
  tick(n: number) {
    this.play(n <= 3 ? "tickFinal" : "tick", { pitch: n <= 3 ? 1 + (4 - n) * 0.06 : 1, priority: true, key: n <= 3 ? "tickFinal" : "tick" });
  }

  crown(mine: boolean) {
    this.play(mine ? "crownMine" : "crownTheirs", { priority: true });
  }

  // ------------------------------------------------------------ fim de jogo
  win() {
    if (!this.ready()) return;
    [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6].forEach((n, i) => this.note(n, 1, 0.9, 0.08, 0.3, i * 130));
    this.note(NOTE.C6, 0, 0.5, 0.35, 0.6, 560);
    this.note(NOTE.G5, 0, 0.4, 0.35, 0.6, 560);
  }

  lose() {
    if (!this.ready()) return;
    [NOTE.G4, NOTE.Eb4, NOTE.C4, NOTE.G3].forEach((n, i) => this.note(n, 1, 0.8, 0.1, 0.4, i * 190));
  }

  /** Fanfarra dos poderes (trombetas). */
  private brass() {
    [NOTE.G4, NOTE.C5, NOTE.D5, NOTE.G5].forEach((n, i) => {
      this.note(n, 2, 0.55, 0.12, 0.2, i * 110);
      this.note(n - 12, 1, 0.45, 0.12, 0.2, i * 110);
    });
  }

  // ------------------------------------------------------------ eventos do jogo
  /** Converte um evento do motor (já no ponto de vista de quem joga) em som. */
  onEvent(e: GameEvent) {
    if (!this.ready()) return;
    switch (e.t) {
      case "spawn": {
        const c = ARENA_CARD_BY_KEY.get(e.card);
        const name = c?.flying ? "spawnFly" : (c?.hp ?? 0) >= 300 ? "spawnHeavy" : "spawnLight";
        this.play(name, { gap: 0.04, x: e.x, y: e.y });
        break;
      }
      case "attack": {
        const tower = e.fromCard === "atalaia" || e.fromCard === "santuario";
        if (tower) this.play("arrow", { gap: 0.1, x: e.x1, y: e.y1, vol: 0.8 });
        else if (e.ranged) {
          const magic = e.fromCard === "moises" || e.fromCard === "salomao" || e.fromCard === "ester" || e.fromCard === "maria";
          this.play(magic ? "magic" : "sling", { gap: 0.08, x: e.x1, y: e.y1 });
        } else {
          this.play(e.dmg >= 45 ? "slashHeavy" : "slash", { gap: 0.07, x: e.x1, y: e.y1, key: e.dmg >= 45 ? "slashHeavy" : "slash" });
        }
        break;
      }
      case "hit":
        if (e.dmg < 25) break;
        this.play(e.dmg >= 60 ? "hitBig" : "hitSmall", { gap: 0.09, x: e.x, y: e.y, vol: Math.min(1, 0.5 + e.dmg / 150), key: e.dmg >= 60 ? "hitBig" : "hitSmall" });
        break;
      case "heal":
        this.play(Math.random() < 0.5 ? "heal" : "healUp", { gap: 0.3, x: e.x, y: e.y, vol: 0.7, key: "heal" });
        break;
      case "spell":
        if (e.key === "fogo") {
          this.play("fogoFall", { x: e.x, priority: true });
          this.later(420, () => this.play("fogoBoom", { x: e.x, priority: true }));
        } else if (e.key === "mar") {
          this.play("marSwell", { x: e.x, priority: true });
          this.later(550, () => this.play("marCrash", { x: e.x, priority: true }));
        } else {
          this.brass();
        }
        break;
      case "death":
        if (e.tower) {
          this.play("towerDown", { x: e.x, priority: true });
        } else {
          this.play("death", { gap: 0.08, x: e.x, y: e.y });
        }
        break;
    }
  }
}
