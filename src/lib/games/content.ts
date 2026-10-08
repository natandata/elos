// Conteúdo dos jogos bíblicos. Só roda no servidor: as respostas certas nunca
// vão para o navegador antes de o jogador responder (ver engine.ts).
// Textos de versículos seguem a Nova Versão Internacional (NVI).
// As listas "extra" (quizExtra, versesExtra, whoExtra, orderExtra) entram sempre no FIM, para não mudar partidas antigas.
import { QUIZ_EXTRA } from "./quizExtra";
import { VERSES_EXTRA } from "./versesExtra";
import { WHO_EXTRA } from "./whoExtra";
import { ORDER_EXTRA } from "./orderExtra";

/** d: 1 = fácil, 2 = médio, 3 = difícil */
export type Level = 1 | 2 | 3;

export type QuizItem = { q: string; a: string; w: [string, string, string]; ref: string; d: Level };

const QUIZ_BASE: QuizItem[] = [
  { q: "Quem construiu a arca para sobreviver ao dilúvio?", a: "Noé", w: ["Abraão", "Moisés", "Davi"], ref: "Gênesis 6–7", d: 1 },
  { q: "Quantos dias Jesus ficou no deserto sendo tentado?", a: "40", w: ["7", "12", "3"], ref: "Mateus 4:2", d: 1 },
  { q: "Quem foi lançado na cova dos leões?", a: "Daniel", w: ["José", "Jonas", "Elias"], ref: "Daniel 6", d: 1 },
  { q: "Qual é o primeiro livro da Bíblia?", a: "Gênesis", w: ["Êxodo", "Salmos", "Mateus"], ref: "Gênesis 1:1", d: 1 },
  { q: "Quem derrotou o gigante Golias?", a: "Davi", w: ["Saul", "Jônatas", "Sansão"], ref: "1 Samuel 17", d: 1 },
  { q: "Quantos apóstolos Jesus escolheu?", a: "12", w: ["7", "10", "70"], ref: "Lucas 6:13", d: 1 },
  { q: "Em que cidade Jesus nasceu?", a: "Belém", w: ["Nazaré", "Jerusalém", "Cafarnaum"], ref: "Mateus 2:1", d: 1 },
  { q: "Quem negou Jesus três vezes antes de o galo cantar?", a: "Pedro", w: ["João", "Tomé", "Judas"], ref: "Mateus 26:34", d: 1 },
  { q: "Qual profeta foi engolido por um grande peixe?", a: "Jonas", w: ["Elias", "Eliseu", "Oseias"], ref: "Jonas 1:17", d: 1 },
  { q: "Quem recebeu os Dez Mandamentos no monte Sinai?", a: "Moisés", w: ["Josué", "Arão", "Calebe"], ref: "Êxodo 20", d: 1 },
  { q: "Qual foi o primeiro milagre de Jesus, nas bodas de Caná?", a: "Transformou água em vinho", w: ["Curou um cego", "Multiplicou os pães", "Andou sobre as águas"], ref: "João 2:1-11", d: 1 },
  { q: "Quantos livros tem a Bíblia protestante?", a: "66", w: ["73", "39", "27"], ref: "Antigo (39) + Novo Testamento (27)", d: 2 },
  { q: "Quem era a mãe do profeta Samuel?", a: "Ana", w: ["Sara", "Rebeca", "Raquel"], ref: "1 Samuel 1", d: 3 },
  { q: "Quem vendeu o direito de filho mais velho por um prato de lentilhas?", a: "Esaú", w: ["Jacó", "Isaque", "Ismael"], ref: "Gênesis 25:34", d: 2 },
  { q: "Quem foi vendido pelos irmãos e depois governou o Egito?", a: "José", w: ["Benjamim", "Judá", "Rúben"], ref: "Gênesis 37–41", d: 2 },
  { q: "Em que monte Elias desafiou os profetas de Baal?", a: "Carmelo", w: ["Sinai", "Sião", "Horebe"], ref: "1 Reis 18", d: 3 },
  { q: "Qual rei de Israel ficou famoso pela sabedoria?", a: "Salomão", w: ["Davi", "Saul", "Ezequias"], ref: "1 Reis 3", d: 1 },
  { q: "Quem escreveu a maior parte dos Salmos?", a: "Davi", w: ["Salomão", "Moisés", "Josué"], ref: "Livro dos Salmos", d: 2 },
  { q: "Qual apóstolo era cobrador de impostos antes de seguir Jesus?", a: "Mateus", w: ["Pedro", "André", "Filipe"], ref: "Mateus 9:9", d: 2 },
  { q: "Qual apóstolo duvidou da ressurreição até ver as marcas de Jesus?", a: "Tomé", w: ["Pedro", "Tiago", "Natanael"], ref: "João 20:24-29", d: 2 },
  { q: "Qual é o último livro da Bíblia?", a: "Apocalipse", w: ["Judas", "Malaquias", "Atos"], ref: "Apocalipse 22", d: 1 },
  { q: "Quem ajudou Jesus a carregar a cruz?", a: "Simão de Cirene", w: ["José de Arimateia", "Nicodemos", "Barrabás"], ref: "Mateus 27:32", d: 2 },
  { q: "Em que dia, depois da crucificação, Jesus ressuscitou?", a: "No terceiro dia", w: ["No sétimo dia", "No primeiro dia", "No quadragésimo dia"], ref: "Lucas 24:7", d: 1 },
  { q: "Quem escondeu os espias de Israel em Jericó?", a: "Raabe", w: ["Rute", "Ester", "Débora"], ref: "Josué 2", d: 3 },
  { q: "Qual jovem judia se tornou rainha da Pérsia e salvou seu povo?", a: "Ester", w: ["Rute", "Débora", "Miriã"], ref: "Livro de Ester", d: 2 },
  { q: "Rute foi nora de quem?", a: "Noemi", w: ["Ana", "Sara", "Miriã"], ref: "Rute 1", d: 2 },
  { q: "Quem foi o primeiro homem criado por Deus?", a: "Adão", w: ["Abel", "Sete", "Noé"], ref: "Gênesis 2:7", d: 1 },
  { q: "Quem matou Abel, seu irmão?", a: "Caim", w: ["Sete", "Lameque", "Enoque"], ref: "Gênesis 4:8", d: 1 },
  { q: "Quantas pragas Deus enviou sobre o Egito?", a: "10", w: ["7", "12", "3"], ref: "Êxodo 7–12", d: 1 },
  { q: "Qual mar se abriu para o povo de Israel atravessar?", a: "Mar Vermelho", w: ["Mar Morto", "Mar da Galileia", "Mar Mediterrâneo"], ref: "Êxodo 14", d: 1 },
  { q: "Quem era o pai de João Batista?", a: "Zacarias", w: ["José", "Simeão", "Eli"], ref: "Lucas 1:13", d: 3 },
  { q: "Quem foi chamado de apóstolo dos gentios?", a: "Paulo", w: ["Pedro", "Barnabé", "Timóteo"], ref: "Romanos 11:13", d: 2 },
  { q: "Qual era o nome de Paulo antes da conversão?", a: "Saulo", w: ["Silas", "Estêvão", "Barnabé"], ref: "Atos 9:1-4", d: 2 },
  { q: "Quem batizou Jesus?", a: "João Batista", w: ["Pedro", "Tiago", "Filipe"], ref: "Mateus 3:13-17", d: 1 },
  { q: "Em que rio Jesus foi batizado?", a: "Jordão", w: ["Nilo", "Eufrates", "Tigre"], ref: "Mateus 3:13", d: 2 },
  { q: "Quem perdeu a força quando teve o cabelo cortado?", a: "Sansão", w: ["Golias", "Gideão", "Jefté"], ref: "Juízes 16", d: 2 },
  { q: "Qual juiz derrotou os midianitas com apenas 300 homens?", a: "Gideão", w: ["Sansão", "Samuel", "Josué"], ref: "Juízes 7", d: 3 },
  { q: "Quem liderou o povo de Israel depois de Moisés?", a: "Josué", w: ["Calebe", "Arão", "Samuel"], ref: "Josué 1", d: 2 },
  { q: "Qual cidade teve os muros derrubados depois de o povo marchar ao redor dela?", a: "Jericó", w: ["Jerusalém", "Babilônia", "Nínive"], ref: "Josué 6", d: 2 },
  { q: "Cerca de quantos homens Jesus alimentou com 5 pães e 2 peixes (sem contar mulheres e crianças)?", a: "5 mil", w: ["500", "12 mil", "100"], ref: "Mateus 14:21", d: 2 },
  { q: "Quem escreveu o livro de Apocalipse?", a: "João", w: ["Paulo", "Pedro", "Lucas"], ref: "Apocalipse 1:1", d: 3 },
  { q: "Qual livro vem logo depois de Gênesis?", a: "Êxodo", w: ["Levítico", "Números", "Josué"], ref: "Êxodo 1:1", d: 2 },
  { q: "Qual oração Jesus ensinou aos discípulos?", a: "Pai Nosso", w: ["Salmo 23", "Oração de Jabez", "Cântico de Maria"], ref: "Mateus 6:9-13", d: 1 },
  { q: "Quem sonhou com uma escada que ligava a terra ao céu?", a: "Jacó", w: ["Abraão", "José", "Daniel"], ref: "Gênesis 28:12", d: 2 },
  { q: "A quem Deus disse primeiro: \"de ti farei uma grande nação\"?", a: "Abraão", w: ["Isaque", "Jacó", "Ló"], ref: "Gênesis 12:1-2", d: 3 },
  { q: "Quem era o grande amigo de Davi, filho do rei Saul?", a: "Jônatas", w: ["Abner", "Joabe", "Absalão"], ref: "1 Samuel 18:1", d: 3 },
  { q: "Qual profeta foi levado ao céu num redemoinho sem passar pela morte?", a: "Elias", w: ["Moisés", "Eliseu", "Isaías"], ref: "2 Reis 2:11", d: 2 },
  { q: "Quem interpretou os sonhos do faraó do Egito?", a: "José", w: ["Daniel", "Moisés", "Arão"], ref: "Gênesis 41", d: 2 },
  { q: "Qual fariseu visitou Jesus de noite?", a: "Nicodemos", w: ["Zaqueu", "Lázaro", "Bartimeu"], ref: "João 3:1-2", d: 3 },
  { q: "Quem subiu numa árvore para conseguir ver Jesus passar?", a: "Zaqueu", w: ["Bartimeu", "Lázaro", "Mateus"], ref: "Lucas 19:1-4", d: 1 },
  { q: "Quem Jesus ressuscitou depois de quatro dias no túmulo?", a: "Lázaro", w: ["Dorcas", "Êutico", "Jairo"], ref: "João 11", d: 2 },
  { q: "Qual é o maior mandamento, segundo Jesus?", a: "Amar a Deus sobre todas as coisas", w: ["Guardar o sábado", "Honrar pai e mãe", "Não matar"], ref: "Mateus 22:37-38", d: 2 },
  { q: "Em que dia da criação Deus descansou?", a: "No sétimo", w: ["No sexto", "No primeiro", "No terceiro"], ref: "Gênesis 2:2", d: 2 },
  { q: "Qual foi a primeira praga do Egito?", a: "Água transformada em sangue", w: ["Rãs", "Gafanhotos", "Trevas"], ref: "Êxodo 7:20", d: 3 },
  { q: "Qual profeta ungiu Davi como rei?", a: "Samuel", w: ["Natã", "Elias", "Isaías"], ref: "1 Samuel 16:13", d: 3 },
  { q: "Quem escreveu o livro de Atos dos Apóstolos?", a: "Lucas", w: ["Marcos", "João", "Paulo"], ref: "Atos 1:1", d: 3 },
  { q: "Quantos anos o povo de Israel andou pelo deserto?", a: "40", w: ["7", "70", "12"], ref: "Números 14:33", d: 2 },
  { q: "Quem era o sogro de Moisés, sacerdote de Midiã?", a: "Jetro", w: ["Labão", "Eli", "Boaz"], ref: "Êxodo 3:1", d: 3 },
  { q: "Quem foi o primeiro mártir cristão, apedrejado por causa de Jesus?", a: "Estêvão", w: ["Tiago", "Barnabé", "Timóteo"], ref: "Atos 7", d: 3 },
  { q: "Quem foi o profeta que sucedeu Elias?", a: "Eliseu", w: ["Isaías", "Samuel", "Natã"], ref: "2 Reis 2", d: 3 },
  { q: "Quem interpretou o sonho da estátua de ouro, prata, bronze e ferro?", a: "Daniel", w: ["José", "Esdras", "Ezequiel"], ref: "Daniel 2", d: 3 },
  { q: "Em que cidade os discípulos foram chamados cristãos pela primeira vez?", a: "Antioquia", w: ["Jerusalém", "Roma", "Corinto"], ref: "Atos 11:26", d: 3 },
  { q: "Quem era o pai do rei Davi?", a: "Jessé", w: ["Boaz", "Saul", "Samuel"], ref: "1 Samuel 16", d: 3 },
  { q: "Qual rei mandou lançar três jovens numa fornalha ardente?", a: "Nabucodonosor", w: ["Dario", "Ciro", "Herodes"], ref: "Daniel 3", d: 3 },
  { q: "Qual profeta viu uma visão de um vale cheio de ossos secos?", a: "Ezequiel", w: ["Isaías", "Jeremias", "Daniel"], ref: "Ezequiel 37", d: 3 },
];

