// Banco de palavras de Quem Desenha? (só dados, client-safe). Cada palavra tem categoria, dificuldade, duas pistas
// e variações aceitas. Conteúdo segue a Bíblia protestante (66 livros, NVI). Uma palavra nova entra numa das listas abaixo.

export type Category = "personagens" | "animais" | "objetos" | "lugares" | "historias" | "conceitos";
export type Level = "facil" | "medio" | "dificil";
export type Testament = "AT" | "NT" | "ambos";

export type Word = {
  id: string;
  text: string;
  category: Category;
  level: Level;
  testament: Testament;
  /** duas pistas, da mais vaga para a mais específica */
  hints: [string, string];
  /** outras formas de escrever que também valem (sem acento, tanto faz) */
  aliases: string[];
  tags: ("rp" | "kids" | "louvor" | "igreja")[];
};

export const CATEGORY_LABEL: Record<Category, { emoji: string; name: string }> = {
  personagens: { emoji: "🧑", name: "Personagens" },
  animais: { emoji: "🐑", name: "Animais" },
  objetos: { emoji: "🏺", name: "Objetos" },
  lugares: { emoji: "⛰️", name: "Lugares" },
  historias: { emoji: "📜", name: "Histórias" },
  conceitos: { emoji: "💡", name: "Conceitos" },
};

export const LEVEL_LABEL: Record<Level, { emoji: string; name: string }> = {
  facil: { emoji: "🟢", name: "Fácil" },
  medio: { emoji: "🟡", name: "Médio" },
  dificil: { emoji: "🔴", name: "Difícil" },
};

/** "Culturas": recortes do banco para escolher o clima da partida. */
export type Culture = "biblia" | "at" | "nt" | "reisprofetas" | "personagens" | "louvor" | "igreja" | "kids";
export const CULTURES: { key: Culture; emoji: string; name: string; hint: string }[] = [
  { key: "biblia", emoji: "📖", name: "Bíblia inteira", hint: "Todas as categorias" },
  { key: "at", emoji: "🏺", name: "Antigo Testamento", hint: "Personagens, objetos e acontecimentos do AT" },
  { key: "nt", emoji: "✝️", name: "Novo Testamento", hint: "Evangelhos, Atos e cartas" },
  { key: "reisprofetas", emoji: "👑", name: "Reis e Profetas", hint: "Davi, Saul, Salomão, Elias, Eliseu…" },
  { key: "personagens", emoji: "🧑‍🤝‍🧑", name: "Personagens", hint: "Só pessoas" },
  { key: "louvor", emoji: "🎵", name: "Louvor", hint: "Adoração e música" },
  { key: "igreja", emoji: "⛪", name: "Igreja", hint: "Vida cristã" },
  { key: "kids", emoji: "🧒", name: "Kids", hint: "Palavras bem simples" },
];

// [texto, nível, testamento, pista 1, pista 2, marcas ("rp" "k" "l" "i"), variações]
type Row = [string, Level, Testament, string, string, string?, string[]?];

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function make(category: Category, rows: Row[]): Word[] {
  return rows.map(([text, level, testament, h1, h2, marks = "", aliases = []]) => {
    const m = marks.split(" ");
    const tags: Word["tags"] = [];
    if (m.includes("rp")) tags.push("rp");
    if (m.includes("k")) tags.push("kids");
    if (m.includes("l")) tags.push("louvor");
    if (m.includes("i")) tags.push("igreja");
    return { id: `${category}:${slug(text)}`, text, category, level, testament, hints: [h1, h2], aliases, tags };
  });
}

