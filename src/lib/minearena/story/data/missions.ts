// Missões da campanha. Cada missão: objetivos em ordem, cena ao começar/concluir, quem aparece e a recompensa.
import type { Mission } from "../types";
import { PUZZLES } from "./puzzles";
import { EXODUS_MISSIONS } from "./exodus";
import { GENESIS_MISSIONS } from "./genesis";
import { SINAI_MISSIONS } from "./sinai";
import { CONQUISTA_MISSIONS } from "./conquista";

const A = (mob: string, x: number, z: number, tag = "animal"): NonNullable<Mission["spawn"]>[number] => ({ mob, at: { x, z }, tag });

const BASE_MISSIONS: Mission[] = [
  ...GENESIS_MISSIONS,
  ...EXODUS_MISSIONS,
  ...SINAI_MISSIONS,
  ...CONQUISTA_MISSIONS,
  // ---------------- CAPÍTULO 1: O ÉDEN ----------------
  {
    id: "eden_1",
    chapter: "eden",
    title: "No princípio",
    desc: "Explore o Jardim do Éden seguindo o curso do rio.",
    ref: "Gênesis 1:1; 2:8–9",
    onStart: "eden_intro",
    objectives: [{ k: "reach", zone: "river", text: "Siga o rio até a campina." }],
    next: "eden_2",
  },
  {
    id: "eden_2",
    chapter: "eden",
    title: "Os animais do jardim",
    desc: "Observe os animais que vivem em paz no jardim.",
    ref: "Gênesis 2:19–20",
    objectives: [{ k: "near", tag: "animal", count: 4, dist: 6, text: "Aproxime-se de 4 animais para observá-los." }],
    onComplete: "eden_animals_done",
    next: "eden_3",
  },
  {
    id: "eden_3",
    chapter: "eden",
    title: "O fruto do jardim",
    desc: "Colha alguns frutos das árvores do jardim (menos da árvore proibida).",
    ref: "Gênesis 2:9",
    objectives: [{ k: "harvest", block: ["fruit_leaves"], count: 4, text: "Colha 4 frutos das árvores do jardim.", at: "meadow" }],
    next: "eden_4",
  },
  {
    id: "eden_4",
    chapter: "eden",
    title: "Adão",
    desc: "Conheça o primeiro homem, que cuida do jardim.",
    ref: "Gênesis 2:15–17",
    npc: "adao",
    objectives: [{ k: "talk", npc: "adao", dialogue: "adam_1", text: "Fale com Adão." }],
    next: "eden_5",
  },
  {
    id: "eden_5",
    chapter: "eden",
    title: "Uma companheira",
    desc: "Deus dá uma auxiliadora a Adão.",
    ref: "Gênesis 2:18–24",
    npc: "eva",
    onStart: "eden_eve",
    objectives: [{ k: "talk", npc: "eva", dialogue: "eve_1", text: "Fale com Eva." }],
    next: "eden_6",
  },
  {
    id: "eden_6",
    chapter: "eden",
    title: "A Árvore da Vida",
    desc: "Visite a árvore de folhas douradas, no coração do jardim.",
    ref: "Gênesis 2:9",
    objectives: [{ k: "reach", zone: "life", text: "Vá até a Árvore da Vida." }],
    onComplete: "eden_life",
    next: "eden_7",
  },
  {
    id: "eden_7",
    chapter: "eden",
    title: "A árvore do conhecimento",
    desc: "Veja a árvore que Deus pediu para não tocar.",
    ref: "Gênesis 2:16–17",
    objectives: [{ k: "reach", zone: "knowledge", text: "Vá até a árvore do conhecimento do bem e do mal." }],
    onComplete: "eden_command",
  },

  // ---------------- CAPÍTULO 2: A QUEDA ----------------
  {
    id: "fall_1",
    chapter: "queda",
    title: "A serpente",
    desc: "Eva e Adão estão junto à árvore do conhecimento. Não os deixe sozinhos.",
    ref: "Gênesis 3:1–7",
    onStart: "fall_intro",
    spawn: [
      { mob: "adao", at: { x: 77, z: 66 }, id: "adao" },
      { mob: "eva", at: { x: 80, z: 62 }, id: "eva" },
      { mob: "serpente", at: { x: 84, z: 60 }, id: "serpente" },
    ],
    objectives: [{ k: "reach", zone: "knowledge", text: "Aproxime-se de Eva, junto à árvore do conhecimento." }],
    onComplete: "fall_scene",
    next: "fall_2",
  },
  {
    id: "fall_2",
    chapter: "queda",
    title: "Onde estás?",
    desc: "Deus procura o homem e a mulher, que se esconderam entre as árvores.",
    ref: "Gênesis 3:8–21",
    npc: "adao",
    onStart: "fall_hide",
    objectives: [{ k: "talk", npc: "adao", dialogue: "fall_confront", text: "Encontre Adão e Eva, escondidos entre as árvores." }],
    onComplete: "fall_clothes",
    next: "fall_3",
  },
  {
    id: "fall_3",
    chapter: "queda",
    title: "A porta do Éden",
    desc: "Acompanhe Adão e Eva para fora do jardim.",
    ref: "Gênesis 3:22–24",
    objectives: [{ k: "reach", zone: "gate", text: "Siga Adão e Eva, escoltados pelo querubim, até o portão do Éden." }],
    onComplete: "fall_expulsion",
  },

  // ---------------- CAPÍTULO 3: CAIM E ABEL ----------------
  {
    id: "ca_1",
    chapter: "caim_abel",
    title: "Abel, o pastor",
    desc: "Conheça Abel, que cuida do rebanho.",
    ref: "Gênesis 4:2",
    npc: "abel",
    onStart: "ca_intro",
    spawn: [{ mob: "abel", at: { x: 28, z: 58 }, id: "abel" }, { mob: "caim", at: { x: 66, z: 58 }, id: "caim" }, A("ovelha", 24, 62, "sheep"), A("ovelha", 29, 65, "sheep"), A("ovelha", 22, 56, "sheep"), A("ovelha", 32, 61, "sheep")],
    objectives: [{ k: "talk", npc: "abel", dialogue: "ca_abel", text: "Fale com Abel." }],
    next: "ca_2",
  },
  {
    id: "ca_2",
    chapter: "caim_abel",
    title: "O rebanho",
    desc: "Ajude Abel a reunir as ovelhas.",
    ref: "Gênesis 4:4",
    objectives: [{ k: "near", tag: "sheep", count: 3, dist: 4, text: "Chegue perto de 3 ovelhas para reuni-las." }],
    next: "ca_3",
  },
  {
    id: "ca_3",
    chapter: "caim_abel",
    title: "Caim, o lavrador",
    desc: "Conheça Caim, que cultiva a terra.",
    ref: "Gênesis 4:2–3",
    npc: "caim",
    objectives: [{ k: "talk", npc: "caim", dialogue: "ca_caim", text: "Fale com Caim, na lavoura." }],
    next: "ca_4",
  },
  {
    id: "ca_4",
    chapter: "caim_abel",
    title: "A colheita",
    desc: "Ajude Caim a colher o trigo.",
    ref: "Gênesis 4:3",
    objectives: [{ k: "harvest", block: ["wheat_3"], count: 6, text: "Colha 6 feixes de trigo maduro.", at: "wheat" }],
    next: "ca_5",
  },
  {
    id: "ca_5",
    chapter: "caim_abel",
    title: "As ofertas",
    desc: "Os dois irmãos trazem ofertas ao Senhor.",
    ref: "Gênesis 4:3–16",
    objectives: [{ k: "reach", zone: "middle", text: "Vá ao encontro dos irmãos, entre os dois altares." }],
    onComplete: "ca_offerings_all",
  },

  // ---------------- CAPÍTULO 4: NOÉ ----------------
  {
    id: "noe_1",
    chapter: "noe",
    title: "Um homem justo",
    desc: "Conheça Noé, que andava com Deus.",
    ref: "Gênesis 6:9–22",
    npc: "noe",
    onStart: "noah_intro",
    spawn: [{ mob: "noe", at: { x: 55, z: 57 }, id: "noe" }, { mob: "sem", at: { x: 58, z: 53 }, id: "sem" }],
    objectives: [{ k: "talk", npc: "noe", dialogue: "noah_brief", text: "Fale com Noé, no acampamento." }],
    give: [{ item: "axe_wood", count: 1 }, { item: "bread", count: 4 }],
    next: "noe_2",
  },
  {
    id: "noe_2",
    chapter: "noe",
    title: "Madeira para a arca",
    desc: "COLETE: reúna madeira na floresta.",
    ref: "Gênesis 6:14",
    objectives: [{ k: "collect", item: "log", count: 20, text: "Colete 20 troncos na floresta, a oeste.", consume: true, at: "forest" }],
    reward: [{ item: "planks", count: 48 }],
    next: "noe_3",
  },
  {
    id: "noe_3",
    chapter: "noe",
    title: "Construa o casco",
    desc: "CONSTRUA: coloque tábuas na área marcada para levantar o casco da arca.",
    ref: "Gênesis 6:15–16",
    objectives: [{ k: "place", zone: "arkSite", count: 40, text: "Coloque 40 blocos de madeira na área da arca." }],
    onComplete: "noah_ark_done",
    next: "noe_4",
  },
  {
    id: "noe_4",
    chapter: "noe",
    title: "Alimento para a viagem",
    desc: "PREPARE: junte comida para a família e para os animais.",
    ref: "Gênesis 6:21",
    objectives: [{ k: "collect", item: "apple", count: 8, text: "Colha 8 frutos no pomar, ao sul da arca.", consume: true, at: "orchard" }],
    next: "noe_5",
  },
  {
    id: "noe_5",
    chapter: "noe",
    title: "Os animais",
    desc: "PROTEJA: guie os animais, de dois em dois, até a arca.",
    ref: "Gênesis 7:2–3,8–9",
    onStart: "noah_animals_start",
    spawn: [
      { mob: "ovelha", at: { x: 98, z: 70 }, tag: "pair:1", id: "p1a" },
      { mob: "ovelha", at: { x: 100, z: 71 }, tag: "pair:1", id: "p1b" },
      { mob: "boi", at: { x: 104, z: 76 }, tag: "pair:2", id: "p2a" },
      { mob: "boi", at: { x: 106, z: 77 }, tag: "pair:2", id: "p2b" },
      { mob: "cabra", at: { x: 94, z: 78 }, tag: "pair:3", id: "p3a" },
      { mob: "cabra", at: { x: 96, z: 79 }, tag: "pair:3", id: "p3b" },
      { mob: "camelo", at: { x: 108, z: 68 }, tag: "pair:4", id: "p4a" },
      { mob: "camelo", at: { x: 110, z: 69 }, tag: "pair:4", id: "p4b" },
      { mob: "cavalo", at: { x: 100, z: 82 }, tag: "pair:5", id: "p5a" },
      { mob: "cavalo", at: { x: 102, z: 83 }, tag: "pair:5", id: "p5b" },
      { mob: "galo", at: { x: 90, z: 74 }, tag: "pair:6", id: "p6a" },
      { mob: "galo", at: { x: 91, z: 75 }, tag: "pair:6", id: "p6b" },
    ],
    objectives: [{ k: "lead", tag: "pair", count: 6, to: "arkInside", near: 8, text: "Aproxime-se de cada par de animais para guiá-lo até a arca." }],
    next: "noe_6",
  },
  {
    id: "noe_6",
    chapter: "noe",
    title: "A porta se fecha",
    desc: "ENTRE NA ARCA: Noé e sua família já estão a bordo.",
    ref: "Gênesis 7:7,16",
    objectives: [{ k: "reach", zone: "arkEnter", text: "Entre na arca." }],
    onComplete: "noah_flood",
  },
];

/** Cada capítulo ganha uma missão de desafio (puzzle), logo antes da missão final. */
function withPuzzles(list: Mission[]): Mission[] {
  const out = [...list];
  for (const [chapter, pz] of Object.entries(PUZZLES)) {
    const ms = list.filter((m) => m.chapter === chapter);
    if (ms.length < 2) continue;
    const last = ms.find((m) => !m.next) ?? ms[ms.length - 1];
    const prev = ms.find((m) => m.next === last.id);
    if (!prev) continue;
    const mission: Mission = { id: `${chapter}_pz`, chapter, title: "O desafio", desc: pz.title, ref: pz.refs[0], objectives: [{ k: "puzzle", puzzle: chapter, text: `Resolva o desafio: ${pz.title}.` }], next: last.id };
    prev.next = mission.id;
    out.splice(out.indexOf(last), 0, mission);
  }
  return out;
}
export const MISSIONS: Mission[] = withPuzzles(BASE_MISSIONS);

export const MISSION_BY_ID = new Map(MISSIONS.map((m) => [m.id, m]));
export const MISSIONS_OF = (chapter: string): Mission[] => MISSIONS.filter((m) => m.chapter === chapter);
