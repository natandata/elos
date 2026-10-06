// Diálogos curtos com personagens (o jogador toca/clica no personagem). Adaptações do texto bíblico, sempre com a referência.
import type { Dialogue } from "../types";

export const DIALOGUES: Record<string, Dialogue> = {
  adam_1: {
    id: "adam_1",
    lines: [
      { who: "Adão", text: "Que bom ver você! Eu sou Adão. Deus me colocou neste jardim para cultivá-lo e guardá-lo.", ref: "Gênesis 2:15" },
      { who: "Adão", text: "Os animais passaram diante de mim, e eu dei nome a cada um deles.", ref: "Gênesis 2:19–20" },
      { who: "Adão", text: "Deus disse que posso comer de qualquer árvore do jardim, menos da árvore do conhecimento do bem e do mal.", ref: "Gênesis 2:16–17" },
      { who: "Adão", text: "Mas, em meio a tudo isso, sinto que falta alguém para dividir a vida comigo.", ref: "Gênesis 2:18" },
    ],
  },
  eve_1: {
    id: "eve_1",
    lines: [
      { who: "Eva", text: "Olá! Este lugar é lindo demais. Adão já me contou tudo sobre o jardim." },
      { who: "Eva", text: "Vamos ver a Árvore da Vida, a de folhas douradas? E depois a árvore que Deus pediu para não tocarmos.", ref: "Gênesis 2:9" },
    ],
  },
  fall_confront: {
    id: "fall_confront",
    lines: [
      { who: "Narrador", text: "Eles ouviram a voz do Senhor Deus, que andava no jardim pela viração do dia, e o homem e a sua mulher se esconderam entre as árvores.", ref: "Gênesis 3:8" },
      { who: "Deus", text: "Onde você está?", ref: "Gênesis 3:9" },
      { who: "Adão", text: "Ouvi a sua voz no jardim e tive medo, porque estava nu. Por isso me escondi.", ref: "Gênesis 3:10" },
      { who: "Deus", text: "Quem lhe disse que você estava nu? Você comeu da árvore de que lhe ordenei que não comesse?", ref: "Gênesis 3:11" },
      { who: "Adão", text: "A mulher que o Senhor pôs comigo me deu do fruto, e eu comi.", ref: "Gênesis 3:12" },
      { who: "Eva", text: "A serpente me enganou, e eu comi.", ref: "Gênesis 3:13" },
      { who: "Deus", text: "Por causa disso, a serpente será maldita entre todos os animais. Porei inimizade entre ela e a mulher, e a descendência da mulher lhe ferirá a cabeça.", ref: "Gênesis 3:14–15" },
      { who: "Narrador", text: "Deus anunciou à mulher dores no parto e dificuldades na vida com o marido.", ref: "Gênesis 3:16" },
      { who: "Deus", text: "Maldita é a terra por sua causa. Com o suor do rosto você comerá o seu pão, até que volte à terra, pois do pó você foi tirado e ao pó voltará.", ref: "Gênesis 3:17–19" },
      { who: "Narrador", text: "O homem deu à sua mulher o nome de Eva, por ser a mãe de todos os viventes. E o Senhor Deus fez túnicas de pele para Adão e sua mulher e os vestiu.", ref: "Gênesis 3:20–21" },
    ],
  },
  ca_abel: {
    id: "ca_abel",
    lines: [
      { who: "Abel", text: "Paz! Eu sou Abel, pastor de ovelhas. Cuidar do rebanho é o meu trabalho.", ref: "Gênesis 4:2" },
      { who: "Abel", text: "Meu irmão Caim cultiva a terra. Cada um de nós serve a Deus com o que tem." },
      { who: "Abel", text: "Ajude-me: chegue perto de três ovelhas para que eu as reúna no pasto." },
    ],
  },
  ca_caim: {
    id: "ca_caim",
    lines: [
      { who: "Caim", text: "Eu sou Caim, lavrador. Esta lavoura é fruto do meu trabalho.", ref: "Gênesis 4:2" },
      { who: "Caim", text: "O trigo está maduro. Preciso de ajuda para colher alguns feixes." },
    ],
  },
  noah_brief: {
    id: "noah_brief",
    lines: [
      { who: "Noé", text: "Que bom que chegou. Eu sou Noé. Deus me falou: a terra está cheia de violência, e Ele enviará um dilúvio.", ref: "Gênesis 6:11–13,17" },
      { who: "Noé", text: "Ele me mandou construir uma arca, para salvar a minha família e um casal de cada espécie de animal.", ref: "Gênesis 6:18–20" },
      { who: "Noé", text: "Preciso de madeira. Reúna 20 troncos na floresta, a oeste. Leve este machado.", ref: "Gênesis 6:14" },
    ],
  },
};
