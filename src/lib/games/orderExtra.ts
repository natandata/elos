// Conjuntos extras do "Ordene os Fatos". Em vez de escrever centenas de listas à mão, há UMA linha do tempo
// mestra (na ordem bíblica) e os conjuntos são sorteados dela de forma determinística. Como a ordem vem da
// linha do tempo, a resposta certa nunca fica inconsistente.
//   fácil  = 4 fatos famosos de épocas diferentes
//   médio  = 4 fatos da mesma época (ou de épocas vizinhas), bem espaçados
//   difícil = 4 fatos seguidos de uma mesma época
// Entram no FIM da lista (content.ts) para não mudar as partidas antigas.
import type { Level, OrderSet } from "./content";

const ERAS = [
  "Os primeiros tempos", // 0
  "Os patriarcas", // 1
  "Êxodo e deserto", // 2
  "Conquista e juízes", // 3
  "O reino de Israel", // 4
  "Reis e profetas", // 5
  "Exílio e volta", // 6
  "A vida de Jesus", // 7
  "A igreja nasce", // 8
] as const;

/** [época, fato, referência, famoso (1), grupo de conflito] — dois fatos do mesmo grupo nunca caem juntos. */
type Ev = [era: number, text: string, ref: string, famous?: 1, group?: string];

// Está na ordem bíblica. Fatos de ordem duvidosa entre si recebem o mesmo "grupo" para nunca aparecerem juntos.
const EV: Ev[] = [
  [0, "Deus cria o céu e a terra", "Gênesis 1", 1],
  [0, "Adão e Eva vivem no jardim do Éden", "Gênesis 2"],
  [0, "Adão e Eva comem do fruto proibido", "Gênesis 3", 1],
  [0, "Caim mata Abel", "Gênesis 4", 1],
  [0, "Enoque é levado por Deus", "Gênesis 5"],
  [0, "Noé constrói a arca", "Gênesis 6", 1],
  [0, "O dilúvio cobre a terra", "Gênesis 7", 1],
  [0, "O arco-íris aparece como sinal da aliança", "Gênesis 9"],
  [0, "A torre de Babel", "Gênesis 11", 1],

  [1, "Deus chama Abraão para sair de Harã", "Gênesis 12", 1],
  [1, "Abraão e Ló se separam", "Gênesis 13"],
  [1, "Deus promete a Abraão filhos como as estrelas", "Gênesis 15"],
  [1, "Sodoma e Gomorra são destruídas", "Gênesis 19"],
  [1, "Nasce Isaque", "Gênesis 21", 1],
  [1, "Abraão é provado ao oferecer Isaque", "Gênesis 22"],
  [1, "Isaque se casa com Rebeca", "Gênesis 24"],
  [1, "Esaú vende o direito de filho mais velho", "Gênesis 25"],
  [1, "Jacó recebe a bênção de Isaque", "Gênesis 27"],
  [1, "Jacó sonha com a escada até o céu", "Gênesis 28", 1],
  [1, "Jacó trabalha para casar com Raquel", "Gênesis 29"],
  [1, "Jacó luta com o anjo", "Gênesis 32"],
  [1, "Jacó e Esaú se reconciliam", "Gênesis 33"],
  [1, "José é vendido pelos irmãos", "Gênesis 37", 1],
  [1, "José interpreta os sonhos do copeiro e do padeiro", "Gênesis 40"],
  [1, "José interpreta os sonhos do faraó", "Gênesis 41", 1],
  [1, "José se revela aos irmãos", "Gênesis 45"],
  [1, "Jacó desce ao Egito", "Gênesis 46"],

  [2, "Nasce Moisés", "Êxodo 2", 1],
  [2, "Moisés foge para Midiã", "Êxodo 2"],
  [2, "Deus fala a Moisés na sarça ardente", "Êxodo 3", 1],
  [2, "As dez pragas caem sobre o Egito", "Êxodo 7–12", 1],
  [2, "O povo atravessa o Mar Vermelho", "Êxodo 14", 1],
  [2, "O maná cai do céu", "Êxodo 16"],
  [2, "Os Dez Mandamentos são dados no Sinai", "Êxodo 20", 1],
  [2, "O povo faz o bezerro de ouro", "Êxodo 32", 1],
  [2, "O tabernáculo é construído", "Êxodo 35–40"],
  [2, "Os doze espias exploram Canaã", "Números 13"],
  [2, "A serpente de bronze é levantada", "Números 21"],
  [2, "A jumenta de Balaão fala", "Números 22"],
  [2, "Moisés morre no monte Nebo", "Deuteronômio 34"],

  [3, "Josué atravessa o rio Jordão", "Josué 3"],
  [3, "Os muros de Jericó caem", "Josué 6", 1],
  [3, "Acã esconde o que era de Jericó", "Josué 7"],
  [3, "O sol para sobre Gibeão", "Josué 10"],
  [3, "Débora e Baraque vencem Sísera", "Juízes 4"],
  [3, "Gideão vence os midianitas com trezentos homens", "Juízes 7", 1],
  [3, "Sansão derruba as colunas do templo", "Juízes 16", 1],

  [4, "Samuel unge Saul como rei", "1 Samuel 10"],
  [4, "Samuel unge Davi", "1 Samuel 16"],
  [4, "Davi vence Golias", "1 Samuel 17", 1],
  [4, "Jônatas e Davi fazem aliança", "1 Samuel 18"],
  [4, "Davi poupa a vida de Saul na caverna", "1 Samuel 24"],
  [4, "Saul morre em batalha", "1 Samuel 31"],
  [4, "Davi é coroado rei", "2 Samuel 5"],
  [4, "A arca da aliança chega a Jerusalém", "2 Samuel 6"],
  [4, "Davi e Bate-Seba", "2 Samuel 11"],
  [4, "Absalão se rebela contra Davi", "2 Samuel 15"],
  [4, "Salomão pede sabedoria a Deus", "1 Reis 3"],
  [4, "O templo é construído", "1 Reis 6", 1],
  [4, "A rainha de Sebá visita Salomão", "1 Reis 10"],
  [4, "O reino se divide em dois", "1 Reis 12"],

  [5, "Elias é sustentado pela viúva de Sarepta", "1 Reis 17"],
  [5, "Elias desafia os profetas de Baal no Carmelo", "1 Reis 18", 1],
  [5, "Elias é levado ao céu num redemoinho", "2 Reis 2", 1],
  [5, "Eliseu cura Naamã da lepra", "2 Reis 5"],
  [5, "Jonas prega em Nínive", "Jonas 3", 1],
  [5, "Isaías vê o Senhor no templo", "Isaías 6"],
  [5, "Samaria é tomada e Israel vai para o cativeiro", "2 Reis 17"],
  [5, "Ezequias ora e a Assíria é derrotada", "2 Reis 19"],
  [5, "Josias encontra o Livro da Lei", "2 Reis 22"],

  [6, "Daniel e seus amigos são levados para a Babilônia", "Daniel 1"],
  [6, "Jerusalém é destruída por Nabucodonosor", "2 Reis 25", 1, "queda"],
  [6, "Os três amigos são lançados na fornalha de fogo", "Daniel 3", 1, "queda"],
  [6, "Uma mão escreve na parede do palácio", "Daniel 5"],
  [6, "Daniel é lançado na cova dos leões", "Daniel 6", 1],
  [6, "Ciro permite que os judeus voltem a Jerusalém", "Esdras 1"],
  [6, "O templo é reconstruído", "Esdras 6"],
  [6, "Ester se torna rainha da Pérsia", "Ester 2"],
  [6, "Esdras ensina a Lei ao povo", "Neemias 8"],
  [6, "Neemias reconstrói os muros de Jerusalém", "Neemias 6", 1],

  [7, "O anjo Gabriel anuncia a Maria", "Lucas 1", 1],
  [7, "Nasce João Batista", "Lucas 1"],
  [7, "Jesus nasce em Belém", "Lucas 2", 1],
  [7, "Os pastores visitam o menino Jesus", "Lucas 2"],
  [7, "Os magos visitam Jesus", "Mateus 2", 1],
  [7, "A família foge para o Egito", "Mateus 2"],
  [7, "Jesus aos doze anos no templo", "Lucas 2"],
  [7, "Jesus é batizado no Jordão", "Mateus 3", 1],
  [7, "Jesus é tentado no deserto", "Mateus 4"],
  [7, "Jesus faz o primeiro milagre em Caná", "João 2", 1],
  [7, "Jesus chama Pedro e André à beira do mar", "Mateus 4"],
  [7, "Jesus prega o Sermão do Monte", "Mateus 5–7", 1],
  [7, "Jesus acalma a tempestade", "Marcos 4"],
  [7, "Jesus liberta o endemoninhado gadareno", "Marcos 5"],
  [7, "Jesus ressuscita a filha de Jairo", "Marcos 5"],
  [7, "Jesus multiplica os pães e os peixes", "Mateus 14", 1],
  [7, "Jesus anda sobre as águas", "Mateus 14", 1],
  [7, "Pedro confessa que Jesus é o Cristo", "Mateus 16"],
  [7, "A transfiguração", "Mateus 17"],
  [7, "Jesus ressuscita Lázaro", "João 11", 1],
  [7, "Jesus visita Zaqueu em Jericó", "Lucas 19"],
  [7, "A entrada triunfal em Jerusalém", "Mateus 21", 1],
  [7, "Jesus purifica o templo", "Mateus 21"],
  [7, "A Última Ceia", "Mateus 26", 1],
  [7, "A oração no Getsêmani", "Mateus 26", 1],
  [7, "Jesus é preso", "Mateus 26"],
  [7, "Pedro nega Jesus três vezes", "Mateus 26"],
  [7, "Pilatos condena Jesus", "Mateus 27"],
  [7, "A crucificação", "Mateus 27", 1],
  [7, "O sepultamento no túmulo de José de Arimateia", "Mateus 27"],
  [7, "A ressurreição de Jesus", "Mateus 28", 1],
  [7, "Jesus aparece aos discípulos reunidos", "João 20"],
  [7, "Tomé vê as marcas nas mãos de Jesus", "João 20"],
  [7, "Jesus restaura Pedro à beira do mar", "João 21"],
  [7, "A ascensão de Jesus", "Atos 1", 1],

  [8, "O Espírito Santo desce no Pentecostes", "Atos 2", 1],
  [8, "Pedro cura o coxo na Porta Formosa", "Atos 3"],
  [8, "Ananias e Safira mentem aos apóstolos", "Atos 5"],
  [8, "A igreja escolhe os sete para servir", "Atos 6"],
  [8, "Estêvão é apedrejado", "Atos 7", 1],
  [8, "Filipe batiza o eunuco etíope", "Atos 8"],
  [8, "Saulo se converte no caminho de Damasco", "Atos 9", 1],
  [8, "Pedro visita Cornélio", "Atos 10"],
  [8, "Tiago é morto por Herodes", "Atos 12"],
  [8, "Pedro é libertado da prisão por um anjo", "Atos 12"],
  [8, "Paulo faz a primeira viagem missionária", "Atos 13"],
  [8, "Os líderes se reúnem no concílio de Jerusalém", "Atos 15"],
  [8, "Paulo e Silas cantam na prisão em Filipos", "Atos 16", 1],
  [8, "Paulo prega em Atenas", "Atos 17"],
  [8, "Paulo fica um ano e meio em Corinto", "Atos 18"],
  [8, "Paulo ensina em Éfeso", "Atos 19"],
  [8, "Paulo é preso em Jerusalém", "Atos 21", 1],
  [8, "Paulo se defende diante do rei Agripa", "Atos 26"],
  [8, "O navio de Paulo naufraga", "Atos 27", 1],
  [8, "Paulo chega a Roma", "Atos 28"],
  [8, "João recebe o Apocalipse em Patmos", "Apocalipse 1"],
];

