// Personagens femininas da Bíblia que passeiam pelo Shopping Elos (client-safe): quem são, o que contam, as conversas entre elas
// e as curiosidades que as vendedoras contam antes de cada compra. O texto segue a Bíblia protestante (ARA, 66 livros).
import type { Beauty } from "./beauty";
import { ITEMS, type Look, type Slot } from "./items";

export type BibleWoman = {
  id: string;
  name: string;
  title: string;
  /** onde a história dela está na Bíblia */
  ref: string;
  intro: string;
  story: string;
  curious: string;
  look: Look;
  beauty: Partial<Beauty>;
};

const itemOf = (slot: Slot, family: string, n = 0): string | undefined => {
  const list = ITEMS.filter((i) => i.slot === slot && i.family === family);
  return list.length ? list[n % list.length].id : undefined;
};
const dress = (parts: [Slot, string, number?][]): Look => {
  const look: Look = {};
  for (const [slot, fam, n] of parts) {
    const id = itemOf(slot, fam, n ?? 0);
    if (id) look[slot] = id;
  }
  return look;
};

type Raw = Omit<BibleWoman, "look" | "beauty"> & { look: [Slot, string, number?][]; beauty: Partial<Beauty> };
const RAW: Raw[] = [
  { id: "eva", name: "Eva", title: "A primeira mulher", ref: "Gênesis 2–3", intro: "Fui criada por Deus e vivi com Adão no jardim do Éden. Ele me deu o nome Eva, que quer dizer vida.", story: "Deus formou a mulher de uma costela do homem para ser a sua companheira. Eu comi do fruto proibido e saímos do jardim, mas Deus prometeu que viria um Salvador.", curious: "Adão chamou a mulher de Eva porque ela seria a mãe de todos os viventes (Gn 3:20).", look: [["tunic", "dress", 11], ["head", "flowers", 0]], beauty: { hair: "long", hairColor: "#7a4a22", skin: "#f1c9a0" } },
  { id: "sara", name: "Sara", title: "Mãe da promessa", ref: "Gênesis 17–21", intro: "Sou esposa de Abraão. Deus prometeu que seríamos pais de uma grande nação.", story: "Esperei muitos anos por um filho. Já idosa, Deus cumpriu a promessa e me deu Isaque. O nome dele quer dizer riso, porque eu ri de alegria.", curious: "Sara é a única mulher de quem a Bíblia diz a idade em que morreu: 127 anos (Gn 23:1).", look: [["tunic", "embroidered", 2], ["head", "veil", 1]], beauty: { hair: "bun", hairColor: "#d8d8e0", skin: "#f6d9bd" } },
  { id: "hagar", name: "Hagar", title: "A serva que Deus viu", ref: "Gênesis 16 e 21", intro: "Fui serva de Sara e mãe de Ismael. Fugi para o deserto, cansada e sozinha.", story: "Junto a uma fonte, o anjo do Senhor me encontrou e prometeu que meu filho teria muitos descendentes. Eu soube que Deus me via e cuidava de mim.", curious: "Hagar chamou Deus de “Tu és o Deus que me vê” (Gn 16:13).", look: [["tunic", "pleated", 5], ["head", "scarf", 4]], beauty: { hair: "braids", hairColor: "#1b1b2a", skin: "#8d5a36" } },
  { id: "rebeca", name: "Rebeca", title: "Esposa de Isaque", ref: "Gênesis 24", intro: "Eu era uma moça de Naor quando um servo de Abraão chegou ao poço.", story: "Ele pediu água e eu dei de beber a ele e aos seus camelos. Assim ele soube que eu era a escolhida para casar com Isaque, e eu disse: “Irei”.", curious: "O servo de Abraão levou dez camelos na viagem (Gn 24:10).", look: [["tunic", "dress", 6], ["head", "veil", 3]], beauty: { hair: "long", hairColor: "#3a2412", skin: "#e8b98a" } },
  { id: "raquel", name: "Raquel", title: "A amada de Jacó", ref: "Gênesis 29–35", intro: "Cuidava das ovelhas de meu pai quando conheci Jacó, junto ao poço.", story: "Jacó trabalhou sete anos para casar comigo, e esses anos lhe pareceram poucos dias, de tanto que me amava. Sou mãe de José e de Benjamim.", curious: "Raquel significa ovelha em hebraico, e ela era pastora do rebanho do pai (Gn 29:9).", look: [["tunic", "twotone", 4], ["head", "ribbon", 3]], beauty: { hair: "wavy", hairColor: "#5e3a1c", skin: "#f1c9a0" } },
  { id: "lia", name: "Lia", title: "Mãe de Judá", ref: "Gênesis 29–30", intro: "Sou a irmã mais velha de Raquel e também esposa de Jacó.", story: "Eu me sentia pouco amada, mas Deus viu a minha dor e me deu filhos. Um deles foi Judá, de quem viria o rei Davi e, mais tarde, Jesus.", curious: "Lia teve seis filhos e uma filha, Diná (Gn 30:21).", look: [["tunic", "dress", 3], ["head", "scarf", 8]], beauty: { hair: "braids", hairColor: "#4a2c14", skin: "#d9a66f" } },
  { id: "joquebede", name: "Joquebede", title: "Mãe de Moisés", ref: "Êxodo 2 e 6:20", intro: "Sou mãe de Miriã, Arão e Moisés, no tempo em que os hebreus eram escravos no Egito.", story: "Para salvar meu bebê, escondi-o num cestinho de juncos às margens do rio Nilo. Deus cuidou dele, e a filha do Faraó o criou como filho.", curious: "A palavra hebraica usada para o cesto de Moisés é a mesma usada para a arca de Noé.", look: [["tunic", "pleated", 1], ["head", "turban", 2]], beauty: { hair: "short", hairColor: "#6f6f80", skin: "#d9a66f" } },
  { id: "miria", name: "Miriã", title: "Profetisa, irmã de Moisés", ref: "Êxodo 2 e 15", intro: "Sou irmã de Moisés e de Arão. Vigiei o cestinho do meu irmãozinho no rio.", story: "Depois que o povo atravessou o mar Vermelho, peguei o pandeiro e dancei, e as mulheres cantaram comigo: “Cantai ao Senhor, porque gloriosamente triunfou”.", curious: "Miriã é a primeira mulher chamada de profetisa na Bíblia (Êx 15:20).", look: [["tunic", "striped", 0], ["head", "ribbon", 5]], beauty: { hair: "curly", hairColor: "#24150c", skin: "#b97b4b" } },
  { id: "raabe", name: "Raabe", title: "Mulher de fé em Jericó", ref: "Josué 2 e 6", intro: "Morei na cidade de Jericó, em uma casa na muralha.", story: "Escondi dois espias de Israel porque cri no Deus deles. Quando os muros caíram, minha família foi salva pelo cordão vermelho que pus na janela.", curious: "Raabe aparece na genealogia de Jesus (Mt 1:5) e na lista dos heróis da fé (Hb 11:31).", look: [["tunic", "dress", 0], ["head", "hood", 3]], beauty: { hair: "ponytail", hairColor: "#a8321f", skin: "#e8b98a" } },
  { id: "debora", name: "Débora", title: "Juíza de Israel", ref: "Juízes 4–5", intro: "Eu julgava o povo de Israel debaixo de uma palmeira, entre Ramá e Betel.", story: "Chamei o comandante Baraque e disse que Deus daria a vitória. Com a ajuda do Senhor, Israel venceu o exército de Sísera, e cantei um hino de louvor.", curious: "Débora é a única mulher entre os juízes de Israel.", look: [["tunic", "embroidered", 6], ["head", "tiara", 0]], beauty: { hair: "bun", hairColor: "#24150c", skin: "#a3683c" } },
  { id: "jael", name: "Jael", title: "Mulher corajosa", ref: "Juízes 4:17-22", intro: "Eu morava numa tenda, esposa de Héber, o queneu.", story: "Quando o general inimigo Sísera fugiu da batalha, ele veio à minha tenda. Com uma estaca da própria tenda eu acabei com a ameaça sobre Israel.", curious: "Débora havia profetizado que o inimigo seria entregue na mão de uma mulher (Jz 4:9).", look: [["tunic", "dress", 9], ["head", "scarf", 2]], beauty: { hair: "short", hairColor: "#4a2c14", skin: "#c98f5c" } },
  { id: "rute", name: "Rute", title: "A moabita fiel", ref: "Rute 1–4", intro: "Sou de Moabe, mas segui minha sogra Noemi até Belém.", story: "Eu lhe disse: “O teu povo será o meu povo, e o teu Deus será o meu Deus”. Juntei espigas no campo de Boaz e acabei me casando com ele.", curious: "Rute é bisavó do rei Davi (Rt 4:17).", look: [["tunic", "dress", 2], ["head", "veil", 5]], beauty: { hair: "long", hairColor: "#24150c", skin: "#f1c9a0" } },
  { id: "noemi", name: "Noemi", title: "Sogra de Rute", ref: "Rute 1–4", intro: "Saí de Belém com marido e filhos, por causa da fome. Voltei só com Rute.", story: "Perdi meu marido e meus filhos em Moabe e pedi que me chamassem Mara, que quer dizer amarga. Mas Deus me deu um neto, Obede, e a alegria voltou.", curious: "Noemi quer dizer minha doçura, e Mara quer dizer amarga (Rt 1:20).", look: [["tunic", "pleated", 3], ["head", "veil", 8]], beauty: { hair: "bun", hairColor: "#a9a9b8", skin: "#f6d9bd" } },
  { id: "ana", name: "Ana", title: "Mãe de Samuel", ref: "1 Samuel 1–2", intro: "Era estéril e chorava diante de Deus no santuário de Siló.", story: "Orei com lágrimas e prometi entregar ao Senhor o filho que Ele me desse. Deus me deu Samuel e eu cantei um louvor de gratidão.", curious: "A oração de Ana (1Sm 2) lembra o cântico de Maria, o Magnificat (Lc 1).", look: [["tunic", "dress", 4], ["head", "ribbon", 1]], beauty: { hair: "bob", hairColor: "#7a4a22", skin: "#e8b98a" } },
  { id: "abigail", name: "Abigail", title: "Mulher sábia", ref: "1 Samuel 25", intro: "Fui esposa de Nabal, um homem duro, e prudente era o que eu sabia ser.", story: "Quando Davi vinha com seus homens para se vingar, levei pães, vinho e comida ao encontro dele e o aconselhei. Davi louvou a Deus pela minha sabedoria.", curious: "Depois que Nabal morreu, Davi se casou com Abigail (1Sm 25:42).", look: [["tunic", "embroidered", 8], ["head", "veil", 2]], beauty: { hair: "wavy", hairColor: "#3a2412", skin: "#d9a66f" } },
  { id: "batseba", name: "Bate-Seba", title: "Mãe de Salomão", ref: "2 Samuel 11–12; 1 Reis 1", intro: "Fui esposa do rei Davi e mãe do rei Salomão.", story: "Passei por dores muito grandes, mas Deus foi fiel. Meu filho Salomão foi o rei que construiu o templo em Jerusalém.", curious: "Bate-Seba aparece na genealogia de Jesus (Mt 1:6).", look: [["tunic", "gown", 3], ["head", "tiara", 2]], beauty: { hair: "long", hairColor: "#24150c", skin: "#e8b98a" } },
  { id: "saba", name: "Rainha de Sabá", title: "A rainha que buscou sabedoria", ref: "1 Reis 10", intro: "Governei um reino distante. Ouvi falar da sabedoria do rei Salomão.", story: "Fiz uma longa viagem para lhe fazer perguntas difíceis. Vi o palácio e a sabedoria dele e disse: “Nem a metade me tinham dito”.", curious: "Ela levou muitas especiarias, ouro e pedras preciosas de presente a Salomão (1Rs 10:2).", look: [["tunic", "gown", 6], ["head", "crown", 0]], beauty: { hair: "braids", hairColor: "#1b1b2a", skin: "#7a4a2a" } },
  { id: "sarepta", name: "Viúva de Sarepta", title: "A viúva que confiou", ref: "1 Reis 17", intro: "Eu era viúva e vivia em Sarepta com o meu filho, no tempo da fome.", story: "Só tinha um punhado de farinha e um pouco de azeite, mas dei o primeiro pão ao profeta Elias. A farinha e o azeite não acabaram até que voltou a chover.", curious: "Jesus mencionou essa viúva quando falou na sinagoga de Nazaré (Lc 4:25-26).", look: [["tunic", "dress", 12], ["head", "scarf", 6]], beauty: { hair: "bun", hairColor: "#4a2c14", skin: "#d9a66f" } },
  { id: "ester", name: "Ester", title: "Rainha da Pérsia", ref: "Livro de Ester", intro: "Meu nome hebraico é Hadassa. Fui escolhida rainha da Pérsia.", story: "Quando meu povo foi ameaçado, jejuei e me apresentei ao rei sem ser chamada, dizendo: “Se perecer, pereci”. Deus usou minha coragem para salvar os judeus.", curious: "O livro de Ester não cita o nome de Deus, mas mostra o cuidado dele em cada acontecimento.", look: [["tunic", "gown", 1], ["head", "crown", 1]], beauty: { hair: "long", hairColor: "#24150c", skin: "#f1c9a0" } },
  { id: "hulda", name: "Hulda", title: "Profetisa em Jerusalém", ref: "2 Reis 22", intro: "Sou esposa de Salum e moro em Jerusalém.", story: "Quando acharam o Livro da Lei no templo, o rei Josias mandou me consultar. Confirmei a palavra do Senhor e o rei fez uma grande reforma no país.", curious: "Hulda morava no bairro novo de Jerusalém (2Rs 22:14).", look: [["tunic", "pleated", 6], ["head", "veil", 6]], beauty: { hair: "short", hairColor: "#94602c", skin: "#e8b98a" } },
  { id: "isabel", name: "Isabel", title: "Mãe de João Batista", ref: "Lucas 1", intro: "Eu e meu marido Zacarias éramos justos, mas não tínhamos filhos.", story: "Já idosa, Deus me deu um filho, João. Quando Maria me visitou, o bebê pulou de alegria dentro de mim e eu disse: “Bendita és tu entre as mulheres”.", curious: "Isabel e Maria eram parentes (Lc 1:36).", look: [["tunic", "dress", 7], ["head", "veil", 7]], beauty: { hair: "bun", hairColor: "#b8b8c4", skin: "#f6d9bd" } },
  { id: "maria", name: "Maria", title: "Mãe de Jesus", ref: "Lucas 1–2", intro: "Sou de Nazaré, na Galileia, e estava prometida a José.", story: "Um anjo me disse que eu seria mãe do Filho de Deus. Respondi: “Aqui está a serva do Senhor”. Jesus nasceu em Belém e foi deitado numa manjedoura.", curious: "O anjo que visitou Maria chamava-se Gabriel (Lc 1:26).", look: [["tunic", "dress", 1], ["head", "veil", 4]], beauty: { hair: "long", hairColor: "#3a2412", skin: "#e8b98a" } },
  { id: "anaprofetisa", name: "Ana, a profetisa", title: "Serva do templo", ref: "Lucas 2:36-38", intro: "Fiquei viúva e passei a servir a Deus no templo com jejuns e orações.", story: "Quando vi o menino Jesus nos braços de Maria, dei graças a Deus e falei do Salvador a todos os que esperavam a libertação de Jerusalém.", curious: "Ana era viúva de oitenta e quatro anos (Lc 2:37).", look: [["tunic", "pleated", 0], ["head", "scarf", 0]], beauty: { hair: "bun", hairColor: "#d8d8e0", skin: "#f1c9a0" } },
  { id: "marta", name: "Marta", title: "Irmã de Maria e Lázaro", ref: "Lucas 10; João 11", intro: "Moro em Betânia e recebi Jesus em minha casa.", story: "Eu me preocupava com muitos afazeres, e Jesus me ensinou que uma só coisa é necessária: ouvi-lo. Depois confessei: “Eu creio que tu és o Cristo, o Filho de Deus”.", curious: "Foi a Marta que Jesus disse: “Eu sou a ressurreição e a vida” (Jo 11:25).", look: [["tunic", "dress", 10], ["head", "scarf", 5]], beauty: { hair: "ponytail", hairColor: "#5e3a1c", skin: "#d9a66f" } },
  { id: "mariabetania", name: "Maria de Betânia", title: "Aos pés de Jesus", ref: "Lucas 10; João 12", intro: "Sou irmã de Marta e de Lázaro.", story: "Sentei-me aos pés de Jesus para ouvir o seu ensino. Mais tarde derramei sobre ele um perfume muito caro para honrá-lo.", curious: "O perfume era nardo puro, e a casa inteira se encheu do aroma (Jo 12:3).", look: [["tunic", "embroidered", 10], ["head", "ribbon", 0]], beauty: { hair: "wavy", hairColor: "#24150c", skin: "#e8b98a" } },
  { id: "madalena", name: "Maria Madalena", title: "A primeira a ver o Senhor ressuscitado", ref: "João 20", intro: "Jesus me libertou, e eu passei a segui-lo e a servi-lo.", story: "Fui ao túmulo bem cedo e o encontrei vazio. Jesus me chamou pelo nome, e corri para contar aos discípulos: “Vi o Senhor!”.", curious: "Maria confundiu Jesus com o jardineiro antes de reconhecê-lo (Jo 20:15).", look: [["tunic", "dress", 13], ["head", "veil", 9]], beauty: { hair: "curly", hairColor: "#7a4a22", skin: "#f1c9a0" } },
  { id: "dorcas", name: "Dorcas", title: "Tabita, a costureira", ref: "Atos 9:36-42", intro: "Moro em Jope e faço túnicas e roupas para os pobres.", story: "Quando adoeci e morri, as viúvas choraram e chamaram Pedro. Ele orou, disse: “Tabita, levanta-te”, e Deus me devolveu a vida.", curious: "Tabita, em aramaico, e Dorcas, em grego, significam gazela (At 9:36).", look: [["tunic", "twotone", 7], ["head", "ribbon", 6]], beauty: { hair: "pigtails", hairColor: "#3a2412", skin: "#c98f5c" } },
  { id: "lidia", name: "Lídia", title: "Vendedora de púrpura", ref: "Atos 16:13-15", intro: "Vendo tecidos de púrpura em Filipos e adoro a Deus.", story: "Ouvi Paulo pregar junto ao rio e o Senhor abriu o meu coração. Fui batizada com a minha casa e convidei os missionários para ficar comigo.", curious: "Lídia era de Tiatira, cidade famosa pelos tecidos tingidos de púrpura (At 16:14).", look: [["tunic", "embroidered", 11], ["head", "turban", 6]], beauty: { hair: "bob", hairColor: "#8c2f39", skin: "#d9a66f" } },
  { id: "priscila", name: "Priscila", title: "Cooperadora de Paulo", ref: "Atos 18; Romanos 16:3", intro: "Fazia tendas com meu marido Áquila e viajamos por várias cidades.", story: "Recebemos Paulo em nossa casa e ensinamos com mais clareza o caminho de Deus a um pregador chamado Apolo. Nossa casa era uma igreja.", curious: "Paulo os chamou de “cooperadores em Cristo Jesus” (Rm 16:3).", look: [["tunic", "pleated", 7], ["head", "scarf", 9]], beauty: { hair: "twinbuns", hairColor: "#4a2c14", skin: "#e8b98a" } },
  { id: "febe", name: "Febe", title: "Diaconisa de Cencreia", ref: "Romanos 16:1-2", intro: "Sirvo à igreja de Cencreia, perto de Corinto.", story: "Paulo me recomendou aos irmãos de Roma e pediu que me recebessem bem, porque eu tinha ajudado a muitos, inclusive a ele.", curious: "Muitos estudiosos acham que Febe foi quem levou a carta de Paulo aos romanos.", look: [["tunic", "dress", 5], ["head", "veil", 10]], beauty: { hair: "sidebraid", hairColor: "#3a2412", skin: "#b97b4b" } },
  { id: "loide", name: "Loide", title: "Avó de Timóteo", ref: "2 Timóteo 1:5", intro: "Sou a avó de Timóteo, o jovem ajudante de Paulo.", story: "Ensinei a fé sincera à minha filha Eunice, e ela a ensinou ao meu neto desde pequeno. Paulo se lembrou disso com gratidão.", curious: "Paulo elogiou a fé de Loide e de Eunice na segunda carta a Timóteo.", look: [["tunic", "pleated", 8], ["head", "veil", 11]], beauty: { hair: "bun", hairColor: "#c24a2a", skin: "#f6d9bd" } },
  { id: "eunice", name: "Eunice", title: "Mãe de Timóteo", ref: "Atos 16:1; 2 Timóteo 1:5", intro: "Sou judia e creio em Jesus. Meu filho se chama Timóteo.", story: "Ensinei a ele as Sagradas Letras desde a infância. Quando cresceu, Timóteo acompanhou Paulo em suas viagens.", curious: "Timóteo conhecia as Sagradas Letras desde pequeno (2Tm 3:15).", look: [["tunic", "dress", 14], ["head", "ribbon", 7]], beauty: { hair: "ponytail", hairColor: "#24150c", skin: "#e8b98a" } },
  { id: "joana", name: "Joana", title: "Discípula de Jesus", ref: "Lucas 8:3; 24:10", intro: "Jesus me curou, e passei a ajudar o seu ministério com os meus bens.", story: "Viajei com os discípulos e estive entre as mulheres que, na manhã da ressurreição, anunciaram aos apóstolos que o túmulo estava vazio.", curious: "O marido de Joana, Cuza, era administrador do rei Herodes (Lc 8:3).", look: [["tunic", "gown", 8], ["head", "tiara", 3]], beauty: { hair: "bob", hairColor: "#94602c", skin: "#f1c9a0" } },
  { id: "samaritana", name: "A mulher samaritana", title: "A mulher do poço", ref: "João 4", intro: "Fui buscar água no poço de Jacó, ao meio-dia.", story: "Ali encontrei Jesus, que me falou da água viva. Corri à cidade e disse: “Vinde ver um homem que me disse tudo quanto tenho feito”. Muitos creram.", curious: "Jesus disse a ela que Deus procura adoradores que o adorem em espírito e em verdade (Jo 4:23).", look: [["tunic", "dress", 15], ["head", "scarf", 1]], beauty: { hair: "wavy", hairColor: "#1b1b2a", skin: "#a3683c" } },
  { id: "viuvamoedas", name: "A viúva das duas moedas", title: "Generosa", ref: "Marcos 12:41-44", intro: "Sou uma viúva pobre e fui ao templo, junto com muita gente.", story: "Coloquei no cofre duas moedinhas, tudo o que eu tinha. Jesus disse a seus discípulos que dei mais do que todos, porque dei com amor tudo o que possuía.", curious: "As duas moedinhas valiam um quadrante, muito pouco dinheiro (Mc 12:42).", look: [["tunic", "dress", 16], ["head", "scarf", 7]], beauty: { hair: "short", hairColor: "#6f6f80", skin: "#d9a66f" } },
  { id: "virtuosa", name: "A mulher virtuosa", title: "Provérbios 31", ref: "Provérbios 31:10-31", intro: "Sou a mulher que o livro de Provérbios descreve com carinho.", story: "Trabalho com alegria, cuido da minha casa, estendo a mão ao necessitado e falo com sabedoria. Quem teme ao Senhor é digna de louvor.", curious: "Provérbios 31:10-31 é um poema em que cada versículo começa com uma letra do alfabeto hebraico, em ordem.", look: [["tunic", "embroidered", 0], ["head", "crown", 2]], beauty: { hair: "long", hairColor: "#5e3a1c", skin: "#f1c9a0" } },
];

