// Biblioteca do Antigo Testamento (39 livros). Cada livro é liberado quando o capítulo correspondente é concluído.
import type { BookDef } from "../types";

const N = "narrativo" as const;
const P = "poetico" as const;
const M = "profeta_maior" as const;
const m = "profeta_menor" as const;

export const BOOKS: BookDef[] = [
  { id: "genesis", name: "Gênesis", kind: N, summary: "Os começos: a criação, a queda, o dilúvio e a família de Abraão, Isaque, Jacó e José." },
  { id: "exodo", name: "Êxodo", kind: N, summary: "A libertação do Egito, a Lei no Sinai e o tabernáculo." },
  { id: "levitico", name: "Levítico", kind: N, summary: "Instruções para o culto e para a vida santa do povo de Deus." },
  { id: "numeros", name: "Números", kind: N, summary: "Os anos de Israel no deserto, entre fé e murmuração." },
  { id: "deuteronomio", name: "Deuteronômio", kind: N, summary: "Os últimos discursos de Moisés antes da entrada em Canaã." },
  { id: "josue", name: "Josué", kind: N, summary: "A entrada e a conquista da terra prometida sob a liderança de Josué." },
  { id: "juizes", name: "Juízes", kind: N, summary: "Um tempo de ciclos de afastamento e livramento, com líderes como Gideão e Sansão." },
  { id: "rute", name: "Rute", kind: N, summary: "A história de lealdade de uma estrangeira que encontra redenção." },
  { id: "1samuel", name: "1 Samuel", kind: N, summary: "Samuel, o primeiro rei Saul e o surgimento de Davi." },
  { id: "2samuel", name: "2 Samuel", kind: N, summary: "O reinado de Davi em Israel e a promessa feita à sua casa." },
  { id: "1reis", name: "1 Reis", kind: N, summary: "O reinado de Salomão, o Templo e a divisão do reino." },
  { id: "2reis", name: "2 Reis", kind: N, summary: "Os reinos de Israel e de Judá até a queda e o exílio." },
  { id: "1cronicas", name: "1 Crônicas", kind: N, summary: "Genealogias e o reinado de Davi, com foco na adoração." },
  { id: "2cronicas", name: "2 Crônicas", kind: N, summary: "De Salomão ao exílio, com ênfase no Templo e na fidelidade." },
  { id: "esdras", name: "Esdras", kind: N, summary: "O retorno do exílio e a reconstrução do Templo." },
  { id: "neemias", name: "Neemias", kind: N, summary: "A reconstrução dos muros de Jerusalém." },
  { id: "ester", name: "Ester", kind: N, summary: "A rainha que arriscou a vida para salvar o seu povo." },
  { id: "jo", name: "Jó", kind: P, summary: "O sofrimento de um homem justo e a pergunta sobre a sabedoria de Deus." },
  { id: "salmos", name: "Salmos", kind: P, summary: "Orações e cânticos de louvor, súplica e confiança, muitos de Davi." },
  { id: "proverbios", name: "Provérbios", kind: P, summary: "Conselhos para viver com sabedoria e temor ao Senhor." },
  { id: "eclesiastes", name: "Eclesiastes", kind: P, summary: "Uma reflexão sobre o sentido da vida debaixo do sol." },
  { id: "cantares", name: "Cantares", kind: P, summary: "Um poema sobre o amor." },
  { id: "isaias", name: "Isaías", kind: M, summary: "Juízo, consolo e a esperança do Servo do Senhor." },
  { id: "jeremias", name: "Jeremias", kind: M, summary: "O profeta que avisou Jerusalém antes da queda e anunciou uma nova aliança." },
  { id: "lamentacoes", name: "Lamentações", kind: M, summary: "O luto por Jerusalém destruída, com esperança na misericórdia de Deus." },
  { id: "ezequiel", name: "Ezequiel", kind: M, summary: "Visões e mensagens de um profeta entre os exilados na Babilônia." },
  { id: "daniel", name: "Daniel", kind: M, summary: "Fidelidade na Babilônia e visões sobre os reinos e o Reino de Deus." },
  { id: "oseias", name: "Oseias", kind: m, summary: "O amor fiel de Deus por um povo infiel." },
  { id: "joel", name: "Joel", kind: m, summary: "Um chamado ao arrependimento e a promessa do Espírito." },
  { id: "amos", name: "Amós", kind: m, summary: "Um pastor que clama por justiça." },
  { id: "obadias", name: "Obadias", kind: m, summary: "Uma mensagem contra o orgulho de Edom." },
  { id: "jonas", name: "Jonas", kind: m, summary: "O profeta enviado a Nínive e a compaixão de Deus." },
  { id: "miqueias", name: "Miqueias", kind: m, summary: "Justiça, misericórdia e o anúncio de um governante vindo de Belém." },
  { id: "naum", name: "Naum", kind: m, summary: "O anúncio da queda de Nínive." },
  { id: "habacuque", name: "Habacuque", kind: m, summary: "As perguntas de um profeta e a resposta: o justo viverá pela fé." },
  { id: "sofonias", name: "Sofonias", kind: m, summary: "O dia do Senhor e a promessa de restauração." },
  { id: "ageu", name: "Ageu", kind: m, summary: "Um chamado para reconstruir o Templo." },
  { id: "zacarias", name: "Zacarias", kind: m, summary: "Visões de encorajamento para quem voltou do exílio." },
  { id: "malaquias", name: "Malaquias", kind: m, summary: "O último livro do Antigo Testamento, um chamado à fidelidade." },
];

export const BOOK_BY_ID = new Map(BOOKS.map((b) => [b.id, b]));
export const KIND_LABEL: Record<BookDef["kind"], string> = { narrativo: "Narrativos e históricos", poetico: "Poéticos", profeta_maior: "Profetas maiores", profeta_menor: "Profetas menores" };
