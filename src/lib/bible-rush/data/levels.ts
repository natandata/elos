import type { Arrival, GuestId, LevelDef } from "../core/types";

/** Chegadas em ritmo constante: o padrão de convidados se repete a cada `step` segundos, a partir de `start`. */
const wave = (pattern: GuestId[], start: number, step: number): Arrival[] => {
  const n = Math.floor((168 - start) / step) + 1;
  return Array.from({ length: n }, (_, i) => ({ at: Math.round((start + i * step) * 10) / 10, guest: pattern[i % pattern.length] }));
};

/** 1. Abraão recebe os três visitantes (Gênesis 18). Tem o tutorial guiado. */
export const ABRAAO: LevelDef = {
  id: "abraao",
  number: 1,
  arc: "Gênesis",
  title: "Abraão: A Hospitalidade",
  hero: "Abraão",
  objective: "Sirva água, pão, coalhada e bezerro aos visitantes de Abraão antes que a paciência acabe. Cuidado para não queimar!",
  ref: "Gênesis 18:1–8",
  context:
    "No maior calor do dia, Abraão viu três homens perto de sua tenda e correu ao encontro deles. Pediu que não passassem sem parar: mandou trazer água, preparar pão com a melhor farinha e assar um bezerro tenro e bom. Serviu também coalhada e leite e ficou ao lado deles, debaixo da árvore, enquanto comiam. A Bíblia lembra que, ao receber bem os outros, alguns acolheram anjos sem saber.",
  note: "A fila, o forno e o tempo de preparo são uma representação lúdica para o gameplay. A Bíblia registra que Abraão serviu água, pão, bezerro, coalhada e leite aos visitantes, e que fez tudo depressa.",
  scene: "abraao",
  timeLimit: 180,
  targetScore: 380,
  queueCap: 4,
  maxAbandon: 10,
  feeds: ["agua", "coalhada", "pao", "bezerro"],
  plateMax: 6,
  tutorial: { direct: "agua", cook: "pao" },
  intro: "abraao_intro",
  outro: "abraao_outro",
  schedule: [
    { at: 0, guest: "visitante", guided: true },
    { at: 0, guest: "viajante", guided: true },
    ...wave(["peregrino", "pastor", "jovem", "visitante", "tres", "viajante", "pastor", "peregrino", "jovem", "tres", "visitante", "pastor"], 9, 4.6),
  ],
  events: [
    { at: 50, kind: "crowd", text: "EVENTO! Chegou uma caravana de viajantes." },
    { at: 100, kind: "storm", text: "EVENTO! O calor do meio-dia aperta. Todos ficam impacientes." },
  ],
};

/** 2. Jacó e Esaú: o guisado de lentilhas (Gênesis 25). */
export const ESAU: LevelDef = {
  id: "esau",
  number: 2,
  arc: "Gênesis",
  title: "Jacó e Esaú: O Guisado",
  hero: "Jacó",
  objective: "Cozinhe o guisado de lentilhas e sirva os famintos que voltam do campo. Esaú está com muita pressa!",
  ref: "Gênesis 25:29–34",
  context:
    "Um dia, Jacó preparou um guisado de lentilhas. Esaú chegou do campo, muito cansado, e pediu para comer daquele guisado vermelho. Jacó deu a ele pão e guisado; Esaú comeu, bebeu, levantou-se e foi embora. A Bíblia diz que, assim, Esaú desprezou o seu direito de filho mais velho: trocou algo precioso por uma refeição para matar a fome de um momento.",
  note: "A fila de famintos e o tempo de preparo são uma representação lúdica para o gameplay. A Bíblia registra o guisado de lentilhas, o pão e a pressa de Esaú, sem detalhar mais ninguém na cozinha.",
  scene: "esau",
  timeLimit: 180,
  targetScore: 430,
  queueCap: 4,
  maxAbandon: 8,
  feeds: ["agua", "pao", "lentilhas", "cabrito"],
  plateMax: 6,
  intro: "esau_intro",
  outro: "esau_outro",
  schedule: wave(["esau", "servo", "cacador", "pastor2", "mercador", "esau", "servo", "pastor2", "cacador", "esau", "mercador", "servo"], 6, 4.3),
  events: [
    { at: 45, kind: "restless", text: "EVENTO! Esaú voltou do campo morrendo de fome." },
    { at: 105, kind: "crowd", text: "EVENTO! Uma caravana de mercadores chegou ao acampamento." },
  ],
};

