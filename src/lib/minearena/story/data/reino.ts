// Fase 6 (reino unido): Samuel, Saul e Davi, o Pastor. Textos adaptados da Bíblia (ARA como base), sempre com a referência.
import type { CutStep, Cutscene, Dialogue, LearnCard, Mission, Vec3 } from "../types";

const say = (who: string, text: string, ref?: string): CutStep => ({ t: "say", who, text, ref });
const cap = (text: string, dur = 3.5, sub?: string): CutStep => ({ t: "caption", text, dur, sub });
const cam = (to: Vec3, look: Vec3, dur: number, wait = true): CutStep => ({ t: "cam", to, look, dur, wait });
const at = (pos: Vec3, look: Vec3): CutStep => ({ t: "camAt", pos, look });
const v = (x: number, y: number, z: number): Vec3 => ({ x, y, z });
const fade = (to: 0 | 1, dur: number, text?: string): CutStep => ({ t: "fade", to, dur, text });
const open: CutStep[] = [{ t: "bars", on: true }, { t: "call", fn: "holdCamera" }];
const close: CutStep[] = [{ t: "bars", on: false }, { t: "call", fn: "releaseCamera" }];
const day: CutStep = { t: "env", time: 0.14, weather: "clear", lock: true };
const night: CutStep = { t: "env", time: 0.9, weather: "clear", lock: true };
/** yaw 0 olha para −z, π para +z, π/2 para oeste, −π/2 para leste. */
const tp = (x: number, z: number, yaw = 0, y = -1): CutStep => ({ t: "teleport", target: "player", to: { x, y, z }, yaw });

const povo = (n: number, x: number, z: number, tag?: string, prefix = "h") =>
  Array.from({ length: n }, (_, i) => ({ mob: ["povo_a", "povo_b", "povo_c", "povo_d"][i % 4], at: { x: x + (i % 6) * 2.2, z: z + Math.floor(i / 6) * 2.4 }, id: `${prefix}${i + 1}`, tag }));

