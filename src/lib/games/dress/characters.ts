// Personagens do "Vista o Herói" (client-safe). As respostas certas ficam só no servidor (solutions.ts).
// Conteúdo segue a Bíblia protestante.

export type DollBase = {
  skin: string;
  hair: "short" | "long" | "braids" | "bald";
  hairColor: string;
  beard: "none" | "short" | "long";
  female?: boolean;
  /** cor do batom e da sombra (personalização da jogadora) */
  lip?: string;
  shadow?: string;
  /** maquiagem completa da jogadora; sem isto o rosto fica como sempre foi (personagens da história) */
  face?: {
    lipStyle: "fosco" | "gloss" | "degrade";
    blush: string | null;
    eye: string;
    liner: "none" | "fino" | "gatinho" | "grosso";
    linerColor: string;
    lashes: "none" | "natural" | "longos" | "dramaticos";
    brows: "afiladas" | "grossas" | "arqueadas" | "retas" | "finas";
    browColor: string | null;
    marks: ("sardas" | "pinta" | "brilho" | "pontos")[];
  };
};

export type DressCharacter = {
  id: string;
  name: string;
  /** a história em poucas linhas (a pista pra escolher as peças) */
  clue: string;
  ref: string;
  base: DollBase;
  /** cores do cenário: céu e chão */
  bg: [string, string];
};

const S = { light: "#f1c9a0", tan: "#d9a66f", brown: "#b97b4b", deep: "#8d5a36" };

