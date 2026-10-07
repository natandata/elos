// "VOCÊ APRENDEU": resumo fiel de cada capítulo. O que é dramatização do jogo vem separado, em `gameNote`.
import type { LearnCard } from "../types";
import { EXODUS_LEARN } from "./exodus";
import { GENESIS_LEARN } from "./genesis";
import { SINAI_LEARN } from "./sinai";
import { CONQUISTA_LEARN } from "./conquista";

export const LEARN: Record<string, LearnCard> = {
  ...GENESIS_LEARN,
  ...EXODUS_LEARN,
  ...SINAI_LEARN,
  ...CONQUISTA_LEARN,
  eden: {
    title: "A CRIAÇÃO",
    what: "No princípio, Deus criou os céus e a terra e viu que tudo era muito bom. Colocou o homem num jardim no Éden para cultivá-lo e guardá-lo, e deu-lhe uma ajudadora. Podiam comer de todas as árvores, menos da árvore do conhecimento do bem e do mal.",
    book: "Gênesis",
    ref: "Gênesis 1–2",
    characters: ["Deus", "Adão", "Eva"],
    concepts: ["Criação", "O jardim do Éden", "A árvore da vida", "O mandamento de Deus"],
    gameNote: "Explorar o jardim, observar os animais e colher frutos são elementos do jogo. A Bíblia registra que Adão deu nome aos animais (Gênesis 2:19–20).",
  },
  queda: {
    title: "A QUEDA",
    what: "A serpente levou a mulher a duvidar da palavra de Deus. Ela comeu do fruto proibido e deu ao marido, que também comeu. Então se esconderam, e Deus os procurou. Houve consequências, mas também uma promessa de livramento. Deus os vestiu com túnicas de pele e os afastou do jardim, que passou a ser guardado.",
    book: "Gênesis",
    ref: "Gênesis 3",
    characters: ["Deus", "Adão", "Eva", "A serpente"],
    concepts: ["Tentação", "Desobediência", "Consequência", "A primeira promessa (Gênesis 3:15)"],
    gameNote: "O choro de Adão e Eva e a conversa da serpente na árvore são dramatização; o texto bíblico não descreve esses detalhes. A mudança do jardim (grama e folhas secas) é uma representação visual das consequências; o texto bíblico fala da maldição da terra por causa do homem.",
  },
  caim_abel: {
    title: "CAIM E ABEL",
    what: "Caim era lavrador e Abel, pastor. Cada um trouxe uma oferta ao Senhor. Deus aceitou a oferta de Abel, mas não a de Caim, que ficou muito irado. Deus o advertiu de que o pecado estava à porta, mas Caim levou o irmão ao campo e o matou. Deus ouviu o clamor e Caim tornou-se andarilho, ainda assim protegido pela misericórdia de Deus.",
    book: "Gênesis",
    ref: "Gênesis 4",
    characters: ["Caim", "Abel", "Adão e Eva"],
    concepts: ["Oferta", "Ira e domínio sobre o pecado", "Responsabilidade pelo irmão", "Consequência"],
    gameNote: "Por respeito, a morte de Abel não é mostrada. O texto bíblico não descreve a cena.",
  },
  noe: {
    title: "NOÉ E A ARCA",
    what: "Noé era um homem justo que andava com Deus. Diante da violência na terra, Deus mandou que construísse uma arca e levasse nela sua família e um casal de cada espécie de animal, com alimento. Noé fez tudo como Deus ordenou, e foi o Senhor quem fechou a porta. Depois do dilúvio, Deus fez uma aliança e deu o arco nas nuvens como sinal de que não destruiria a terra outra vez com águas.",
    book: "Gênesis",
    ref: "Gênesis 6–9",
    characters: ["Noé", "Sem, Cão e Jafé", "Deus"],
    concepts: ["Obediência", "Fé em ação", "Aliança", "O arco-íris"],
    gameNote: "A multidão do lado de fora, as falas do povo e a tempestade com raios são dramatização do que a Bíblia resume em Gênesis 7:21–23 (não informa quantas pessoas eram). Coletar madeira, construir parte do casco e guiar os animais é a forma do jogo de viver a história. A Bíblia não detalha esses passos.",
  },
};
