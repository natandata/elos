// Campanha: O Antigo Testamento. Os 41 capítulos em ordem cronológica; os marcados como `built` já são jogáveis.
import type { ChapterDef } from "../types";
import { LEARN } from "./learn";

type Row = [id: string, title: string, subtitle: string, book: string, ref: string, period: string, phase: number, unlocks: string[], map?: string, achievement?: string];

const ROWS: Row[] = [
  ["eden", "O Éden", "A Criação", "Gênesis", "Gênesis 1–2", "Origens", 2, ["genesis"], "eden", "o_comeco"],
  ["queda", "A Queda", "A serpente, o fruto e a porta que se fechou", "Gênesis", "Gênesis 3", "Origens", 2, [], "eden"],
  ["caim_abel", "Caim e Abel", "Duas ofertas, dois corações", "Gênesis", "Gênesis 4", "Origens", 2, [], "fields"],
  ["noe", "Noé e a Arca", "A obediência que salvou uma família", "Gênesis", "Gênesis 6–9", "Origens", 2, [], "noah", "construtor_arca"],
  ["babel", "A Torre de Babel", "A cidade que quis chegar ao céu", "Gênesis", "Gênesis 11", "Origens", 3, [], "shinar"],
  ["abraao", "Abraão", "O chamado e a promessa", "Gênesis", "Gênesis 12, 15, 17 e 21", "Patriarcas", 3, [], "canaa"],
  ["isaque_jaco", "Isaque e Jacó", "A família da promessa", "Gênesis", "Gênesis 25–35", "Patriarcas", 3, ["jo"], "berseba"],
  ["jose", "José", "Do poço ao palácio, da inveja ao perdão", "Gênesis", "Gênesis 37–50", "Patriarcas", 3, [], "egito"],
  ["moises", "Moisés", "A sarça que ardia e não se consumia", "Êxodo", "Êxodo 1–4", "Êxodo", 4, ["exodo"], "moises"],
  ["pragas", "As Pragas do Egito", "O faraó que não quis deixar o povo ir", "Êxodo", "Êxodo 7–11", "Êxodo", 4, [], "egito"],
  ["pascoa", "A Páscoa", "O cordeiro, o sangue e a saída do Egito", "Êxodo", "Êxodo 12", "Êxodo", 4, [], "gosen"],
  ["mar_vermelho", "O Mar Vermelho", "O mar se abriu", "Êxodo", "Êxodo 14", "Êxodo", 4, [], "mar", "atraves_aguas"],
  ["deserto", "O Deserto", "Maná, água e o tabernáculo", "Êxodo, Números, Deuteronômio", "Êxodo 16–17, 25–40", "Êxodo", 4, ["levitico", "numeros", "deuteronomio"], "deserto"],
  ["sinai", "Os Dez Mandamentos", "A Lei no monte", "Êxodo", "Êxodo 19–20", "Êxodo", 4, [], "sinai"],
  ["bezerro", "O Bezerro de Ouro", "Quando o povo se esqueceu", "Êxodo", "Êxodo 32", "Êxodo", 4, [], "sinai"],
  ["espias", "Os Espias", "Doze foram, dois confiaram", "Números", "Números 13–14", "Conquista", 5, [], "espias"],
  ["terra_prometida", "Moisés e a Terra Prometida", "Do monte Nebo, Canaã", "Deuteronômio", "Deuteronômio 31–34", "Conquista", 5, [], "nebo"],
  ["raabe", "Raabe", "O cordão vermelho", "Josué", "Josué 2", "Conquista", 5, ["josue"], "jerico"],
  ["jordao", "Josué e o Jordão", "A travessia", "Josué", "Josué 3", "Conquista", 5, [], "jordao"],
  ["jerico", "Jericó", "Sete voltas e as muralhas", "Josué", "Josué 6", "Conquista", 5, [], "jerico", "muralhas_cairam"],
  ["gideao", "Gideão", "Trezentos homens e uma luz na noite", "Juízes", "Juízes 6–7", "Juízes", 5, ["juizes"], "gideao"],
  ["sansao", "Sansão", "Força, fraqueza e arrependimento", "Juízes", "Juízes 13–16", "Juízes", 5, [], "sansao"],
  ["rute", "Rute", "Lealdade e redenção", "Rute", "Rute 1–4", "Juízes", 5, ["rute"], "rute"],
  ["samuel", "Samuel", "A voz que chamou de noite", "1 Samuel", "1 Samuel 1–3", "Reino unido", 6, ["1samuel"], "silo"],
  ["saul", "Saul", "O primeiro rei", "1 Samuel", "1 Samuel 8–15", "Reino unido", 6, [], "benjamim"],
  ["davi_pastor", "Davi, o Pastor", "O menor da casa de Jessé", "1 Samuel", "1 Samuel 16", "Reino unido", 6, ["salmos"], "belem"],
  ["golias", "Davi e Golias", "Cinco pedras lisas", "1 Samuel", "1 Samuel 17", "Reino unido", 6, [], undefined, "o_gigante"],
  ["davi_saul", "Davi e Saul", "A caverna e o manto", "1 Samuel", "1 Samuel 24 e 26", "Reino unido", 6, [], undefined],
  ["davi_rei", "Davi, Rei", "Jerusalém e a arca da aliança", "2 Samuel", "2 Samuel 5–7", "Reino unido", 6, ["2samuel", "1cronicas"], undefined],
  ["salomao", "Salomão", "O pedido de sabedoria e o Templo", "1 Reis", "1 Reis 3 e 6–8", "Reino unido", 6, ["1reis", "proverbios", "eclesiastes", "cantares"], undefined, "pedido_sabedoria"],
  ["elias", "Elias", "O fogo no monte Carmelo", "1 Reis", "1 Reis 18", "Reino dividido", 7, [], undefined, "fogo_ceu"],
  ["eliseu", "Eliseu", "Três sinais do poder de Deus", "2 Reis", "2 Reis 4–6", "Reino dividido", 7, ["2reis"], undefined],
  ["queda_israel", "A Queda de Israel", "Idolatria e exílio do reino do norte", "2 Reis", "2 Reis 17", "Reino dividido", 7, ["oseias", "amos", "jonas"], undefined],
  ["isaias", "Isaías", "A voz do profeta em Jerusalém", "Isaías", "Isaías 36–37 e 53", "Reino dividido", 7, ["isaias", "miqueias", "naum"], undefined],
  ["jeremias", "Jeremias", "O aviso e a queda de Jerusalém", "Jeremias", "Jeremias 1 e 52", "Exílio", 7, ["jeremias", "lamentacoes", "habacuque", "sofonias", "joel", "obadias"], undefined],
  ["daniel_babilonia", "Daniel na Babilônia", "Fiel na corte do rei", "Daniel", "Daniel 1–2", "Exílio", 7, ["daniel", "ezequiel"], undefined],
  ["fornalha", "A Fornalha Ardente", "Três amigos e um quarto no fogo", "Daniel", "Daniel 3", "Exílio", 7, [], undefined, "na_fornalha"],
  ["leoes", "Daniel na Cova dos Leões", "A noite em que a oração venceu", "Daniel", "Daniel 6", "Exílio", 7, [], undefined, "na_cova"],
  ["retorno", "O Retorno", "De volta a Jerusalém", "Esdras", "Esdras 1–6", "Retorno", 7, ["esdras", "2cronicas", "ageu", "zacarias"], undefined],
  ["neemias", "Neemias", "O muro reconstruído", "Neemias", "Neemias 2–6", "Retorno", 7, ["neemias", "malaquias"], undefined],
  ["ester", "Ester", "Para um tempo como este", "Ester", "Ester 1–10", "Retorno", 7, ["ester"], undefined],
];

export const CHAPTERS: ChapterDef[] = ROWS.map(([id, title, subtitle, book, ref, period, phase, unlocksBooks, map, achievement], i) => ({
  id,
  number: i + 1,
  title,
  subtitle,
  book,
  ref,
  period,
  map,
  missions: [],
  built: !!map,
  phase,
  learn: LEARN[id],
  unlocksBooks,
  achievement,
}));

export const CHAPTER_BY_ID = new Map(CHAPTERS.map((c) => [c.id, c]));
export const CHAPTER_NUMBER = (id: string): number => CHAPTER_BY_ID.get(id)?.number ?? 0;
/** capítulo seguinte na campanha (ou null depois do último) */
export const NEXT_CHAPTER = (id: string): ChapterDef | null => CHAPTERS[(CHAPTER_BY_ID.get(id)?.number ?? 0)] ?? null;