// ====================================================================== MISSÕES
export const REINO_MISSIONS: Mission[] = [
  // ---------------- SAMUEL ----------------
  {
    id: "sm_1",
    chapter: "samuel",
    title: "A oração de Ana",
    desc: "Em Siló, uma mulher chora diante do Senhor.",
    ref: "1 Samuel 1:1–20",
    npc: "ana",
    onStart: "sm_intro",
    spawn: [
      { mob: "ana", at: { x: 92, z: 66 }, id: "ana" },
      { mob: "eli", at: { x: 84, z: 64 }, id: "eli" },
    ],
    objectives: [{ k: "talk", npc: "ana", dialogue: "sm_ana", text: "Fale com Ana, junto à entrada do santuário." }],
    onComplete: "sm_born",
    next: "sm_2",
  },
  {
    id: "sm_2",
    chapter: "samuel",
    title: "O menino no santuário",
    desc: "Samuel cresce a serviço do Senhor, ao lado do sacerdote Eli.",
    ref: "1 Samuel 2:11,18–26; 3:1",
    npc: "samuel",
    spawn: [{ mob: "samuel_menino", at: { x: 90, z: 56 }, id: "samuel" }],
    objectives: [{ k: "talk", npc: "samuel", dialogue: "sm_boy", text: "Fale com o menino Samuel, no átrio do santuário." }],
    next: "sm_3",
  },
  {
    id: "sm_3",
    chapter: "samuel",
    title: "Samuel! Samuel!",
    desc: "De noite, uma voz chama o menino.",
    ref: "1 Samuel 3:2–18",
    onStart: "sm_night",
    objectives: [
      { k: "reach", zone: "eli", text: "Corra até Eli, junto à porta: alguém chamou Samuel." },
      { k: "reach", zone: "leito", text: "Volte ao leito, dentro do santuário, como Eli mandou." },
      { k: "reach", zone: "eli", text: "A voz chamou outra vez: vá de novo a Eli." },
    ],
    onComplete: "sm_voice",
    next: "sm_4",
  },
  {
    id: "sm_4",
    chapter: "samuel",
    title: "Ebenézer",
    desc: "Samuel levanta uma pedra de lembrança.",
    ref: "1 Samuel 3:19–21; 7:12",
    give: [{ item: "cobble", count: 1 }],
    objectives: [{ k: "place", zone: "ebenezer", count: 1, match: "cobble", text: "Levante a pedra de Ebenézer: coloque a pedra no lugar marcado, a sudeste." }],
    onComplete: "sm_ebenezer",
  },

  // ---------------- SAUL ----------------
  {
    id: "sl_1",
    chapter: "saul",
    title: "As jumentas perdidas",
    desc: "Saul sai à procura das jumentas do pai.",
    ref: "1 Samuel 9:1–14",
    npc: "saul",
    onStart: "sl_intro",
    spawn: [
      { mob: "saul", at: { x: 30, z: 114 }, id: "saul" },
      { mob: "cavalo", at: { x: 76, z: 56 }, tag: "jumenta" },
      { mob: "cavalo", at: { x: 84, z: 64 }, tag: "jumenta" },
      { mob: "cavalo", at: { x: 72, z: 66 }, tag: "jumenta" },
      { mob: "cavalo", at: { x: 88, z: 58 }, tag: "jumenta" },
    ],
    objectives: [
      { k: "near", tag: "jumenta", count: 3, dist: 4, text: "Procure as jumentas perdidas nos montes, a nordeste: aproxime-se de 3." },
      { k: "reach", zone: "zufe", text: "Siga até a cidade de Zufe, onde mora o vidente." },
    ],
    next: "sl_2",
  },
  {
    id: "sl_2",
    chapter: "saul",
    title: "O vidente e o rei",
    desc: "Samuel recebe Saul, a quem Deus mostrou na véspera.",
    ref: "1 Samuel 9:15–10:13",
    npc: "samuel",
    spawn: [{ mob: "samuel", at: { x: 130, z: 53 }, id: "samuel" }],
    objectives: [{ k: "talk", npc: "samuel", dialogue: "sl_samuel", text: "Fale com Samuel, o vidente, em Zufe." }],
    onComplete: "sl_anoint",
    next: "sl_3",
  },
  {
    id: "sl_3",
    chapter: "saul",
    title: "Escondido entre a bagagem",
    desc: "Em Mispá, o rei escolhido não aparece.",
    ref: "1 Samuel 10:17–27",
    npc: "saul",
    spawn: [
      { mob: "samuel", at: { x: 150, z: 96 }, id: "samuel" },
      { mob: "saul", at: { x: 157, z: 107 }, id: "saul" },
      ...povo(8, 138, 100, "povo"),
    ],
    objectives: [
      { k: "reach", zone: "mispa", text: "Vá a Mispá, ao sudeste, onde Samuel reuniu o povo." },
      { k: "talk", npc: "saul", dialogue: "sl_hidden", text: "Procure Saul entre a bagagem, perto das caixas." },
    ],
    onComplete: "sl_king",
    next: "sl_4",
  },
  {
    id: "sl_4",
    chapter: "saul",
    title: "Jabes-Gileade",
    desc: "O primeiro ato do rei: salvar uma cidade.",
    ref: "1 Samuel 11:1–15",
    onStart: "sl_jabes_intro",
    spawn: [{ mob: "saul", at: { x: 58, z: 46 }, id: "saul" }, ...povo(8, 52, 48, "povo")],
    objectives: [{ k: "reach", zone: "jabes", text: "Chegue a Jabes-Gileade, ao norte, com Saul." }],
    onComplete: "sl_jabes",
    next: "sl_5",
  },
  {
    id: "sl_5",
    chapter: "saul",
    title: "Melhor é obedecer",
    desc: "Em Gilgal, Samuel confronta o rei.",
    ref: "1 Samuel 15:1–35",
    npc: "samuel",
    spawn: [
      { mob: "samuel", at: { x: 168, z: 44 }, id: "samuel" },
      { mob: "saul", at: { x: 172, z: 44 }, id: "saul" },
    ],
    objectives: [
      { k: "reach", zone: "gilgal", text: "Vá a Gilgal, a leste, onde Samuel espera Saul." },
      { k: "talk", npc: "samuel", dialogue: "sl_reject", text: "Ouça Samuel diante do rei." },
    ],
    onComplete: "sl_end",
  },

  // ---------------- DAVI, O PASTOR ----------------
  {
    id: "dp_1",
    chapter: "davi_pastor",
    title: "Enche o teu chifre de azeite",
    desc: "Samuel chega a Belém, em segredo.",
    ref: "1 Samuel 16:1–5",
    npc: "samuel",
    onStart: "dp_intro",
    spawn: [
      { mob: "samuel", at: { x: 22, z: 76 }, id: "samuel" },
      { mob: "anciao", at: { x: 26, z: 73 }, id: "an1" },
      { mob: "anciao", at: { x: 18, z: 73 }, id: "an2" },
    ],
    objectives: [{ k: "talk", npc: "samuel", dialogue: "dp_elders", text: "Fale com Samuel, no portão de Belém." }],
    next: "dp_2",
  },
  {
    id: "dp_2",
    chapter: "davi_pastor",
    title: "Os sete filhos de Jessé",
    desc: "O Senhor não olha para a aparência.",
    ref: "1 Samuel 16:6–11",
    npc: "jesse",
    spawn: [
      { mob: "jesse", at: { x: 36, z: 88 }, id: "jesse" },
      ...Array.from({ length: 7 }, (_, i) => ({ mob: ["irmao_a", "irmao_b", "irmao_c"][i % 3], at: { x: 24 + i * 2.6, z: 93 }, id: `f${i + 1}`, tag: "filho" })),
    ],
    objectives: [
      { k: "near", tag: "filho", count: 7, dist: 3, text: "Passe diante dos sete filhos de Jessé, na frente da casa." },
      { k: "talk", npc: "jesse", dialogue: "dp_sons", text: "Fale com Jessé." },
    ],
    next: "dp_3",
  },
  {
    id: "dp_3",
    chapter: "davi_pastor",
    title: "O pastor de Belém",
    desc: "O mais novo cuida das ovelhas, no campo.",
    ref: "1 Samuel 16:11–13",
    spawn: [
      { mob: "davi", at: { x: 84, z: 68 }, id: "davi" },
      { mob: "ovelha", at: { x: 78, z: 64 }, tag: "rebanho" },
      { mob: "ovelha", at: { x: 82, z: 62 }, tag: "rebanho" },
      { mob: "ovelha", at: { x: 88, z: 66 }, tag: "rebanho" },
      { mob: "ovelha", at: { x: 90, z: 72 }, tag: "rebanho" },
      { mob: "ovelha", at: { x: 80, z: 72 }, tag: "rebanho" },
      { mob: "cabra", at: { x: 86, z: 62 }, tag: "rebanho" },
    ],
    objectives: [
      { k: "reach", zone: "pasto", text: "Vá ao pasto, a leste, onde o mais novo cuida das ovelhas." },
      { k: "talk", npc: "davi", dialogue: "dp_david", text: "Fale com Davi." },
    ],
    onComplete: "dp_anoint",
    next: "dp_4",
  },
  {
    id: "dp_4",
    chapter: "davi_pastor",
    title: "O leão e o urso",
    desc: "O pastor defende o rebanho.",
    ref: "1 Samuel 17:34–37",
    onStart: "dp_beast",
    objectives: [{ k: "wait", seconds: 6, text: "Fique junto às ovelhas até a calma voltar ao pasto." }],
    next: "dp_5",
  },
  {
    id: "dp_5",
    chapter: "davi_pastor",
    title: "A harpa diante do rei",
    desc: "Davi toca para acalmar o rei Saul.",
    ref: "1 Samuel 16:14–23",
    npc: "saul",
    onStart: "dp_palace",
    spawn: [
      { mob: "saul", at: { x: 146, z: 38 }, id: "saul", y: 26.1 },
      { mob: "davi", at: { x: 144, z: 53 }, id: "davi" },
    ],
    objectives: [
      { k: "reach", zone: "palacio", text: "Entre no palácio de Saul, em Gibeá, a leste." },
      { k: "talk", npc: "saul", dialogue: "dp_saul", text: "Fale com o rei Saul, dentro do palácio." },
    ],
    onComplete: "dp_harp",
  },
];

