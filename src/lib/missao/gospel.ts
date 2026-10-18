// Missão Madureira: avalia a "passagem" que o jogador escreve para um NPC (sem IA, por enquanto).
// O jogador dá a REFERÊNCIA (ex.: João 3:16) e a IDEIA com as próprias palavras. Nota de 0 a 100:
//   - referência (até 50): versículo evangelístico conhecido = 50; mesmo capítulo dele = 30; outra passagem válida = 15;
//   - ideia (até 50): cobre os pontos do evangelho (Deus/amor, pecado, Jesus, cruz/ressurreição, fé/arrependimento,
//     graça/salvação) e combina com o versículo citado.
// 70% ou mais = o NPC foi evangelizado. Bíblia protestante (66 livros, ARA).

type Book = { name: string; ch: number; alias: string[] };

const BOOKS: Book[] = [
  { name: "Gênesis", ch: 50, alias: ["gn", "gen", "genesis"] },
  { name: "Êxodo", ch: 40, alias: ["ex", "exo", "exodo"] },
  { name: "Levítico", ch: 27, alias: ["lv", "lev", "levitico"] },
  { name: "Números", ch: 36, alias: ["nm", "num", "numeros"] },
  { name: "Deuteronômio", ch: 34, alias: ["dt", "deut", "deuteronomio"] },
  { name: "Josué", ch: 24, alias: ["js", "jos", "josue"] },
  { name: "Juízes", ch: 21, alias: ["jz", "jui", "juizes"] },
  { name: "Rute", ch: 4, alias: ["rt", "rute"] },
  { name: "1 Samuel", ch: 31, alias: ["1sm", "1sam", "1samuel", "isamuel"] },
  { name: "2 Samuel", ch: 24, alias: ["2sm", "2sam", "2samuel", "iisamuel"] },
  { name: "1 Reis", ch: 22, alias: ["1rs", "1re", "1reis", "ireis"] },
  { name: "2 Reis", ch: 25, alias: ["2rs", "2re", "2reis", "iireis"] },
  { name: "1 Crônicas", ch: 29, alias: ["1cr", "1cro", "1cronicas"] },
  { name: "2 Crônicas", ch: 36, alias: ["2cr", "2cro", "2cronicas"] },
  { name: "Esdras", ch: 10, alias: ["ed", "esd", "esdras"] },
  { name: "Neemias", ch: 13, alias: ["ne", "nee", "neemias"] },
  { name: "Ester", ch: 10, alias: ["et", "est", "ester"] },
  { name: "Jó", ch: 42, alias: ["jo_", "job"] },
  { name: "Salmos", ch: 150, alias: ["sl", "sal", "salmo", "salmos"] },
  { name: "Provérbios", ch: 31, alias: ["pv", "pr", "prov", "proverbios"] },
  { name: "Eclesiastes", ch: 12, alias: ["ec", "ecl", "eclesiastes"] },
  { name: "Cânticos", ch: 8, alias: ["ct", "can", "cantico", "canticos", "cantares"] },
  { name: "Isaías", ch: 66, alias: ["is", "isa", "isaias"] },
  { name: "Jeremias", ch: 52, alias: ["jr", "jer", "jeremias"] },
  { name: "Lamentações", ch: 5, alias: ["lm", "lam", "lamentacoes"] },
  { name: "Ezequiel", ch: 48, alias: ["ez", "eze", "ezequiel"] },
  { name: "Daniel", ch: 12, alias: ["dn", "dan", "daniel"] },
  { name: "Oseias", ch: 14, alias: ["os", "ose", "oseias"] },
  { name: "Joel", ch: 3, alias: ["jl", "joel"] },
  { name: "Amós", ch: 9, alias: ["am", "amos"] },
  { name: "Obadias", ch: 1, alias: ["ob", "obadias"] },
  { name: "Jonas", ch: 4, alias: ["jn", "jon", "jonas"] },
  { name: "Miqueias", ch: 7, alias: ["mq", "miq", "miqueias"] },
  { name: "Naum", ch: 3, alias: ["na", "naum"] },
  { name: "Habacuque", ch: 3, alias: ["hc", "hab", "habacuque"] },
  { name: "Sofonias", ch: 3, alias: ["sf", "sof", "sofonias"] },
  { name: "Ageu", ch: 2, alias: ["ag", "ageu"] },
  { name: "Zacarias", ch: 14, alias: ["zc", "zac", "zacarias"] },
  { name: "Malaquias", ch: 4, alias: ["ml", "mal", "malaquias"] },
  { name: "Mateus", ch: 28, alias: ["mt", "mat", "mateus"] },
  { name: "Marcos", ch: 16, alias: ["mc", "mar", "marcos"] },
  { name: "Lucas", ch: 24, alias: ["lc", "luc", "lucas"] },
  { name: "João", ch: 21, alias: ["jo", "joa", "joao"] },
  { name: "Atos", ch: 28, alias: ["at", "atos"] },
  { name: "Romanos", ch: 16, alias: ["rm", "rom", "romanos"] },
  { name: "1 Coríntios", ch: 16, alias: ["1co", "1cor", "1corintios"] },
  { name: "2 Coríntios", ch: 13, alias: ["2co", "2cor", "2corintios"] },
  { name: "Gálatas", ch: 6, alias: ["gl", "gal", "galatas"] },
  { name: "Efésios", ch: 6, alias: ["ef", "efe", "efesios"] },
  { name: "Filipenses", ch: 4, alias: ["fp", "fil", "filipenses"] },
  { name: "Colossenses", ch: 4, alias: ["cl", "col", "colossenses"] },
  { name: "1 Tessalonicenses", ch: 5, alias: ["1ts", "1tes", "1tessalonicenses"] },
  { name: "2 Tessalonicenses", ch: 3, alias: ["2ts", "2tes", "2tessalonicenses"] },
  { name: "1 Timóteo", ch: 6, alias: ["1tm", "1tim", "1timoteo"] },
  { name: "2 Timóteo", ch: 4, alias: ["2tm", "2tim", "2timoteo"] },
  { name: "Tito", ch: 3, alias: ["tt", "tit", "tito"] },
  { name: "Filemom", ch: 1, alias: ["fm", "flm", "filemom", "filemon"] },
  { name: "Hebreus", ch: 13, alias: ["hb", "heb", "hebreus"] },
  { name: "Tiago", ch: 5, alias: ["tg", "tia", "tiago"] },
  { name: "1 Pedro", ch: 5, alias: ["1pe", "1ped", "1pedro"] },
  { name: "2 Pedro", ch: 3, alias: ["2pe", "2ped", "2pedro"] },
  { name: "1 João", ch: 5, alias: ["1jo", "1joao"] },
  { name: "2 João", ch: 1, alias: ["2jo", "2joao"] },
  { name: "3 João", ch: 1, alias: ["3jo", "3joao"] },
  { name: "Judas", ch: 1, alias: ["jd", "jud", "judas"] },
  { name: "Apocalipse", ch: 22, alias: ["ap", "apo", "apocalipse"] },
];