const PERSONAGENS = make("personagens", [
  ["Noé", "facil", "AT", "Personagem do Antigo Testamento.", "Construiu uma grande arca.", "k", ["noe"]],
  ["Davi", "facil", "AT", "Personagem do Antigo Testamento.", "Pastor que virou rei de Israel.", "rp k", ["rei davi", "david"]],
  ["Golias", "facil", "AT", "Personagem do Antigo Testamento.", "Gigante filisteu derrotado com uma pedra.", "k"],
  ["Jesus", "facil", "NT", "O centro do Novo Testamento.", "Nasceu em Belém e morreu na cruz.", "k", ["jesus cristo", "cristo"]],
  ["Maria", "facil", "NT", "Personagem do Novo Testamento.", "Mãe de Jesus.", "k", ["maria mae de jesus"]],
  ["Adão", "facil", "AT", "O primeiro dos personagens.", "O primeiro homem, feito do pó da terra.", "k", ["adao"]],
  ["Eva", "facil", "AT", "Personagem do Antigo Testamento.", "A primeira mulher.", "k"],
  ["Jonas", "facil", "AT", "Profeta do Antigo Testamento.", "Passou três dias dentro de um grande peixe.", "rp k"],
  ["Moisés", "medio", "AT", "Personagem do Antigo Testamento.", "Tirou o povo do Egito e recebeu os mandamentos.", "rp", ["moises"]],
  ["Sansão", "medio", "AT", "Juiz de Israel.", "Tinha uma força enorme e cabelos compridos.", "k", ["sansao"]],
  ["Daniel", "medio", "AT", "Profeta na Babilônia.", "Foi lançado na cova dos leões.", "rp k"],
  ["Elias", "medio", "AT", "Profeta do Antigo Testamento.", "Foi levado ao céu num redemoinho.", "rp", ["profeta elias"]],
  ["José do Egito", "medio", "AT", "Personagem de Gênesis.", "Vendido pelos irmãos, chegou a governador do Egito.", "", ["jose", "jose do egito"]],
  ["Abraão", "medio", "AT", "Pai de uma grande nação.", "Recebeu a promessa de ter descendentes como as estrelas.", "", ["abraao", "abrao"]],
  ["Isaque", "medio", "AT", "Filho da promessa.", "Filho de Abraão e Sara.", ""],
  ["Jacó", "medio", "AT", "Pai das doze tribos.", "Lutou com o anjo e recebeu o nome Israel.", "", ["jaco"]],
  ["Salomão", "medio", "AT", "Rei de Israel.", "Pediu sabedoria a Deus e construiu o Templo.", "rp", ["salomao", "rei salomao"]],
  ["Saul", "medio", "AT", "O primeiro rei de Israel.", "Perseguiu Davi.", "rp", ["rei saul"]],
  ["Samuel", "medio", "AT", "Profeta e juiz.", "Ouviu a voz de Deus ainda menino, no templo.", "rp"],
  ["Josué", "medio", "AT", "Sucessor de Moisés.", "Conduziu o povo à terra prometida e a Jericó.", "rp", ["josue"]],
  ["Ester", "medio", "AT", "Rainha de um reino estrangeiro.", "Salvou o seu povo diante do rei Assuero.", "", ["rainha ester"]],
  ["Jó", "medio", "AT", "Homem íntegro que sofreu muito.", "Perdeu tudo e continuou confiando em Deus.", "", ["jo"]],
  ["Caim", "medio", "AT", "Personagem de Gênesis.", "Filho de Adão e Eva que matou o irmão.", ""],
  ["Pedro", "medio", "NT", "Apóstolo de Jesus.", "Pescador que negou o Mestre três vezes.", "", ["simao pedro", "apostolo pedro"]],
  ["Paulo", "medio", "NT", "Apóstolo dos gentios.", "Perseguia a igreja até encontrar Jesus no caminho de Damasco.", "", ["apostolo paulo", "saulo"]],
  ["João Batista", "medio", "NT", "Profeta do Novo Testamento.", "Preparou o caminho e batizou Jesus no Jordão.", "rp", ["joao batista"]],
  ["Zaqueu", "medio", "NT", "Cobrador de impostos.", "Subiu numa árvore para ver Jesus.", "k"],
  ["Lázaro", "medio", "NT", "Amigo de Jesus.", "Foi chamado para fora do túmulo depois de quatro dias.", "", ["lazaro"]],
  ["Judas", "medio", "NT", "Um dos doze.", "Entregou Jesus por trinta moedas de prata.", "", ["judas iscariotes"]],
  ["Eliseu", "dificil", "AT", "Profeta do Antigo Testamento.", "Sucessor de Elias, que pegou o manto dele.", "rp"],
  ["Isaías", "dificil", "AT", "Um dos grandes profetas.", "Anunciou o Servo sofredor e o Emanuel.", "rp", ["isaias"]],
  ["Gideão", "dificil", "AT", "Juiz de Israel.", "Venceu os midianitas com trezentos homens.", "", ["gedeao", "gideao"]],
  ["Débora", "dificil", "AT", "Juíza e profetisa.", "Liderou Israel junto com Baraque.", "rp", ["debora"]],
  ["Rute", "dificil", "AT", "Mulher de Moabe.", "Disse à sogra: o teu povo será o meu povo.", ""],
  ["Esaú", "dificil", "AT", "Irmão gêmeo de Jacó.", "Vendeu o direito de primogenitura por um prato de lentilhas.", "", ["esau"]],
  ["Maria Madalena", "dificil", "NT", "Seguidora de Jesus.", "Foi a primeira a ver o Senhor ressuscitado.", ""],
  ["Nicodemos", "dificil", "NT", "Fariseu, membro do Sinédrio.", "Procurou Jesus de noite.", ""],
  ["Pôncio Pilatos", "dificil", "NT", "Governador romano.", "Lavou as mãos diante da multidão.", "", ["pilatos", "poncio pilatos"]],
  ["Estêvão", "dificil", "NT", "Diácono da igreja primitiva.", "Foi o primeiro mártir cristão.", "", ["estevao"]],
]);