// ====================================================================== DIÁLOGOS
const L = (who: string, text: string, ref?: string) => ({ who, text, ref });
export const REINO_DIALOGUES: Record<string, Dialogue> = {
  sm_ana: {
    id: "sm_ana",
    lines: [
      L("Narrador", "Havia um homem de Ramataim, de nome Elcana, que tinha duas mulheres: Ana e Penina. Penina tinha filhos, mas Ana não os tinha; e ela sofria muito com isso.", "1 Samuel 1:1–2,6"),
      L("Ana", "Ó Senhor dos Exércitos, se benignamente atentares para a aflição da tua serva e te lembrares de mim, e lhe deres um filho, eu o dedicarei ao Senhor por todos os dias da sua vida; e a navalha não passará pela sua cabeça.", "1 Samuel 1:11"),
      L("Eli", "Até quando estarás embriagada? Deixa o teu vinho.", "1 Samuel 1:14"),
      L("Ana", "Não, senhor meu; sou mulher atribulada de espírito. Não bebi vinho nem bebida forte, mas derramei a minha alma perante o Senhor. Não tenhas a tua serva por filha de Belial; é por causa da grandeza das minhas queixas que tenho orado até agora.", "1 Samuel 1:15–16"),
      L("Eli", "Vai-te em paz, e o Deus de Israel te conceda a petição que lhe fizeste.", "1 Samuel 1:17"),
      L("Narrador", "A mulher se foi, comeu, e o seu rosto não era mais triste.", "1 Samuel 1:18"),
    ],
  },
  sm_boy: {
    id: "sm_boy",
    lines: [
      L("Narrador", "O menino Samuel servia ao Senhor perante Eli, vestido de uma estola de linho. Sua mãe lhe fazia cada ano uma pequena túnica e a levava, quando subia com o marido para oferecer o sacrifício anual.", "1 Samuel 2:18–19"),
      L("Narrador", "O menino Samuel crescia e era benquisto, tanto da parte do Senhor como dos homens.", "1 Samuel 2:26"),
      L("Narrador", "Naqueles dias, a palavra do Senhor era mui rara; as visões não eram frequentes. Eli, cujos olhos já começavam a escurecer, estava deitado no seu lugar.", "1 Samuel 3:1–2"),
      L("Samuel", "Todas as noites eu durmo aqui perto, dentro do santuário, onde está a arca de Deus. A lâmpada de Deus ainda não se apagou.", "1 Samuel 3:3"),
    ],
  },
  sl_samuel: {
    id: "sl_samuel",
    lines: [
      L("Narrador", "Um dia antes da chegada de Saul, o Senhor tinha revelado a Samuel: amanhã, a esta hora, te enviarei um homem da terra de Benjamim; unge-o por príncipe sobre o meu povo, e ele livrará o meu povo da mão dos filisteus.", "1 Samuel 9:15–16"),
      L("Senhor", "Eis o homem de quem te falei; este dominará sobre o meu povo.", "1 Samuel 9:17"),
      L("Saul", "Peço-te que me digas onde está a casa do vidente.", "1 Samuel 9:18"),
      L("Samuel", "Eu sou o vidente. Sobe adiante de mim ao lugar alto, e comerás hoje comigo. As jumentas que perdeste há três dias, não te dê isso cuidado, porque já se acharam. E para quem é todo o desejo de Israel? Não é para ti e para toda a casa de teu pai?", "1 Samuel 9:19–20"),
      L("Saul", "Não sou eu benjamita, da menor das tribos de Israel? E não é a minha família a menor de todas as famílias da tribo de Benjamim? Por que, pois, me dizes tal coisa?", "1 Samuel 9:21"),
    ],
  },
  sl_hidden: {
    id: "sl_hidden",
    lines: [
      L("Narrador", "Samuel convocou o povo ao Senhor, em Mispá. Tirada a sorte, caiu sobre a tribo de Benjamim, e sobre a família de Matri, e por fim sobre Saul, filho de Quis. Mas, quando o procuraram, não o acharam.", "1 Samuel 10:17–21"),
      L("Senhor", "Eis que está escondido entre a bagagem.", "1 Samuel 10:22"),
      L("Saul", "Eu? Rei? Eu me escondi porque não me sinto à altura. Mas, se o Senhor me escolheu...", "1 Samuel 10:21–22"),
      L("Narrador", "Correram e o trouxeram de lá. Quando se pôs no meio do povo, era mais alto do que todos, desde o ombro para cima.", "1 Samuel 10:23"),
      L("Samuel", "Vedes o que o Senhor escolheu? Não há semelhante a ele em todo o povo.", "1 Samuel 10:24"),
      L("Povo", "Viva o rei!", "1 Samuel 10:24"),
    ],
  },
  sl_reject: {
    id: "sl_reject",
    lines: [
      L("Narrador", "O Senhor tinha mandado Saul ao amalequitas, para os destruir completamente, sem poupar coisa alguma. Mas Saul e o povo pouparam o melhor do gado e dos despojos.", "1 Samuel 15:1–9"),
      L("Samuel", "Que é, pois, este balido de ovelhas e este mugido de bois que ouço?", "1 Samuel 15:14"),
      L("Saul", "Trouxeram-nos dos amalequitas, porque o povo poupou o melhor das ovelhas e dos bois para sacrificar ao Senhor, teu Deus.", "1 Samuel 15:15"),
      L("Samuel", "Tem porventura o Senhor tanto prazer em holocaustos e sacrifícios, como em que se obedeça à sua palavra? Eis que o obedecer é melhor do que o sacrificar, e o atender melhor do que a gordura de carneiros.", "1 Samuel 15:22"),
      L("Samuel", "Porquanto rejeitaste a palavra do Senhor, ele também te rejeitou a ti, para que não sejas rei.", "1 Samuel 15:23"),
      L("Saul", "Pequei, pois transgredi o mandado do Senhor e as tuas palavras, porque temi o povo e dei ouvidos à sua voz.", "1 Samuel 15:24"),
    ],
  },
  dp_elders: {
    id: "dp_elders",
    lines: [
      L("Senhor", "Até quando terás pena de Saul, havendo-o eu rejeitado? Enche o teu chifre de azeite e vai; envio-te a Jessé, o belemita, porque dentre os seus filhos me tenho provido de um rei.", "1 Samuel 16:1"),
      L("Samuel", "Como irei? Se Saul o souber, me matará.", "1 Samuel 16:2"),
      L("Senhor", "Toma contigo uma bezerra e dize: vim oferecer sacrifício ao Senhor. Convida Jessé para o sacrifício; eu te farei saber o que hás de fazer, e ungirás para mim aquele que eu te designar.", "1 Samuel 16:2–3"),
      L("Narrador", "Samuel fez como o Senhor ordenou e veio a Belém. Os anciãos da cidade saíram tremendo ao seu encontro.", "1 Samuel 16:4"),
      L("Anciãos", "Vens em paz?", "1 Samuel 16:4"),
      L("Samuel", "Em paz; vim sacrificar ao Senhor. Santificai-vos e vinde comigo ao sacrifício.", "1 Samuel 16:5"),
    ],
  },
  dp_sons: {
    id: "dp_sons",
    lines: [
      L("Narrador", "Quando entraram, Samuel viu Eliabe, o filho mais velho, e disse consigo: certamente o ungido do Senhor está diante dele.", "1 Samuel 16:6"),
      L("Senhor", "Não atentes para a sua aparência, nem para a sua altura, porque o rejeitei; porque o Senhor não vê como vê o homem. O homem vê o exterior, porém o Senhor, o coração.", "1 Samuel 16:7"),
      L("Narrador", "Jessé fez passar diante de Samuel sete dos seus filhos.", "1 Samuel 16:8–10"),
      L("Samuel", "O Senhor não escolheu a estes. Acabaram-se os teus filhos?", "1 Samuel 16:10–11"),
      L("Jessé", "Ainda falta o mais novo, que apascenta as ovelhas.", "1 Samuel 16:11"),
      L("Samuel", "Manda buscá-lo; porque não nos assentaremos à mesa, enquanto ele não vier.", "1 Samuel 16:11"),
    ],
  },
  dp_david: {
    id: "dp_david",
    lines: [
      L("Narrador", "Mandou, pois, Jessé buscá-lo. Era ruivo, de belos olhos e de aparência formosa.", "1 Samuel 16:12"),
      L("Davi", "Eu sou o mais novo, e cuido das ovelhas do meu pai. Samuel disse que o Senhor me quer chamar. Eu não sei por quê.", "1 Samuel 16:11–12"),
      L("Senhor", "Levanta-te e unge-o, porque é este.", "1 Samuel 16:12"),
    ],
  },
  dp_saul: {
    id: "dp_saul",
    lines: [
      L("Narrador", "O Espírito do Senhor se retirou de Saul, e um espírito mau, da parte do Senhor, o atormentava.", "1 Samuel 16:14"),
      L("Servos", "Procure o nosso senhor um homem que saiba tocar harpa; quando o espírito mau vier sobre ti, ele a tocará, e te sentirás melhor.", "1 Samuel 16:15–16"),
      L("Servo", "Vi um filho de Jessé, o belemita, que sabe tocar, é homem valente e guerreiro, prudente no falar e de boa aparência; e o Senhor é com ele.", "1 Samuel 16:18"),
      L("Saul", "Manda-me Davi, teu filho, que está com as ovelhas.", "1 Samuel 16:19"),
      L("Narrador", "Davi veio a Saul e ficou ao seu serviço. Saul o amou muito, e Davi foi seu pajem de armas.", "1 Samuel 16:21"),
    ],
  },
};