export const QUIZ: QuizItem[] = [...QUIZ_BASE, ...QUIZ_EXTRA];

export type VerseItem = { ref: string; before: string; after: string; a: string; w: [string, string, string]; d: Level };

const VERSES_BASE: VerseItem[] = [
  { ref: "João 3:16", before: "Pois Deus", after: "o mundo de tal maneira que deu o seu Filho Unigênito, para que todo o que nele crer não pereça, mas tenha a vida eterna.", a: "amou", w: ["temeu", "chamou", "criou"], d: 1 },
  { ref: "Salmos 23:1", before: "O Senhor é o meu", after: "; de nada terei falta.", a: "pastor", w: ["rei", "refúgio", "escudo"], d: 1 },
  { ref: "Filipenses 4:13", before: "Tudo posso naquele que me", after: ".", a: "fortalece", w: ["ensina", "guia", "ama"], d: 1 },
  { ref: "Provérbios 3:5", before: "Confie no Senhor de todo o seu", after: "e não se apoie em seu próprio entendimento.", a: "coração", w: ["tempo", "pensamento", "caminho"], d: 2 },
  { ref: "Josué 1:9", before: "Não fui eu que ordenei a você? Seja forte e", after: "! Não se apavore nem desanime, pois o Senhor, o seu Deus, estará com você por onde você andar.", a: "corajoso", w: ["sábio", "paciente", "humilde"], d: 2 },
  { ref: "Romanos 8:28", before: "Sabemos que Deus age em todas as coisas para o", after: "daqueles que o amam, dos que foram chamados de acordo com o seu propósito.", a: "bem", w: ["mal", "tempo", "caminho"], d: 2 },
  { ref: "Isaías 41:10", before: "Não tema, pois estou com você; não tenha medo, pois sou o seu Deus. Eu o fortalecerei e o", after: "; eu o segurarei com a minha mão direita vitoriosa.", a: "ajudarei", w: ["guardarei", "visitarei", "consolarei"], d: 3 },
  { ref: "Mateus 11:28", before: "Venham a mim, todos os que estão cansados e sobrecarregados, e eu darei", after: "a vocês.", a: "descanso", w: ["alegria", "pressa", "vitória"], d: 2 },
  { ref: "Salmos 119:105", before: "A tua palavra é", after: "para os meus pés e luz para o meu caminho.", a: "lâmpada", w: ["espada", "escudo", "cajado"], d: 1 },
  { ref: "1 Timóteo 4:12", before: "Ninguém o menospreze pelo fato de você ser", after: "; mas seja um exemplo para os fiéis na palavra, no procedimento, no amor, na fé e na pureza.", a: "jovem", w: ["pobre", "fraco", "calado"], d: 2 },
  { ref: "Jeremias 29:11", before: "Pois eu bem sei os planos que tenho para vocês, diz o Senhor, planos de fazê-los prosperar e não de causar dano, planos de dar a vocês esperança e um", after: ".", a: "futuro", w: ["lar", "reino", "descanso"], d: 2 },
  { ref: "Salmos 46:1", before: "Deus é o nosso refúgio e a nossa", after: ", auxílio sempre presente na adversidade.", a: "fortaleza", w: ["torre", "casa", "muralha"], d: 3 },
  { ref: "Mateus 6:33", before: "Busquem, pois, em primeiro lugar o", after: "de Deus e a sua justiça, e todas essas coisas lhes serão acrescentadas.", a: "Reino", w: ["Templo", "Povo", "Caminho"], d: 2 },
  { ref: "Salmos 119:11", before: "Guardo no", after: "a tua palavra para não pecar contra ti.", a: "coração", w: ["livro", "altar", "caderno"], d: 3 },
  { ref: "1 Coríntios 13:13", before: "Assim, permanecem a fé, a esperança e o amor, estes três. O", after: "deles, porém, é o amor.", a: "maior", w: ["menor", "primeiro", "último"], d: 2 },
  { ref: "Mateus 28:20", before: "E eu estarei sempre com vocês, até o", after: "dos tempos.", a: "fim", w: ["começo", "meio", "segundo"], d: 3 },
  { ref: "Salmos 27:1", before: "O Senhor é a minha", after: "e a minha salvação; de quem terei temor?", a: "luz", w: ["voz", "sombra", "paz"], d: 1 },
  { ref: "Provérbios 22:6", before: "Instrua a", after: "segundo os objetivos que você tem para ela, e mesmo com o passar dos anos não se desviará deles.", a: "criança", w: ["jovem", "pessoa", "família"], d: 2 },
  { ref: "Filipenses 4:7", before: "E a", after: "de Deus, que excede todo o entendimento, guardará o coração e a mente de vocês em Cristo Jesus.", a: "paz", w: ["glória", "força", "luz"], d: 3 },
  { ref: "Tiago 4:7", before: "Submetam-se, pois, a Deus. Resistam ao diabo, e ele", after: "de vocês.", a: "fugirá", w: ["dormirá", "voltará", "falará"], d: 3 },
  { ref: "Hebreus 11:1", before: "Ora, a fé é a", after: "daquilo que esperamos e a prova das coisas que não vemos.", a: "certeza", w: ["dúvida", "história", "lembrança"], d: 3 },
];