const ANIMAIS = make("animais", [
  ["Leão", "facil", "ambos", "Animal que aparece em várias histórias.", "Daniel ficou entre eles na cova.", "k", ["leao"]],
  ["Ovelha", "facil", "ambos", "Animal muito citado nas Escrituras.", "O pastor sai para buscar a que se perdeu.", "k"],
  ["Cordeiro", "facil", "ambos", "Animal usado em sacrifícios.", "Um título de Jesus: o ... de Deus.", "k"],
  ["Jumento", "facil", "ambos", "Animal de carga.", "Jesus entrou em Jerusalém montado num.", "k", ["burro", "jumenta", "jegue"]],
  ["Serpente", "facil", "ambos", "Animal do jardim do Éden.", "Enganou Eva.", "k", ["cobra"]],
  ["Pomba", "facil", "ambos", "Ave que aparece na história do dilúvio.", "Voltou a Noé com um ramo de oliveira.", "k"],
  ["Peixe", "facil", "ambos", "Animal que vive na água.", "Cinco pães e dois deles alimentaram a multidão.", "k"],
  ["Corvo", "facil", "AT", "Ave preta.", "Alimentou o profeta Elias junto ao ribeiro.", "k"],
  ["Camelo", "facil", "ambos", "Animal do deserto.", "Mais fácil ele passar pelo fundo de uma agulha.", "k"],
  ["Boi", "facil", "ambos", "Animal do campo.", "Esteve na manjedoura, segundo a tradição natalina.", "k", ["touro", "bezerro", "vaca"]],
  ["Galo", "facil", "NT", "Ave que canta de madrugada.", "Cantou depois que Pedro negou Jesus.", "k"],
  ["Gafanhoto", "medio", "ambos", "Inseto.", "Era o alimento de João Batista, com mel silvestre.", ""],
  ["Águia", "medio", "ambos", "Ave de rapina.", "Os que esperam no Senhor sobem com asas como as dela.", "", ["aguia"]],
  ["Raposa", "medio", "AT", "Animal esperto.", "Sansão amarrou tochas na cauda de trezentas.", ""],
  ["Urso", "medio", "AT", "Animal selvagem.", "Davi enfrentou um para proteger as ovelhas.", ""],
  ["Rã", "medio", "AT", "Animal anfíbio.", "Uma das pragas do Egito.", "", ["ra", "sapo"]],
  ["Bode", "medio", "AT", "Animal do rebanho.", "Levava os pecados do povo para o deserto, no Dia da Expiação.", "", ["cabra", "bode expiatorio"]],
  ["Baleia", "dificil", "AT", "Imagem popular de uma história bíblica.", "A Bíblia fala em um grande peixe que engoliu Jonas.", "", ["grande peixe"]],
]);