// ====================================================================== CUTSCENES
export const REINO_CUTSCENES: Record<string, Cutscene> = {
  // ---------------- SAMUEL ----------------
  sm_intro: {
    id: "sm_intro",
    steps: [
      { t: "bars", on: true },
      { t: "call", fn: "holdCamera" },
      fade(1, 0.01),
      day,
      { t: "music", track: "silo" },
      cap("SAMUEL", 3, "1 Samuel 1–3"),
      at(v(70, 38, 84), v(90, 27, 56)),
      fade(0, 2),
      say("Narrador", "Nos dias dos juízes, o santuário do Senhor ficava em Siló, e a arca da aliança estava ali. Todos os anos, Elcana subia para adorar e oferecer sacrifício.", "1 Samuel 1:3; 3:3"),
      cam(v(78, 33, 78), v(88, 27, 64), 4),
      { t: "bars", on: false },
      { t: "call", fn: "releaseCamera" },
    ],
  },
  sm_born: {
    id: "sm_born",
    steps: [
      ...open,
      cam(v(78, 33, 78), v(90, 27, 64), 2.5),
      say("Narrador", "Levantaram-se de madrugada, adoraram perante o Senhor e voltaram para casa. O Senhor se lembrou de Ana; ela concebeu e deu à luz um filho, e lhe chamou Samuel, dizendo: eu o pedi ao Senhor.", "1 Samuel 1:19–20"),
      fade(1, 1.5, "Alguns anos depois…"),
      fade(0, 1.5),
      say("Ana", "Por este menino orava eu, e o Senhor me concedeu o que eu lhe pedi. Por isso também eu o dou ao Senhor; por todos os dias que viver será do Senhor.", "1 Samuel 1:27–28"),
      say("Ana", "O meu coração exulta no Senhor; a minha força está exaltada no Senhor.", "1 Samuel 2:1"),
      { t: "call", fn: "removeNpc", arg: "ana" },
      ...close,
    ],
  },
  sm_night: {
    id: "sm_night",
    steps: [
      { t: "bars", on: true },
      { t: "call", fn: "holdCamera" },
      fade(1, 1.5, "Uma noite, em Siló…"),
      night,
      { t: "music", track: "silo_noite" },
      tp(88, 49, Math.PI, 26.1),
      at(v(94, 31, 56), v(88, 27, 46)),
      fade(0, 2),
      say("Narrador", "A lâmpada de Deus ainda não se apagara. Samuel estava deitado no templo do Senhor, onde estava a arca de Deus.", "1 Samuel 3:3"),
      say("Senhor", "Samuel!", "1 Samuel 3:4"),
      say("Samuel", "Eis-me aqui!", "1 Samuel 3:4"),
      say("Narrador", "Samuel correu a Eli e disse: eis-me aqui, pois tu me chamaste. Mas Eli não o tinha chamado.", "1 Samuel 3:5"),
      { t: "bars", on: false },
      { t: "call", fn: "releaseCamera" },
    ],
  },
  sm_voice: {
    id: "sm_voice",
    steps: [
      ...open,
      cam(v(80, 32, 74), v(86, 27, 62), 2.5),
      say("Eli", "Não te chamei, filho meu; torna a deitar-te.", "1 Samuel 3:5–6"),
      say("Narrador", "O Senhor tornou a chamar: Samuel! E Samuel foi outra vez a Eli. Pela terceira vez o Senhor o chamou, e Samuel foi a Eli.", "1 Samuel 3:6–8"),
      say("Narrador", "Então Eli entendeu que era o Senhor quem chamava o menino.", "1 Samuel 3:8"),
      say("Eli", "Vai deitar-te; e, se te chamar, dize: Fala, Senhor, porque o teu servo ouve.", "1 Samuel 3:9"),
      { t: "music", track: "exodo_sagrado" },
      say("Narrador", "O Senhor veio, ficou ali e chamou como das outras vezes: Samuel! Samuel!", "1 Samuel 3:10"),
      say("Samuel", "Fala, porque o teu servo ouve.", "1 Samuel 3:10"),
      say("Senhor", "Eis que vou fazer uma coisa em Israel que fará tinir ambos os ouvidos a quem a ouvir. Naquele dia cumprirei contra Eli tudo o que falei acerca da sua casa, porque os seus filhos se faziam desprezíveis e ele não os repreendeu.", "1 Samuel 3:11–13"),
      say("Narrador", "Samuel teve medo de contar a visão a Eli. Pela manhã, Eli lhe disse: não me encubras nada. Samuel contou-lhe tudo.", "1 Samuel 3:15–18"),
      say("Eli", "Ele é o Senhor; faça o que bem lhe parecer.", "1 Samuel 3:18"),
      fade(1, 1.5),
      day,
      fade(0, 1.5),
      ...close,
    ],
  },
  sm_ebenezer: {
    id: "sm_ebenezer",
    steps: [
      ...open,
      cam(v(122, 33, 100), v(130, 26, 90), 3),
      { t: "effect", kind: "holy", at: v(130, 27, 90), dur: 5 },
      { t: "music", track: "learn" },
      say("Narrador", "Samuel crescia, e o Senhor era com ele e não deixou cair em terra nenhuma de todas as suas palavras. Todo o Israel, desde Dã até Berseba, soube que Samuel estava confirmado como profeta do Senhor.", "1 Samuel 3:19–20"),
      say("Narrador", "Mais tarde, depois de o Senhor dar a vitória a Israel, Samuel tomou uma pedra e a pôs entre Mispá e Sem, e lhe chamou Ebenézer, dizendo:", "1 Samuel 7:12"),
      say("Samuel", "Até aqui nos ajudou o Senhor.", "1 Samuel 7:12"),
      fade(1, 2.5),
      ...close,
    ],
  },

  // ---------------- SAUL ----------------
  sl_intro: {
    id: "sl_intro",
    steps: [
      { t: "bars", on: true },
      { t: "call", fn: "holdCamera" },
      fade(1, 0.01),
      day,
      { t: "music", track: "saul" },
      cap("SAUL", 3, "1 Samuel 8–15"),
      at(v(22, 36, 128), v(30, 27, 112)),
      fade(0, 2),
      say("Narrador", "O povo disse a Samuel: constitui-nos um rei, para que nos governe, como o têm todas as nações. O Senhor disse a Samuel: ouve a voz do povo; não te rejeitaram a ti, mas a mim, para eu não reinar sobre eles.", "1 Samuel 8:5–7"),
      say("Narrador", "Havia um homem de Benjamim, de nome Quis, forte e valente. Tinha um filho chamado Saul, jovem e bonito; não havia outro mais bonito do que ele entre os filhos de Israel, e era mais alto do que todo o povo, do ombro para cima.", "1 Samuel 9:1–2"),
      say("Quis", "Perderam-se as jumentas de meu pai Quis. Toma contigo um dos moços e levanta-te; vai buscar as jumentas.", "1 Samuel 9:3"),
      cam(v(36, 33, 122), v(30, 27, 114), 4),
      { t: "bars", on: false },
      { t: "call", fn: "releaseCamera" },
    ],
  },
  sl_anoint: {
    id: "sl_anoint",
    steps: [
      ...open,
      cam(v(124, 33, 64), v(130, 27, 52), 3),
      { t: "effect", kind: "holy", at: v(130, 28, 52), dur: 6 },
      say("Narrador", "Samuel tomou um vaso de azeite, derramou-o sobre a cabeça de Saul, beijou-o e disse:", "1 Samuel 10:1"),
      say("Samuel", "Não é o Senhor que te ungiu por príncipe sobre a sua herança?", "1 Samuel 10:1"),
      say("Samuel", "O Espírito do Senhor se apossará de ti, e profetizarás com eles, e serás mudado em outro homem. Quando te sucederem estes sinais, faze o que te vier à mão, porque Deus é contigo.", "1 Samuel 10:6–7"),
      say("Narrador", "Quando Saul voltou as costas para sair de Samuel, Deus lhe mudou o coração, e todos aqueles sinais lhe sucederam naquele dia.", "1 Samuel 10:9"),
      ...close,
    ],
  },
  sl_king: {
    id: "sl_king",
    steps: [
      ...open,
      cam(v(144, 33, 118), v(152, 28, 104), 3),
      { t: "music", track: "learn" },
      say("Narrador", "Samuel expôs ao povo o direito do reino e o escreveu num livro, que pôs diante do Senhor. E Saul foi para a sua casa em Gibeá, e com ele foram os valentes cujo coração Deus tocara.", "1 Samuel 10:25–26"),
      fade(1, 2.5),
      ...close,
    ],
  },
  sl_jabes_intro: {
    id: "sl_jabes_intro",
    steps: [
      { t: "bars", on: true },
      { t: "call", fn: "holdCamera" },
      fade(1, 1.2, "Cerca de um mês depois…"),
      day,
      tp(58, 52, 0),
      at(v(66, 36, 58), v(60, 27, 30)),
      fade(0, 2),
      say("Narrador", "Naás, o amonita, subiu e acampou contra Jabes-Gileade. Os homens de Jabes disseram: faze aliança conosco, e te serviremos. Mas Naás impôs uma condição cruel e humilhante.", "1 Samuel 11:1–2"),
      say("Anciãos de Jabes", "Dá-nos sete dias para enviarmos mensageiros por todo o território de Israel; se não houver quem nos livre, nos entregaremos a ti.", "1 Samuel 11:3"),
      say("Narrador", "Quando Saul ouviu estas palavras, o Espírito de Deus se apossou dele, e a sua ira se acendeu muito. Convocou todo o Israel, e o temor do Senhor caiu sobre o povo, que saiu como um só homem.", "1 Samuel 11:6–7"),
      { t: "bars", on: false },
      { t: "call", fn: "releaseCamera" },
    ],
  },
  sl_jabes: {
    id: "sl_jabes",
    steps: [
      ...open,
      cam(v(60, 40, 56), v(64, 26, 26), 3),
      { t: "sfx", kind: "thunder" },
      say("Narrador", "Saul e o povo chegaram de madrugada e atacaram os amonitas até o calor do dia; os que escaparam se dispersaram, e dois deles não ficaram juntos.", "1 Samuel 11:11"),
      say("Saul", "Hoje ninguém será morto, porque hoje o Senhor operou salvamento em Israel.", "1 Samuel 11:13"),
      say("Samuel", "Vinde, vamos a Gilgal e renovemos ali o reino.", "1 Samuel 11:14"),
      say("Narrador", "Foram a Gilgal, e ali fizeram Saul rei perante o Senhor.", "1 Samuel 11:15"),
      fade(1, 2),
      ...close,
    ],
  },
  sl_end: {
    id: "sl_end",
    steps: [
      ...open,
      cam(v(164, 33, 56), v(170, 27, 42), 3),
      { t: "music", track: "saul_triste" },
      say("Narrador", "Samuel virou as costas para sair, e Saul lhe agarrou a orla do manto, que se rasgou.", "1 Samuel 15:27"),
      say("Samuel", "O Senhor rasgou de ti hoje o reino de Israel e o deu a teu próximo, que é melhor do que tu.", "1 Samuel 15:28"),
      say("Narrador", "Samuel não viu mais a Saul até o dia da sua morte, mas chorava por ele. E o Senhor se arrependeu de ter posto Saul como rei sobre Israel.", "1 Samuel 15:35"),
      say("Senhor", "Até quando terás pena de Saul? Enche o teu chifre de azeite e vai; envio-te a Jessé, o belemita.", "1 Samuel 16:1"),
      fade(1, 2.5),
      ...close,
    ],
  },

  // ---------------- DAVI, O PASTOR ----------------
  dp_intro: {
    id: "dp_intro",
    steps: [
      { t: "bars", on: true },
      { t: "call", fn: "holdCamera" },
      fade(1, 0.01),
      day,
      { t: "music", track: "davi" },
      cap("DAVI, O PASTOR", 3, "1 Samuel 16–17"),
      at(v(16, 36, 96), v(22, 27, 76)),
      fade(0, 2),
      say("Narrador", "Samuel tinha chorado por Saul, mas o Senhor o mandou a Belém, com o chifre cheio de azeite, escolher um rei entre os filhos de Jessé.", "1 Samuel 16:1"),
      cam(v(18, 33, 90), v(22, 27, 76), 4),
      { t: "bars", on: false },
      { t: "call", fn: "releaseCamera" },
    ],
  },
  dp_anoint: {
    id: "dp_anoint",
    steps: [
      ...open,
      cam(v(76, 34, 84), v(84, 27, 68), 3),
      { t: "npcEnter", npc: "samuel", mob: "samuel", at: { x: 80, z: 72 } },
      { t: "npcEnter", npc: "jesse", mob: "jesse", at: { x: 78, z: 70 } },
      say("Narrador", "Samuel tomou o chifre do azeite e ungiu Davi no meio de seus irmãos.", "1 Samuel 16:13"),
      { t: "effect", kind: "holy", at: v(84, 29, 68), dur: 6 },
      say("Narrador", "E, daquele dia em diante, o Espírito do Senhor se apossou de Davi. Samuel se levantou e foi a Ramá.", "1 Samuel 16:13"),
      { t: "npcExit", npc: "samuel" },
      { t: "npcExit", npc: "jesse" },
      ...close,
    ],
  },
  dp_beast: {
    id: "dp_beast",
    steps: [
      ...open,
      cam(v(78, 34, 82), v(88, 27, 62), 3),
      { t: "npcEnter", npc: "leao", mob: "leao", at: { x: 98, z: 60 } },
      { t: "npcEnter", npc: "urso", mob: "urso", at: { x: 103, z: 67 } },
      say("Davi", "Quando o teu servo apascentava as ovelhas de seu pai, e vinha um leão ou um urso e tomava um cordeiro do rebanho, eu saía atrás dele, ferindo-o, e livrava o cordeiro da sua boca.", "1 Samuel 17:34–35"),
      { t: "npcGo", npc: "davi", to: { x: 96, z: 62 }, speed: 3.6, wait: true },
      { t: "effect", kind: "dust", at: v(98, 26, 62), dur: 3 },
      { t: "npcExit", npc: "leao" },
      { t: "npcExit", npc: "urso" },
      { t: "npcGo", npc: "davi", to: { x: 84, z: 68 }, speed: 3, wait: true },
      say("Davi", "O Senhor, que me livrou da pata do leão e da pata do urso, me livrará também.", "1 Samuel 17:37"),
      { t: "bars", on: false },
      { t: "call", fn: "releaseCamera" },
    ],
  },
  dp_palace: {
    id: "dp_palace",
    steps: [
      { t: "bars", on: true },
      { t: "call", fn: "holdCamera" },
      fade(1, 1.2, "Em Gibeá, no palácio do rei…"),
      day,
      tp(146, 56, Math.PI),
      at(v(156, 36, 62), v(146, 29, 40)),
      fade(0, 2),
      say("Narrador", "O Espírito do Senhor se retirou de Saul, e um espírito mau o atormentava. Os servos do rei procuravam alguém que o ajudasse.", "1 Samuel 16:14–16"),
      { t: "bars", on: false },
      { t: "call", fn: "releaseCamera" },
    ],
  },
  dp_harp: {
    id: "dp_harp",
    steps: [
      ...open,
      cam(v(146, 31, 52), v(146, 29, 38), 3),
      { t: "music", track: "davi_harpa" },
      { t: "effect", kind: "sparkle", at: v(146, 30, 40), dur: 8 },
      say("Narrador", "Quando o espírito mau, da parte de Deus, vinha sobre Saul, Davi tomava a harpa e a tocava com a mão; então Saul sentia alívio e se achava melhor, e o espírito mau se retirava dele.", "1 Samuel 16:23"),
      say("Narrador", "Davi voltava para as ovelhas de seu pai, em Belém, mas o Senhor continuava com ele.", "1 Samuel 16:18; 17:15"),
      fade(1, 2.5),
      ...close,
    ],
  },
};

