// A narrativa de A Última Tribo (só dados): pergaminhos, Bíblias e mensagens espalhadas pelo mapa.
// Versículos na Nova Versão Internacional (NVI).

export type LoreKind = "pergaminho" | "biblia" | "mensagem";
export type Lore = { id: string; kind: LoreKind; title: string; text: string; ref?: string };

export const LORE: Lore[] = [
  // ---- pergaminhos: o que aconteceu depois do arrebatamento
  { id: "p1", kind: "pergaminho", title: "O dia em que sumiram", text: "Foi num instante. Carros sem motorista, panelas no fogo, roupas dobradas no chão. Quem ficou correu para as ruas chamando nomes que ninguém respondeu." },
  { id: "p2", kind: "pergaminho", title: "A primeira semana", text: "A energia caiu no terceiro dia. No quinto, os mercados já estavam vazios. As pessoas que restaram começaram a andar em grupos, e os grupos começaram a desconfiar uns dos outros." },
  { id: "p3", kind: "pergaminho", title: "As tribos", text: "Chamamos de tribos os que resolveram ficar juntos. Toda tribo começa com uma promessa: dividir a água. Quase toda tribo termina quando a água acaba." },
  { id: "p4", kind: "pergaminho", title: "Os que avisaram", text: "Minha avó falava disso toda vez que eu saía de casa. Eu ria. Hoje procuro a Bíblia dela em cada gaveta que abro." },
  { id: "p5", kind: "pergaminho", title: "As Trevas", text: "Ninguém sabe explicar a escuridão que avança. Ela não queima nem molha, mas quem fica dentro dela não volta. Por isso todos acabam empurrados para o mesmo lugar." },
  { id: "p6", kind: "pergaminho", title: "A regra", text: "Dizem que no fim sobra um só. Eu ainda não decidi se acredito nisso, ou se é só o medo falando mais alto que a gente." },
  { id: "p7", kind: "pergaminho", title: "A igreja do morro", text: "As portas ficaram abertas. Deixaram comida no altar e um recado: “Pegue o que precisar. Deixe o que puder.” Alguém ainda cumpre." },
  { id: "p8", kind: "pergaminho", title: "Para quem encontrar isto", text: "Se você está lendo, ainda há tempo. Não é tarde para quem ainda respira. Leia o livro que deixei junto. Eu só li depois que perdi tudo." },

  // ---- Bíblias: um versículo para o momento
  { id: "b1", kind: "biblia", title: "Uma Bíblia marcada", text: "“Dois homens estarão no campo; um será tirado e o outro deixado. Portanto, vigiem, porque vocês não sabem em que dia virá o Senhor de vocês.”", ref: "Mateus 24:40,42" },
  { id: "b2", kind: "biblia", title: "Uma Bíblia de bolso", text: "“Mesmo que eu ande por um vale de trevas e morte, não temerei perigo algum, pois tu estás comigo.”", ref: "Salmo 23:4" },
  { id: "b3", kind: "biblia", title: "Uma Bíblia molhada", text: "“Deus é o nosso refúgio e a nossa fortaleza, auxílio sempre presente na adversidade.”", ref: "Salmo 46:1" },
  { id: "b4", kind: "biblia", title: "Uma Bíblia sublinhada", text: "“Não tema, pois estou com você; não tenha medo, pois sou o seu Deus. Eu o fortalecerei e o ajudarei.”", ref: "Isaías 41:10" },
  { id: "b5", kind: "biblia", title: "Uma Bíblia de púlpito", text: "“Nesse mundo vocês terão aflições; mas tenham ânimo! Eu venci o mundo.”", ref: "João 16:33" },
  { id: "b6", kind: "biblia", title: "Uma Bíblia com dedicatória", text: "“Seja forte e corajoso! Não se apavore nem desanime, pois o Senhor, o seu Deus, estará com você por onde você andar.”", ref: "Josué 1:9" },
  { id: "b7", kind: "biblia", title: "Uma Bíblia aberta", text: "“Venham a mim, todos os que estão cansados e sobrecarregados, e eu darei descanso a vocês.”", ref: "Mateus 11:28" },
  { id: "b8", kind: "biblia", title: "Uma Bíblia antiga", text: "“Levanto os meus olhos para os montes e pergunto: De onde me virá o socorro? O meu socorro vem do Senhor, que fez os céus e a terra.”", ref: "Salmo 121:1-2" },
  { id: "b9", kind: "biblia", title: "Uma Bíblia com folha dobrada", text: "“É melhor ter companhia do que estar sozinho, porque maior é a recompensa do trabalho de duas pessoas. Se um cair, o amigo pode ajudá-lo a levantar-se.”", ref: "Eclesiastes 4:9-10" },
  { id: "b10", kind: "biblia", title: "Uma Bíblia no altar", text: "“Ele enxugará dos seus olhos toda lágrima. Não haverá mais morte, nem tristeza, nem choro, nem dor, pois a antiga ordem já passou.”", ref: "Apocalipse 21:4" },

  // ---- mensagens: gravações e bilhetes
  { id: "m1", kind: "mensagem", title: "Gravação de rádio", text: "“...repito: há água limpa na fazenda ao sul da rodovia. Não venham armados. Não temos nada além disso para oferecer.”" },
  { id: "m2", kind: "mensagem", title: "Bilhete na geladeira", text: "“Filha, se você voltar e eu não estiver, vá para a igreja do morro. Eu te espero lá. Não confie em quem oferece demais.”" },
  { id: "m3", kind: "mensagem", title: "Caderno de turno da fábrica", text: "“Turno da noite: metade da equipe não apareceu. As máquinas ficaram ligadas sozinhas até o gerador morrer. Tranquei o depósito. A chave está comigo.”" },
  { id: "m4", kind: "mensagem", title: "Recado na delegacia", text: "“As armas do cofre foram distribuídas. Erro meu. Quem tem arma parou de pedir e começou a tomar.”" },
  { id: "m5", kind: "mensagem", title: "Celular sem sinal", text: "Um vídeo salvo, 14 segundos: uma criança rindo, uma mãe dizendo “olha pra cá”, e então a câmera cai no chão filmando o teto." },
  { id: "m6", kind: "mensagem", title: "Carta do acampamento", text: "“Fizemos uma tribo de nove. Hoje somos quatro. Ninguém foi levado pelas Trevas. Fomos nós mesmos.”" },
];