const OBJETOS = make("objetos", [
  ["Arca", "facil", "AT", "Grande embarcação.", "Noé construiu uma para salvar a família.", "k", ["arca de noe"]],
  ["Cajado", "facil", "AT", "Bastão de pastor.", "Moisés abriu o mar com um.", "k", ["bastao", "vara"]],
  ["Harpa", "facil", "AT", "Instrumento musical de cordas.", "Davi tocava para acalmar o rei Saul.", "l k", ["lira"]],
  ["Coroa", "facil", "ambos", "Enfeite da cabeça.", "Os reis usavam.", "k"],
  ["Espada", "facil", "ambos", "Arma de metal.", "Pedro cortou a orelha do servo com uma.", "k"],
  ["Trombeta", "facil", "AT", "Instrumento de sopro.", "Fez as muralhas de Jericó caírem.", "l k", ["shofar", "corneta"]],
  ["Estilingue", "facil", "AT", "Arma simples de pastor.", "Davi usou contra Golias.", "k", ["funda", "atiradeira"]],
  ["Sandálias", "facil", "ambos", "Calçado.", "Moisés tirou as dele diante da sarça.", "", ["sandalia", "sandalias"]],
  ["Cruz", "facil", "NT", "O símbolo do cristianismo.", "Nela Jesus morreu pelos nossos pecados.", "k i"],
  ["Pão", "facil", "ambos", "Alimento básico.", "Jesus disse: Eu sou o de vida.", "k i", ["pao"]],
  ["Barco", "facil", "NT", "Meio de transporte na água.", "Os discípulos pescadores usavam no mar da Galileia.", "k"],
  ["Escudo", "facil", "ambos", "Proteção do soldado.", "Paulo fala do ... da fé, que apaga os dardos do maligno.", ""],
  ["Livro", "facil", "ambos", "Algo para ler.", "A Palavra de Deus reunida em 66.", "i", ["biblia", "bíblia", "pergaminho", "rolo"]],
  ["Lamparina", "facil", "ambos", "Dá luz no escuro.", "Palavra tua é lâmpada para os meus pés.", "", ["lampada", "candeia", "lanterna"]],
  ["Rede", "facil", "NT", "Usada na pesca.", "Jesus chamou pescadores para serem pescadores de homens.", "k", ["rede de pesca"]],
  ["Arca da Aliança", "medio", "AT", "Objeto sagrado do tabernáculo.", "Guardava as tábuas da lei.", "", ["arca da alianca", "arca do pacto"]],
  ["Tábuas da Lei", "medio", "AT", "Feitas de pedra.", "Nelas estavam os dez mandamentos.", "", ["tabuas da lei", "tabuas", "tabua", "dez mandamentos"]],
  ["Vaso", "medio", "ambos", "Recipiente de barro.", "Deus é o oleiro e nós somos o barro.", "", ["jarro", "jarra", "pote"]],
  ["Cálice", "medio", "NT", "Copo.", "Usado na Santa Ceia.", "i", ["calice", "taca"]],
  ["Âncora", "medio", "NT", "Pesada, de ferro.", "A esperança é chamada de ... da alma.", "", ["ancora"]],
  ["Moeda", "medio", "NT", "Dinheiro antigo.", "Uma mulher acendeu a lâmpada para achar a que perdeu.", ""],
  ["Túnica colorida", "medio", "AT", "Peça de roupa.", "O pai deu de presente ao filho preferido, José.", "", ["tunica colorida", "manto colorido", "tunica", "manto de varias cores"]],
  ["Tamborim", "medio", "AT", "Instrumento de percussão.", "Miriã dançou com um depois de atravessar o mar.", "l", ["pandeiro"]],
  ["Flauta", "medio", "NT", "Instrumento de sopro.", "Jesus disse: Nós vos tocamos ..., e não dançastes.", "l"],
  ["Címbalos", "dificil", "AT", "Instrumento de percussão, de metal.", "O Salmo 150 manda louvar a Deus com eles sonoros.", "l", ["cimbalos", "cimbalo", "prato"]],
  ["Coroa de espinhos", "medio", "NT", "Colocada na cabeça de alguém.", "Os soldados puseram em Jesus.", ""],
  ["Trono", "medio", "ambos", "Assento de rei.", "Salomão tinha um de marfim.", ""],
  ["Altar", "medio", "ambos", "Lugar de oferta.", "Noé construiu um depois do dilúvio.", "i"],
  ["Anel", "medio", "NT", "Joia no dedo.", "O pai mandou colocar no filho que voltou para casa.", ""],
  ["Chaves", "medio", "NT", "Abrem portas.", "Jesus falou das do reino dos céus.", "", ["chave"]],
  ["Candelabro", "dificil", "AT", "Tinha sete braços.", "Ficava no tabernáculo e dava luz ao lugar santo.", "", ["menorá", "menora"]],
  ["Tenda", "dificil", "AT", "Casa dos nômades.", "O tabernáculo era uma, no deserto.", "", ["tabernaculo", "tabernáculo"]],
]);

