// Cutscenes curtas (10 a 30 s), dirigidas por dados: cenário, personagens, falas e referência bíblica.

export type CutsceneBg = "dawn" | "field" | "ark" | "storm" | "night";
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
  noah_intro: {
    id: "noah_intro",
    title: "Noé: Reunindo os Animais",
    steps: [
      {
        bg: "dawn",
        actors: [{ emoji: "🛶", pos: "center", anim: "bob", size: "lg" }],
        text: "Noé obedeceu a Deus e construiu a arca. Agora chegava a hora de reunir os animais.",
        ref: "Gênesis 6:14–22",
        seconds: 5,
      },
      {
        bg: "field",
        actors: [
          { emoji: "🧔", pos: "left", anim: "bob", size: "lg" },
          { emoji: "🐑", pos: "center", anim: "walk" },
          { emoji: "🐑", pos: "right", anim: "walk" },
        ],
        speaker: "Noé",
        text: "Dois de cada espécie, macho e fêmea. É o que o Senhor mandou. Vamos cuidar de cada par.",
        ref: "Gênesis 6:19–21",
        seconds: 6,
      },
      {
        bg: "field",
        actors: [
          { emoji: "🌾", pos: "left", anim: "bob" },
          { emoji: "🧔", pos: "center", anim: "bob", size: "lg" },
          { emoji: "🪺", pos: "right", anim: "bob" },
        ],
        text: "Deus mandou juntar todo alimento. Prepare os pratos na cozinha da arca e sirva cada par. Cuide para que ninguém espere demais, e não deixe nada queimar!",
        seconds: 5,
      },
    ],
  },
  noah_outro: {
    id: "noah_outro",
    title: "A porta da arca",
    steps: [
      {
        bg: "ark",
        actors: [
          { emoji: "🐑", pos: "left", anim: "walk" },
          { emoji: "🦁", pos: "center", anim: "walk" },
          { emoji: "🕊️", pos: "right", anim: "bob" },
        ],
        text: "Todos os animais entraram na arca, de dois em dois, como Deus tinha ordenado.",
        ref: "Gênesis 7:8–9",
        seconds: 5,
      },
      {
        bg: "ark",
        actors: [{ emoji: "🛶", pos: "center", anim: "bob", size: "lg" }],
        effect: "sparkle",
        text: "Noé e sua família entraram também. E foi o Senhor quem fechou a porta atrás deles.",
        ref: "Gênesis 7:7 e 7:16",
        seconds: 6,
      },
      {
        bg: "storm",
        actors: [{ emoji: "🛶", pos: "center", anim: "bob", size: "lg" }],
        effect: "rain",
        text: "A obediência de Noé salvou a vida de sua família e dos animais. A próxima história desta jornada já está esperando.",
        seconds: 6,
      },
    ],
  },
};