export const VERSES: VerseItem[] = [...VERSES_BASE, ...VERSES_EXTRA];

export type WhoItem = { key: string; name: string; hints: [string, string, string, string]; ref: string; d: Level };

const WHO_BASE: WhoItem[] = [
  { key: "noe", name: "Noé", ref: "Gênesis 6–9", hints: ["Deus me avisou de algo que nunca tinha acontecido e mandou construir algo enorme.", "Levei minha família e muitos animais para dentro do que construí.", "Choveu quarenta dias e quarenta noites.", "Uma pomba voltou com um ramo de oliveira."], d: 1 },
  { key: "moises", name: "Moisés", ref: "Êxodo 2–20", hints: ["Fui salvo de um rio ainda bebê, dentro de um cesto.", "Cresci na casa do faraó, mas fugi para Midiã.", "Deus falou comigo numa sarça que queimava sem se consumir.", "Abri o Mar Vermelho e recebi os Dez Mandamentos."], d: 1 },
  { key: "davi", name: "Davi", ref: "1 Samuel 16–17", hints: ["Eu era o mais novo dos irmãos e cuidava de ovelhas.", "Tocava harpa e escrevi muitos Salmos.", "Fui ungido rei por Samuel ainda jovem.", "Derrubei um gigante com uma pedra e uma funda."], d: 1 },
  { key: "daniel", name: "Daniel", ref: "Daniel 1–6", hints: ["Fui levado para a Babilônia ainda jovem.", "Recusei a comida do rei para me manter fiel a Deus.", "Eu interpretava sonhos de reis.", "Passei uma noite numa cova de leões e nada me aconteceu."], d: 1 },
  { key: "jose", name: "José do Egito", ref: "Gênesis 37–50", hints: ["Meu pai me deu uma túnica colorida.", "Meus irmãos me venderam por inveja.", "Fui parar no Egito e acabei preso sem culpa.", "Interpretei os sonhos do faraó e virei governador."], d: 2 },
  { key: "ester", name: "Ester", ref: "Livro de Ester", hints: ["Fui criada pelo meu primo Mardoqueu.", "Fui escolhida entre muitas jovens para ser rainha.", "No começo, escondi que era judia.", "Arrisquei minha vida diante do rei para salvar o meu povo."], d: 2 },
  { key: "jonas", name: "Jonas", ref: "Livro de Jonas", hints: ["Deus mandou eu ir a Nínive, mas fui para o lado contrário.", "Peguei um barco e veio uma grande tempestade.", "Fui jogado ao mar.", "Passei três dias dentro de um grande peixe."], d: 1 },
  { key: "pedro", name: "Pedro", ref: "Mateus 4 e 26", hints: ["Eu era pescador na Galileia.", "Jesus me chamou dizendo que eu seria pescador de homens.", "Andei sobre as águas por alguns passos até duvidar.", "Neguei Jesus três vezes antes de o galo cantar."], d: 1 },
  { key: "paulo", name: "Paulo", ref: "Atos 9", hints: ["No começo, eu perseguia os cristãos.", "Uma luz forte me parou no caminho para Damasco.", "Fiquei cego por três dias até Ananias orar por mim.", "Escrevi cartas do Novo Testamento, como Romanos e Gálatas."], d: 2 },
  { key: "rute", name: "Rute", ref: "Livro de Rute", hints: ["Nasci em Moabe, não em Israel.", "Meu marido morreu e fiquei viúva.", "Disse à minha sogra: o teu povo será o meu povo.", "Casei com Boaz e fui bisavó do rei Davi."], d: 3 },
  { key: "salomao", name: "Salomão", ref: "1 Reis 3–6", hints: ["Meu pai foi rei antes de mim.", "Deus perguntou o que eu queria, e eu pedi sabedoria.", "Julguei o caso de duas mulheres que disputavam um bebê.", "Construí o templo em Jerusalém."], d: 2 },
  { key: "sansao", name: "Sansão", ref: "Juízes 13–16", hints: ["Antes de nascer, um anjo anunciou que eu seria separado para Deus.", "Minha força estava ligada ao cabelo, que nunca foi cortado.", "Matei um leão com as mãos nuas.", "Derrubei as colunas do templo dos filisteus."], d: 2 },
  { key: "elias", name: "Elias", ref: "1 Reis 17–18; 2 Reis 2", hints: ["Fui profeta no tempo do rei Acabe.", "Corvos me traziam comida junto a um ribeiro.", "Desafiei os profetas de Baal no monte Carmelo.", "Fui levado ao céu num redemoinho, sem morrer."], d: 3 },
  { key: "abraao", name: "Abraão", ref: "Gênesis 12–22", hints: ["Deus me mandou sair da minha terra sem dizer o destino.", "Prometeu que meus descendentes seriam como as estrelas.", "Minha esposa Sara teve um filho já idosa.", "Quase ofereci meu filho Isaque, mas Deus providenciou um carneiro."], d: 2 },
  { key: "zaqueu", name: "Zaqueu", ref: "Lucas 19:1-10", hints: ["Eu era muito baixinho.", "Trabalhava cobrando impostos e era mal visto.", "Subi numa árvore para ver Jesus passar.", "Jesus foi à minha casa, e eu devolvi o que tinha tomado."], d: 3 },
  { key: "debora", name: "Débora", ref: "Juízes 4–5", hints: ["Fui juíza e profetisa de Israel.", "Julgava o povo sentada debaixo de uma palmeira.", "Chamei Baraque para liderar o exército.", "Cantei uma canção de vitória depois de derrotarmos Sísera."], d: 3 },
];