/** 3. A primeira Páscoa (Êxodo 12). */
export const PASCOA: LevelDef = {
  id: "pascoa",
  number: 3,
  arc: "Êxodo",
  title: "A Primeira Páscoa",
  hero: "O povo de Israel",
  objective: "Prepare o cordeiro, o pão sem fermento e as ervas amargas. As famílias comem depressa, prontas para partir!",
  ref: "Êxodo 12:1–14",
  context:
    "Na noite da primeira Páscoa, Deus mandou que cada família comesse o cordeiro assado no fogo, com pães sem fermento e ervas amargas. Deveriam comer apressadamente, de cinto na cintura, sandálias nos pés e cajado na mão, prontos para sair do Egito. A Páscoa é lembrada até hoje como a noite em que o Senhor livrou o seu povo.",
  note: "A fila de famílias e o tempo de preparo são uma representação lúdica para o gameplay. A Bíblia registra o cordeiro assado, os pães sem fermento, as ervas amargas e a pressa na refeição.",
  scene: "pascoa",
  timeLimit: 180,
  targetScore: 460,
  queueCap: 4,
  maxAbandon: 8,
  feeds: ["agua", "ervas", "azimo", "cordeiro"],
  plateMax: 6,
  intro: "pascoa_intro",
  outro: "pascoa_outro",
  schedule: wave(["avo", "jovem3", "mae", "familia", "menina", "jovem3", "familia", "avo", "mae", "menina", "familia", "jovem3"], 5, 4.1),
  events: [
    { at: 55, kind: "crowd", text: "EVENTO! Mais famílias chegaram, todas com pressa." },
    { at: 110, kind: "restless", text: "EVENTO! É quase meia-noite! Comam depressa!" },
  ],
};

/** 4. Maná e codornizes no deserto (Êxodo 16). */
export const MANA: LevelDef = {
  id: "mana",
  number: 4,
  arc: "Êxodo",
  title: "Maná e Codornizes",
  hero: "Moisés",
  objective: "Recolha o maná, asse as codornizes e faça os bolos de maná para o povo no deserto. Cuidado com o murmúrio!",
  ref: "Êxodo 16:4 e 11–15, 31",
  context:
    "No deserto, o povo reclamou de fome. Deus prometeu pão do céu: de manhã o chão amanheceu coberto de uma coisa fina, que parecia geada, e o povo a chamou de maná. Tinha gosto de bolo de mel. À tarde, vieram codornizes e cobriram o acampamento. Cada família recolhia o necessário para o dia: Deus cuidava do seu povo.",
  note: "A fila de famílias e o tempo de preparo são uma representação lúdica para o gameplay. A Bíblia registra o maná, as codornizes e que o povo moía o maná e fazia bolos com ele.",
  scene: "mana",
  timeLimit: 180,
  targetScore: 470,
  queueCap: 4,
  maxAbandon: 8,
  feeds: ["mana", "agua", "bolomana", "codorniz"],
  plateMax: 6,
  intro: "mana_intro",
  outro: "mana_outro",
  schedule: wave(["israelita", "idosa", "menino4", "familia4", "murmurador", "israelita", "familia4", "menino4", "murmurador", "idosa", "familia4", "israelita"], 5, 4.0),
  events: [
    { at: 40, kind: "restless", text: "EVENTO! O povo está murmurando de fome." },
    { at: 90, kind: "crowd", text: "EVENTO! Chegaram as codornizes! Muita gente no acampamento." },
    { at: 135, kind: "restless", text: "EVENTO! Todos querem comer ao mesmo tempo." },
  ],
};

/** 5. As bodas de Caná (João 2). */
export const CANA: LevelDef = {
  id: "cana",
  number: 5,
  arc: "Evangelhos",
  title: "As Bodas de Caná",
  hero: "Jesus",
  objective: "Sirva os convidados da festa. O vinho está acabando: encha as talhas e leve o vinho novo a todos!",
  ref: "João 2:1–11",
  context:
    "Jesus e seus discípulos foram convidados para um casamento em Caná da Galileia. Faltou vinho na festa. Jesus mandou os serventes encherem de água as seis talhas de pedra. Quando o mestre-sala provou o que tinha sido água, disse ao noivo que ele guardara o bom vinho até agora. Foi o primeiro sinal de Jesus, e seus discípulos creram nele.",
  note: "A fila de convidados e o tempo de preparo são uma representação lúdica para o gameplay. A Bíblia registra o casamento, as seis talhas de pedra, o vinho novo e a surpresa do mestre-sala.",
  scene: "cana",
  timeLimit: 180,
  targetScore: 490,
  queueCap: 4,
  maxAbandon: 8,
  feeds: ["vinho", "frutas", "pao", "cordeiro"],
  plateMax: 6,
  intro: "cana_intro",
  outro: "cana_outro",
  schedule: wave(["convidado", "mestresala", "musico", "convidada", "noivos", "convidado", "musico", "mestresala", "convidada", "noivos", "convidado", "convidada"], 5, 3.9),
  events: [
    { at: 50, kind: "crowd", text: "EVENTO! Chegaram mais convidados para a festa." },
    { at: 100, kind: "restless", text: "EVENTO! O vinho está acabando! Todos pedem vinho." },
  ],
};