export const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9:.,\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const ALIAS = new Map<string, number>();
BOOKS.forEach((b, i) => {
  ALIAS.set(norm(b.name).replace(/\s/g, ""), i);
  for (const a of b.alias) ALIAS.set(a.replace(/_$/, ""), i);
});
// "Jó" e "João": "jo" é João (mais comum em evangelismo); Jó é "job" ou "jó" com acento
ALIAS.set("jo", BOOKS.findIndex((b) => b.name === "João"));

export type Ref = { book: number; ch: number; v0: number; v1: number };

/** Lê uma referência: "João 3:16", "jo 3.16", "Rm 5:8-9", "1 Jo 1 9", "Romanos 10 9". */
export function parseRef(input: string): Ref | null {
  const raw = input.trim();
  // Jó com acento antes de normalizar
  const isJob = /^j[óò](\s|\d|$)/i.test(raw);
  const s = norm(raw).replace(/\b(cap(itulo)?|vers(iculo)?|v)\b\.?/g, " ");
  const m = s.match(/^([1-3]?\s?[a-z]+)\s*(\d{1,3})\s*[:.,\s]\s*(\d{1,3})(?:\s*-\s*(\d{1,3}))?/);
  if (!m) return null;
  const key = m[1].replace(/\s/g, "");
  const book = isJob ? BOOKS.findIndex((b) => b.name === "Jó") : ALIAS.get(key);
  if (book === undefined || book < 0) return null;
  const ch = Number(m[2]);
  const v0 = Number(m[3]);
  const v1 = m[4] ? Number(m[4]) : v0;
  if (ch < 1 || ch > BOOKS[book].ch || v0 < 1 || v0 > 176 || v1 < v0 || v1 - v0 > 12) return null;
  return { book, ch, v0, v1 };
}