export const BIBLE_WOMEN: BibleWoman[] = RAW.map((r) => ({ ...r, look: dress(r.look), beauty: r.beauty }));

/** Conversas entre as personagens (como notícias do dia; cada linha é de uma delas, alternando). */
export const GOSSIP: string[][] = [
  ["Lembra aquela criança que foi encontrada no templo na semana passada?", "Os pais acharam! Parece que o nome dele era Jesus.", "Dizem que ele conversava com os mestres da Lei e todos se admiravam das respostas."],
  ["Viu aquele homem construindo um barco enorme em terra seca?", "É o Noé! Ele diz que Deus mandou, porque vem um dilúvio.", "E está juntando animais de dois em dois!"],
  ["Soube que um pastorzinho derrubou o gigante Golias com uma pedra?", "O filho de Jessé? O Davi?", "Ele só tinha uma funda e cinco pedrinhas, mas disse que quem lutou foi Deus."],
  ["Lembra do José, aquele que os irmãos venderam?", "Agora é governador do Egito, só abaixo do Faraó!", "E quando os irmãos foram comprar trigo, ele os perdoou."],
  ["Ouviu que o Daniel passou a noite na cova dos leões?", "E de manhã estava são e salvo!", "Disse que Deus enviou um anjo e fechou a boca dos leões."],
  ["Dizem que um profeta foi engolido por um grande peixe.", "Foi o Jonas! Passou três dias lá dentro.", "Depois pregou em Nínive e a cidade inteira se arrependeu."],
  ["Viu o Zaqueu, o cobrador de impostos, subir numa árvore?", "Para ver Jesus passar, porque ele é baixinho!", "E Jesus foi jantar na casa dele. Zaqueu prometeu devolver quatro vezes o que cobrou a mais."],
  ["Fui a um casamento em Caná onde o vinho acabou.", "E agora, que vexame!", "Jesus mandou encher as talhas de água e ela virou o melhor vinho da festa."],
  ["Os discípulos contaram que o mar se acalmou com uma palavra de Jesus.", "Ele dormia no barco durante a tempestade!", "Quando o acordaram, disse ao vento: “Cala-te, acalma-te”."],
  ["Cinco mil homens comeram até se fartar naquele monte!", "Com cinco pães e dois peixinhos de um menino?", "E ainda sobraram doze cestos de pedaços."],
  ["Lázaro, de Betânia, estava morto havia quatro dias.", "Então como ele está passeando pela cidade?", "Jesus chamou: “Lázaro, vem para fora!”, e ele saiu."],
  ["Eram só galileus, mas falaram nas línguas de todo mundo em Jerusalém!", "Foi o Espírito Santo, com línguas como de fogo.", "Naquele dia, uns três mil foram batizados."],
  ["Saulo, o perseguidor, agora prega que Jesus é o Filho de Deus!", "Dizem que uma luz o derrubou na estrada de Damasco.", "Ele ficou cego, e o Ananias orou por ele para voltar a ver."],
  ["Houve um terremoto na prisão de Filipos!", "E os presos fugiram?", "Não! Paulo e Silas cantavam hinos, e o carcereiro se converteu com a família toda."],
  ["Aquele jovem Eutico dormiu na janela durante a pregação do Paulo...", "E caiu do terceiro andar, não foi?", "Paulo o abraçou e ele voltou vivo. Todos ficaram consolados."],
  ["Pedro andou sobre as águas do lago, é verdade?", "Andou, até olhar para o vento e ter medo.", "Jesus o segurou: “Homem de pouca fé, por que duvidaste?”."],
  ["Os pastores vigiavam os rebanhos de noite quando um anjo apareceu.", "E o que ele disse?", "Anunciou o nascimento do Salvador. Eles correram a Belém e acharam o bebê numa manjedoura."],
  ["Uns sábios do Oriente seguiram uma estrela até Belém.", "E levaram presentes ao menino?", "Ouro, incenso e mirra. E voltaram por outro caminho, avisados em sonho."],
  ["O povo atravessou o mar Vermelho a pé enxuto!", "Moisés estendeu a mão e as águas se abriram.", "E o exército do Faraó? Ficou para trás, nas águas."],
  ["No deserto, o povo acorda e encontra pão no chão!", "É o maná! Cai todas as manhãs.", "E na véspera do sábado vem uma porção dobrada."],
  ["Os muros de Jericó caíram!", "Depois de sete voltas e das trombetas dos sacerdotes?", "O povo gritou e as muralhas ruíram, menos a casa da Raabe, com o cordão vermelho."],
  ["Gideão venceu um exército enorme com só trezentos homens!", "Só com trombetas e jarros com tochas?", "O inimigo fugiu. Deus mostrou que a vitória era dele."],
  ["Duas mães disputavam o mesmo bebê diante do rei Salomão.", "E como ele decidiu?", "Mandou dividir o menino ao meio. A verdadeira mãe pediu que o entregassem inteiro à outra, e ele soube quem era."],
  ["Elias desafiou os profetas de Baal no monte Carmelo.", "E o fogo desceu?", "Desceu e consumiu o sacrifício, mesmo com o altar encharcado de água!"],
  ["Reconstruíram o muro de Jerusalém em cinquenta e dois dias!", "Com o Neemias comandando?", "Cada família reparou um trecho. Alguns trabalhavam com a espada na cintura."],
  ["O cego Bartimeu gritava à beira do caminho, em Jericó.", "E Jesus o chamou?", "“A tua fé te salvou.” Ele passou a ver e seguiu Jesus pelo caminho."],
  ["Três jovens foram lançados numa fornalha acesa e não se queimaram!", "Sadraque, Mesaque e Abede-Nego?", "O rei viu um quarto homem andando com eles no meio do fogo."],
  ["O Jó perdeu tudo, mas não deixou de confiar em Deus.", "E no fim?", "Deus o restaurou e deu a ele o dobro do que tinha antes."],
  ["Jesus contou a história do homem ferido na estrada de Jericó.", "O samaritano parou para ajudar, né?", "E Jesus perguntou qual dos três foi o próximo. “Vai e faze da mesma maneira”."],
  ["O filho mais novo voltou para casa depois de gastar tudo!", "E o pai o expulsou?", "Correu ao seu encontro, abraçou e fez uma festa."],
  ["A rainha Ester arriscou a vida diante do rei para salvar o seu povo.", "E ele a recebeu?", "Estendeu o cetro de ouro. O povo foi salvo!"],
  ["A Rute está colhendo espigas no campo de Boaz.", "E a sogra Noemi?", "Foi ela quem aconselhou tudo. No fim, Boaz se casou com a Rute!"],
  ["Zacarias ficou mudo no templo!", "Por quê?", "Duvidou do anjo. Só voltou a falar quando deu ao filho o nome de João."],
  ["Estive no Jordão quando Jesus foi batizado por João.", "E aconteceu algo?", "Os céus se abriram, o Espírito desceu como uma pomba e uma voz disse: “Este é o meu Filho amado”."],
];