const LUGARES = make("lugares", [
  ["Jardim do Éden", "facil", "AT", "O primeiro lugar da Bíblia.", "Ali estavam a árvore da vida e a do conhecimento.", "k", ["eden", "éden", "jardim"]],
  ["Egito", "facil", "AT", "Terra das pirâmides.", "O povo de Israel foi escravo ali.", "k", ["egipto"]],
  ["Deserto", "facil", "ambos", "Lugar seco e de areia.", "O povo andou quarenta anos por ele.", "k"],
  ["Igreja", "facil", "NT", "Lugar de reunião.", "Também é o nome do povo de Deus.", "i k", ["templo cristao"]],
  ["Jerusalém", "medio", "ambos", "Cidade santa.", "Ali ficava o templo, em Judá.", "", ["jerusalem"]],
  ["Belém", "medio", "ambos", "Pequena cidade de Judá.", "Cidade de Davi e onde Jesus nasceu.", "k", ["belem"]],
  ["Mar Vermelho", "medio", "AT", "Grande extensão de água.", "Deus o abriu para o povo passar a pé.", "k"],
  ["Monte Sinai", "medio", "AT", "Montanha no deserto.", "Moisés subiu nela para receber a lei.", "", ["sinai", "monte sinai"]],
  ["Jericó", "medio", "AT", "Cidade cercada por muralhas.", "Cidade cujas muralhas caíram.", "", ["jerico"]],
  ["Rio Jordão", "medio", "ambos", "Rio de Israel.", "Jesus foi batizado nele.", "", ["jordao", "rio jordao"]],
  ["Templo", "medio", "ambos", "Casa de Deus.", "Salomão construiu o primeiro, em Jerusalém.", "i"],
  ["Sepulcro", "medio", "NT", "Lugar de sepultamento.", "Na manhã de domingo estava vazio.", "", ["tumulo", "túmulo", "sepulcro vazio"]],
  ["Mar da Galileia", "medio", "NT", "Grande lago.", "Jesus acalmou a tempestade nele.", ""],
  ["Roma", "medio", "NT", "Capital de um grande império.", "Paulo foi levado preso para lá.", ""],
  ["Nazaré", "dificil", "NT", "Pequena cidade.", "Cidade onde Jesus cresceu.", "", ["nazare"]],
  ["Galileia", "dificil", "NT", "Região ao norte.", "Região onde Jesus fez a maior parte do ministério.", ""],
  ["Babilônia", "dificil", "AT", "Grande império.", "Para lá o povo de Judá foi levado cativo.", "", ["babilonia"]],
  ["Sodoma e Gomorra", "dificil", "AT", "Cidades antigas.", "Foram destruídas por fogo e enxofre.", "", ["sodoma", "gomorra"]],
  ["Gólgota", "dificil", "NT", "Colina fora de Jerusalém.", "Lugar da Caveira, onde Jesus foi crucificado.", "", ["golgota", "calvario", "calvário"]],
  ["Monte das Oliveiras", "dificil", "NT", "Colina perto de Jerusalém.", "Jesus orou ali na noite em que foi preso.", "", ["getsemani", "getsêmani"]],
  ["Cafarnaum", "dificil", "NT", "Cidade à beira do lago.", "Era como a casa de Jesus durante o ministério na Galileia.", ""],
  ["Patmos", "dificil", "NT", "Pequena ilha.", "João recebeu ali a visão do Apocalipse.", ""],
  ["Nínive", "dificil", "AT", "Grande cidade.", "Cidade para onde Jonas foi enviado.", "", ["ninive"]],
]);