export const refLabel = (r: Ref) => `${BOOKS[r.book].name} ${r.ch}:${r.v0}${r.v1 !== r.v0 ? `-${r.v1}` : ""}`;

// ------------------------------------------------------------------ versículos evangelísticos

/** Temas do evangelho que a ideia deve cobrir (palavras-chave já sem acento). */
export const THEMES = [
  { id: "amor", label: "o amor de Deus", words: ["deus", "amor", "ama", "amou", "pai", "criador"] },
  { id: "pecado", label: "o pecado e a nossa necessidade", words: ["peca", "pecou", "perdid", "morte", "separad", "culpa", "erro", "condena", "longe de deus", "inferno", "juizo"] },
  { id: "jesus", label: "quem é Jesus", words: ["jesus", "cristo", "filho", "senhor", "salvador", "messias", "cordeiro"] },
  { id: "cruz", label: "a cruz e a ressurreição", words: ["cruz", "morreu", "morte dele", "sangue", "ressuscit", "ressurrei", "vivo", "sacrificio", "pagou", "levou", "tumulo"] },
  { id: "fe", label: "fé e arrependimento", words: ["crer", "cre", "creia", "creu", "fe", "confia", "receb", "arrepend", "converte", "entrega", "aceita", "confess", "segui"] },
  { id: "graca", label: "graça, perdão e vida eterna", words: ["graca", "perdao", "perdoa", "salva", "salvo", "salvacao", "vida eterna", "eterna", "ceu", "liberta", "nova vida", "novo nascimento", "nascer de novo", "presente", "dom"] },
] as const;

type ThemeId = (typeof THEMES)[number]["id"];

