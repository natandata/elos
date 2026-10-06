// Ruído determinístico (mesma seed → mesmo mundo).
export function hashInt(a: number, b: number, c: number, d: number): number {
  let h = Math.imul(a, 0x27d4eb2d) ^ Math.imul(b, 0x165667b1) ^ Math.imul(c, 0x85ebca6b) ^ Math.imul(d, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  h ^= h >>> 15;
  return h >>> 0;
}

export const rand01 = (seed: number, x: number, y: number, z: number): number => hashInt(seed, x, y, z) / 4294967296;

const sm = (t: number) => t * t * (3 - 2 * t);

export function noise2(seed: number, x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const u = sm(x - xi);
  const v = sm(y - yi);
  const a = rand01(seed, xi, yi, 1);
  const b = rand01(seed, xi + 1, yi, 1);
  const c = rand01(seed, xi, yi + 1, 1);
  const d = rand01(seed, xi + 1, yi + 1, 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function noise3(seed: number, x: number, y: number, z: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const u = sm(x - xi);
  const v = sm(y - yi);
  const w = sm(z - zi);
  const r = (dx: number, dy: number, dz: number) => rand01(seed, xi + dx, yi + dy, zi + dz);
  const x00 = r(0, 0, 0) + (r(1, 0, 0) - r(0, 0, 0)) * u;
  const x10 = r(0, 1, 0) + (r(1, 1, 0) - r(0, 1, 0)) * u;
  const x01 = r(0, 0, 1) + (r(1, 0, 1) - r(0, 0, 1)) * u;
  const x11 = r(0, 1, 1) + (r(1, 1, 1) - r(0, 1, 1)) * u;
  const y0 = x00 + (x10 - x00) * v;
  const y1 = x01 + (x11 - x01) * v;
  return y0 + (y1 - y0) * w;
}

export function fbm2(seed: number, x: number, y: number, octaves = 4): number {
  let amp = 1;
  let f = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += noise2(seed + i * 131, x * f, y * f) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }
  return sum / norm;
}

export function seedFromString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h | 0;
}

export const smoothstep = (a: number, b: number, v: number): number => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
