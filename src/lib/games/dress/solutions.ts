// Respostas certas do "Vista o Herói". SÓ SERVIDOR: nunca importe este arquivo de um componente de cliente.
// Conteúdo segue a Bíblia protestante; onde a Bíblia não descreve a roupa, a nota diz isso.
import "server-only";
import type { Slot } from "./items";

export type SlotSolution = {
  /** a peça mais fiel ao texto bíblico (2 pontos) */
  ideal: string;
  /** peças também aceitáveis (1 ponto) */
  ok: string[];
  /** por que (mostrado depois de responder) */
  note: string;
};

export type Solution = Record<Slot, SlotSolution>;

export const SOLUTIONS: Record<string, Solution> = {
  davi: {
    head: { ideal: "head_none", ok: ["head_scarf"], note: "Davi cuidava das ovelhas: nada de coroa nem capacete (ele recusou até a armadura de Saul)." },
    tunic: { ideal: "tunic_simple", ok: ["tunic_skins"], note: "Roupa simples de pastor. Ele tirou a armadura que Saul lhe emprestou (1 Samuel 17:38-39)." },
    mantle: { ideal: "mantle_belt", ok: ["mantle_none"], note: "Pastores usavam um cinto de couro para prender a túnica e levar a bolsa." },
    shoes: { ideal: "shoes_sandals", ok: ["shoes_none"], note: "Sandálias simples de quem anda pelo campo." },
    hand: { ideal: "hand_sling", ok: ["hand_staff"], note: "“Tomou o seu cajado, escolheu cinco pedras lisas... e com a funda na mão” (1 Samuel 17:40)." },
  },
  joao: {
    head: { ideal: "head_none", ok: ["head_scarf"], note: "A Bíblia não fala de nada na cabeça: ele vivia no deserto." },
    tunic: { ideal: "tunic_camel", ok: [], note: "“Tinha João vestes de pelos de camelo” (Mateus 3:4)." },
    mantle: { ideal: "mantle_belt", ok: ["mantle_sash"], note: "“...e um cinto de couro em torno dos lombos” (Mateus 3:4)." },
    shoes: { ideal: "shoes_sandals", ok: ["shoes_none"], note: "Vida simples no deserto: sandálias comuns ou descalço." },
    hand: { ideal: "hand_none", ok: ["hand_staff"], note: "Ele pregava e batizava no Jordão, sem nenhum objeto especial." },
  },
  jose: {
    head: { ideal: "head_none", ok: ["head_scarf", "head_turban"], note: "O texto fala do anel, do linho e do colar, não de algo na cabeça." },
    tunic: { ideal: "tunic_linen", ok: ["tunic_purple"], note: "O faraó o vestiu de “linho finíssimo” (Gênesis 41:42)." },
    mantle: { ideal: "mantle_collar", ok: ["mantle_royal"], note: "“Pôs-lhe um colar de ouro ao pescoço” (Gênesis 41:42)." },
    shoes: { ideal: "shoes_sandals", ok: ["shoes_gold"], note: "A Bíblia não descreve o calçado; sandálias de corte egípcia." },
    hand: { ideal: "hand_none", ok: ["hand_scroll"], note: "O faraó lhe deu o anel de sinete (a autoridade dele), não um objeto para segurar." },
  },
  gideao: {
    head: { ideal: "head_none", ok: ["head_helmet", "head_scarf"], note: "O texto não descreve nada na cabeça." },
    tunic: { ideal: "tunic_simple", ok: ["tunic_skins"], note: "Gideão era lavrador (Juízes 6:11): roupa simples." },
    mantle: { ideal: "mantle_belt", ok: ["mantle_sash"], note: "Um cinto simples para prender a túnica." },
    shoes: { ideal: "shoes_sandals", ok: ["shoes_none"], note: "Sandálias de caminhada." },
    hand: { ideal: "hand_trumpet", ok: ["hand_jar"], note: "“Deu a todos eles trombetas e jarros vazios, com tochas dentro” (Juízes 7:16)." },
  },
  sansao: {
    head: { ideal: "head_none", ok: [], note: "Cabeça descoberta, mostrando o cabelo: “navalha nunca passou pela minha cabeça” (Juízes 16:17)." },
    tunic: { ideal: "tunic_simple", ok: ["tunic_skins"], note: "Roupa simples da época dos Juízes." },
    mantle: { ideal: "mantle_belt", ok: ["mantle_none"], note: "Um cinto para prender a túnica." },
    shoes: { ideal: "shoes_sandals", ok: ["shoes_none"], note: "Sandálias comuns." },
    hand: { ideal: "hand_jawbone", ok: ["hand_none"], note: "Com uma queixada de jumento, Sansão derrotou mil homens (Juízes 15:15)." },
  },
  moises: {
    head: { ideal: "head_scarf", ok: ["head_none"], note: "Pastor no deserto de Midiã, usava pano na cabeça contra o sol." },
    tunic: { ideal: "tunic_simple", ok: ["tunic_linen"], note: "Roupa simples de pastor." },
    mantle: { ideal: "mantle_striped", ok: ["mantle_white"], note: "Mantos de lã listrados eram comuns entre pastores do deserto." },
    shoes: { ideal: "shoes_none", ok: ["shoes_sandals"], note: "“Tire as sandálias dos pés, porque o lugar em que você está é terra santa” (Êxodo 3:5)." },
    hand: { ideal: "hand_staff", ok: [], note: "“Que é isso na sua mão? Um cajado” (Êxodo 4:2)." },
  },
  noe: {
    head: { ideal: "head_none", ok: ["head_scarf"], note: "A Bíblia não descreve a cabeça de Noé." },
    tunic: { ideal: "tunic_simple", ok: ["tunic_skins"], note: "A Bíblia não descreve a roupa de Noé; vestes simples de lavrador." },
    mantle: { ideal: "mantle_belt", ok: ["mantle_none"], note: "Um cinto simples; sem enfeites de luxo." },
    shoes: { ideal: "shoes_sandals", ok: ["shoes_none"], note: "Sandálias simples." },
    hand: { ideal: "hand_olive", ok: ["hand_staff"], note: "A pomba voltou “trazendo no bico uma folha nova de oliveira” (Gênesis 8:11)." },
  },
  daniel: {
    head: { ideal: "head_turban", ok: ["head_none"], note: "Oficiais da corte da Babilônia usavam turbante (provável pelo que se sabe da época)." },
    tunic: { ideal: "tunic_purple", ok: ["tunic_linen"], note: "“Vestiram a Daniel de púrpura” (Daniel 5:29)." },
    mantle: { ideal: "mantle_collar", ok: ["mantle_royal"], note: "“...puseram-lhe ao pescoço um colar de ouro” (Daniel 5:29)." },
    shoes: { ideal: "shoes_sandals", ok: ["shoes_gold"], note: "Sandálias de corte." },
    hand: { ideal: "hand_scroll", ok: ["hand_none"], note: "Daniel estudava as Escrituras: lia os livros dos profetas (Daniel 9:2)." },
  },
  ester: {
    head: { ideal: "head_crown", ok: ["head_diadem"], note: "O rei “pôs-lhe na cabeça a coroa real” (Ester 2:17)." },
    tunic: { ideal: "tunic_purple", ok: ["tunic_linen"], note: "“Vestiu-se Ester dos seus trajes reais” (Ester 5:1)." },
    mantle: { ideal: "mantle_royal", ok: ["mantle_white"], note: "Manto de rainha da Pérsia." },
    shoes: { ideal: "shoes_gold", ok: ["shoes_sandals"], note: "Calçado de palácio." },
    hand: { ideal: "hand_none", ok: ["hand_scepter"], note: "Ela só tocou a ponta do cetro do rei, que estava na mão dele (Ester 5:2)." },
  },
  maria: {
    head: { ideal: "head_veil", ok: [], note: "A Bíblia não descreve a roupa de Maria; uma jovem judia de Nazaré usava véu." },
    tunic: { ideal: "tunic_blue", ok: ["tunic_simple"], note: "Roupa simples de mulher do povo (a tradição a pinta de azul)." },
    mantle: { ideal: "mantle_blue", ok: ["mantle_white"], note: "Um manto simples sobre o véu." },
    shoes: { ideal: "shoes_sandals", ok: ["shoes_none"], note: "Sandálias simples." },
    hand: { ideal: "hand_none", ok: ["hand_pitcher"], note: "Nenhum objeto especial; um cântaro seria comum para as mulheres da época." },
  },
  josue: {
    head: { ideal: "head_helmet", ok: ["head_none"], note: "Josué era comandante de guerra (Josué 5:13)." },
    tunic: { ideal: "tunic_armor", ok: ["tunic_simple"], note: "Roupa de guerreiro; o comandante do exército do Senhor apareceu a ele com a espada nua." },
    mantle: { ideal: "mantle_belt", ok: ["mantle_sash"], note: "Cinto de soldado." },
    shoes: { ideal: "shoes_sandals", ok: ["shoes_none"], note: "Mas diante do Senhor ele teve que tirar as sandálias: “o lugar é santo” (Josué 5:15)." },
    hand: { ideal: "hand_sword", ok: ["hand_trumpet"], note: "Josué era o comandante; as trombetas ficaram com os sacerdotes (Josué 6:4)." },
  },
  salomao: {
    head: { ideal: "head_crown", ok: ["head_diadem"], note: "Rei de Israel: “a coroa com que sua mãe o coroou” (Cântico dos Cânticos 3:11)." },
    tunic: { ideal: "tunic_purple", ok: ["tunic_linen"], note: "Veste real de púrpura." },
    mantle: { ideal: "mantle_royal", ok: ["mantle_collar"], note: "Manto real, em um palácio de ouro (1 Reis 10:21)." },
    shoes: { ideal: "shoes_gold", ok: ["shoes_sandals"], note: "Calçado de rei." },
    hand: { ideal: "hand_scepter", ok: [], note: "O cetro simboliza a autoridade do rei." },
  },
  miguel: {
    head: { ideal: "head_helmet", ok: ["head_none"], note: "Miguel “pelejou” contra o dragão (Apocalipse 12:7): um guerreiro celestial. A Bíblia não descreve a armadura; a arte o mostra assim." },
    tunic: { ideal: "tunic_armor", ok: ["tunic_linen"], note: "Armadura de arcanjo guerreiro." },
    mantle: { ideal: "mantle_white", ok: ["mantle_sash"], note: "Branco, a cor dos seres celestiais na Bíblia." },
    shoes: { ideal: "shoes_bronze", ok: ["shoes_sandals"], note: "Grevas de guerra." },
    hand: { ideal: "hand_sword", ok: [], note: "Ele guerreia com os seus anjos contra o dragão." },
  },
  adao: {
    head: { ideal: "head_none", ok: [], note: "Nada na cabeça." },
    tunic: { ideal: "tunic_leaves", ok: ["tunic_skins"], note: "Costuraram folhas de figueira (Gênesis 3:7); depois Deus fez “vestimentas de peles” (Gênesis 3:21)." },
    mantle: { ideal: "mantle_none", ok: [], note: "Nada mais por cima: foi Deus quem providenciou as vestes." },
    shoes: { ideal: "shoes_none", ok: [], note: "Descalço, no jardim." },
    hand: { ideal: "hand_none", ok: [], note: "Mãos livres para cuidar do jardim (Gênesis 2:15)." },
  },
  eva: {
    head: { ideal: "head_none", ok: [], note: "Nada na cabeça." },
    tunic: { ideal: "tunic_leaves", ok: ["tunic_skins"], note: "Costuraram folhas de figueira (Gênesis 3:7); depois Deus fez “vestimentas de peles” (Gênesis 3:21)." },
    mantle: { ideal: "mantle_none", ok: [], note: "Nada mais por cima: foi Deus quem providenciou as vestes." },
    shoes: { ideal: "shoes_none", ok: [], note: "Descalça, no jardim." },
    hand: { ideal: "hand_none", ok: [], note: "Mãos livres." },
  },
  jaco: {
    head: { ideal: "head_scarf", ok: ["head_none"], note: "Pastor que vivia em tendas, protegia-se do sol com um pano." },
    tunic: { ideal: "tunic_simple", ok: ["tunic_skins"], note: "Roupa simples de pastor." },
    mantle: { ideal: "mantle_sheep", ok: ["mantle_belt"], note: "Rebeca cobriu as mãos e o pescoço de Jacó com peles de cabritos (Gênesis 27:16)." },
    shoes: { ideal: "shoes_sandals", ok: ["shoes_none"], note: "Sandálias de viagem." },
    hand: { ideal: "hand_staff", ok: [], note: "“Com o meu cajado atravessei este Jordão” (Gênesis 32:10)." },
  },
  isaias: {
    head: { ideal: "head_none", ok: ["head_scarf"], note: "Nada especial na cabeça." },
    tunic: { ideal: "tunic_sack", ok: ["tunic_simple"], note: "“Desata o pano de saco dos teus lombos” (Isaías 20:2): roupa de profeta em sinal de luto." },
    mantle: { ideal: "mantle_none", ok: ["mantle_belt"], note: "Nada por cima." },
    shoes: { ideal: "shoes_none", ok: ["shoes_sandals"], note: "“...e tira as sandálias dos pés”, andou descalço por ordem de Deus (Isaías 20:2)." },
    hand: { ideal: "hand_scroll", ok: [], note: "“Toma um grande rolo e escreve nele” (Isaías 8:1)." },
  },
  rute: {
    head: { ideal: "head_scarf", ok: ["head_veil"], note: "A Bíblia não descreve a cabeça de Rute; uma mulher que trabalhava no campo cobria a cabeça do sol." },
    tunic: { ideal: "tunic_simple", ok: ["tunic_linen"], note: "Roupa simples de trabalhadora do campo (Rute 2)." },
    mantle: { ideal: "mantle_striped", ok: ["mantle_white", "mantle_none"], note: "Boaz mediu seis medidas de cevada “no manto” dela (Rute 3:15)." },
    shoes: { ideal: "shoes_sandals", ok: ["shoes_none"], note: "Sandálias simples de quem anda pelos campos." },
    hand: { ideal: "hand_sheaf", ok: [], note: "Ela respigava espigas atrás dos ceifeiros (Rute 2:2-3, 17)." },
  },
  miria: {
    head: { ideal: "head_veil", ok: ["head_scarf"], note: "A Bíblia não descreve; mulheres hebreias cobriam a cabeça." },
    tunic: { ideal: "tunic_simple", ok: ["tunic_blue", "tunic_linen"], note: "Roupa simples de uma mulher do povo, recém-saída do Egito." },
    mantle: { ideal: "mantle_none", ok: ["mantle_white"], note: "Nada de luxo: eram um povo que acabara de ser libertado." },
    shoes: { ideal: "shoes_none", ok: ["shoes_sandals"], note: "O povo passou o mar a pé enxuto (Êxodo 14:29)." },
    hand: { ideal: "hand_tambourine", ok: [], note: "“Miriã tomou um tamborim” e todas as mulheres a seguiram com tamborins e danças (Êxodo 15:20)." },
  },
  rebeca: {
    head: { ideal: "head_veil", ok: ["head_scarf"], note: "“Tomou o véu e se cobriu” ao ver Isaque (Gênesis 24:65)." },
    tunic: { ideal: "tunic_simple", ok: ["tunic_blue", "tunic_linen"], note: "Moça de família de pastores, roupa simples." },
    mantle: { ideal: "mantle_none", ok: ["mantle_white"], note: "Nada especial; ela trabalhava no poço." },
    shoes: { ideal: "shoes_sandals", ok: ["shoes_none"], note: "Sandálias simples de quem anda até o poço." },
    hand: { ideal: "hand_pitcher", ok: ["hand_jar"], note: "“Desceu à fonte, encheu o seu cântaro” e deu de beber ao servo e aos camelos (Gênesis 24:16-20)." },
  },
  raquel: {
    head: { ideal: "head_scarf", ok: ["head_veil", "head_none"], note: "Pastora sob o sol: pano na cabeça (a Bíblia não descreve)." },
    tunic: { ideal: "tunic_simple", ok: ["tunic_skins"], note: "Roupa simples de pastora." },
    mantle: { ideal: "mantle_belt", ok: ["mantle_none"], note: "Cinto simples para trabalhar com as ovelhas." },
    shoes: { ideal: "shoes_sandals", ok: ["shoes_none"], note: "Sandálias de pastora." },
    hand: { ideal: "hand_staff", ok: [], note: "Ela “pastoreava as ovelhas de seu pai” (Gênesis 29:9): o cajado de pastor." },
  },
  saba: {
    head: { ideal: "head_crown", ok: ["head_diadem"], note: "Era uma rainha (1 Reis 10:1)." },
    tunic: { ideal: "tunic_purple", ok: ["tunic_linen"], note: "Veste real, adequada a uma rainha em visita ao rei Salomão." },
    mantle: { ideal: "mantle_collar", ok: ["mantle_royal"], note: "Ela trouxe “ouro e pedras preciosas” (1 Reis 10:2): joias de rainha." },
    shoes: { ideal: "shoes_gold", ok: ["shoes_sandals"], note: "Calçado de rainha." },
    hand: { ideal: "hand_alabaster", ok: ["hand_jar"], note: "Ela trouxe “muitas especiarias” e perfumes (1 Reis 10:2, 10)." },
  },
  jael: {
    head: { ideal: "head_scarf", ok: ["head_veil"], note: "Mulher de nômades, cobria a cabeça (a Bíblia não descreve)." },
    tunic: { ideal: "tunic_simple", ok: ["tunic_skins"], note: "Roupa simples de mulher que morava em tenda." },
    mantle: { ideal: "mantle_none", ok: ["mantle_belt"], note: "Nada de luxo." },
    shoes: { ideal: "shoes_sandals", ok: ["shoes_none"], note: "Sandálias simples." },
    hand: { ideal: "hand_tentpeg", ok: [], note: "“Tomou uma estaca da tenda, pegou um martelo” (Juízes 4:21)." },
  },
  betania: {
    head: { ideal: "head_none", ok: ["head_scarf"], note: "“Enxugou-lhe os pés com os seus cabelos” (João 12:3): cabelos soltos." },
    tunic: { ideal: "tunic_simple", ok: ["tunic_blue", "tunic_linen"], note: "Roupa simples de uma mulher de Betânia." },
    mantle: { ideal: "mantle_none", ok: ["mantle_white"], note: "Nada por cima; ela se abaixou aos pés de Jesus." },
    shoes: { ideal: "shoes_none", ok: ["shoes_sandals"], note: "Descalça, humilde, aos pés dele." },
    hand: { ideal: "hand_alabaster", ok: ["hand_jar"], note: "“Uma libra de perfume de nardo puro, de muito valor” (João 12:3), num vaso de alabastro." },
  },
  dorcas: {
    head: { ideal: "head_scarf", ok: ["head_veil"], note: "A Bíblia não descreve; mulher de Jope cobria a cabeça." },
    tunic: { ideal: "tunic_simple", ok: ["tunic_blue", "tunic_linen"], note: "Roupa simples de costureira." },
    mantle: { ideal: "mantle_none", ok: ["mantle_blue"], note: "Nada especial: ela era conhecida pelas roupas que fazia para os outros." },
    shoes: { ideal: "shoes_sandals", ok: ["shoes_none"], note: "Sandálias simples." },
    hand: { ideal: "hand_cloth", ok: [], note: "“Mostravam-lhe as túnicas e vestidos que Dorcas fazia” (Atos 9:39)." },
  },
  lidia: {
    head: { ideal: "head_scarf", ok: ["head_veil"], note: "A Bíblia não descreve; uma comerciante cobria a cabeça." },
    tunic: { ideal: "tunic_purple", ok: ["tunic_linen"], note: "Lídia era “vendedora de púrpura” (Atos 16:14), o tecido mais caro da época." },
    mantle: { ideal: "mantle_none", ok: ["mantle_blue", "mantle_white"], note: "Nada que a Bíblia descreva por cima." },
    shoes: { ideal: "shoes_sandals", ok: ["shoes_gold"], note: "Sandálias de uma comerciante." },
    hand: { ideal: "cloth__roxo", ok: [], note: "Ela vendia tecido de púrpura (Atos 16:14)." },
  },
  raabe: {
    head: { ideal: "head_scarf", ok: ["head_veil"], note: "A Bíblia não descreve; mulher de Jericó cobria a cabeça." },
    tunic: { ideal: "tunic_simple", ok: ["tunic_linen"], note: "Ela escondeu os espias entre “hastes de linho” (Josué 2:6): roupas e casa simples." },
    mantle: { ideal: "mantle_sash", ok: [], note: "O “cordão de fio escarlate” na janela salvou a casa dela (Josué 2:18)." },
    shoes: { ideal: "shoes_sandals", ok: ["shoes_none"], note: "Sandálias comuns." },
    hand: { ideal: "hand_none", ok: ["hand_scroll"], note: "Nada na mão: o sinal foi a faixa vermelha na janela." },
  },
  ana: {
    head: { ideal: "head_veil", ok: ["head_scarf"], note: "Ela orava no santuário (1 Samuel 1:12-13): mulher cobrindo a cabeça." },
    tunic: { ideal: "tunic_simple", ok: ["tunic_blue", "tunic_linen"], note: "Roupa simples de uma mulher de Ramá." },
    mantle: { ideal: "mantle_none", ok: ["mantle_white"], note: "Nada especial por cima." },
    shoes: { ideal: "shoes_sandals", ok: ["shoes_none"], note: "Sandálias de peregrina até Siló." },
    hand: { ideal: "hand_cloth", ok: [], note: "“Sua mãe lhe fazia uma pequena túnica e lha trazia cada ano” (1 Samuel 2:19)." },
  },
  abigail: {
    head: { ideal: "head_veil", ok: ["head_scarf"], note: "Mulher respeitável que se curvou diante de Davi (1 Samuel 25:23)." },
    tunic: { ideal: "tunic_simple", ok: ["tunic_blue", "tunic_linen"], note: "Mulher de família rica, mas a Bíblia não descreve a roupa." },
    mantle: { ideal: "mantle_none", ok: ["mantle_blue"], note: "Nada que a Bíblia descreva por cima." },
    shoes: { ideal: "shoes_sandals", ok: ["shoes_none"], note: "Ela viajou pelo caminho de jumento." },
    hand: { ideal: "hand_sheaf", ok: ["hand_pitcher"], note: "Levou “duzentos pães, dois odres de vinho... e cinco medidas de grão torrado” (1 Samuel 25:18)." },
  },
};