/** Versículos clássicos do evangelismo e os temas de cada um. */
const KEY: { b: string; ch: number; v0: number; v1?: number; t: ThemeId[] }[] = [
  { b: "João", ch: 3, v0: 16, t: ["amor", "jesus", "fe", "graca"] },
  { b: "João", ch: 3, v0: 3, t: ["graca", "fe"] },
  { b: "João", ch: 3, v0: 17, t: ["amor", "jesus", "graca"] },
  { b: "João", ch: 3, v0: 36, t: ["fe", "graca", "pecado"] },
  { b: "João", ch: 1, v0: 12, t: ["fe", "jesus", "graca"] },
  { b: "João", ch: 1, v0: 29, t: ["jesus", "pecado", "cruz"] },
  { b: "João", ch: 5, v0: 24, t: ["fe", "graca", "pecado"] },
  { b: "João", ch: 6, v0: 37, t: ["jesus", "fe"] },
  { b: "João", ch: 8, v0: 12, t: ["jesus", "graca"] },
  { b: "João", ch: 8, v0: 32, t: ["graca"] },
  { b: "João", ch: 8, v0: 36, t: ["jesus", "graca"] },
  { b: "João", ch: 10, v0: 10, t: ["jesus", "graca"] },
  { b: "João", ch: 10, v0: 28, t: ["graca", "jesus"] },
  { b: "João", ch: 11, v0: 25, t: ["jesus", "cruz", "fe", "graca"] },
  { b: "João", ch: 14, v0: 6, t: ["jesus", "fe", "graca"] },
  { b: "Romanos", ch: 1, v0: 16, t: ["graca", "fe"] },
  { b: "Romanos", ch: 3, v0: 23, t: ["pecado"] },
  { b: "Romanos", ch: 3, v0: 24, t: ["graca", "jesus"] },
  { b: "Romanos", ch: 5, v0: 8, t: ["amor", "pecado", "cruz", "jesus"] },
  { b: "Romanos", ch: 5, v0: 1, t: ["fe", "jesus", "graca"] },
  { b: "Romanos", ch: 6, v0: 23, t: ["pecado", "graca", "jesus"] },
  { b: "Romanos", ch: 8, v0: 1, t: ["jesus", "graca", "pecado"] },
  { b: "Romanos", ch: 10, v0: 9, v1: 10, t: ["fe", "jesus", "cruz", "graca"] },
  { b: "Romanos", ch: 10, v0: 13, t: ["fe", "graca", "jesus"] },
  { b: "Romanos", ch: 10, v0: 17, t: ["fe"] },
  { b: "1 Coríntios", ch: 15, v0: 3, v1: 4, t: ["jesus", "cruz", "pecado"] },
  { b: "2 Coríntios", ch: 5, v0: 17, t: ["jesus", "graca"] },
  { b: "2 Coríntios", ch: 5, v0: 21, t: ["jesus", "pecado", "cruz", "graca"] },
  { b: "Gálatas", ch: 2, v0: 20, t: ["jesus", "cruz", "fe", "amor"] },
  { b: "Efésios", ch: 2, v0: 8, v1: 9, t: ["graca", "fe"] },
  { b: "Colossenses", ch: 1, v0: 13, v1: 14, t: ["graca", "jesus", "pecado"] },
  { b: "1 Timóteo", ch: 1, v0: 15, t: ["jesus", "pecado", "graca"] },
  { b: "1 Timóteo", ch: 2, v0: 5, t: ["jesus", "amor"] },
  { b: "Tito", ch: 3, v0: 5, t: ["graca", "amor"] },
  { b: "Hebreus", ch: 7, v0: 25, t: ["jesus", "graca"] },
  { b: "Hebreus", ch: 9, v0: 27, t: ["pecado"] },
  { b: "1 Pedro", ch: 2, v0: 24, t: ["jesus", "cruz", "pecado"] },
  { b: "1 Pedro", ch: 3, v0: 18, t: ["jesus", "cruz", "pecado", "amor"] },
  { b: "2 Pedro", ch: 3, v0: 9, t: ["amor", "fe"] },
  { b: "1 João", ch: 1, v0: 9, t: ["fe", "pecado", "graca"] },
  { b: "1 João", ch: 4, v0: 9, v1: 10, t: ["amor", "jesus", "cruz"] },
  { b: "1 João", ch: 5, v0: 11, v1: 12, t: ["graca", "jesus", "fe"] },
  { b: "Atos", ch: 2, v0: 38, t: ["fe", "pecado", "graca"] },
  { b: "Atos", ch: 3, v0: 19, t: ["fe", "pecado", "graca"] },
  { b: "Atos", ch: 4, v0: 12, t: ["jesus", "graca"] },
  { b: "Atos", ch: 16, v0: 31, t: ["fe", "jesus", "graca"] },
  { b: "Mateus", ch: 11, v0: 28, t: ["jesus", "graca"] },
  { b: "Mateus", ch: 16, v0: 26, t: ["pecado", "graca"] },
  { b: "Marcos", ch: 1, v0: 15, t: ["fe", "graca"] },
  { b: "Marcos", ch: 10, v0: 45, t: ["jesus", "cruz"] },
  { b: "Lucas", ch: 19, v0: 10, t: ["jesus", "pecado", "graca"] },
  { b: "Lucas", ch: 15, v0: 7, t: ["fe", "pecado", "amor"] },
  { b: "Isaías", ch: 53, v0: 5, v1: 6, t: ["cruz", "pecado", "jesus"] },
  { b: "Isaías", ch: 1, v0: 18, t: ["graca", "pecado"] },
  { b: "Ezequiel", ch: 33, v0: 11, t: ["amor", "fe", "pecado"] },
  { b: "Apocalipse", ch: 3, v0: 20, t: ["jesus", "fe"] },
  { b: "Salmos", ch: 51, v0: 10, t: ["pecado", "graca"] },
];

