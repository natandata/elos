import { DEFAULT_SETTINGS, type SaveData, type Settings } from "../core/types";

const key = (uid: string) => `bible-rush:v2:${uid}`;

export function freshSave(): SaveData {
  return {
    unlockedChapter: 1,
    stars: {},
    bestScores: {},
    achievements: [],
    settings: { ...DEFAULT_SETTINGS },
    gallery: [],
    serveStreak: 0,
    totalServed: 0,
    tutorialDone: false,
    seenIntro: [],
    challengeBest: {},
  };
}

/** Lê o progresso salvo neste aparelho; valores ausentes ou inválidos voltam ao padrão. */
export function loadSave(uid: string): SaveData {
  const base = freshSave();
  try {
    const raw = localStorage.getItem(key(uid));
    if (!raw) return base;
    const d = JSON.parse(raw) as Partial<SaveData>;
    const num = (v: unknown, f: number) => (typeof v === "number" && Number.isFinite(v) ? v : f);
    const rec = (v: unknown): Record<string, number> => {
      const out: Record<string, number> = {};
      if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) if (typeof x === "number" && Number.isFinite(x)) out[k] = x;
      return out;
    };
    const strs = (v: unknown, f: string[]) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : f);
    const st: Partial<Settings> = d.settings ?? {};
    return {
      unlockedChapter: Math.max(1, num(d.unlockedChapter, 1)),
      stars: rec(d.stars),
      bestScores: rec(d.bestScores),
      achievements: strs(d.achievements, []),
      settings: {
        volume: Math.min(100, Math.max(0, num(st.volume, DEFAULT_SETTINGS.volume))),
        music: st.music !== false,
        sfx: st.sfx !== false,
        textSpeed: st.textSpeed === "slow" || st.textSpeed === "fast" ? st.textSpeed : "normal",
        uiScale: st.uiScale === "large" ? "large" : "normal",
        colorblind: st.colorblind === true,
        reduceMotion: st.reduceMotion === true,
      },
      gallery: Array.from(new Set([...base.gallery, ...strs(d.gallery, [])])),
      serveStreak: num(d.serveStreak, 0),
      totalServed: num(d.totalServed, 0),
      tutorialDone: d.tutorialDone === true,
      seenIntro: strs(d.seenIntro, []),
      challengeBest: rec(d.challengeBest),
    };
  } catch {
    return base;
  }
}

/** Salva automaticamente; se o aparelho não deixar, o jogo continua e só não guarda o progresso. */
export function writeSave(uid: string, s: SaveData): void {
  try {
    localStorage.setItem(key(uid), JSON.stringify(s));
  } catch {
    // sem armazenamento: vale só nesta sessão
  }
}

export function resetSave(uid: string): void {
  try {
    localStorage.removeItem(key(uid));
  } catch {
    // nada a limpar
  }
}
