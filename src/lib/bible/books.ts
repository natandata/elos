// Os 66 livros da Bíblia protestante com o nome (NVI), a abreviação e o número de capítulos. São só fatos de estrutura;
// o texto da NVI nunca fica no projeto: vem da YouVersion Platform (licença Biblica) a cada leitura. Ver nvi.server.ts.

export type BibleBook = { id: string; name: string; abbr: string; chapters: number; ot: boolean };

const RAW: [string, string, string, number, boolean][] = [
  ["GEN", "Gênesis", "Gn", 50, true],
  ["EXO", "Êxodo", "Êx", 40, true],
  ["LEV", "Levítico", "Lv", 27, true],
  ["NUM", "Números", "Nm", 36, true],
  ["DEU", "Deuteronômio", "Dt", 34, true],
  ["JOS", "Josué", "Js", 24, true],
  ["JDG", "Juízes", "Jz", 21, true],
  ["RUT", "Rute", "Rt", 4, true],
  ["1SA", "1Samuel", "1Sm", 31, true],
  ["2SA", "2Samuel", "2Sm", 24, true],
  ["1KI", "1Reis", "1Rs", 22, true],
  ["2KI", "2Reis", "2Rs", 25, true],
  ["1CH", "1Crônicas", "1Cr", 29, true],
  ["2CH", "2Crônicas", "2Cr", 36, true],
  ["EZR", "Esdras", "Ed", 10, true],
  ["NEH", "Neemias", "Ne", 13, true],
  ["EST", "Ester", "Et", 10, true],
  ["JOB", "Jó", "Jó", 42, true],
  ["PSA", "Salmos", "Sl", 150, true],
  ["PRO", "Provérbios", "Pv", 31, true],
  ["ECC", "Eclesiastes", "Ec", 12, true],
  ["SNG", "Cântico dos Cânticos", "Ct", 8, true],
  ["ISA", "Isaías", "Is", 66, true],
  ["JER", "Jeremias", "Jr", 52, true],
  ["LAM", "Lamentações", "Lm", 5, true],
  ["EZK", "Ezequiel", "Ez", 48, true],
  ["DAN", "Daniel", "Dn", 12, true],
  ["HOS", "Oseias", "Os", 14, true],
  ["JOL", "Joel", "Jl", 3, true],
  ["AMO", "Amós", "Am", 9, true],
  ["OBA", "Obadias", "Ob", 1, true],
  ["JON", "Jonas", "Jn", 4, true],
  ["MIC", "Miqueias", "Mq", 7, true],
  ["NAM", "Naum", "Na", 3, true],
  ["HAB", "Habacuque", "Hc", 3, true],
  ["ZEP", "Sofonias", "Sf", 3, true],
  ["HAG", "Ageu", "Ag", 2, true],
  ["ZEC", "Zacarias", "Zc", 14, true],
  ["MAL", "Malaquias", "Ml", 4, true],
  ["MAT", "Mateus", "Mt", 28, false],
  ["MRK", "Marcos", "Mc", 16, false],
  ["LUK", "Lucas", "Lc", 24, false],
  ["JHN", "João", "Jo", 21, false],
  ["ACT", "Atos", "At", 28, false],
  ["ROM", "Romanos", "Rm", 16, false],
  ["1CO", "1Coríntios", "1Co", 16, false],
  ["2CO", "2Coríntios", "2Co", 13, false],
  ["GAL", "Gálatas", "Gl", 6, false],
  ["EPH", "Efésios", "Ef", 6, false],
  ["PHP", "Filipenses", "Fp", 4, false],
  ["COL", "Colossenses", "Cl", 4, false],
  ["1TH", "1Tessalonicenses", "1Ts", 5, false],
  ["2TH", "2Tessalonicenses", "2Ts", 3, false],
  ["1TI", "1Timóteo", "1Tm", 6, false],
  ["2TI", "2Timóteo", "2Tm", 4, false],
  ["TIT", "Tito", "Tt", 3, false],
  ["PHM", "Filemom", "Fm", 1, false],
  ["HEB", "Hebreus", "Hb", 13, false],
  ["JAS", "Tiago", "Tg", 5, false],
  ["1PE", "1Pedro", "1Pe", 5, false],
  ["2PE", "2Pedro", "2Pe", 3, false],
  ["1JN", "1João", "1Jo", 5, false],
  ["2JN", "2João", "2Jo", 1, false],
  ["3JN", "3João", "3Jo", 1, false],
  ["JUD", "Judas", "Jd", 1, false],
  ["REV", "Apocalipse", "Ap", 22, false],
];

export const BIBLE_BOOKS: BibleBook[] = RAW.map(([id, name, abbr, chapters, ot]) => ({ id, name, abbr, chapters, ot }));

export function findBook(id: string): BibleBook | undefined {
  return BIBLE_BOOKS.find((b) => b.id === id.toUpperCase());
}

/** Capítulo anterior e próximo, atravessando os livros (Gênesis 1 não tem anterior; Apocalipse 22 não tem próximo). */
export function neighbors(bookId: string, chapter: number): { prev: [BibleBook, number] | null; next: [BibleBook, number] | null } {
  const i = BIBLE_BOOKS.findIndex((b) => b.id === bookId);
  const b = BIBLE_BOOKS[i];
  const prev: [BibleBook, number] | null = chapter > 1 ? [b, chapter - 1] : i > 0 ? [BIBLE_BOOKS[i - 1], BIBLE_BOOKS[i - 1].chapters] : null;
  const next: [BibleBook, number] | null = chapter < b.chapters ? [b, chapter + 1] : i < BIBLE_BOOKS.length - 1 ? [BIBLE_BOOKS[i + 1], 1] : null;
  return { prev, next };
}