// ------------------------------------------------------------------ sorteio determinístico

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PER_LEVEL = 100;
const FAMOUS = EV.map((e, i) => (e[3] ? i : -1)).filter((i) => i >= 0);

function okGroups(ix: number[]): boolean {
  const seen = new Set<string>();
  for (const i of ix) {
    const g = EV[i][4];
    if (!g) continue;
    if (seen.has(g)) return false;
    seen.add(g);
  }
  return true;
}

function pickSorted(rnd: () => number, pool: number[], n = 4): number[] {
  const bag = [...pool];
  const out: number[] = [];
  while (out.length < n && bag.length) out.push(bag.splice(Math.floor(rnd() * bag.length), 1)[0]);
  return out.sort((a, b) => a - b);
}

const EASY_TITLES = ["Grandes momentos da Bíblia", "Do começo ao fim", "Linha do tempo bíblica", "Passos da história de Deus", "Marcos da Bíblia"];

function generate(): OrderSet[] {
  const rnd = mulberry32(20261008);
  const used = new Set<string>();
  const out: OrderSet[] = [];
  const add = (ix: number[], title: string, d: Level): boolean => {
    const key = ix.join(",");
    if (ix.length !== 4 || used.has(key) || !okGroups(ix)) return false;
    used.add(key);
    out.push({
      title,
      events: ix.map((i) => EV[i][1]) as [string, string, string, string],
      ref: ix.map((i) => EV[i][2]).join("; "),
      d,
    });
    return true;
  };

  // fácil: fatos famosos de pelo menos 3 épocas diferentes
  for (let tries = 0, n = 0; n < PER_LEVEL && tries < 20000; tries++) {
    const ix = pickSorted(rnd, FAMOUS);
    if (new Set(ix.map((i) => EV[i][0])).size < 3) continue;
    if (add(ix, EASY_TITLES[n % EASY_TITLES.length], 1)) n++;
  }

  // médio: mesma época ou épocas vizinhas, com espaço entre os fatos
  for (let tries = 0, n = 0; n < PER_LEVEL && tries < 40000; tries++) {
    const start = Math.floor(rnd() * EV.length);
    const pool: number[] = [];
    for (let i = start; i < Math.min(EV.length, start + 16); i++) pool.push(i);
    const ix = pickSorted(rnd, pool);
    const eras = ix.map((i) => EV[i][0]);
    const lo = Math.min(...eras);
    const hi = Math.max(...eras);
    if (hi - lo > 1) continue;
    if (ix[3] - ix[0] < 8) continue;
    const title = lo === hi ? ERAS[lo] : `${ERAS[lo]} · ${ERAS[hi]}`;
    if (add(ix, title, 2)) n++;
  }

  // difícil: fatos bem próximos de uma mesma época
  for (let tries = 0, n = 0; n < PER_LEVEL && tries < 40000; tries++) {
    const start = Math.floor(rnd() * (EV.length - 4));
    const pool: number[] = [];
    for (let i = start; i < Math.min(EV.length, start + 7); i++) pool.push(i);
    const ix = pickSorted(rnd, pool);
    if (new Set(ix.map((i) => EV[i][0])).size !== 1) continue;
    if (add(ix, ERAS[EV[ix[0]][0]], 3)) n++;
  }
  return out;
}

export const ORDER_EXTRA: OrderSet[] = generate();
