// Temas bíblicos do "Vista o Herói" (client-safe, só dados): um tema novo entra aqui sem mexer na lógica do jogo.
// As respostas do júri ficam no servidor (solutions.ts), com o mesmo id do tema.
import { DRESS_CHARACTER_BY_ID } from "./characters";

export type ThemeCategory = "characters" | "events" | "places" | "concepts";
export type Difficulty = "easy" | "medium" | "hard" | "expert";
/** Cenário da passarela (public/dress/cenarios/<chave>.webp; o palácio é a passarela original). */
export type SceneKey = "palacio" | "deserto" | "galileia" | "templo" | "mercado" | "vila" | "jardim" | "montanha";

export type BibleTheme = {
  id: string;
  name: string;
  /** a chamada da rodada ("Vista-se como...") */
  description: string;
  category: ThemeCategory;
  difficulty: Difficulty;
  tags: string[];
  /** dica opcional: ajuda a interpretar sem entregar a combinação */
  hint: string;
  /** a história em poucas linhas */
  historicalContext: string;
  /** categorias que costumam ajudar (sugestão, ninguém é obrigada a usar) */
  suggestions: string[];
  scene: SceneKey;
  ref?: string;
};

export const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: "Fácil", medium: "Médio", hard: "Difícil", expert: "Expert" };
export const CATEGORY_LABEL: Record<ThemeCategory, string> = { characters: "Personagem", events: "História", places: "Lugar", concepts: "Estética bíblica" };

type Meta = Pick<BibleTheme, "difficulty" | "scene" | "tags" | "suggestions" | "hint">;

/** Personagens (o texto vem de characters.ts; aqui entram o que é do jogo: cenário, dificuldade, tags e sugestões). */
const CHARACTER_META: Record<string, Meta> = {
  ester: { difficulty: "medium", scene: "palacio", tags: ["royal", "queen", "persia", "old_testament"], suggestions: ["Roupa real", "Manto", "Coroa ou diadema", "Joias", "Cores nobres"], hint: "Pense numa rainha da corte persa que arriscou a vida pelo seu povo." },
  maria: { difficulty: "easy", scene: "vila", tags: ["nazare", "mother", "new_testament", "veil"], suggestions: ["Túnica simples", "Véu", "Manto", "Sandálias"], hint: "Uma jovem humilde de Nazaré: simplicidade e cores suaves." },
  eva: { difficulty: "hard", scene: "jardim", tags: ["eden", "creation", "old_testament", "nature"], suggestions: ["Folhas e natureza", "Cabelo solto", "Pés descalços"], hint: "A primeira mulher, no jardim: o que a natureza oferece?" },
  rute: { difficulty: "medium", scene: "vila", tags: ["harvest", "moab", "old_testament", "field"], suggestions: ["Roupa de trabalho", "Pano na cabeça", "Espigas", "Sandálias"], hint: "Uma estrangeira que respigava espigas nos campos de Belém." },
  miria: { difficulty: "medium", scene: "deserto", tags: ["exodus", "prophetess", "music", "old_testament"], suggestions: ["Túnica", "Pandeiro", "Manto", "Pés descalços"], hint: "Ela cantou e dançou depois de atravessar o mar." },
  rebeca: { difficulty: "medium", scene: "vila", tags: ["well", "water", "old_testament", "veil"], suggestions: ["Véu", "Cântaro", "Túnica", "Sandálias"], hint: "Foi buscar água no poço e deu de beber aos camelos." },
  raquel: { difficulty: "easy", scene: "montanha", tags: ["shepherd", "sheep", "old_testament"], suggestions: ["Roupa simples", "Cajado", "Pano de cabeça", "Sandálias"], hint: "Pastora de ovelhas do seu pai." },
  saba: { difficulty: "medium", scene: "palacio", tags: ["royal", "queen", "caravan", "old_testament"], suggestions: ["Roupa real", "Joias", "Coroa", "Manto"], hint: "Veio de longe, com riquezas, visitar o rei Salomão." },
  jael: { difficulty: "hard", scene: "deserto", tags: ["tent", "judges", "old_testament"], suggestions: ["Roupa simples", "Estaca de tenda", "Pano de cabeça", "Sandálias"], hint: "Mulher de tenda do deserto, com uma ferramenta de acampamento." },
  betania: { difficulty: "medium", scene: "vila", tags: ["perfume", "worship", "new_testament", "bethany"], suggestions: ["Túnica", "Vaso de alabastro", "Véu", "Sandálias"], hint: "Ela derramou perfume precioso aos pés de Jesus." },
  dorcas: { difficulty: "medium", scene: "mercado", tags: ["tailor", "joppa", "new_testament", "charity"], suggestions: ["Túnica", "Tecidos", "Cesta", "Sandálias"], hint: "Costurava roupas para as viúvas em Jope." },
  lidia: { difficulty: "medium", scene: "mercado", tags: ["merchant", "purple", "philippi", "new_testament"], suggestions: ["Túnica", "Tecido púrpura", "Manto", "Sandálias"], hint: "Vendedora de púrpura, tecido caro, em Filipos." },
  raabe: { difficulty: "hard", scene: "mercado", tags: ["jericho", "city", "old_testament", "scarlet"], suggestions: ["Túnica", "Faixa vermelha", "Pano de cabeça", "Sandálias"], hint: "Moradora de Jericó que escondeu os espiões, com um cordão vermelho na janela." },
  ana: { difficulty: "medium", scene: "templo", tags: ["prayer", "temple", "mother", "old_testament"], suggestions: ["Véu", "Túnica simples", "Manto", "Sandálias"], hint: "Orou no santuário pedindo um filho." },
  abigail: { difficulty: "hard", scene: "montanha", tags: ["wise", "peace", "old_testament", "noble"], suggestions: ["Roupa nobre", "Manto", "Véu", "Cestos de pão"], hint: "Mulher sábia que levou pães e comida para acalmar um futuro rei." },
};

