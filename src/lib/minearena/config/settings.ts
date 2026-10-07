// Opções do jogador (guardadas neste aparelho). 0 em fov/distância = "Padrão" (varia com o aparelho).
export interface Settings {
  fov: number;
  distance: number;
  sensitivity: number;
  volume: number;
  clouds: boolean;
  particles: boolean;
  coords: boolean;
  invertY: boolean;
  /** Tamanho dos controles de toque: 0 pequeno · 1 médio · 2 grande. */
  touchSize: 0 | 1 | 2;
  /** Gráficos: -1 automático · 0 baixo · 1 médio · 2 alto. */
  quality: -1 | 0 | 1 | 2;
  /** 0 fácil · 1 normal · 2 difícil. */
  difficulty: 0 | 1 | 2;
  /** Música de fundo (faixa em loop). */
  music: boolean;
  /** Balanço da câmera ao andar (desligue se enjoar). */
  bob: boolean;
  /** Troca botões: o pular vai para o centro das setas e o correr para o lado do pular. */
  swapButtons: boolean;
}

export const DEFAULT_SETTINGS: Settings = { fov: 0, distance: 0, sensitivity: 100, volume: 100, clouds: true, particles: true, coords: false, invertY: false, touchSize: 0, quality: -1, difficulty: 1, music: true, bob: true, swapButtons: false };

const KEY = "minearena-options";

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const d = JSON.parse(raw) as Partial<Settings>;
    const n = (v: unknown, lo: number, hi: number, def: number) => (typeof v === "number" && v >= lo && v <= hi ? v : def);
    return {
      fov: n(d.fov, 0, 120, 0),
      distance: n(d.distance, 0, 8, 0),
      sensitivity: n(d.sensitivity, 30, 250, 100),
      volume: n(d.volume, 0, 100, 100),
      clouds: d.clouds !== false,
      particles: d.particles !== false,
      coords: d.coords === true,
      invertY: d.invertY === true,
      touchSize: d.touchSize === 1 || d.touchSize === 2 ? d.touchSize : 0,
      quality: d.quality === 0 || d.quality === 1 || d.quality === 2 ? d.quality : -1,
      difficulty: d.difficulty === 0 || d.difficulty === 2 ? d.difficulty : 1,
      music: d.music !== false,
      bob: d.bob !== false,
      swapButtons: d.swapButtons === true,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // sem armazenamento: as opções valem só nesta sessão
  }
}