// ====================================================================== CARTÕES "VOCÊ APRENDEU"
export const REINO_LEARN: Record<string, LearnCard> = {
  samuel: {
    title: "SAMUEL",
    what: "Ana, que não tinha filhos, orou no santuário de Siló e prometeu dedicar a Deus o filho que pedia. Deus a ouviu, e nasceu Samuel, que desde pequeno serviu ao Senhor ao lado do sacerdote Eli. Numa noite, Deus o chamou três vezes, e Eli o ensinou a responder: fala, Senhor, que o teu servo ouve. Samuel se tornou profeta de Israel e levantou a pedra de Ebenézer: até aqui nos ajudou o Senhor.",
    book: "1 Samuel",
    ref: "1 Samuel 1–3; 7:12",
    characters: ["Ana", "Eli", "Samuel", "Elcana", "Deus"],
    concepts: ["Oração", "Ouvir a voz de Deus", "Dedicação", "Gratidão: Ebenézer"],
    gameNote: "O Senhor chamou Samuel quatro vezes na noite: três vezes ele correu a Eli, e na quarta respondeu a Deus. A pedra de Ebenézer, em 1 Samuel 7, foi posta mais tarde, depois de uma vitória; o jogo a mostra aqui no fim para fechar o capítulo.",
  },
  saul: {
    title: "SAUL",
    what: "Israel pediu um rei como as outras nações. Deus escolheu Saul, jovem alto e humilde, que procurava as jumentas do pai. Samuel o ungiu, e Saul, que se escondera entre a bagagem, foi aclamado rei em Mispá. Ele livrou Jabes-Gileade, mas depois desobedeceu a Deus, poupando o que devia ser destruído. Samuel disse: o obedecer é melhor do que o sacrificar. O reino foi tirado de Saul.",
    book: "1 Samuel",
    ref: "1 Samuel 8–15",
    characters: ["Saul", "Samuel", "Quis", "Naás", "Deus"],
    concepts: ["Um rei pedido pelo povo", "Humildade", "Obediência", "Consequência da desobediência"],
    gameNote: "O livro de 1 Samuel conta muita coisa entre estes episódios (batalhas contra os filisteus, Jônatas e outras). Aqui ficam só os momentos que marcam o começo e a queda do reinado de Saul.",
  },
  davi_pastor: {
    title: "DAVI, O PASTOR",
    what: "Deus rejeitou Saul e mandou Samuel a Belém ungir um novo rei entre os filhos de Jessé. Sete filhos passaram, mas Deus disse que não olha para a aparência: o Senhor olha o coração. Davi, o mais novo, estava no campo com as ovelhas, e foi ungido. O Espírito do Senhor veio sobre ele. Davi, que defendia o rebanho contra o leão e o urso, foi chamado ao palácio para tocar harpa e acalmar o rei Saul.",
    book: "1 Samuel",
    ref: "1 Samuel 16",
    characters: ["Davi", "Samuel", "Jessé", "Saul", "Os irmãos de Davi"],
    concepts: ["Deus olha o coração", "Fidelidade nas coisas pequenas", "Unção", "A música e a presença de Deus"],
    gameNote: "O leão e o urso são contados por Davi só mais tarde, em 1 Samuel 17:34–37, antes de enfrentar Golias; o jogo mostra essa lembrança aqui, no pasto. A Bíblia fala de oito filhos de Jessé (1 Samuel 17:12).",
  },
};
