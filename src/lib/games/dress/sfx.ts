// Sons do Vista o Herói, sintetizados na hora (nada para baixar). Só rodam depois de um toque da jogadora.
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
let loaded = false;
const listeners = new Set<() => void>();

function readMute() {
  if (loaded) return;
  loaded = true;
  try {
    muted = localStorage.getItem("vh:mute") === "1";
  } catch {
    /* sem armazenamento */
  }
}

function audio(): AudioContext | null {
  readMute();
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
  return ctx;
}

export const isMuted = (): boolean => (readMute(), muted);
export function setMuted(v: boolean) {
  readMute();
  muted = v;
  try {
    localStorage.setItem("vh:mute", v ? "1" : "0");
  } catch {
    /* sem armazenamento */
  }
  if (master && ctx) master.gain.setTargetAtTime(v ? 0 : 0.5, ctx.currentTime, 0.02);
  if (v) stopMusic();
  listeners.forEach((f) => f());
}
export const onMuteChange = (f: () => void): (() => void) => {
  listeners.add(f);
  return () => void listeners.delete(f);
};

function tone(freq: number, start: number, dur: number, type: OscillatorType, vol: number, to?: number) {
  const c = audio();
  if (!c || !master || muted) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  if (to) o.frequency.exponentialRampToValueAtTime(to, start + dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(vol, start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(master);
  o.start(start);
  o.stop(start + dur + 0.05);
}

function noise(start: number, dur: number, vol: number, freq: number, q = 0.7) {
  const c = audio();
  if (!c || !master || muted) return;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(master);
  src.start(start);
}

let lastStep = 0;
/** Passinho de salto no piso do salão. */
export function step() {
  const c = audio();
  if (!c || muted) return;
  const now = c.currentTime;
  if (now - lastStep < 0.12) return;
  lastStep = now;
  noise(now, 0.05, 0.22, 1700 + Math.random() * 500, 1.2);
  tone(150, now, 0.05, "sine", 0.05);
}

/** "Ding" ao vestir uma peça. */
export function ding() {
  const c = audio();
  if (!c) return;
  const t = c.currentTime;
  tone(988, t, 0.35, "sine", 0.22);
  tone(1480, t + 0.07, 0.45, "sine", 0.16);
}

/** Moedinhas: compra na loja. */
export function coin() {
  const c = audio();
  if (!c) return;
  const t = c.currentTime;
  tone(1319, t, 0.12, "square", 0.08);
  tone(1760, t + 0.1, 0.4, "square", 0.08);
}

/** Estalinho para as reações (👏🔥). */
export function pop() {
  const c = audio();
  if (!c) return;
  const t = c.currentTime;
  tone(520, t, 0.1, "triangle", 0.2, 900);
}

/** Aplausos da plateia. */
export function applause(seconds = 2.6) {
  const c = audio();
  if (!c || muted) return;
  const t = c.currentTime;
  const n = Math.floor(seconds * 22);
  for (let i = 0; i < n; i++) {
    const at = t + (i / n) * seconds + Math.random() * 0.03;
    const swell = Math.sin((i / n) * Math.PI);
    noise(at, 0.06, 0.18 * (0.35 + swell), 1500 + Math.random() * 1800, 0.5);
  }
}

// ---------------------------------------------------------------- música da passarela (loop curto, estilo desfile)
let musicTimer: ReturnType<typeof setInterval> | null = null;
let musicBeat = 0;
let nextTime = 0;
const SCALE = [0, 3, 5, 7, 10, 12, 15, 17];
const ROOT = 196; // sol grave

export function startMusic() {
  const c = audio();
  if (!c || muted || musicTimer) return;
  musicBeat = 0;
  nextTime = c.currentTime + 0.1;
  const bpm = 112;
  const spb = 60 / bpm / 2; // colcheias
  const sched = () => {
    const cc = audio();
    if (!cc) return;
    while (nextTime < cc.currentTime + 0.35) {
      const b = musicBeat % 16;
      if (b % 4 === 0) tone(90, nextTime, 0.16, "sine", 0.32, 45); // bumbo
      if (b % 4 === 2) noise(nextTime, 0.05, 0.12, 6500, 2); // chimbal
      if (b % 8 === 4) noise(nextTime, 0.12, 0.1, 2200, 1); // palma
      const bar = Math.floor(musicBeat / 16) % 4;
      const bassRoot = [0, 5, 3, 7][bar];
      if (b % 2 === 0) tone(ROOT * 0.5 * Math.pow(2, (bassRoot + (b % 8 === 6 ? 7 : 0)) / 12), nextTime, spb * 1.6, "sawtooth", 0.07);
      const arp = [0, 2, 4, 2, 5, 4, 2, 1][b % 8];
      tone(ROOT * 2 * Math.pow(2, (SCALE[arp] + bassRoot) / 12), nextTime, spb * 0.9, "triangle", 0.075);
      nextTime += spb;
      musicBeat++;
    }
  };
  sched();
  musicTimer = setInterval(sched, 120);
}

export function stopMusic() {
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = null;
}