export const LORE_BY_ID = new Map(LORE.map((l) => [l.id, l]));
export const LORE_ICON: Record<LoreKind, string> = { pergaminho: "📜", biblia: "📖", mensagem: "📼" };

/** Nomes e temperamento dos sobreviventes controlados pelo computador. */
export const BOT_PROFILES: { name: string; aggression: number; loyalty: number; color: number }[] = [
  { name: "Marcos", aggression: 0.75, loyalty: 0.35, color: 0x6b7a4a },
  { name: "Lídia", aggression: 0.4, loyalty: 0.8, color: 0x7a4a5a },
  { name: "Tiago", aggression: 0.6, loyalty: 0.55, color: 0x4a5f7a },
  { name: "Rute", aggression: 0.3, loyalty: 0.9, color: 0x8a6a3a },
  { name: "Caleb", aggression: 0.85, loyalty: 0.25, color: 0x5a4a3a },
  { name: "Sara", aggression: 0.5, loyalty: 0.65, color: 0x3f6b5a },
  { name: "Elias", aggression: 0.65, loyalty: 0.5, color: 0x70503a },
  { name: "Noemi", aggression: 0.35, loyalty: 0.75, color: 0x5a5a7a },
  { name: "Josias", aggression: 0.8, loyalty: 0.3, color: 0x7a3f3a },
  { name: "Davi", aggression: 0.7, loyalty: 0.6, color: 0x4f6a3f },
  { name: "Ester", aggression: 0.45, loyalty: 0.85, color: 0x6a4a6a },
  { name: "Pedro", aggression: 0.8, loyalty: 0.45, color: 0x3f4f5f },
  { name: "Marta", aggression: 0.4, loyalty: 0.7, color: 0x8a5a3a },
  { name: "Lucas", aggression: 0.55, loyalty: 0.6, color: 0x4a6a6a },
  { name: "Débora", aggression: 0.75, loyalty: 0.5, color: 0x6a3a4a },
  { name: "Abner", aggression: 0.9, loyalty: 0.2, color: 0x3a3f3a },
  { name: "Miriam", aggression: 0.35, loyalty: 0.8, color: 0x7a6a3a },
  { name: "Jonas", aggression: 0.5, loyalty: 0.4, color: 0x3a5a7a },
  { name: "Ana", aggression: 0.3, loyalty: 0.9, color: 0x7a5a6a },
];
