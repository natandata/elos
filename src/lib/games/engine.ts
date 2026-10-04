import { ORDER, QUIZ, VERSES, WHO, type OrderSet, type QuizItem, type VerseItem, type WhoItem } from "./content";

// ---------------------------------------------------------------- datas / sorteio

export function todayBR(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

/** Segunda-feira da semana corrente (Brasília), "YYYY-MM-DD". */
export function weekStartBR(): string {
  const today = todayBR();
  const d = new Date(`${today}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // segunda = 0
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

function dayIndex(date: string): number {
  return Math.floor(new Date(`${date}T00:00:00Z`).getTime() / 86_400_000);
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: string): () => number {
  let a = hashString(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: readonly T[], seed: string): T[] {
  const r = rng(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Escolhe `count` itens do dia sem repetir dentro de um ciclo da lista. */
function pickDaily<T>(pool: readonly T[], count: number, date: string, salt: string): T[] {
  const perCycle = Math.max(1, Math.floor(pool.length / count));
  const day = dayIndex(date);
  const cycle = Math.floor(day / perCycle);
  const order = shuffle(pool, `${salt}:cycle:${cycle}`);
  const start = (day % perCycle) * count;
  return order.slice(start, start + count);
}

// ---------------------------------------------------------------- perguntas

export type Question = { prompt: string; options: string[]; correctIdx: number; ref: string };
export type PublicQuestion = { prompt: string; options: string[] };

function buildQuiz(item: QuizItem, seed: string): Question {
  const options = shuffle([item.a, ...item.w], `${seed}:${item.q}`);
  return { prompt: item.q, options, correctIdx: options.indexOf(item.a), ref: item.ref };
}

function buildVerse(item: VerseItem, seed: string): Question {
  const options = shuffle([item.a, ...item.w], `${seed}:${item.ref}`);
  const prompt = [item.before, "_____", item.after].filter(Boolean).join(" ");
  return { prompt, options, correctIdx: options.indexOf(item.a), ref: item.ref };
}

export const QUESTION_COUNT = { quiz: 5, verse: 3, duel: 5 } as const;

export function dailyQuestions(game: "quiz" | "verse", date = todayBR()): Question[] {
  if (game === "quiz") {
    return pickDaily(QUIZ, QUESTION_COUNT.quiz, date, "quiz").map((q) => buildQuiz(q, date));
  }
  return pickDaily(VERSES, QUESTION_COUNT.verse, date, "verse").map((v) => buildVerse(v, date));
}

export function duelQuestions(duelId: string): Question[] {
  return shuffle(QUIZ, `duel:${duelId}`)
    .slice(0, QUESTION_COUNT.duel)
    .map((q) => buildQuiz(q, duelId));
}

export function toPublic(questions: Question[]): PublicQuestion[] {
  return questions.map((q) => ({ prompt: q.prompt, options: q.options }));
}

export function xpForQuiz(score: number): number {
  return score >= 5 ? 2 : score >= 3 ? 1 : 0;
}
export function xpForVerse(score: number): number {
  return score >= 3 ? 2 : score >= 2 ? 1 : 0;
}

// ---------------------------------------------------------------- Quem Sou Eu?

export const WHO_OPTIONS = 5;
export const WHO_MAX_GUESSES = 4;

export type WhoRound = { item: WhoItem; options: string[]; correctIdx: number };

export function dailyWho(date = todayBR()): WhoRound {
  const [item] = pickDaily(WHO, 1, date, "who");
  const others = shuffle(
    WHO.filter((w) => w.key !== item.key),
    `who-others:${date}`,
  ).slice(0, WHO_OPTIONS - 1);
  const options = shuffle([item.name, ...others.map((o) => o.name)], `who-opts:${date}`);
  return { item, options, correctIdx: options.indexOf(item.name) };
}

// ---------------------------------------------------------------- Ordene os Fatos

export type OrderRound = { set: OrderSet; shuffled: string[]; correctOrder: number[] };

/** `shuffled` é o que o jogador vê; `correctOrder[i]` é o índice (em `shuffled`)
 *  do evento que deve ocupar a posição i da linha do tempo. */
export function dailyOrder(date = todayBR()): OrderRound {
  const [set] = pickDaily(ORDER, 1, date, "order");
  let shuffled = shuffle(set.events, `order:${date}`);
  // evita que o embaralhado já saia na ordem certa
  if (shuffled.every((e, i) => e === set.events[i])) shuffled = [...shuffled.slice(1), shuffled[0]];
  const correctOrder = set.events.map((e) => shuffled.indexOf(e));
  return { set, shuffled, correctOrder };
}

// ---------------------------------------------------------------- baú

export function weightedPick<T>(items: T[], weight: (t: T) => number): T | null {
  const total = items.reduce((s, i) => s + weight(i), 0);
  if (items.length === 0 || total <= 0) return null;
  let roll = Math.random() * total;
  for (const item of items) {
    roll -= weight(item);
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}