const HISTORIAS = make("historias", [
  ["Arca de Noé", "facil", "AT", "História de Gênesis.", "Um homem, sua família e os animais se salvaram da água.", "k", ["arca de noe", "noe e a arca"]],
  ["Davi e Golias", "facil", "AT", "História do livro de 1 Samuel.", "Um pastor jovem derrubou um gigante.", "rp k", ["golias e davi"]],
  ["Daniel na cova dos leões", "facil", "AT", "História do livro de Daniel.", "Um profeta passou a noite com feras e saiu ileso.", "rp k", ["cova dos leoes", "daniel e os leoes"]],
  ["Jonas e o grande peixe", "facil", "AT", "História do Antigo Testamento.", "Um profeta fugiu e foi engolido.", "k", ["jonas e a baleia", "jonas e o peixe", "jonas e o grande peixe"]],
  ["Nascimento de Jesus", "facil", "NT", "Acontecimento dos Evangelhos.", "Numa manjedoura, em Belém, com pastores e anjos.", "k", ["natal", "natividade", "presepio", "presépio"]],
  ["Travessia do Mar Vermelho", "medio", "AT", "Livro de Êxodo.", "Um povo atravessou entre duas muralhas de água.", "k", ["travessia do mar vermelho", "abertura do mar vermelho", "mar vermelho"]],
  ["Multiplicação dos pães", "medio", "NT", "Milagre de Jesus.", "Cinco pães e dois peixes alimentaram milhares.", "k", ["multiplicacao dos paes", "multiplicacao dos paes e peixes"]],
  ["Jesus andando sobre as águas", "medio", "NT", "Milagre de Jesus.", "Pedro quis ir até Ele, mas começou a afundar.", "", ["jesus andando sobre as aguas", "jesus anda sobre as aguas", "andar sobre as aguas"]],
  ["Torre de Babel", "medio", "AT", "História de Gênesis.", "Uma construção até o céu e a confusão das línguas.", "k"],
  ["Dilúvio", "medio", "AT", "Evento de Gênesis.", "Choveu quarenta dias e quarenta noites.", "", ["diluvio"]],
  ["Maná", "medio", "AT", "Alimento do deserto.", "Caía do céu todas as manhãs.", "", ["mana"]],
  ["Pentecostes", "medio", "NT", "Livro de Atos.", "Línguas de fogo e o Espírito Santo sobre os discípulos.", "i"],
  ["Êxodo", "medio", "AT", "Segundo livro da Bíblia.", "A saída do povo do Egito.", "", ["exodo", "saida do egito"]],
  ["Última Ceia", "medio", "NT", "Refeição dos Evangelhos.", "Jesus com os doze, na noite em que foi entregue.", "i", ["ultima ceia", "santa ceia", "ceia do senhor"]],
  ["Crucificação", "medio", "NT", "Acontecimento dos Evangelhos.", "Jesus na cruz, entre dois ladrões.", "", ["crucificacao", "morte de jesus"]],
  ["Ressurreição", "medio", "NT", "O centro da fé cristã.", "O túmulo estava vazio no terceiro dia.", "i", ["ressurreicao", "ressurreicao de jesus"]],
  ["Criação do mundo", "medio", "AT", "Começo de Gênesis.", "Seis dias de trabalho e um de descanso.", "k", ["criacao do mundo", "criacao", "criação"]],
  ["Magos do Oriente", "medio", "NT", "Visitantes de Jesus.", "Seguiram uma estrela e levaram ouro, incenso e mirra.", "k", ["reis magos", "magos", "tres reis magos"]],
  ["Ovelha perdida", "medio", "NT", "Parábola de Jesus.", "O pastor deixa noventa e nove para buscar uma.", "k", ["a ovelha perdida"]],
  ["Queda de Jericó", "dificil", "AT", "Livro de Josué.", "Sete voltas, trombetas e gritos.", "k", ["queda de jerico", "muralhas de jerico", "muros de jerico"]],
  ["Ressurreição de Lázaro", "dificil", "NT", "Milagre do Evangelho de João.", "Jesus chorou e chamou um morto com voz alta.", "", ["ressurreicao de lazaro", "lazaro ressuscitado"]],
  ["Sarça ardente", "dificil", "AT", "Livro de Êxodo.", "Um arbusto pegava fogo e não se consumia.", "", ["sarca ardente", "sarca", "sarça"]],
  ["Filho pródigo", "dificil", "NT", "Parábola de Jesus.", "Gastou a herança e voltou para o pai.", "", ["filho prodigo", "o filho prodigo"]],
  ["Armadura de Deus", "dificil", "NT", "Carta de Paulo aos efésios.", "Cinto da verdade, couraça da justiça, escudo da fé.", "", ["armadura de deus", "armadura espiritual"]],
  ["Caminho de Emaús", "dificil", "NT", "Depois da ressurreição.", "Dois discípulos caminhavam com um estranho que partiu o pão.", "", ["caminho de emaus", "emaus"]],
  ["Bezerro de ouro", "dificil", "AT", "Livro de Êxodo.", "O povo fez um ídolo enquanto Moisés estava no monte.", "", ["vaca de ouro", "bezerro de ouro", "touro de ouro"]],
  ["Negação de Pedro", "dificil", "NT", "Noite da prisão de Jesus.", "Antes do galo cantar, ele negou três vezes.", "", ["negacao de pedro", "pedro nega jesus", "pedro negou jesus"]],
  ["Bom samaritano", "dificil", "NT", "Parábola de Jesus.", "O que ajudou o ferido na estrada foi um estrangeiro.", "", ["o bom samaritano", "samaritano"]],
  ["Fornalha ardente", "dificil", "AT", "Livro de Daniel.", "Três jovens no fogo e um quarto homem com eles.", "", ["fornalha de fogo", "fornalha"]],
  ["Dez pragas", "dificil", "AT", "Livro de Êxodo.", "Rãs, gafanhotos, trevas… até o faraó deixar o povo sair.", "", ["as dez pragas", "pragas do egito", "pragas"]],
  ["Jacó e a escada", "dificil", "AT", "Livro de Gênesis.", "Num sonho, anjos subiam e desciam.", "", ["jaco e a escada", "escada de jaco", "escada de jaco"]],
  ["Elias e o carro de fogo", "dificil", "AT", "Livro de 2 Reis.", "Um profeta subiu ao céu num redemoinho.", "rp", ["carro de fogo", "elias e o redemoinho"]],
  ["Sansão e Dalila", "dificil", "AT", "Livro de Juízes.", "O segredo da força estava nos cabelos.", "", ["dalila", "sansao e dalila"]],
  ["Pesca maravilhosa", "dificil", "NT", "Milagre dos Evangelhos.", "As redes quase rebentaram de tantos peixes.", "", ["pesca milagrosa", "a pesca maravilhosa"]],
  ["Paulo e Silas na prisão", "dificil", "NT", "Livro de Atos.", "À meia-noite cantavam hinos e as portas se abriram.", "l", ["paulo e silas", "prisao de filipos"]],
  ["Lava-pés", "dificil", "NT", "Gesto de humildade.", "Jesus lavou os pés dos discípulos.", "i", ["lava pes", "lavapes", "lava-pes"]],
  ["Semeador", "dificil", "NT", "Parábola de Jesus.", "A semente caiu em quatro tipos de terreno.", "", ["o semeador", "parabola do semeador"]],
]);

