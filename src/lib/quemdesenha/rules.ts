// Regras de Quem Desenha? (só funções puras e números, client-safe): conferir palpite, pontuar, pistas e títulos.
import { LEVEL_LABEL, WORDS, wordsFor, type Category, type Culture, type Level, type Word } from "./words";

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 12;

export type Settings = {
  /** quantas vezes cada pessoa desenha */
  rounds: number;
  /** segundos para desenhar */
  drawSeconds: number;
  culture: Culture;
  category: Category | "todas";
  /** "mista" sorteia as três dificuldades */
  level: Level | "mista";
  maxPlayers: number;
  /** completa a sala com sobreviventes do computador (treino) */
  bots: number;
};

export const DEFAULT_SETTINGS: Settings = { rounds: 2, drawSeconds: 60, culture: "biblia", category: "todas", level: "mista", maxPlayers: 8, bots: 0 };

export const CHOOSE_SECONDS = 15;
export const REVEAL_SECONDS = 6;

/** Deixa os ajustes dentro do que existe (o que vem do aparelho nunca é confiável). */
export function cleanSettings(s: Partial<Settings> | undefined): Settings {
  const d = DEFAULT_SETTINGS;
  const num = (v: unknown, lo: number, hi: number, def: number) => (Number.isFinite(Number(v)) ? Math.max(lo, Math.min(hi, Math.floor(Number(v)))) : def);
  const cultures: Culture[] = ["biblia", "at", "nt", "reisprofetas", "personagens", "louvor", "igreja", "kids"];
  const cats = ["todas", "personagens", "animais", "objetos", "lugares", "historias", "conceitos"];
  const levels = ["mista", "facil", "medio", "dificil"];
  return {
    rounds: num(s?.rounds, 1, 4, d.rounds),
    drawSeconds: [30, 45, 60, 90].includes(Number(s?.drawSeconds)) ? Number(s?.drawSeconds) : d.drawSeconds,
    culture: cultures.includes(s?.culture as Culture) ? (s!.culture as Culture) : d.culture,
    category: cats.includes(s?.category as string) ? (s!.category as Settings["category"]) : d.category,
    level: levels.includes(s?.level as string) ? (s!.level as Settings["level"]) : d.level,
    maxPlayers: num(s?.maxPlayers, MIN_PLAYERS, MAX_PLAYERS, d.maxPlayers),
    bots: num(s?.bots, 0, 6, 0),
  };
}

// ---------------------------------------------------------------- palpites
const STOP = new Set(["o", "a", "os", "as", "de", "do", "da", "dos", "das", "e", "um", "uma", "no", "na", "nos", "nas", "ao", "em"]);

/** Minúsculas, sem acento nem pontuação. "Davi!" e "davi" são a mesma coisa. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Igual a `normalize`, tirando artigos e preposições soltas ("a arca de noe" = "arca noe"). */
function core(s: string): string {
  return normalize(s)
    .split(" ")
    .filter((p) => p && !STOP.has(p))
    .join(" ");
}

function lev(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > 2) return 9;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}

export type GuessResult = "certo" | "quase" | "errado";

/**
 * Confere um palpite com a palavra e as variações cadastradas. Só vale o que está no banco:
 * erro de digitação de uma letra passa (a partir de 6 letras); parecido de sentido, não.
 */
export function judgeGuess(word: Word, guess: string): GuessResult {
  const g = core(guess);
  if (g.length < 2) return "errado";
  let near = false;
  for (const form of [word.text, ...word.aliases]) {
    const f = core(form);
    if (!f) continue;
    if (g === f) return "certo";
    const d = lev(g, f);
    if (f.length >= 6 && d === 1) return "certo";
    if (f.length >= 4 && d <= 2) near = true;
  }
  return near ? "quase" : "errado";
}

