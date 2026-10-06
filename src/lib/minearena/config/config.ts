// Constantes do MINEARENA. Mexa aqui pra equilibrar.
export const CHUNK = 16;
export const WORLD_H = 64;
export const SEA_LEVEL = 20;
/** Duração de um dia completo (amanhecer → noite), em segundos. */
export const DAY_SECONDS = 600;
export const REACH = 5;
export const AUTOSAVE_S = 20;

export const PLAYER = {
  w: 0.6,
  h: 1.8,
  eye: 1.62,
  walk: 4.3,
  sprint: 6,
  jump: 8.6,
  gravity: 26,
  maxHealth: 20,
  maxHunger: 20,
} as const;

export const RENDER_DISTANCE = { mobile: 4, desktop: 6 } as const;
export const MAX_ENTITIES = { mobile: 14, desktop: 22 } as const;