const CONCEITOS = make("conceitos", [
  ["Anjo", "facil", "ambos", "Ser espiritual.", "Mensageiro de Deus, com asas na imaginação popular.", "k"],
  ["Céu", "facil", "ambos", "Lá em cima.", "A morada de Deus.", "k", ["ceu"]],
  ["Oração", "facil", "ambos", "Algo que fazemos de joelhos ou de olhos fechados.", "Conversa com Deus.", "i k", ["oracao", "orar"]],
  ["Louvor", "facil", "ambos", "Algo que se canta.", "Cantar e exaltar a Deus.", "l i k", ["louvar"]],
  ["Fé", "medio", "ambos", "Sem ela é impossível agradar a Deus.", "A certeza das coisas que se esperam.", "i", ["fe"]],
  ["Amor", "medio", "ambos", "O maior de todos.", "Deus é isto.", "k i"],
  ["Perdão", "medio", "ambos", "Ato de misericórdia.", "Setenta vezes sete.", "i", ["perdao", "perdoar"]],
  ["Jejum", "medio", "ambos", "Prática da vida cristã.", "Ficar sem comer para buscar a Deus.", "i"],
  ["Batismo", "medio", "NT", "Ato público de fé.", "Descer às águas, como Jesus no Jordão.", "i", ["batizar"]],
  ["Adoração", "medio", "ambos", "Reverência a Deus.", "Os magos vieram para fazer isto ao menino.", "l i", ["adoracao", "adorar"]],
  ["Pecado", "medio", "ambos", "O que nos separa de Deus.", "Entrou no mundo por um só homem.", "", ["pecar"]],
  ["Salvação", "medio", "ambos", "O maior presente.", "É pela graça, mediante a fé.", "i", ["salvacao", "salvar"]],
  ["Graça", "medio", "ambos", "Favor imerecido.", "Pela qual somos salvos, e não por obras.", "i", ["graca"]],
  ["Paz", "medio", "ambos", "Fruto do Espírito.", "Jesus deixou a Sua aos discípulos.", "k"],
  ["Esperança", "medio", "ambos", "Uma das três que permanecem.", "A âncora da alma.", "", ["esperanca", "esperar"]],
  ["Milagre", "medio", "ambos", "Algo sobrenatural.", "Jesus fez o primeiro em Caná.", "k"],
  ["Arrependimento", "dificil", "ambos", "Mudança de rumo.", "Voltar-se para Deus de coração.", "i", ["arrepender", "arrepender-se"]],
  ["Espírito Santo", "dificil", "ambos", "Terceira pessoa da Trindade.", "Desceu como pomba sobre Jesus.", "i", ["espirito santo", "consolador"]],
  ["Trindade", "dificil", "ambos", "Mistério da fé cristã.", "Pai, Filho e Espírito Santo.", "i"],
  ["Bênção", "dificil", "ambos", "O que o pai dá ao filho.", "Jacó a recebeu de Isaque.", "i", ["bencao", "abencoar"]],
  ["Humildade", "dificil", "ambos", "Característica de Cristo.", "Quem se humilha será exaltado.", "", ["humilde"]],
  ["Gratidão", "dificil", "ambos", "Resposta ao que recebemos.", "Dez leprosos foram curados, só um voltou para agradecer.", "l i", ["gratidao", "agradecimento"]],
  ["Dízimo", "dificil", "ambos", "Parte do que se recebe.", "A décima parte devolvida a Deus.", "i", ["dizimo", "oferta"]],
  ["Cântico", "medio", "ambos", "Música de louvor.", "Cantai ao Senhor um ... novo.", "l i", ["cantico", "musica", "música", "canção", "cancao"]],
  ["Salmos", "medio", "AT", "Um livro do Antigo Testamento.", "Tem 150 capítulos e foi escrito em grande parte por Davi.", "l rp", ["salmo", "livro de salmos"]],
  ["Aleluia", "medio", "ambos", "Palavra de origem hebraica.", "Quer dizer: louvai ao Senhor.", "l i"],
  ["Hosana", "dificil", "NT", "Grito da multidão.", "Gritaram isto quando Jesus entrou em Jerusalém.", "l i"],
  ["Santa Ceia", "dificil", "NT", "Prática da igreja.", "Pão e vinho em memória de Jesus.", "i", ["ceia", "comunhao", "comunhão"]],
]);

export const WORDS: Word[] = [...PERSONAGENS, ...ANIMAIS, ...OBJETOS, ...LUGARES, ...HISTORIAS, ...CONCEITOS];
export const WORD_BY_ID = new Map(WORDS.map((w) => [w.id, w]));

/** Palavras de um recorte (cultura) e, opcionalmente, de uma categoria. */
export function wordsFor(culture: Culture, category: Category | "todas" = "todas"): Word[] {
  return WORDS.filter((w) => {
    if (category !== "todas" && w.category !== category) return false;
    switch (culture) {
      case "biblia":
        return true;
      case "at":
        return w.testament === "AT";
      case "nt":
        return w.testament === "NT";
      case "reisprofetas":
        return w.tags.includes("rp");
      case "personagens":
        return w.category === "personagens";
      case "louvor":
        return w.tags.includes("louvor");
      case "igreja":
        return w.tags.includes("igreja");
      case "kids":
        return w.tags.includes("kids");
    }
  });
}