/** 6. Jesus alimenta a multidão (João 6). */
export const PAES: LevelDef = {
  id: "paes",
  number: 6,
  arc: "Evangelhos",
  title: "Os Pães e os Peixes",
  hero: "Jesus",
  objective: "Asse os pães de cevada e os peixes e alimente a multidão que veio ouvir Jesus. Sobrarão doze cestos!",
  ref: "João 6:1–13",
  context:
    "Uma grande multidão seguia Jesus e já era tarde. Um menino tinha cinco pães de cevada e dois peixes. Jesus tomou os pães, deu graças e distribuiu ao povo; fez o mesmo com os peixes. Todos comeram até ficar satisfeitos e ainda sobraram doze cestos de pedaços. Deus provê mais do que precisamos quando entregamos a ele o que temos.",
  note: "A fila da multidão e o tempo de preparo são uma representação lúdica para o gameplay. A Bíblia registra os cinco pães de cevada, os dois peixes, a ação de graças de Jesus e os doze cestos que sobraram.",
  scene: "paes",
  timeLimit: 180,
  targetScore: 520,
  queueCap: 4,
  maxAbandon: 8,
  feeds: ["agua", "paocevada", "peixe", "frutas"],
  plateMax: 6,
  intro: "paes_intro",
  outro: "paes_outro",
  schedule: wave(["discipulo", "menino6", "pescador", "mae6", "familia6", "pescador", "menino6", "familia6", "mae6", "discipulo", "familia6", "pescador"], 4, 3.7),
  events: [
    { at: 40, kind: "crowd", text: "EVENTO! A multidão está crescendo." },
    { at: 90, kind: "crowd", text: "EVENTO! Mais cinco mil pessoas chegaram ao monte." },
    { at: 135, kind: "restless", text: "EVENTO! Já está ficando tarde. O povo tem fome." },
  ],
};

/** Capítulos da campanha: os seis primeiros estão prontos; os outros aparecem como "em breve". */
export type ChapterInfo = { number: number; arc: string; title: string; ref: string; level?: LevelDef };

export const CAMPAIGN: ChapterInfo[] = [
  { number: 1, arc: "Gênesis", title: ABRAAO.title, ref: ABRAAO.ref, level: ABRAAO },
  { number: 2, arc: "Gênesis", title: ESAU.title, ref: ESAU.ref, level: ESAU },
  { number: 3, arc: "Êxodo", title: PASCOA.title, ref: PASCOA.ref, level: PASCOA },
  { number: 4, arc: "Êxodo", title: MANA.title, ref: MANA.ref, level: MANA },
  { number: 5, arc: "Evangelhos", title: CANA.title, ref: CANA.ref, level: CANA },
  { number: 6, arc: "Evangelhos", title: PAES.title, ref: PAES.ref, level: PAES },
  { number: 7, arc: "Em breve", title: "Elias e a Viúva de Sarepta", ref: "1 Reis 17" },
  { number: 8, arc: "Em breve", title: "Daniel e os Legumes", ref: "Daniel 1" },
  { number: 9, arc: "Em breve", title: "O Grande Banquete", ref: "Lucas 14 e Mateus 22" },
  { number: 10, arc: "Em breve", title: "Jesus em Casa de Zaqueu", ref: "Lucas 19" },
  { number: 11, arc: "Em breve", title: "O Pão Partido em Emaús", ref: "Lucas 24" },
  { number: 12, arc: "Em breve", title: "A Última Ceia", ref: "Lucas 22" },
  { number: 13, arc: "Em breve", title: "O Café da Manhã na Praia", ref: "João 21" },
];

export const LEVELS: Record<string, LevelDef> = Object.fromEntries(CAMPAIGN.flatMap((c) => (c.level ? [[c.level.id, c.level]] : [])));
export const FIRST_LEVEL = ABRAAO;

export const CHALLENGES: { mode: "survival" | "speed" | "perfect"; emoji: string; name: string; desc: string }[] = [
  { mode: "survival", emoji: "♾️", name: "Sobrevivência", desc: "Quantos convidados você atende antes de perder 3? O ritmo só aumenta." },
  { mode: "speed", emoji: "⏱️", name: "Velocidade", desc: "Atenda o máximo de convidados em 60 segundos." },
  { mode: "perfect", emoji: "💎", name: "Perfeito", desc: "Nenhum convidado pode ir embora. Uma falha e acabou." },
];

/** Modos desafio usam o cardápio da multidão de Jesus com chegadas geradas em ritmo crescente. */
export function challengeLevel(mode: "survival" | "speed" | "perfect"): LevelDef {
  const base = { ...PAES, schedule: [], events: [], tutorial: undefined, targetScore: 0 };
  const pool = ["discipulo", "menino6", "pescador", "mae6", "familia6"];
  if (mode === "survival") return { ...base, id: "challenge_survival", title: "Sobrevivência", timeLimit: 0, maxAbandon: 3, generator: { first: 1, start: 7, min: 3, accel: 0.2, pool } };
  if (mode === "speed") return { ...base, id: "challenge_speed", title: "Velocidade", timeLimit: 60, maxAbandon: 99, generator: { first: 1, start: 4.5, min: 2.3, accel: 0.18, pool } };
  return { ...base, id: "challenge_perfect", title: "Perfeito", timeLimit: 120, maxAbandon: 1, generator: { first: 1, start: 6.5, min: 3.6, accel: 0.14, pool } };
}
