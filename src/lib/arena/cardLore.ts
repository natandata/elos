// Histórias bíblicas das cartas (client-safe). Conteúdo segue a Bíblia protestante.

export type CardLore = {
  /** Um pouco da história do personagem ou do acontecimento. */
  story: string;
  /** Onde ler na Bíblia. */
  ref: string;
  /** Como o jeito de lutar da carta lembra a história. */
  attack: string;
};

export const CARD_LORE: Record<string, CardLore> = {
  davi: {
    story:
      "Davi era o filho mais novo de Jessé e cuidava das ovelhas da família. Quando o gigante Golias desafiou o exército de Israel, todos tiveram medo, mas Davi confiou em Deus, pegou cinco pedras lisas do ribeiro e derrubou o gigante com uma só pedrada. Anos depois, Deus fez dele rei de Israel.",
    ref: "1 Samuel 16–17",
    attack: "Davi ataca de longe com a funda, como contra Golias, e pode acertar até quem voa.",
  },
  joao: {
    story:
      "João Batista viveu no deserto e pregava que as pessoas se arrependessem e voltassem para Deus. Batizava no rio Jordão e preparou o caminho para Jesus, a quem apontou dizendo: “Eis o Cordeiro de Deus, que tira o pecado do mundo”. Falava a verdade com coragem, até diante do rei.",
    ref: "Mateus 3 · João 1:19-34",
    attack: "João é rápido e valente: corre na frente para anunciar a batalha e ataca de perto.",
  },
  jose: {
    story:
      "José foi vendido pelos próprios irmãos e levado como escravo para o Egito. Mesmo preso sem culpa, continuou fiel a Deus. Ao interpretar os sonhos do faraó, avisou sobre sete anos de fartura e sete de fome, guardou grãos e acabou salvando o Egito, a sua família e muitos povos.",
    ref: "Gênesis 37–50",
    attack: "José guardou o grão e aguentou muito sofrimento: é resistente e firme na linha de frente.",
  },
  gideao: {
    story:
      "Gideão achava que era pequeno demais, mas Deus o chamou para livrar Israel de Midiã. Deus reduziu o exército a apenas 300 homens para mostrar que a vitória vinha dEle. Com trombetas, jarros e tochas, eles cercaram o acampamento inimigo de noite e o inimigo fugiu.",
    ref: "Juízes 6–7",
    attack: "Três guerreiros entram juntos, lembrando os 300 que venceram um exército enorme.",
  },
  sansao: {
    story:
      "Sansão foi separado para Deus desde antes de nascer, e sua força extraordinária vinha do Senhor. Libertou o povo de Israel dos filisteus muitas vezes. No fim, pediu força a Deus mais uma vez e derrubou as colunas do templo dos inimigos.",
    ref: "Juízes 13–16",
    attack: "Sansão tem força enorme: golpes de muito dano, de perto.",
  },
  maria: {
    story:
      "Maria era uma jovem de Nazaré. Quando o anjo Gabriel disse que ela seria a mãe de Jesus, ela respondeu: “Eis aqui a serva do Senhor; cumpra-se em mim segundo a tua palavra”. Cuidou de Jesus desde o nascimento em Belém e o acompanhou até a cruz.",
    ref: "Lucas 1–2 · João 19:25-27",
    attack: "Maria cuida de quem está por perto, curando os aliados, e atua de longe.",
  },
  mar: {
    story:
      "Quando o povo de Israel saiu do Egito, o faraó foi atrás deles e eles ficaram presos diante do Mar Vermelho. Deus mandou Moisés estender a mão: as águas se abriram e o povo passou a pé enxuto. Quando os egípcios entraram, o mar voltou ao lugar.",
    ref: "Êxodo 14",
    attack: "Uma onda que atinge uma área e deixa os inimigos lentos, como os egípcios no meio do mar.",
  },
  trombetas: {
    story:
      "Deus mandou Josué cercar a cidade de Jericó durante sete dias. Sete sacerdotes tocaram trombetas e, no sétimo dia, o povo gritou: os muros da cidade caíram. Foi a fé e a obediência que derrubaram aquelas muralhas.",
    ref: "Josué 6",
    attack: "Um toque de trombetas numa área pequena, que derruba muros: forte contra construções.",
  },
  noe: {
    story:
      "Noé era um homem justo num tempo em que o mundo estava cheio de violência. Deus o avisou do dilúvio e ele construiu a arca, onde guardou a família e os animais. Depois do dilúvio, Deus fez uma aliança e deixou o arco-íris como sinal da promessa.",
    ref: "Gênesis 6–9",
    attack: "Noé abriga e cuida: cura os aliados que estão por perto enquanto resiste.",
  },
  moises: {
    story:
      "Moisés foi salvo de um rio ainda bebê e criado no palácio do faraó. Deus falou com ele numa sarça que ardia sem se consumir e o mandou libertar o povo da escravidão no Egito. Atravessou o Mar Vermelho com o povo e, no monte Sinai, recebeu os Dez Mandamentos.",
    ref: "Êxodo 2–20",
    attack: "O cajado de Moisés atinge de longe e atrapalha os inimigos, deixando-os lentos, como os carros do faraó no mar.",
  },
  josue: {
    story:
      "Josué foi ajudante de Moisés e, depois dele, liderou o povo até a terra prometida. Deus lhe disse: “Sê forte e corajoso; não temas, nem te espantes, porque o Senhor, teu Deus, é contigo”. Sob o seu comando caíram os muros de Jericó.",
    ref: "Josué 1 e 6",
    attack: "Josué derruba muros: causa muito mais dano em construções (Atalaias e Santuário).",
  },
  daniel: {
    story:
      "Daniel foi levado jovem para a Babilônia, mas continuou orando a Deus todos os dias, mesmo quando isso foi proibido. Por isso foi jogado numa cova de leões. Deus enviou o seu anjo e fechou a boca dos leões, e Daniel saiu sem ferimento algum.",
    ref: "Daniel 6",
    attack: "Daniel luta com o leão ao lado e seus golpes acertam também quem está em volta do alvo.",
  },
  jesus: {
    story:
      "Jesus é o Filho de Deus. Andou fazendo o bem, curou doentes, ensinou sobre o amor e o Reino de Deus e morreu na cruz pelos nossos pecados. Ressuscitou ao terceiro dia. Ele disse: “Vinde a mim, todos os que estais cansados e sobrecarregados, e eu vos aliviarei”.",
    ref: "Mateus 11:28 · Lucas 24",
    attack: "Jesus é a carta mais forte do jogo: golpeia em área com enorme poder e cura os aliados num raio grande, mostrando o cuidado dEle com as pessoas.",
  },
  salomao: {
    story:
      "Quando virou rei, Salomão pediu a Deus sabedoria para governar o povo, e Deus lhe deu isso e muito mais. Ele construiu o templo em Jerusalém e escreveu muitos provérbios. Sua sabedoria ficou famosa, e reis vinham de longe para ouvi-lo.",
    ref: "1 Reis 3–8 · Provérbios",
    attack: "Salomão é sábio e resistente: ataca de longe, sem se arriscar.",
  },
  ester: {
    story:
      "Ester, uma jovem judia, tornou-se rainha da Pérsia. Quando um decreto ameaçou matar todo o seu povo, o primo Mardoqueu lhe disse que talvez ela tivesse chegado ao reino “para um tempo como este”. Ela jejuou e foi, com coragem, falar com o rei, e o povo foi salvo.",
    ref: "Livro de Ester",
    attack: "Ester atua de longe e ganha tempo para o seu povo: seus golpes deixam os inimigos um pouco lentos.",
  },
  miguel: {
    story:
      "Miguel é um arcanjo, chamado na Bíblia de “grande príncipe” que protege o povo de Deus. Ele aparece no livro de Daniel e no Apocalipse, em batalhas contra as forças do mal, sempre vencendo pelo poder de Deus.",
    ref: "Daniel 10 e 12 · Apocalipse 12:7-9",
    attack: "Miguel voa: passa por cima do rio e do exército e ataca onde mais precisam dele.",
  },
  fogo: {
    story:
      "No monte Carmelo, o profeta Elias desafiou os profetas de Baal. Ele orou ao Senhor e caiu fogo do céu, que consumiu o sacrifício, a lenha e até as pedras. O povo viu e declarou: “O Senhor é Deus!”.",
    ref: "1 Reis 18:20-39",
    attack: "Uma chama que cai do céu e causa muito dano numa área. Contra construções, o dano é menor.",
  },
};
