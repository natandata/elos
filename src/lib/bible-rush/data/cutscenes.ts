// Cutscenes curtas (10 a 30 s), dirigidas por dados: cenário, personagens, falas e referência bíblica.

export type CutsceneBg = "dawn" | "field" | "ark" | "storm" | "night" | "tent" | "camp" | "egypt" | "desert" | "feast" | "hill";
export type CutsceneActor = { emoji: string; pos: "left" | "center" | "right"; anim?: "bob" | "walk" | "none"; flip?: boolean; size?: "sm" | "md" | "lg" };
export type CutsceneStep = {
  bg: CutsceneBg;
  actors?: CutsceneActor[];
  /** quem fala; vazio = narração */
  speaker?: string;
  text: string;
  ref?: string;
  effect?: "rain" | "sparkle" | "none";
  /** segundos até avançar sozinho (depende da velocidade de texto) */
  seconds?: number;
};
export type Cutscene = { id: string; title: string; steps: CutsceneStep[] };

export const CUTSCENES: Record<string, Cutscene> = {
  abraao_intro: {
    id: "abraao_intro",
    title: "Abraão: A Hospitalidade",
    steps: [
      {
        bg: "tent",
        actors: [{ emoji: "⛺", pos: "center", anim: "bob", size: "lg" }],
        text: "Era o maior calor do dia. Abraão estava sentado à porta da sua tenda, junto aos carvalhos de Manre.",
        ref: "Gênesis 18:1",
        seconds: 5,
      },
      {
        bg: "tent",
        actors: [
          { emoji: "🧔", pos: "left", anim: "walk" },
          { emoji: "🧔", pos: "center", anim: "walk" },
          { emoji: "🧔", pos: "right", anim: "walk" },
        ],
        text: "De repente, Abraão viu três homens parados perto dele. Correu ao encontro deles e se curvou até o chão.",
        ref: "Gênesis 18:2",
        seconds: 6,
      },
      {
        bg: "tent",
        actors: [
          { emoji: "🧓", pos: "left", anim: "bob", size: "lg" },
          { emoji: "🥖", pos: "center", anim: "bob" },
          { emoji: "🥛", pos: "right", anim: "bob" },
        ],
        speaker: "Abraão",
        text: "Não passem sem parar! Descansem debaixo da árvore. Vou trazer água e pão para vocês. Me ajude: tudo depressa!",
        ref: "Gênesis 18:3–5",
        seconds: 6,
      },
    ],
  },
  abraao_outro: {
    id: "abraao_outro",
    title: "À sombra da árvore",
    steps: [
      {
        bg: "tent",
        actors: [
          { emoji: "🧔", pos: "left", anim: "bob" },
          { emoji: "🍖", pos: "center", anim: "bob" },
          { emoji: "🧔", pos: "right", anim: "bob" },
        ],
        text: "Abraão serviu coalhada, leite e o bezerro que mandou preparar. E ficou ao lado dos visitantes, debaixo da árvore, enquanto eles comiam.",
        ref: "Gênesis 18:8",
        seconds: 6,
      },
      {
        bg: "tent",
        actors: [{ emoji: "🌳", pos: "center", anim: "bob", size: "lg" }],
        effect: "sparkle",
        text: "Receber bem as pessoas é um jeito de servir a Deus. A Bíblia lembra que alguns acolheram anjos sem saber.",
        ref: "Hebreus 13:2",
        seconds: 6,
      },
    ],
  },
  esau_intro: {
    id: "esau_intro",
    title: "Jacó e Esaú: O Guisado",
    steps: [
      {
        bg: "camp",
        actors: [
          { emoji: "🧑‍🦱", pos: "left", anim: "bob", size: "lg" },
          { emoji: "🍲", pos: "center", anim: "bob", size: "lg" },
        ],
        text: "Jacó estava cozinhando um guisado de lentilhas na sua tenda, quando Esaú, seu irmão, voltou do campo.",
        ref: "Gênesis 25:29",
        seconds: 5,
      },
      {
        bg: "camp",
        actors: [
          { emoji: "🧑‍🦰", pos: "center", anim: "walk", size: "lg" },
          { emoji: "🏹", pos: "right", anim: "bob" },
        ],
        speaker: "Esaú",
        text: "Estou cansado e morrendo de fome! Deixe-me comer um pouco desse guisado vermelho. Depressa!",
        ref: "Gênesis 25:30",
        seconds: 6,
      },
    ],
  },
  esau_outro: {
    id: "esau_outro",
    title: "O preço de uma refeição",
    steps: [
      {
        bg: "camp",
        actors: [
          { emoji: "🧑‍🦰", pos: "left", anim: "bob", size: "lg" },
          { emoji: "🍲", pos: "center", anim: "bob" },
          { emoji: "🥖", pos: "right", anim: "bob" },
        ],
        text: "Jacó deu a Esaú pão e guisado de lentilhas. Ele comeu, bebeu, levantou-se e foi embora.",
        ref: "Gênesis 25:34",
        seconds: 6,
      },
      {
        bg: "camp",
        actors: [{ emoji: "🌅", pos: "center", anim: "bob", size: "lg" }],
        effect: "sparkle",
        text: "Esaú trocou o seu direito de filho mais velho por uma refeição. A Bíblia diz que ele desprezou o que era precioso. Vale a pena esperar e valorizar o que vem de Deus.",
        ref: "Gênesis 25:34",
        seconds: 7,
      },
    ],
  },
  pascoa_intro: {
    id: "pascoa_intro",
    title: "A Primeira Páscoa",
    steps: [
      {
        bg: "egypt",
        actors: [{ emoji: "🏠", pos: "center", anim: "bob", size: "lg" }],
        text: "Deus mandou que cada família de Israel preparasse uma refeição especial, naquela noite, dentro de casa.",
        ref: "Êxodo 12:3–7",
        seconds: 5,
      },
      {
        bg: "egypt",
        actors: [
          { emoji: "🍖", pos: "left", anim: "bob" },
          { emoji: "🫓", pos: "center", anim: "bob" },
          { emoji: "🥬", pos: "right", anim: "bob" },
        ],
        text: "O cordeiro assado no fogo, os pães sem fermento e as ervas amargas. E deveriam comer apressadamente, prontos para partir.",
        ref: "Êxodo 12:8–11",
        seconds: 7,
      },
    ],
  },
  pascoa_outro: {
    id: "pascoa_outro",
    title: "A noite da libertação",
    steps: [
      {
        bg: "egypt",
        actors: [
          { emoji: "👨‍👩‍👧", pos: "left", anim: "walk" },
          { emoji: "👴", pos: "center", anim: "walk" },
          { emoji: "👩", pos: "right", anim: "walk" },
        ],
        text: "Naquela noite, o povo saiu do Egito, levando a massa do pão ainda sem fermento.",
        ref: "Êxodo 12:33–34",
        seconds: 6,
      },
      {
        bg: "night",
        actors: [{ emoji: "🌙", pos: "center", anim: "bob", size: "lg" }],
        effect: "sparkle",
        text: "A Páscoa passou a ser lembrada todos os anos: o dia em que Deus livrou o seu povo.",
        ref: "Êxodo 12:14",
        seconds: 6,
      },
    ],
  },
  mana_intro: {
    id: "mana_intro",
    title: "Maná e Codornizes",
    steps: [
      {
        bg: "desert",
        actors: [
          { emoji: "🧑", pos: "left", anim: "bob" },
          { emoji: "👵", pos: "center", anim: "bob" },
          { emoji: "👦", pos: "right", anim: "bob" },
        ],
        text: "No deserto, o povo estava com fome e começou a murmurar. Mas Deus ouviu e prometeu mandar pão do céu.",
        ref: "Êxodo 16:2–4",
        seconds: 6,
      },
      {
        bg: "desert",
        actors: [
          { emoji: "🍪", pos: "left", anim: "bob" },
          { emoji: "🧔", pos: "center", anim: "bob", size: "lg" },
          { emoji: "🍗", pos: "right", anim: "bob" },
        ],
        speaker: "Moisés",
        text: "O Senhor vai dar carne ao entardecer e pão pela manhã. Cada um recolha o que precisa para o dia.",
        ref: "Êxodo 16:8 e 16",
        seconds: 6,
      },
    ],
  },
  mana_outro: {
    id: "mana_outro",
    title: "Pão do céu",
    steps: [
      {
        bg: "desert",
        actors: [
          { emoji: "🍪", pos: "left", anim: "bob" },
          { emoji: "🍗", pos: "center", anim: "bob" },
          { emoji: "🌅", pos: "right", anim: "bob" },
        ],
        text: "À tarde vieram as codornizes e, de manhã, o maná. O povo chamou aquilo de maná e comeu esse pão do céu durante quarenta anos.",
        ref: "Êxodo 16:13–15, 31 e 35",
        seconds: 7,
      },
      {
        bg: "desert",
        actors: [{ emoji: "🙏", pos: "center", anim: "bob", size: "lg" }],
        effect: "sparkle",
        text: "Deus cuida do seu povo todos os dias. Ele dá o pão de cada dia.",
        ref: "Êxodo 16:4",
        seconds: 5,
      },
    ],
  },
  cana_intro: {
    id: "cana_intro",
    title: "As Bodas de Caná",
    steps: [
      {
        bg: "feast",
        actors: [
          { emoji: "🤵", pos: "left", anim: "bob" },
          { emoji: "👰", pos: "center", anim: "bob", size: "lg" },
          { emoji: "🎻", pos: "right", anim: "bob" },
        ],
        text: "Em Caná da Galileia havia um casamento. Jesus, sua mãe e os discípulos também foram convidados.",
        ref: "João 2:1–2",
        seconds: 5,
      },
      {
        bg: "feast",
        actors: [
          { emoji: "🏺", pos: "left", anim: "bob" },
          { emoji: "🍷", pos: "center", anim: "bob", size: "lg" },
          { emoji: "🏺", pos: "right", anim: "bob" },
        ],
        text: "No meio da festa, o vinho acabou. Jesus mandou encher de água as seis talhas de pedra. Vamos ajudar os serventes!",
        ref: "João 2:3–7",
        seconds: 6,
      },
    ],
  },
  cana_outro: {
    id: "cana_outro",
    title: "O melhor vinho",
    steps: [
      {
        bg: "feast",
        actors: [
          { emoji: "🤵", pos: "left", anim: "bob" },
          { emoji: "🍷", pos: "center", anim: "bob", size: "lg" },
          { emoji: "🧑", pos: "right", anim: "bob" },
        ],
        speaker: "Mestre-sala",
        text: "Todos servem primeiro o bom vinho. Mas você guardou o melhor até agora!",
        ref: "João 2:9–10",
        seconds: 6,
      },
      {
        bg: "feast",
        actors: [{ emoji: "✨", pos: "center", anim: "bob", size: "lg" }],
        effect: "sparkle",
        text: "Foi o primeiro sinal de Jesus. Ele mostrou a sua glória, e os seus discípulos creram nele.",
        ref: "João 2:11",
        seconds: 6,
      },
    ],
  },
  paes_intro: {
    id: "paes_intro",
    title: "Os Pães e os Peixes",
    steps: [
      {
        bg: "hill",
        actors: [
          { emoji: "👨‍👩‍👧", pos: "left", anim: "bob" },
          { emoji: "🧑", pos: "center", anim: "bob", size: "lg" },
          { emoji: "👩", pos: "right", anim: "bob" },
        ],
        text: "Uma grande multidão seguia Jesus. Já era tarde e todos estavam com fome, num lugar deserto.",
        ref: "João 6:1–5",
        seconds: 6,
      },
      {
        bg: "hill",
        actors: [
          { emoji: "👦", pos: "left", anim: "bob", size: "lg" },
          { emoji: "🥖", pos: "center", anim: "bob" },
          { emoji: "🐟", pos: "right", anim: "bob" },
        ],
        speaker: "André",
        text: "Aqui está um menino que tem cinco pães de cevada e dois peixes. Mas o que é isso para tanta gente?",
        ref: "João 6:8–9",
        seconds: 6,
      },
    ],
  },
  paes_outro: {
    id: "paes_outro",
    title: "Doze cestos",
    steps: [
      {
        bg: "hill",
        actors: [
          { emoji: "🥖", pos: "left", anim: "bob" },
          { emoji: "🙏", pos: "center", anim: "bob", size: "lg" },
          { emoji: "🐟", pos: "right", anim: "bob" },
        ],
        text: "Jesus tomou os pães, deu graças e distribuiu ao povo. Fez o mesmo com os peixes. E todos comeram o quanto quiseram.",
        ref: "João 6:11",
        seconds: 6,
      },
      {
        bg: "hill",
        actors: [{ emoji: "🧺", pos: "center", anim: "bob", size: "lg" }],
        effect: "sparkle",
        text: "Ainda sobraram doze cestos cheios. Quando entregamos a Deus o que temos, ele faz mais do que imaginamos.",
        ref: "João 6:12–13",
        seconds: 6,
      },
    ],
  },
};