/** Temas de histórias, lugares e estéticas (o jogo vive de criatividade: não precisam ser uma pessoa só). */
const EXTRA_THEMES: BibleTheme[] = [
  {
    id: "mulher_virtuosa",
    name: "Mulher Virtuosa",
    description: "Vista-se como a mulher descrita em Provérbios 31.",
    category: "concepts",
    difficulty: "medium",
    tags: ["proverbs", "linen", "wisdom", "old_testament"],
    hint: "Linho fino, força e trabalho: uma mulher de valor.",
    historicalContext: "Provérbios 31 descreve uma mulher que trabalha com as mãos, veste linho fino e púrpura e é respeitada na cidade.",
    suggestions: ["Linho", "Cinto", "Cestas", "Cores nobres"],
    scene: "vila",
    ref: "Provérbios 31:10-31",
  },
  {
    id: "pastora_ovelhas",
    name: "Pastora de Ovelhas",
    description: "Vista-se como quem cuida do rebanho nas colinas.",
    category: "concepts",
    difficulty: "easy",
    tags: ["shepherd", "sheep", "hills", "old_testament"],
    hint: "Roupa prática para o campo e algo para guiar o rebanho.",
    historicalContext: "Pastorear era trabalho comum em Israel: de Raquel a Davi, muita gente da Bíblia cuidou de ovelhas.",
    suggestions: ["Túnica simples", "Pano de cabeça", "Cajado", "Sandálias"],
    scene: "montanha",
    ref: "Gênesis 29:9",
  },
  {
    id: "viajante_deserto",
    name: "Viajante do Deserto",
    description: "Vista-se para uma longa viagem pelo deserto.",
    category: "concepts",
    difficulty: "easy",
    tags: ["desert", "travel", "exodus", "old_testament"],
    hint: "Proteção contra o sol e a areia, e algo para carregar água.",
    historicalContext: "Povos inteiros atravessaram o deserto a pé: roupas leves, panos na cabeça e mantos contra o frio da noite.",
    suggestions: ["Pano de cabeça", "Manto", "Cajado", "Cântaro"],
    scene: "deserto",
  },
  {
    id: "pesca_galileia",
    name: "Pesca na Galileia",
    description: "Vista-se para um dia de pesca no mar da Galileia.",
    category: "places",
    difficulty: "medium",
    tags: ["galilee", "fisher", "disciples", "new_testament"],
    hint: "Roupa simples e leve de quem trabalha com barcos e redes.",
    historicalContext: "Vários discípulos de Jesus eram pescadores no mar da Galileia, que passavam a noite jogando as redes.",
    suggestions: ["Túnica simples", "Cinto", "Cesta", "Pés descalços"],
    scene: "galileia",
    ref: "Lucas 5:1-11",
  },
  {
    id: "princesa_israel",
    name: "Princesa de Israel",
    description: "Vista-se como uma filha do rei.",
    category: "concepts",
    difficulty: "medium",
    tags: ["royal", "princess", "israel", "old_testament"],
    hint: "Uma túnica de mangas compridas e muito colorida distinguia as filhas do rei.",
    historicalContext: "Em Israel, as filhas virgens do rei usavam túnicas especiais de mangas compridas e muitas cores.",
    suggestions: ["Túnica colorida", "Diadema", "Colar", "Véu"],
    scene: "palacio",
    ref: "2 Samuel 13:18",
  },
  {
    id: "peregrina_jerusalem",
    name: "Peregrina em Jerusalém",
    description: "Vista-se para subir ao templo numa festa.",
    category: "places",
    difficulty: "medium",
    tags: ["jerusalem", "temple", "pilgrim", "feast"],
    hint: "Três vezes por ano as famílias subiam a Jerusalém: roupa digna, véu e algo para o caminho.",
    historicalContext: "Nas festas, peregrinos de toda parte caminhavam até Jerusalém cantando os Salmos de romagem.",
    suggestions: ["Véu", "Túnica", "Xale", "Cajado"],
    scene: "templo",
    ref: "Salmo 122",
  },
  {
    id: "mercadora_jerusalem",
    name: "Mercadora de Jerusalém",
    description: "Vista-se para um dia de mercado na cidade antiga.",
    category: "places",
    difficulty: "medium",
    tags: ["market", "merchant", "jerusalem", "city"],
    hint: "Roupa de quem trabalha e vende: prática, mas bem apresentada.",
    historicalContext: "Nos mercados se vendiam pães, frutas, tecidos e jarros; as mulheres também negociavam.",
    suggestions: ["Túnica", "Cinto", "Cesta", "Pano de cabeça"],
    scene: "mercado",
  },
  {
    id: "festa_israel",
    name: "Festa em Israel",
    description: "Vista-se para uma celebração com música e dança.",
    category: "events",
    difficulty: "hard",
    tags: ["feast", "music", "celebration", "old_testament"],
    hint: "Cores alegres, joias e algum instrumento: a festa é o centro.",
    historicalContext: "Os israelitas celebravam com música, pandeiros, danças e roupas de festa.",
    suggestions: ["Roupa colorida", "Faixa", "Pandeiro", "Coroa de flores"],
    scene: "vila",
    ref: "Êxodo 15:20",
  },
  {
    id: "noite_belem",
    name: "Uma Noite em Belém",
    description: "Vista-se para a noite em que Jesus nasceu.",
    category: "events",
    difficulty: "hard",
    tags: ["bethlehem", "nativity", "night", "new_testament"],
    hint: "Roupas simples, lã e panos para o frio da noite, uma lamparina na mão.",
    historicalContext: "Naquela noite, em Belém, pastores e viajantes estavam acordados, e o povo cuidava de lamparinas e rebanhos.",
    suggestions: ["Túnica simples", "Xale", "Lamparina", "Pano de cabeça"],
    scene: "vila",
    ref: "Lucas 2:8-20",
  },
];

const fromCharacter = (id: string): BibleTheme | null => {
  const c = DRESS_CHARACTER_BY_ID.get(id);
  const m = CHARACTER_META[id];
  if (!c || !m) return null;
  return { id: c.id, name: c.name, description: `Vista-se como ${c.name}.`, category: "characters", historicalContext: c.clue, ref: c.ref, ...m };
};

export const THEMES: BibleTheme[] = [...Object.keys(CHARACTER_META).map(fromCharacter).filter((t): t is BibleTheme => !!t), ...EXTRA_THEMES];
export const THEME_BY_ID = new Map(THEMES.map((t) => [t.id, t]));

/** URL do cenário da passarela de um tema. */
export const sceneUrl = (scene: SceneKey): string => (scene === "palacio" ? "/dress/passarela.webp" : `/dress/cenarios/${scene}.webp`);