const bookIdx = (name: string) => BOOKS.findIndex((b) => b.name === name);
const KEYS = KEY.map((k) => ({ ...k, book: bookIdx(k.b), v1: k.v1 ?? k.v0 }));

/** Sugestões para quem não lembra (aparecem como dica na tela). */
export const SUGGESTIONS = ["João 3:16", "Romanos 3:23", "Romanos 6:23", "Romanos 5:8", "Romanos 10:9", "Efésios 2:8-9", "João 14:6", "1 João 1:9", "Atos 4:12", "2 Coríntios 5:17"];

export type Verdict = {
  score: number;
  refScore: number;
  ideaScore: number;
  ref: string | null;
  /** temas que apareceram na ideia */
  hit: string[];
  /** dica do que faltou */
  tips: string[];
  ok: boolean;
};

export const PASS = 70;

function themesIn(text: string): ThemeId[] {
  const t = ` ${norm(text)} `;
  const out: ThemeId[] = [];
  for (const th of THEMES) {
    if (th.words.some((w) => (w.length <= 3 ? new RegExp(`\\b${w}\\b`).test(t) : t.includes(w)))) out.push(th.id);
  }
  return out;
}

/**
 * Avalia a passagem. `used` = referências já usadas nesta rodada (repetir a mesma vale menos).
 */
export function judge(refText: string, idea: string, used: string[] = []): Verdict {
  const tips: string[] = [];
  const ref = parseRef(refText);
  let refScore = 0;
  let keyThemes: ThemeId[] = [];
  if (!ref) {
    tips.push("Escreva a referência assim: João 3:16.");
  } else {
    const exact = KEYS.find((k) => k.book === ref.book && k.ch === ref.ch && ref.v0 <= k.v1 && ref.v1 >= k.v0);
    const sameCh = KEYS.find((k) => k.book === ref.book && k.ch === ref.ch);
    if (exact) {
      refScore = 50;
      keyThemes = exact.t;
    } else if (sameCh) {
      refScore = 30;
      keyThemes = sameCh.t;
      tips.push(`Quase! Um versículo bem conhecido desse capítulo é ${BOOKS[sameCh.book].name} ${sameCh.ch}:${sameCh.v0}.`);
    } else {
      refScore = 15;
      tips.push("Essa passagem existe, mas não é das que mais falam da salvação. Tente João 3:16 ou Romanos 6:23.");
    }
    const label = refLabel(ref);
    const times = used.filter((u) => u === label).length;
    if (times > 0) {
      refScore = Math.max(0, refScore - 15 * times);
      tips.push("Você já usou essa passagem: varie para render mais.");
    }
  }

  const words = norm(idea).split(" ").filter(Boolean).length;
  const hit = themesIn(idea);
  let ideaScore = 0;
  if (words >= 4) {
    ideaScore = hit.length * 8;
    // combina com o versículo citado
    const match = keyThemes.filter((t) => hit.includes(t)).length;
    if (keyThemes.length) ideaScore += Math.round((match / keyThemes.length) * 8);
    if (words >= 10) ideaScore += 2;
  } else {
    tips.push("Conte a ideia com as suas palavras (pelo menos uma frase).");
  }
  ideaScore = Math.min(50, ideaScore);
  const missing = THEMES.filter((t) => !hit.includes(t.id));
  if (ideaScore < 40 && missing.length) tips.push(`Fale também sobre ${missing.slice(0, 2).map((m) => m.label).join(" e ")}.`);

  const score = Math.max(0, Math.min(100, refScore + ideaScore));
  return {
    score,
    refScore,
    ideaScore,
    ref: ref ? refLabel(ref) : null,
    hit: THEMES.filter((t) => hit.includes(t.id)).map((t) => t.label),
    tips: score >= PASS ? [] : tips.slice(0, 2),
    ok: score >= PASS,
  };
}
