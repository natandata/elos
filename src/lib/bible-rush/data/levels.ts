import type { Arrival, LevelDef, SpeciesId } from "../core/types";

/** Chegadas do vertical slice: [segundo, espécie]. Dirigido por dados: para criar outra fase basta outra lista. */
const A = (list: [number, SpeciesId][]): Arrival[] => list.map(([at, species]) => ({ at, species }));

/** Ordem em que os pares chegam (se repete): mistura pedidos simples e de dois pratos. */
const WAVE: SpeciesId[] = ["rabbit", "lion", "horse", "parrot", "bear", "camel", "dove", "bear", "sheep", "horse", "lion", "dove"];

export const NOAH_ANIMALS: LevelDef = {
  id: "noah_animals",
  number: 2,
  arc: "Gênesis",
  title: "Noé: Reunindo os Animais",
  hero: "Noé",
  objective: "Prepare os pratos na Cozinha da Arca e sirva cada par antes que a paciência acabe. Cuidado para não queimar!",
  ref: "Gênesis 6:19–21 e 7:1–16",
  context:
    "Deus mandou Noé levar para a arca um casal de cada espécie e juntar todo o alimento necessário, para que servisse de comida a ele e aos animais. Noé fez tudo como Deus ordenou. Quando todos estavam a bordo, foi o próprio Senhor quem fechou a porta.",
  note: "A cozinha da arca, os pedidos e o forno são uma representação lúdica para o gameplay. A Bíblia registra que Noé juntou o alimento conforme a ordem de Deus, sem detalhar essa rotina.",
  timeLimit: 180,
  targetScore: 440,
  queueCap: 4,
  maxAbandon: 8,
  feeds: ["hay", "grain", "fruit", "fish"],
  plateMax: 6,
  tutorial: true,
  intro: "noah_intro",
  outro: "noah_outro",
  schedule: [
    { at: 0, species: "sheep", guided: true },
    { at: 0, species: "dove", guided: true },
    ...A(
      Array.from({ length: 44 }, (_, i): [number, SpeciesId] => [Math.round((9 + i * 3.5) * 10) / 10, WAVE[i % WAVE.length]]),
    ),
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
