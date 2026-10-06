import type { Arrival, LevelDef, SpeciesId } from "../core/types";

/** Chegadas do vertical slice: [segundo, espécie]. Dirigido por dados: para criar outra fase basta outra lista. */
const A = (list: [number, SpeciesId][]): Arrival[] => list.map(([at, species]) => ({ at, species }));

export const NOAH_ANIMALS: LevelDef = {
  id: "noah_animals",
  number: 2,
  arc: "Gênesis",
  title: "Noé: Reunindo os Animais",
  hero: "Noé",
  objective: "Alimente cada par de animais e leve-o ao lugar certo da arca antes que a paciência acabe.",
  ref: "Gênesis 6:19–20 e 7:1–16",
  context:
    "Deus mandou Noé levar para a arca um casal de cada espécie, junto com o alimento necessário, para que a vida fosse preservada. Noé fez tudo como Deus ordenou. Quando todos estavam a bordo, foi o próprio Senhor quem fechou a porta.",
  note: "Alimentar os pares e organizá-los em cercados é uma representação lúdica para o gameplay. A Bíblia registra que Noé reuniu os animais conforme a ordem de Deus, sem detalhar essa rotina.",
  timeLimit: 180,
  targetScore: 280,
  queueCap: 4,
  maxAbandon: 4,
  feeds: ["hay", "grain", "fruit", "fish"],
  pens: ["pasture", "stable", "cages", "aviary"],
  stock: { hay: 5, grain: 5, fruit: 4, fish: 4 },
  tutorial: true,
  intro: "noah_intro",
  outro: "noah_outro",
  schedule: [
    { at: 0, species: "sheep", guided: true },
    { at: 0, species: "dove", guided: true },
    ...A([
      [10, "rabbit"],
      [17, "lion"],
      [24, "horse"],
      [31, "parrot"],
      [38, "camel"],
      [44, "sheep"],
      [50, "bear"],
      [56, "dove"],
      [62, "horse"],
      [68, "lion"],
      [74, "rabbit"],
      [80, "camel"],
      [86, "bear"],
      [91, "parrot"],
      [96, "sheep"],
      [101, "dove"],
      [106, "horse"],
      [111, "lion"],
      [116, "camel"],
      [121, "bear"],
      [126, "rabbit"],
      [131, "parrot"],
      [136, "horse"],
      [141, "sheep"],
      [146, "lion"],
      [151, "bear"],
      [156, "dove"],
      [161, "camel"],
    ]),
  ],
  events: [
    { at: 52, kind: "crowd", text: "EVENTO! Uma grande multidão chegou." },
    { at: 98, kind: "restless", text: "EVENTO! Os animais estão se movimentando." },
    { at: 126, kind: "storm", text: "EVENTO! Uma tempestade se aproxima." },
  ],
};

/** Capítulos da campanha: só o vertical slice está pronto; os outros aparecem como "em breve". */
export type ChapterInfo = { number: number; arc: string; title: string; ref: string; level?: LevelDef };

export const CAMPAIGN: ChapterInfo[] = [
  { number: 1, arc: "Gênesis", title: "Noé: Construindo a Arca", ref: "Gênesis 6" },
  { number: 2, arc: "Gênesis", title: "Noé: Reunindo os Animais", ref: "Gênesis 6–7", level: NOAH_ANIMALS },
  { number: 3, arc: "Gênesis", title: "Abraão: Hospitalidade", ref: "Gênesis 18" },
  { number: 4, arc: "Gênesis", title: "Isaque: Os Poços", ref: "Gênesis 26" },
  { number: 5, arc: "Gênesis", title: "Jacó: O Rebanho", ref: "Gênesis 30–31" },
  { number: 6, arc: "José", title: "José no Egito", ref: "Gênesis 41" },
  { number: 7, arc: "José", title: "Sete Anos de Fartura", ref: "Gênesis 41" },
  { number: 8, arc: "José", title: "A Fome", ref: "Gênesis 41–47" },
  { number: 9, arc: "Êxodo", title: "Moisés no Egito", ref: "Êxodo 5–12" },
  { number: 10, arc: "Êxodo", title: "Preparação para o Êxodo", ref: "Êxodo 12" },
  { number: 11, arc: "Êxodo", title: "Travessia", ref: "Êxodo 14" },
  { number: 12, arc: "Êxodo", title: "Maná no Deserto", ref: "Êxodo 16" },
  { number: 13, arc: "Êxodo", title: "Água da Rocha", ref: "Êxodo 17" },
  { number: 14, arc: "Josué", title: "Preparando a Entrada", ref: "Josué 1–3" },
  { number: 15, arc: "Josué", title: "Jericó", ref: "Josué 6" },
  { number: 16, arc: "Rute", title: "Colheita", ref: "Rute 2" },
  { number: 17, arc: "Davi", title: "O Pastor", ref: "1 Samuel 16–17" },
  { number: 18, arc: "Davi", title: "Davi e Golias", ref: "1 Samuel 17" },
  { number: 19, arc: "Salomão", title: "Construção do Templo", ref: "1 Reis 5–6" },
  { number: 20, arc: "Salomão", title: "O Templo", ref: "1 Reis 8" },
  { number: 21, arc: "Daniel", title: "Babilônia", ref: "Daniel 1–6" },
  { number: 22, arc: "Neemias", title: "Reconstrução dos Muros", ref: "Neemias 3–4" },
];

export const LEVELS: Record<string, LevelDef> = { [NOAH_ANIMALS.id]: NOAH_ANIMALS };

const ALL_SPECIES: SpeciesId[] = ["sheep", "rabbit", "dove", "parrot", "horse", "camel", "lion", "bear"];

export const CHALLENGES: { mode: "survival" | "speed" | "perfect"; emoji: string; name: string; desc: string }[] = [
  { mode: "survival", emoji: "♾️", name: "Sobrevivência", desc: "Quantos pares você atende antes de perder 3? O ritmo só aumenta." },
  { mode: "speed", emoji: "⏱️", name: "Velocidade", desc: "Atenda o máximo de pares em 60 segundos." },
  { mode: "perfect", emoji: "💎", name: "Perfeito", desc: "Nenhum par pode ir embora. Uma falha e acabou." },
];

/** Modos desafio reaproveitam a fase do Noé com chegadas geradas em ritmo crescente. */
export function challengeLevel(mode: "survival" | "speed" | "perfect"): LevelDef {
  const base = { ...NOAH_ANIMALS, schedule: [], events: [], tutorial: false, targetScore: 0 };
  if (mode === "survival") return { ...base, id: "challenge_survival", title: "Sobrevivência", timeLimit: 0, maxAbandon: 3, generator: { first: 1, start: 8, min: 3.2, accel: 0.2, pool: ALL_SPECIES } };
  if (mode === "speed") return { ...base, id: "challenge_speed", title: "Velocidade", timeLimit: 60, maxAbandon: 99, generator: { first: 1, start: 5, min: 2.4, accel: 0.18, pool: ALL_SPECIES } };
  return { ...base, id: "challenge_perfect", title: "Perfeito", timeLimit: 120, maxAbandon: 1, generator: { first: 1, start: 7, min: 3.8, accel: 0.14, pool: ALL_SPECIES } };
}
