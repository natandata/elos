import { ORDER, QUIZ, VERSES, WHO, type Level, type OrderSet, type QuizItem, type VerseItem, type WhoItem } from "./content";
import { OPTION_COUNT, rules, WHO_RULES, type StoredDifficulty } from "./difficulty";

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

/** Bloco de 3 horas do dia em Brasília (0 a 7) em que a partida foi criada. */
function blockOf(createdAt?: string | null): number {
  const at = createdAt ? new Date(createdAt) : new Date();
  const h = Number(at.toLocaleString("en-GB", { timeZone: "America/Sao_Paulo", hour: "2-digit", hour12: false })) % 24;
  return Math.floor(h / 3);
}

/**
 * Data de sorteio da partida. A cada 3 horas o sorteio muda por completo (outro "dia" na lista),
 * congelado no momento em que a partida foi criada (`createdAt`) pra as perguntas não trocarem no meio.
 * Treino (jogar de novo no mesmo dia) também usa o sorteio de outro dia, pra não repetir.
 */
export function practiceDate(date: string, variant: number, createdAt?: string | null): string {
  const shift = blockOf(createdAt) * 53 + (variant > 0 ? variant * 37 + 11 : 0);
  if (shift === 0) return date;
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + shift);
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

export function shuffle<T>(items: readonly T[], seed: string): T[] {
  const r = rng(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Escolhe `count` itens do dia sem repetir dentro de um ciclo da lista. */
export function pickDaily<T>(pool: readonly T[], count: number, date: string, salt: string): T[] {
  const perCycle = Math.max(1, Math.floor(pool.length / count));
  const day = dayIndex(date);
  const cycle = Math.floor(day / perCycle);
  const order = shuffle(pool, `${salt}:cycle:${cycle}`);
  const start = (day % perCycle) * count;
  return order.slice(start, start + count);
}

// ---------------------------------------------------------------- perguntas

export type Question = { prompt: string; options: string[]; correctIdx: number; ref: string };
export type PublicQuestion = { prompt: string; options: string[]; ref: string };

const LEVEL: Record<"facil" | "medio" | "dificil", Level> = { facil: 1, medio: 2, dificil: 3 };

/** Sorteio do dia por dificuldade; "legacy" mantém o sorteio antigo (lista toda). */
function poolFor<T extends { d: Level }>(pool: readonly T[], diff: StoredDifficulty, legacySize = pool.length): readonly T[] {
  return diff === "legacy" ? pool.slice(0, legacySize) : pool.filter((i) => i.d === LEVEL[diff]);
}

// Tamanho da lista de perguntas na época do "legacy" (as novas entram no fim).
const LEGACY_QUIZ_SIZE = 57;
const saltFor = (salt: string, diff: StoredDifficulty) => (diff === "legacy" ? salt : `${salt}:${diff}`);
const optionCount = (diff: StoredDifficulty) => (diff === "legacy" ? 4 : OPTION_COUNT[diff]);

function buildQuiz(item: QuizItem, seed: string, count = 4): Question {
  const options = shuffle([item.a, ...item.w.slice(0, count - 1)], `${seed}:${item.q}`);
  return { prompt: item.q, options, correctIdx: options.indexOf(item.a), ref: item.ref };
}

function buildVerse(item: VerseItem, seed: string, count = 4): Question {
  const options = shuffle([item.a, ...item.w.slice(0, count - 1)], `${seed}:${item.ref}`);
  // pontuação logo depois da lacuna fica colada ("_____;"), não solta ("_____ ;")
  const glue = /^[;,.:?!]/.test(item.after) ? "" : " ";
  const prompt = `${item.before ? `${item.before} ` : ""}_____${item.after ? `${glue}${item.after}` : ""}`;
  return { prompt, options, correctIdx: options.indexOf(item.a), ref: item.ref };
}

export const QUESTION_COUNT = { quiz: 5, verse: 3, duel: 5 } as const;

export function dailyQuestions(game: "quiz" | "verse", diff: StoredDifficulty, date = todayBR()): Question[] {
  const n = optionCount(diff);
  if (game === "quiz") {
    return pickDaily(poolFor(QUIZ, diff, LEGACY_QUIZ_SIZE), QUESTION_COUNT.quiz, date, saltFor("quiz", diff)).map((q) => buildQuiz(q, date, n));
  }
  return pickDaily(poolFor(VERSES, diff), QUESTION_COUNT.verse, date, saltFor("verse", diff)).map((v) => buildVerse(v, date, n));
}

export function duelQuestions(duelId: string): Question[] {
  return shuffle(QUIZ, `duel:${duelId}`)
    .slice(0, QUESTION_COUNT.duel)
    .map((q) => buildQuiz(q, duelId));
}

export function toPublic(questions: Question[]): PublicQuestion[] {
  return questions.map((q) => ({ prompt: q.prompt, options: q.options, ref: q.ref }));
}

// ---------------------------------------------------------------- Quem Sou Eu?

export const WHO_OPTIONS = 5;

export type WhoRound = { item: WhoItem; options: string[]; correctIdx: number; startHints: number; maxGuesses: number };

export function dailyWho(diff: StoredDifficulty, date = todayBR()): WhoRound {
  const [item] = pickDaily(poolFor(WHO, diff), 1, date, saltFor("who", diff));
  const others = shuffle(
    WHO.filter((w) => w.key !== item.key),
    `who-others:${date}`,
  ).slice(0, WHO_OPTIONS - 1);
  const options = shuffle([item.name, ...others.map((o) => o.name)], `who-opts:${date}`);
  const r = WHO_RULES[rules(diff)];
  return { item, options, correctIdx: options.indexOf(item.name), startHints: r.startHints, maxGuesses: r.maxGuesses };
}

// ---------------------------------------------------------------- Ordene os Fatos

export type OrderRound = { set: OrderSet; shuffled: string[]; correctOrder: number[] };

/** `shuffled` é o que o jogador vê; `correctOrder[i]` é o índice (em `shuffled`)
 *  do evento que deve ocupar a posição i da linha do tempo. */
export function dailyOrder(diff: StoredDifficulty, date = todayBR()): OrderRound {
  const [set] = pickDaily(poolFor(ORDER, diff), 1, date, saltFor("order", diff));
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