export const DRESS_CHARACTERS: DressCharacter[] = [
  {
    id: "davi",
    name: "Davi",
    clue: "Jovem pastor de ovelhas que enfrentou o gigante Golias sem armadura, só com o que usava no campo.",
    ref: "1 Samuel 17:40",
    base: { skin: S.tan, hair: "short", hairColor: "#6b3b1c", beard: "none" },
    bg: ["#bfe3f5", "#9ccf6a"],
  },
  {
    id: "joao",
    name: "João Batista",
    clue: "Viveu no deserto, comia gafanhotos e mel silvestre e pregava: “Preparem o caminho do Senhor”.",
    ref: "Mateus 3:1-4",
    base: { skin: S.brown, hair: "long", hairColor: "#4a2c14", beard: "long" },
    bg: ["#f5d9a8", "#d9b97a"],
  },
  {
    id: "jose",
    name: "José, governador do Egito",
    clue: "Vendido pelos irmãos, chegou a governador do Egito. O faraó o honrou diante de todos.",
    ref: "Gênesis 41:41-43",
    base: { skin: S.tan, hair: "short", hairColor: "#2e1a0c", beard: "none" },
    bg: ["#fbe3b0", "#e0b66a"],
  },
  {
    id: "gideao",
    name: "Gideão",
    clue: "Com apenas 300 homens, cercou o acampamento inimigo à noite. Não levaram espadas na mão, e sim outra coisa.",
    ref: "Juízes 7:16-20",
    base: { skin: S.tan, hair: "short", hairColor: "#5a3a1e", beard: "short" },
    bg: ["#26335c", "#4b5a3a"],
  },
  {
    id: "sansao",
    name: "Sansão",
    clue: "Nazireu, consagrado a Deus desde o nascimento. Sua força era enorme e o cabelo nunca foi cortado.",
    ref: "Juízes 15:15; 16:17",
    base: { skin: S.brown, hair: "braids", hairColor: "#2b1a0c", beard: "short" },
    bg: ["#f7dca4", "#c99a52"],
  },
  {
    id: "moises",
    name: "Moisés",
    clue: "Diante da sarça que ardia sem se queimar, ouviu: “O lugar em que você está é terra santa”.",
    ref: "Êxodo 3:5; 4:2",
    base: { skin: S.tan, hair: "long", hairColor: "#d8d4cc", beard: "long" },
    bg: ["#f5c98a", "#c8864a"],
  },
  {
    id: "noe",
    name: "Noé",
    clue: "Construiu a arca e, depois do dilúvio, soltou uma pomba que voltou trazendo um sinal de paz.",
    ref: "Gênesis 8:11",
    base: { skin: S.light, hair: "long", hairColor: "#cfcac0", beard: "long" },
    bg: ["#cfe8f6", "#a8c98a"],
  },
  {
    id: "daniel",
    name: "Daniel",
    clue: "Servo de Deus na corte da Babilônia. Leu a escrita na parede e foi honrado pelo rei.",
    ref: "Daniel 5:29",
    base: { skin: S.tan, hair: "short", hairColor: "#2b1b10", beard: "short" },
    bg: ["#3b2a66", "#6f5aa6"],
  },
  {
    id: "ester",
    name: "Ester",
    clue: "Jovem judia que virou rainha da Pérsia e arriscou a vida para salvar o seu povo.",
    ref: "Ester 2:17; 5:1-2",
    base: { skin: S.light, hair: "long", hairColor: "#3a2012", beard: "none", female: true },
    bg: ["#f3d2e6", "#c88fb0"],
  },
  {
    id: "maria",
    name: "Maria, mãe de Jesus",
    clue: "Jovem humilde de Nazaré, escolhida por Deus. Respondeu: “Eis aqui a serva do Senhor”.",
    ref: "Lucas 1:26-38",
    base: { skin: S.tan, hair: "long", hairColor: "#3a2012", beard: "none", female: true },
    bg: ["#d6e8f7", "#a9c4e0"],
  },
  {
    id: "josue",
    name: "Josué",
    clue: "Líder de Israel na conquista de Jericó. Antes da batalha, encontrou o comandante do exército do Senhor.",
    ref: "Josué 5:13-15; 6:2-5",
    base: { skin: S.brown, hair: "short", hairColor: "#2a1a0e", beard: "short" },
    bg: ["#f1d9b0", "#bd9a62"],
  },
  {
    id: "salomao",
    name: "Salomão",
    clue: "Rei de Israel, pediu sabedoria a Deus. Seu trono e sua glória eram famosos até em terras distantes.",
    ref: "1 Reis 3:9; 10:18-20",
    base: { skin: S.tan, hair: "short", hairColor: "#2b1a0c", beard: "short" },
    bg: ["#fbeab8", "#e0b24a"],
  },
  {
    id: "miguel",
    name: "Miguel, o arcanjo",
    clue: "Anjo guerreiro que lidera os exércitos do céu na batalha contra o dragão.",
    ref: "Apocalipse 12:7",
    base: { skin: S.light, hair: "long", hairColor: "#e8d28a", beard: "none" },
    bg: ["#2a3b7a", "#5d7ad6"],
  },
  {
    id: "adao",
    name: "Adão",
    clue: "Primeiro homem. Depois do pecado, percebeu que estava nu e se cobriu; depois Deus mesmo o vestiu.",
    ref: "Gênesis 3:7, 21",
    base: { skin: S.brown, hair: "short", hairColor: "#3a2412", beard: "none" },
    bg: ["#c8efc0", "#6fbf5a"],
  },
  {
    id: "eva",
    name: "Eva",
    clue: "Primeira mulher. Depois do pecado, percebeu que estava nua e se cobriu; depois Deus mesmo a vestiu.",
    ref: "Gênesis 3:7, 21",
    base: { skin: S.tan, hair: "long", hairColor: "#4a2a14", beard: "none", female: true },
    bg: ["#c8efc0", "#6fbf5a"],
  },
  {
    id: "jaco",
    name: "Jacó",
    clue: "Pastor que vivia em tendas. Para receber a bênção do pai, cobriu as mãos e o pescoço com peles.",
    ref: "Gênesis 27:16; 32:10",
    base: { skin: S.tan, hair: "short", hairColor: "#5a3a1e", beard: "short" },
    bg: ["#f3dcb0", "#cfa467"],
  },
  {
    id: "isaias",
    name: "Isaías",
    clue: "Profeta que, por ordem de Deus, andou despojado como sinal ao povo e escreveu num grande rolo.",
    ref: "Isaías 20:2; 8:1",
    base: { skin: S.light, hair: "short", hairColor: "#6a4a2c", beard: "short" },
    bg: ["#dfe3ea", "#a9b0c0"],
  },
  {
    id: "rute",
    name: "Rute",
    clue: "Viúva estrangeira que seguiu a sogra até Belém e trabalhou no campo de Boaz, recolhendo o que sobrava da colheita.",
    ref: "Rute 2:2-3, 17",
    base: { skin: S.tan, hair: "long", hairColor: "#3a2012", beard: "none", female: true },
    bg: ["#f6e2a8", "#d9b55a"],
  },
  {
    id: "miria",
    name: "Miriã",
    clue: "Irmã de Moisés. Depois que o povo atravessou o mar a pé enxuto, ela guiou as mulheres em louvor e dança.",
    ref: "Êxodo 15:20-21",
    base: { skin: S.brown, hair: "long", hairColor: "#2a1a0e", beard: "none", female: true },
    bg: ["#bfe3f5", "#e0c88a"],
  },
  {
    id: "rebeca",
    name: "Rebeca",
    clue: "No poço, deu água ao servo de Abraão e aos seus camelos. Ao ver Isaque de longe, fez o que a noiva faz.",
    ref: "Gênesis 24:15-20, 65",
    base: { skin: S.light, hair: "long", hairColor: "#4a2a14", beard: "none", female: true },
    bg: ["#f9dcc0", "#cfa467"],
  },
  {
    id: "raquel",
    name: "Raquel",
    clue: "Chegou ao poço com o rebanho do pai, e foi ali que Jacó se apaixonou por ela.",
    ref: "Gênesis 29:9-11",
    base: { skin: S.tan, hair: "long", hairColor: "#3a2012", beard: "none", female: true },
    bg: ["#cfe8b8", "#8fbf63"],
  },
  {
    id: "saba",
    name: "Rainha de Sabá",
    clue: "Veio de terras distantes a Jerusalém para provar a sabedoria de Salomão, trazendo presentes de grande valor.",
    ref: "1 Reis 10:1-2",
    base: { skin: S.deep, hair: "braids", hairColor: "#1f130a", beard: "none", female: true },
    bg: ["#fbe3a8", "#c9843a"],
  },
  {
    id: "jael",
    name: "Jael",
    clue: "Quando o general inimigo dormiu na sua tenda, ela usou o que tinha à mão numa tenda de nômades.",
    ref: "Juízes 4:21",
    base: { skin: S.tan, hair: "long", hairColor: "#2b1a0c", beard: "none", female: true },
    bg: ["#f1d9a8", "#b98a55"],
  },
  {
    id: "betania",
    name: "Maria de Betânia",
    clue: "Irmã de Marta e Lázaro. Aos pés de Jesus, derramou um perfume caríssimo e enxugou os pés dele com o que tinha na cabeça.",
    ref: "João 12:3",
    base: { skin: S.light, hair: "long", hairColor: "#5a3016", beard: "none", female: true },
    bg: ["#e5d6f5", "#a98fc9"],
  },
  {
    id: "dorcas",
    name: "Dorcas (Tabita)",
    clue: "Discípula de Jope, amada por todos, que passava os dias fazendo roupas para as viúvas pobres.",
    ref: "Atos 9:36-39",
    base: { skin: S.brown, hair: "long", hairColor: "#2a1a0e", beard: "none", female: true },
    bg: ["#f9d9d9", "#d9919b"],
  },
  {
    id: "lidia",
    name: "Lídia",
    clue: "Mulher de Tiatira que vendia um tecido muito caro e abriu a casa para Paulo e seus companheiros em Filipos.",
    ref: "Atos 16:14-15",
    base: { skin: S.tan, hair: "long", hairColor: "#3a2012", beard: "none", female: true },
    bg: ["#e3d0f0", "#9b6bbf"],
  },
  {
    id: "raabe",
    name: "Raabe",
    clue: "Escondeu os espias de Israel em Jericó e, em troca, amarrou algo vermelho na janela para salvar a família.",
    ref: "Josué 2:6, 18",
    base: { skin: S.tan, hair: "long", hairColor: "#4a2a14", beard: "none", female: true },
    bg: ["#f6cfc0", "#c9654a"],
  },
  {
    id: "ana",
    name: "Ana, mãe de Samuel",
    clue: "Pediu um filho ao Senhor com lágrimas. Quando Samuel nasceu, todo ano ela levava a ele algo que ela mesma fazia.",
    ref: "1 Samuel 1:10-11; 2:19",
    base: { skin: S.light, hair: "long", hairColor: "#6a4a2c", beard: "none", female: true },
    bg: ["#dfe9f7", "#9fb8de"],
  },
  {
    id: "abigail",
    name: "Abigail",
    clue: "Mulher sábia que levou pães, vinho e grãos em jumentos para acalmar Davi antes que ele atacasse a casa de Nabal.",
    ref: "1 Samuel 25:18-19",
    base: { skin: S.tan, hair: "long", hairColor: "#3a2012", beard: "none", female: true },
    bg: ["#f3e6b8", "#c9a94a"],
  },
];

export const DRESS_CHARACTER_BY_ID = new Map(DRESS_CHARACTERS.map((c) => [c.id, c]));

/** O jogo só sorteia personagens femininas (os personagens masculinos ficam guardados, fora do sorteio). */
export const FEMALE_CHARACTERS = DRESS_CHARACTERS.filter((c) => c.base.female);
