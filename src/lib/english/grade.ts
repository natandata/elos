import type { Exercise, RpReport, RpTurn, TurnResult } from "./types";

// Correção por regras (sem IA): normaliza o texto, aceita variações e perdoa erro de digitação pequeno.

/** minúsculas, sem pontuação (menos apóstrofo), espaços únicos. Aspas curvas viram retas. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’ʼ`]/g, "'")
    .replace(/[^a-z0-9'à-ÿ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Distância de edição (Levenshtein). */
export function distance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

export type TypedGrade = { ok: boolean; /** certo, mas com erro de digitação */ typo: boolean; expected: string };

/** Resposta digitada: igual a uma aceita = certa; a 1 letra (frases longas, até 2) de uma aceita = certa com aviso. */
export function gradeTyped(input: string, accepted: string[]): TypedGrade {
  const n = normalize(input);
  const norms = accepted.map(normalize);
  const expected = accepted[0] ?? "";
  if (!n) return { ok: false, typo: false, expected };
  if (norms.includes(n)) return { ok: true, typo: false, expected };
  for (const a of norms) {
    const lim = a.length >= 18 ? 2 : a.length >= 5 ? 1 : 0;
    if (lim > 0 && distance(n, a) <= lim) return { ok: true, typo: true, expected };
  }
  return { ok: false, typo: false, expected };
}

/** Banco de palavras: a frase montada (lista de palavras) contra as respostas aceitas. */
export function gradeBank(words: string[], accepted: string[]): TypedGrade {
  const joined = words.join(" ");
  const n = normalize(joined);
  const ok = accepted.map(normalize).includes(n);
  return { ok, typo: false, expected: accepted[0] ?? "" };
}

/** Embaralha de forma estável (mesma semente = mesma ordem), para o banco de palavras não mudar a cada render. */
export function seededShuffle<T>(list: T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822519);
    h = Math.imul(h ^ (h >>> 13), 3266489917);
    h ^= h >>> 16;
    const j = Math.abs(h) % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Estrelas da lição: 3 com no máximo 1 erro de primeira, 2 com até 3, 1 se terminou. */
export function lessonStars(firstTryWrong: number): 1 | 2 | 3 {
  return firstTryWrong <= 1 ? 3 : firstTryWrong <= 3 ? 2 : 1;
}

/** Fila da lição com repetição dos erros: o exercício errado volta uma vez no fim. */
export function requeue(queue: Exercise[], index: number, wasWrong: boolean, retried: Set<string>): Exercise[] {
  if (!wasWrong) return queue;
  const ex = queue[index];
  if (retried.has(ex.id)) return queue;
  retried.add(ex.id);
  return [...queue, ex];
}

// ------------------------------------------------------------------ conversas (Roleplay roteirizado)

/** Avalia uma resposta digitada numa vez da conversa: 2 = ótima, 1 = parcial/quase, 0 = não serviu. */
export function gradeRoleplayTyped(input: string, turn: RpTurn): 0 | 1 | 2 {
  const n = normalize(input);
  if (!n) return 0;
  if (turn.ans && gradeTyped(input, turn.ans).ok) return 2;
  if (turn.re) for (const src of turn.re) if (new RegExp(src).test(n)) return 2;
  if (turn.keys) {
    const words = new Set(n.split(" "));
    for (const group of turn.keys) if (group.length && group.every((w) => words.has(normalize(w)))) return 1;
  }
  return 0;
}

/** Relatório da conversa: precisão, complexidade (tamanho e variedade das respostas), dicas e frases novas. */
export function roleplayReport(turns: RpTurn[], results: TurnResult[]): RpReport {
  const total = turns.length || 1;
  const points = results.reduce((s, r) => s + r.q, 0);
  const accuracy = Math.round((points / (total * 2)) * 100);
  const replies = results.map((r) => normalize(r.reply)).filter(Boolean);
  const words = replies.reduce((s, r) => s + r.split(" ").length, 0);
  const avg = replies.length ? words / replies.length : 0;
  const unique = new Set(replies.flatMap((r) => r.split(" "))).size;
  // 0-100: frases com ~6+ palavras e vocabulário variado pontuam mais
  const complexity = Math.max(0, Math.min(100, Math.round(Math.min(avg / 7, 1) * 60 + Math.min(unique / 22, 1) * 40)));
  const complexityLabel = complexity >= 70 ? "Ótima: frases completas e variadas" : complexity >= 40 ? "Boa: dá para fazer frases um pouco mais longas" : "Básica: tente responder com frases inteiras";
  const tips = results.filter((r) => r.q < 2).map((r) => turns[r.turn]?.tip).filter((t): t is string => !!t);
  const phrases = results.filter((r) => r.q < 2).map((r) => turns[r.turn]?.model).filter((m): m is string => !!m);
  const best = phrases.length >= 3 ? phrases : [...phrases, ...turns.map((t) => t.model).filter((m) => !phrases.includes(m))];
  return { accuracy, complexity, complexityLabel, words, tips: [...new Set(tips)].slice(0, 4), phrases: best.slice(0, 3) };
}

/** XP de uma lição ou conversa (o servidor confere de novo, com teto por dia). */
export const XP_LESSON = 1;
export const XP_ROLEPLAY = 2;
export const XP_DAILY_LESSONS = 3;