/** Curiosidades bíblicas que as vendedoras contam antes de cada compra. */
export const CURIOSITIES: string[] = [
  "A Bíblia protestante tem 66 livros: 39 no Antigo Testamento e 27 no Novo.",
  "O Salmo 119 é o capítulo mais longo da Bíblia, com 176 versículos.",
  "O Salmo 117 é o capítulo mais curto da Bíblia, com apenas 2 versículos.",
  "Matusalém é o homem mais velho da Bíblia: viveu 969 anos (Gn 5:27).",
  "Jesus nasceu em Belém, como o profeta Miqueias havia anunciado (Mq 5:2).",
  "A Bíblia foi escrita por cerca de 40 autores ao longo de uns 1.500 anos.",
  "“Jesus chorou” (Jo 11:35) é um dos versículos mais curtos da Bíblia.",
  "Davi é apontado como autor de cerca de 73 salmos.",
  "A arca de Noé tinha trezentos côvados de comprimento (Gn 6:15), uns 135 metros.",
  "Os israelitas comeram maná por quarenta anos no deserto (Êx 16:35).",
  "Salomão pediu a Deus sabedoria em vez de riquezas (1Rs 3:9-12).",
  "Pedro era pescador e Mateus era cobrador de impostos antes de seguir Jesus.",
  "O Novo Testamento foi escrito originalmente em grego.",
  "Boa parte do Antigo Testamento foi escrita em hebraico.",
  "Jesus escolheu doze apóstolos (Mc 3:14).",
  "Zaqueu subiu num sicômoro para ver Jesus passar (Lc 19:4).",
  "O livro de Ester não cita o nome de Deus, mas mostra o cuidado dele de ponta a ponta.",
  "Moisés tinha oitenta anos quando falou com o Faraó (Êx 7:7).",
  "Jonas ficou três dias e três noites dentro do grande peixe (Jn 1:17).",
  "O primeiro milagre de Jesus foi transformar água em vinho, em Caná (Jo 2).",
  "Paulo escreveu cartas a igrejas em lugares como Roma, Corinto e Filipos.",
  "A palavra “evangelho” significa boa notícia.",
  "O livro de Salmos tem 150 capítulos, o maior número de toda a Bíblia.",
  "Daniel orava três vezes por dia, de joelhos, voltado para Jerusalém (Dn 6:10).",
  "Jesus foi batizado por João no rio Jordão (Mt 3:13).",
  "Foi Maria, irmã de Marta, que derramou perfume de nardo puro sobre Jesus (Jo 12:3).",
  "Abraão tinha cem anos quando nasceu Isaque (Gn 21:5).",
  "Os Dez Mandamentos foram dados a Moisés no monte Sinai (Êx 20).",
  "Jesus ensinou o Pai Nosso no Sermão do Monte (Mt 6:9-13).",
  "Gênesis é o primeiro livro da Bíblia e Apocalipse é o último.",
  "O rei Josias tinha só oito anos quando começou a reinar (2Rs 22:1).",
  "Bartimeu era o cego de Jericó que Jesus curou (Mc 10:46-52).",
  "Os pastores foram os primeiros a ouvir o anúncio do nascimento de Jesus (Lc 2:8-12).",
  "Rute e Ester são os dois livros da Bíblia que têm nome de mulher.",
  "Os sábios do Oriente levaram ouro, incenso e mirra ao menino Jesus (Mt 2:11).",
  "Gideão derrotou os midianitas com apenas trezentos homens (Jz 7).",
  "O fruto do Espírito é amor, alegria, paz, longanimidade, benignidade... (Gl 5:22-23).",
  "“Porque Deus amou ao mundo de tal maneira...” é João 3:16.",
  "Cinco pães e dois peixes alimentaram cerca de cinco mil homens (Mt 14:21).",
];

/** Sorteia a próxima curiosidade (nunca a mesma da vez anterior). */
export function nextCuriosity(prev: number): number {
  const i = Math.floor(Math.random() * CURIOSITIES.length);
  return i === prev ? (i + 1) % CURIOSITIES.length : i;
}
