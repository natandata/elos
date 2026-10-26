import { seededShuffle } from "@/lib/english/grade";

// Regras puras da economia do Babel (client-safe). Os valores pagos de verdade ficam no banco (migração 0236);
// aqui ficam só as leituras: corações com recarga, missões do dia e preços da loja (precisam bater com o banco).

export const MAX_HEARTS = 5;
export const HEART_REGEN_MS = 4 * 3_600_000;
export const GOALS = [
  { xp: 10, label: "Casual", hint: "5 min por dia" },
  { xp: 20, label: "Regular", hint: "10 min por dia" },
  { xp: 30, label: "Sério", hint: "15 min por dia" },
  { xp: 50, label: "Intenso", hint: "20 min por dia" },
] as const;

export const SHOP = {
  freeze: { price: 100, title: "Congelar ofensiva", desc: "Se você faltar 1 dia, sua ofensiva não zera. Guarde até 2." },
  refill: { price: 80, title: "Recarregar corações", desc: "Enche os 5 corações na hora." },
  boost: { price: 50, title: "XP em dobro (15 min)", desc: "Todo XP que você ganhar nos próximos 15 minutos vale o dobro." },
} as const;
export type ShopItem = keyof typeof SHOP;

/** Corações agora, contando a recarga de 1 a cada 4 horas desde `heartsAt`. */
export function heartsNow(hearts: number, heartsAt: string | null, now = Date.now()): { hearts: number; nextAt: number | null } {
  if (hearts >= MAX_HEARTS || !heartsAt) return { hearts: Math.min(hearts, MAX_HEARTS), nextAt: null };
  const t0 = new Date(heartsAt).getTime();
  const n = Math.max(0, Math.floor((now - t0) / HEART_REGEN_MS));
  const h = Math.min(MAX_HEARTS, hearts + n);
  return { hearts: h, nextAt: h >= MAX_HEARTS ? null : t0 + (n + 1) * HEART_REGEN_MS };
}

export type DailyStats = { xp: number; lessons: number; perfects: number; roleplays: number; practices: number };
export type Quest = { id: string; title: string; target: number; metric: keyof DailyStats; gems: number };

const POOL: Quest[] = [
  { id: "xp30", title: "Ganhe 30 XP", target: 30, metric: "xp", gems: 10 },
  { id: "xp50", title: "Ganhe 50 XP", target: 50, metric: "xp", gems: 15 },
  { id: "les2", title: "Complete 2 lições", target: 2, metric: "lessons", gems: 10 },
  { id: "les3", title: "Complete 3 lições", target: 3, metric: "lessons", gems: 15 },
  { id: "perf1", title: "Faça 1 lição perfeita", target: 1, metric: "perfects", gems: 15 },
  { id: "perf2", title: "Faça 2 lições perfeitas", target: 2, metric: "perfects", gems: 20 },
  { id: "rp1", title: "Converse com um personagem", target: 1, metric: "roleplays", gems: 15 },
  { id: "pr1", title: "Treine os seus erros", target: 1, metric: "practices", gems: 10 },
];
export const CHEST_GEMS = 30;
export const CHEST_IDX = 9;

/** 3 missões do dia, sempre as mesmas para a mesma pessoa no mesmo dia, de tipos diferentes. */
export function dailyQuests(userId: string, day: string): Quest[] {
  const shuffled = seededShuffle(POOL, `${userId}:${day}`);
  const out: Quest[] = [];
  const metrics = new Set<string>();
  for (const q of shuffled) {
    if (metrics.has(q.metric)) continue;
    metrics.add(q.metric);
    out.push(q);
    if (out.length === 3) break;
  }
  return out;
}

export const questProgress = (q: Quest, d: DailyStats) => Math.min(q.target, d[q.metric]);

export const WEEK_LETTERS = ["S", "T", "Q", "Q", "S", "S", "D"];