export const WHO: WhoItem[] = [...WHO_BASE, ...WHO_EXTRA];

export type OrderSet = { title: string; events: [string, string, string, string]; ref: string; d: Level };

// "events" já está na ordem cronológica correta.
const ORDER_BASE: OrderSet[] = [
  { title: "Do começo de tudo", events: ["Criação do mundo", "Adão e Eva comem do fruto proibido", "O dilúvio", "A torre de Babel"], ref: "Gênesis 1–11", d: 1 },
  { title: "Os patriarcas", events: ["Deus chama Abraão", "Nasce Isaque", "José é vendido ao Egito", "O povo sai do Egito"], ref: "Gênesis 12 – Êxodo 12", d: 2 },
  { title: "Liberdade e deserto", events: ["O povo sai do Egito", "Os Dez Mandamentos", "Os muros de Jericó caem", "Davi vira rei"], ref: "Êxodo – 2 Samuel", d: 2 },
  { title: "Reis e exílio", events: ["Davi vence Golias", "Salomão constrói o templo", "O exílio na Babilônia", "Neemias reconstrói os muros"], ref: "1 Samuel – Neemias", d: 2 },
  { title: "O ministério de Jesus", events: ["Jesus é batizado", "O Sermão do Monte", "A Última Ceia", "A ressurreição"], ref: "Evangelhos", d: 1 },
  { title: "A igreja nasce", events: ["A ressurreição", "A ascensão", "Pentecostes", "A conversão de Paulo"], ref: "Lucas 24 – Atos 9", d: 2 },
  { title: "Primeiras histórias", events: ["Caim e Abel", "Noé constrói a arca", "Deus chama Abraão", "Jacó sonha com a escada"], ref: "Gênesis 4–28", d: 1 },
  { title: "Libertação do Egito", events: ["Moisés nasce", "A sarça ardente", "As dez pragas", "A travessia do Mar Vermelho"], ref: "Êxodo 2–14", d: 1 },
  { title: "Terra prometida e juízes", events: ["Josué atravessa o Jordão", "Os muros de Jericó caem", "Gideão vence os midianitas", "Sansão derruba as colunas"], ref: "Josué – Juízes", d: 3 },
  { title: "Dos juízes ao rei", events: ["Deus chama Samuel", "Saul é ungido rei", "Davi é ungido", "Davi vence Golias"], ref: "1 Samuel 3–17", d: 3 },
  { title: "Infância de Jesus", events: ["O anjo anuncia a Maria", "Jesus nasce em Belém", "A fuga para o Egito", "Jesus aos doze anos no templo"], ref: "Mateus 1–2; Lucas 1–2", d: 1 },
  { title: "Jesus e seus discípulos", events: ["Jesus chama os primeiros discípulos", "Multiplicação dos pães", "A transfiguração", "A entrada em Jerusalém"], ref: "Evangelhos", d: 3 },
  { title: "Dias da paixão", events: ["A Última Ceia", "A oração no Getsêmani", "A negação de Pedro", "A crucificação"], ref: "Mateus 26–27", d: 2 },
  { title: "Reconstrução de Israel", events: ["O exílio na Babilônia", "Daniel na cova dos leões", "Neemias reconstrói os muros", "O povo lê a Lei com Esdras"], ref: "Daniel – Neemias", d: 3 },
];

export const ORDER: OrderSet[] = [...ORDER_BASE, ...ORDER_EXTRA];