// ---------------------------------------------------------------- pontos
/** Faixas do spec (0–10 s: 100, …) esticadas para qualquer duração: fração do tempo já usada. */
export function guessPoints(elapsedMs: number, totalMs: number, hintsUsed: number): number {
  const f = Math.max(0, Math.min(1, elapsedMs / Math.max(1, totalMs)));
  const base = f < 1 / 6 ? 100 : f < 1 / 3 ? 80 : f < 1 / 2 ? 60 : f < 3 / 4 ? 40 : 20;
  // cada pista usada tira uma fatia do máximo
  return Math.max(10, Math.round(base * (1 - 0.15 * Math.min(2, hintsUsed))));
}

/** O desenhista ganha pelo que os outros entenderam: todos acertando vale 100. */
export function drawerPoints(correct: number, guessers: number): number {
  if (guessers <= 0 || correct <= 0) return 0;
  return Math.round((100 * correct) / guessers);
}

/** Quantas pistas já saíram (a 1ª com 1/3 do tempo, a 2ª com 2/3). */
export function hintsShown(elapsedMs: number, totalMs: number): number {
  const f = elapsedMs / Math.max(1, totalMs);
  return f >= 2 / 3 ? 2 : f >= 1 / 3 ? 1 : 0;
}

/** "_ _ _ _   _ _" a partir da palavra: letras viram traços, espaços separam as palavras. */
export function maskOf(text: string): string {
  return text
    .split(" ")
    .map((w) => [...w].map((c) => (/[\p{L}\p{N}]/u.test(c) ? "_" : c)).join(" "))
    .join("   ");
}

// ---------------------------------------------------------------- sorteio de palavras
/** Três opções para o desenhista, sem repetir as já usadas na partida. */
export function drawChoices(rand: () => number, s: Settings, used: Set<string>): Word[] {
  const pool = wordsFor(s.culture, s.category);
  const fresh = pool.filter((w) => !used.has(w.id));
  const base = fresh.length >= 3 ? fresh : pool.length >= 3 ? pool : WORDS;
  const out: Word[] = [];
  const take = (list: Word[]) => {
    const l = list.filter((w) => !out.includes(w));
    if (l.length) out.push(l[Math.floor(rand() * l.length)]);
  };
  if (s.level === "mista") {
    // uma de cada nível, quando o recorte tem
    for (const lv of ["facil", "medio", "dificil"] as Level[]) take(base.filter((w) => w.level === lv));
  } else take(base.filter((w) => w.level === s.level));
  while (out.length < 3) {
    const before = out.length;
    take(s.level === "mista" ? base : base.filter((w) => w.level === s.level).concat(base));
    if (out.length === before) break;
  }
  return out.slice(0, 3);
}

// ---------------------------------------------------------------- perfil e títulos
export const TITLES: { stars: number; emoji: string; name: string }[] = [
  { stars: 0, emoji: "🌱", name: "Novo Convertido" },
  { stars: 150, emoji: "📖", name: "Aprendiz das Escrituras" },
  { stars: 500, emoji: "🕊️", name: "Discípulo" },
  { stars: 1200, emoji: "🔥", name: "Servo Fiel" },
  { stars: 2500, emoji: "👑", name: "Conhecedor da Palavra" },
  { stars: 5000, emoji: "📜", name: "Mestre das Escrituras" },
];

export function titleFor(stars: number) {
  let t = TITLES[0];
  for (const x of TITLES) if (stars >= x.stars) t = x;
  const next = TITLES.find((x) => x.stars > stars) ?? null;
  return { title: t, next };
}

export type QdStats = { stars: number; matches: number; wins: number; drawings: number; guesses: number; win_streak: number; best_streak: number };
export const EMPTY_STATS: QdStats = { stars: 0, matches: 0, wins: 0, drawings: 0, guesses: 0, win_streak: 0, best_streak: 0 };

/** O que a pessoa leva da partida (as "estrelas" do perfil). */
export type MatchReport = { players: number; place: number; score: number; drawings: number; guesses: number; seconds: number };
export function matchStars(r: MatchReport): number {
  const place = r.place === 1 ? 40 : r.place === 2 ? 25 : r.place === 3 ? 15 : 5;
  return Math.round(r.score / 10 + place + r.guesses * 2 + r.drawings);
}

export const levelName = (l: Level) => LEVEL_LABEL[l].name;
