import { LIBRARY_UNITS } from "./library.generated";
import type { Exercise, Lesson, RawExercise, Roleplay, Unit } from "./types";

// Conteúdo do Babel, fase 1: nível A1 (unidades 1 a 4). Escrito para o ELOS (adolescentes brasileiros);
// não reproduz lições de nenhum outro curso. Explicações e instruções em português; o que se aprende, em inglês.

const mc = (q: string, opts: string[], a: number, ex: string, why?: (string | null)[], say?: string): RawExercise => ({ k: "mc", q, opts, a, ex, why, say });
const hear = (say: string, opts: string[], a: number, ex: string): RawExercise => ({ k: "mc", q: "Toque no que você ouviu", opts, a, ex, say });
const tr = (pt: string, ans: string[], bank: string[], ex: string): RawExercise => ({ k: "tr", pt, ans, bank, ex });
const ty = (prompt: string, ans: string[], ex: string, hint?: string): RawExercise => ({ k: "ty", prompt, ans, ex, hint });
const mt = (pairs: [string, string][], ex: string): RawExercise => ({ k: "mt", pairs, ex });
const ls = (say: string, ans: string[], ex: string): RawExercise => ({ k: "ls", say, ans, ex });

const L = (unit: number, n: number, title: string, raw: RawExercise[]): Lesson => ({
  id: `u${unit}l${n}`,
  unit,
  n,
  title,
  exercises: raw.map((e, i) => ({ ...e, id: `u${unit}l${n}e${i + 1}` }) as Exercise),
});

export const UNITS: Unit[] = [
  {
    n: 1,
    title: "Oi, tudo bem?",
    emoji: "👋",
    level: "A1",
    about: "Cumprimentos, apresentações e boas maneiras.",
    roleplay: "retiro",
    lessons: [
      L(1, 1, "Cumprimentos", [
        mc("Como se diz “Olá” em inglês?", ["Hello", "Goodbye", "Thanks", "Sorry"], 0, "“Hello” é o cumprimento mais comum. “Goodbye” é tchau, “Thanks” é obrigado e “Sorry” é desculpa.", [null, "“Goodbye” significa tchau.", "“Thanks” significa obrigado.", "“Sorry” significa desculpa."]),
        mt([["Hello", "Olá"], ["Goodbye", "Tchau"], ["Thanks", "Obrigado"], ["Please", "Por favor"]], "Quatro palavras para começar: Hello (olá), Goodbye (tchau), Thanks (obrigado) e Please (por favor)."),
        tr("Bom dia", ["Good morning"], ["Good", "morning", "night", "afternoon"], "“Good morning” é usado até o meio-dia. À tarde: “Good afternoon”. À noite: “Good evening”. Antes de dormir: “Good night”."),
        mc("Você chega num encontro à noite. Você diz: “Good ___”.", ["morning", "evening", "afternoon", "breakfast"], 1, "Ao chegar à noite usamos “Good evening”. “Good night” é para se despedir antes de dormir.", ["“Morning” é de manhã.", null, "“Afternoon” é de tarde.", "“Breakfast” é o café da manhã."]),
        ty("Boa tarde", ["Good afternoon"], "“Good afternoon” = boa tarde. A palavra “afternoon” é tarde.", "Cumprimento da tarde"),
        ls("Hello, my friend!", ["Hello my friend", "Hello friend"], "Você ouviu: “Hello, my friend!” (Olá, meu amigo!)."),
        hear("Goodbye", ["Hello", "Goodbye", "Thanks", "Please"], 1, "“Goodbye” é tchau. Um jeito mais curto e informal é “Bye”."),
        ty("Diga “oi” de um jeito informal", ["Hi", "Hello", "Hey"], "“Hi” e “Hey” são mais informais; “Hello” serve para qualquer situação.", "3 letras ou 5 letras"),
        tr("Tchau, até logo", ["Goodbye see you later", "Bye see you later"], ["Goodbye", "see", "you", "later", "hello", "morning"], "“See you later” = até logo. “Bye” é um jeito curto de dizer tchau."),
      ]),
      L(1, 2, "Meu nome é...", [
        mc("Como se pergunta “Qual é o seu nome?”", ["What is your name?", "How old are you?", "Where are you?", "Who is he?"], 0, "“What is your name?” (ou “What’s your name?”) pergunta o nome.", [null, "“How old are you?” pergunta a idade.", "“Where are you?” pergunta onde você está.", "“Who is he?” pergunta quem é ele."]),
        tr("Meu nome é Ana", ["My name is Ana", "My name's Ana", "I am Ana", "I'm Ana"], ["My", "name", "is", "Ana", "your", "am", "are"], "“My name is...” é o jeito mais comum de dizer o nome. “I am...” também serve."),
        ty("Responda “How are you?” dizendo que está bem", ["I am fine", "I'm fine", "I am good", "I'm good", "I am well", "I'm well", "Fine", "Good"], "Para dizer que está bem: “I’m fine” ou “I’m good”. “Fine” sozinho também vale.", "I’m ..."),
        mc("How are you? — I’m ___, thanks.", ["fine", "name", "Brazil", "book"], 0, "“Fine” significa bem. É a resposta mais comum para “How are you?”.", [null, "“Name” é nome.", "“Brazil” é Brasil.", "“Book” é livro."]),
        mt([["How are you?", "Como você está?"], ["I’m fine", "Estou bem"], ["What’s your name?", "Qual é o seu nome?"], ["My name is...", "Meu nome é..."]], "Essas quatro frases aparecem em toda primeira conversa."),
        ls("What is your name?", ["What is your name", "What's your name"], "Você ouviu: “What is your name?” (Qual é o seu nome?)."),
        hear("I am fine thanks", ["I am fine, thanks", "I am hungry, thanks", "I am tired, thanks", "I am late, thanks"], 0, "“Fine” é bem. Hungry é com fome, tired é cansado e late é atrasado."),
        ty("Meu nome é Sam", ["My name is Sam", "My name's Sam", "I am Sam", "I'm Sam"], "Mesma estrutura: “My name is” + nome.", "My name ..."),
        tr("E você?", ["And you"], ["And", "you", "your", "are"], "“And you?” devolve a pergunta de um jeito simples e educado."),
      ]),
      L(1, 3, "Prazer em conhecer", [
        mc("Qual frase significa “Prazer em conhecer você”?", ["Nice to meet you", "See you later", "Thank you", "Good night"], 0, "“Nice to meet you” é dito quando conhecemos alguém.", [null, "“See you later” é até logo.", "“Thank you” é obrigado.", "“Good night” é boa noite (ao dormir)."]),
        tr("De onde você é?", ["Where are you from"], ["Where", "are", "you", "from", "is", "what"], "“Where are you from?” pergunta a origem. Note a ordem: Where + are + you + from."),
        tr("Eu sou do Brasil", ["I am from Brazil", "I'm from Brazil"], ["I", "am", "from", "Brazil", "are", "in"], "“I’m from” + país. Nomes de países começam com letra maiúscula."),
        ty("🇧🇷", ["Brazil"], "Brazil = Brasil. Nomes de países têm letra maiúscula.", "Que país é este?"),
        mc("“Thank you!” — “___.”", ["You’re welcome", "Good morning", "I’m fine", "Goodbye"], 0, "“You’re welcome” = de nada. É a resposta para “Thank you”.", [null, "“Good morning” é bom dia.", "“I’m fine” é estou bem.", "“Goodbye” é tchau."]),
        mt([["Please", "Por favor"], ["Thank you", "Obrigado(a)"], ["Sorry", "Desculpa"], ["You’re welcome", "De nada"]], "Palavras de boas maneiras: nunca saem de moda."),
        ls("Nice to meet you", ["Nice to meet you"], "Você ouviu: “Nice to meet you.” (Prazer em conhecer você.)"),
        ty("Responda em inglês: “Thank you!”", ["You are welcome", "You're welcome"], "“You’re welcome” = de nada.", "Y... w..."),
        tr("Prazer em conhecer você, Sam", ["Nice to meet you Sam"], ["Nice", "to", "meet", "you", "Sam", "see", "hello"], "O nome da pessoa vem no fim da frase."),
      ]),
    ],
  },
  {
    n: 2,
    title: "Eu e minha família",
    emoji: "👨‍👩‍👧",
    level: "A1",
    about: "Idade, números, família e amigos.",
    roleplay: "grupo",
    lessons: [
      L(2, 1, "Quem sou eu", [
        mc("Complete: I ___ fifteen years old.", ["am", "is", "are", "be"], 0, "Com “I” usamos “am”. Em inglês a idade usa o verbo “ser”: I am fifteen (não “I have fifteen”).", [null, "“is” é para he/she/it.", "“are” é para you/we/they.", "“be” sozinho não serve aqui."]),
        tr("Eu tenho quinze anos", ["I am fifteen", "I'm fifteen", "I am fifteen years old", "I'm fifteen years old", "I am 15", "I'm 15"], ["I", "am", "fifteen", "years", "old", "have", "is"], "Em inglês, “ter 15 anos” é “ser 15 anos”: I am fifteen."),
        mt([["one", "um"], ["five", "cinco"], ["ten", "dez"], ["twelve", "doze"]], "Números: one (1), five (5), ten (10), twelve (12)."),
        ty("Diga que você tem 14 anos", ["I am fourteen", "I'm fourteen", "I am 14", "I'm 14", "I am fourteen years old", "I'm fourteen years old"], "“I am fourteen.” (14 = fourteen).", "I am ..."),
        hear("I am sixteen", ["fifteen", "sixteen", "seventeen", "fourteen"], 1, "Atenção: “sixteen” (16) e “sixty” (60) soam parecido, mas o acento muda."),
        ls("How old are you", ["How old are you"], "“How old are you?” pergunta a idade."),
        ty("17 (escreva por extenso)", ["seventeen"], "17 = seventeen.", "se..."),
        tr("Quantos anos você tem?", ["How old are you"], ["How", "old", "are", "you", "is", "years"], "“How old are you?” — literalmente “quão velho você é?”."),
      ]),
      L(2, 2, "Minha família", [
        mt([["mother", "mãe"], ["father", "pai"], ["brother", "irmão"], ["sister", "irmã"]], "Família: mother, father, brother, sister."),
        ty("irmã", ["sister"], "sister = irmã. brother = irmão.", "s..."),
        mc("My ___ is my father’s mother.", ["grandmother", "sister", "aunt", "friend"], 0, "A mãe do seu pai é sua avó: grandmother.", [null, "“sister” é irmã.", "“aunt” é tia.", "“friend” é amigo."]),
        tr("Esta é a minha mãe", ["This is my mother", "This is my mom"], ["This", "is", "my", "mother", "mom", "your", "these"], "“This is my...” apresenta alguém. “Mom” é o jeito mais informal de dizer mãe."),
        mc("She is my sister. ___ name is Julia.", ["Her", "His", "My", "Their"], 0, "Para uma mulher usamos “her” (dela). Para um homem, “his” (dele).", [null, "“His” é dele.", "“My” é meu: “My name is...” seria o seu nome.", "“Their” é deles."]),
        ls("This is my family", ["This is my family"], "“Family” é família."),
        tr("Eu tenho um irmão", ["I have a brother"], ["I", "have", "a", "brother", "am", "an"], "Para dizer o que você tem, use “I have”. “A” vem antes de consoante: a brother."),
        ty("pai", ["father", "dad"], "father = pai (formal); dad = papai (informal).", "f... ou d..."),
      ]),
      L(2, 3, "Amigos e igreja", [
        mc("My friend Paul is 15. ___ is my classmate.", ["He", "She", "They", "It"], 0, "Paul é homem: usamos “he” (ele). Mulher: “she”. Mais de uma pessoa: “they”.", [null, "“She” é para mulher.", "“They” é para várias pessoas.", "“It” é para coisas e animais."]),
        tr("Ela é minha amiga", ["She is my friend", "She's my friend"], ["She", "is", "my", "friend", "he", "are"], "“She is” = ela é. A forma curta é “she’s”."),
        mc("Anna and Luke are at church. ___ are friends.", ["They", "He", "She", "We"], 0, "Duas pessoas: “they” (eles/elas).", [null, "“He” é só um homem.", "“She” é só uma mulher.", "“We” inclui quem fala."]),
        mt([["friend", "amigo(a)"], ["church", "igreja"], ["youth group", "grupo de jovens"], ["pastor", "pastor"]], "Vocabulário do dia a dia na igreja."),
        ty("Eles são meus amigos", ["They are my friends", "They're my friends"], "“They are” = eles são. Amigos no plural: friends.", "They ..."),
        ls("He is my friend", ["He is my friend", "He's my friend"], "“He is my friend.” (Ele é meu amigo.)"),
        mc("We go to ___ on Sunday.", ["church", "school", "bed", "work"], 0, "Muita gente vai à igreja no domingo: church.", [null, "“school” é escola.", "“bed” é cama.", "“work” é trabalho."]),
        tr("Nós somos amigos", ["We are friends", "We're friends"], ["We", "are", "friends", "is", "they", "friend"], "“We are” = nós somos. Forma curta: “we’re”."),
      ]),
    ],
  },
  {
    n: 3,
    title: "Na escola",
    emoji: "🎒",
    level: "A1",
    about: "Material, matérias, dias da semana e lugares.",
    roleplay: "escola",
    lessons: [
      L(3, 1, "Meu material", [
        ty("📖", ["book"], "book = livro.", "Está na sua mochila"),
        ty("✏️", ["pencil"], "pencil = lápis. pen = caneta.", "p..."),
        ty("🎒", ["backpack", "bag"], "backpack = mochila.", "b..."),
        mt([["book", "livro"], ["pen", "caneta"], ["notebook", "caderno"], ["desk", "carteira"]], "Material de sala: book, pen, notebook, desk."),
        mc("This is ___ apple. (uma maçã)", ["an", "a", "the", "two"], 0, "Usamos “an” antes de som de vogal: an apple, an orange. “A” vem antes de consoante: a book.", [null, "“a” é para consoante.", "“the” é o/a, não um/uma.", "“two” é dois."]),
        tr("Isto é um livro", ["This is a book"], ["This", "is", "a", "book", "an", "are"], "“This is a...” para algo perto de você."),
        mc("That is ___ pen.", ["a", "an", "two", "any"], 0, "“Pen” começa com consoante: a pen. “That” é para algo mais longe.", [null, "“an” seria para vogal.", "“two” é dois.", "“any” não cabe aqui."]),
        ls("This is my notebook", ["This is my notebook"], "“Notebook” é caderno."),
      ]),
      L(3, 2, "Matérias e dias", [
        mt([["math", "matemática"], ["science", "ciências"], ["history", "história"], ["English", "inglês"]], "Matérias: math, science, history, English."),
        mc("Qual dia vem depois de Monday?", ["Tuesday", "Sunday", "Friday", "Saturday"], 0, "Ordem: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday.", [null, "“Sunday” é domingo.", "“Friday” é sexta.", "“Saturday” é sábado."]),
        tr("Eu tenho aula de matemática", ["I have math class", "I have a math class"], ["I", "have", "math", "class", "a", "am"], "“Class” é aula. “I have” = eu tenho."),
        ty("segunda-feira", ["Monday"], "Monday = segunda-feira. Dias da semana começam com maiúscula.", "M..."),
        ty("sexta-feira", ["Friday"], "Friday = sexta-feira.", "F..."),
        ls("I like science", ["I like science"], "“I like” = eu gosto de."),
        mc("I ___ history class on Wednesday.", ["have", "am", "has", "is"], 0, "Com “I” usamos “have”. (“Has” é para he/she/it.)", [null, "“am” é do verbo ser.", "“has” é para he/she/it.", "“is” é do verbo ser."]),
        tr("Eu gosto de inglês", ["I like English"], ["I", "like", "English", "likes", "am", "love"], "“English” sempre começa com letra maiúscula."),
      ]),
      L(3, 3, "Onde fica?", [
        mc("Como se pergunta “Onde fica a biblioteca?”", ["Where is the library?", "What is the library?", "Who is the library?", "When is the library?"], 0, "“Where” pergunta lugar. “What” é o quê, “Who” é quem, “When” é quando.", [null, "“What” pergunta o quê.", "“Who” pergunta quem.", "“When” pergunta quando."]),
        tr("Onde fica o banheiro?", ["Where is the bathroom"], ["Where", "is", "the", "bathroom", "are", "what"], "“Where is the...?” serve para perguntar onde fica qualquer lugar."),
        mc("What time is it? — It is ___.", ["three o’clock", "Monday", "a pen", "my sister"], 0, "Para horas: “It is three o’clock.” (São três horas.)", [null, "“Monday” é dia, não hora.", "“a pen” é uma caneta.", "“my sister” é minha irmã."]),
        mt([["library", "biblioteca"], ["classroom", "sala de aula"], ["bathroom", "banheiro"], ["teacher", "professor(a)"]], "Lugares e pessoas na escola."),
        ty("professora", ["teacher"], "teacher = professor ou professora.", "t..."),
        ls("Where is the classroom", ["Where is the classroom"], "“Classroom” é sala de aula."),
        mc("The teacher is ___ the classroom.", ["in", "at", "on", "under"], 0, "“In the classroom” = dentro da sala.", [null, "“at” é em, num ponto.", "“on” é sobre.", "“under” é embaixo."]),
        tr("A biblioteca está aqui", ["The library is here"], ["The", "library", "is", "here", "are", "there"], "“Here” é aqui; “there” é lá."),
      ]),
    ],
  },
  {
    n: 4,
    title: "Comida e pedidos",
    emoji: "🍕",
    level: "A1",
    about: "Comidas, gostos e como pedir educadamente.",
    roleplay: "lanchonete",
    lessons: [
      L(4, 1, "Comidas e bebidas", [
        ty("🍎", ["apple"], "apple = maçã.", "a..."),
        ty("💧", ["water"], "water = água.", "w..."),
        ty("🍕", ["pizza"], "pizza = pizza (mesma palavra!).", "p..."),
        ty("🍚", ["rice"], "rice = arroz.", "r..."),
        mt([["bread", "pão"], ["juice", "suco"], ["chicken", "frango"], ["milk", "leite"]], "Comidas e bebidas: bread, juice, chicken, milk."),
        hear("orange juice", ["orange juice", "apple juice", "water", "milk"], 0, "“Orange juice” = suco de laranja."),
        ls("I want some water", ["I want some water"], "“I want some water.” (Eu quero um pouco de água.)"),
        mc("“Rice” significa…", ["arroz", "feijão", "frango", "pão"], 0, "rice = arroz. Feijão é beans; frango é chicken; pão é bread.", [null, "Feijão é “beans”.", "Frango é “chicken”.", "Pão é “bread”."]),
      ]),
      L(4, 2, "Eu gosto de...", [
        tr("Eu gosto de pizza", ["I like pizza"], ["I", "like", "pizza", "likes", "am", "love"], "“I like” + o que você gosta."),
        tr("Eu não gosto de leite", ["I don't like milk", "I do not like milk"], ["I", "don't", "like", "milk", "not", "am", "doesn't"], "Para negar: “I don’t like...”. “Don’t” = do not."),
        mc("She ___ chocolate.", ["likes", "like", "liking", "am like"], 0, "Com he/she/it o verbo ganha -s: she likes.", [null, "Com “she” precisa do -s.", "“liking” não cabe aqui.", "“am like” está errado."]),
        ty("Eu quero água", ["I want water", "I want some water"], "“I want” = eu quero.", "I w..."),
        mc("I ___ like carrots. (eu não gosto)", ["don’t", "doesn’t", "am not", "not"], 0, "Com “I” usamos “don’t”. “Doesn’t” é para he/she/it.", [null, "“doesn’t” é para he/she/it.", "“am not” não combina com “like”.", "“not” sozinho não basta."]),
        ls("What is your favorite food", ["What is your favorite food", "What's your favorite food"], "“Favorite food” é comida favorita."),
        mt([["favorite", "favorito"], ["hungry", "com fome"], ["thirsty", "com sede"], ["delicious", "delicioso"]], "Para falar de comida e fome."),
        ty("Diga que você está com fome", ["I am hungry", "I'm hungry"], "“I’m hungry” = estou com fome.", "I’m h..."),
      ]),
      L(4, 3, "Pedindo e pagando", [
        mc("Você quer pedir um suco. O que diz?", ["Can I have a juice, please?", "Where is the juice?", "I am a juice.", "Juice are good."], 0, "“Can I have..., please?” é o jeito educado de pedir.", [null, "“Where is...?” pergunta onde fica.", "“I am a juice” significa “eu sou um suco”.", "A frase está gramaticalmente errada."]),
        tr("Posso pedir uma água, por favor?", ["Can I have a water please", "Can I have some water please"], ["Can", "I", "have", "a", "water", "please", "am", "some"], "“Please” (por favor) deixa o pedido educado."),
        mc("How ___ is it?", ["much", "many", "old", "long"], 0, "“How much” pergunta o preço.", [null, "“How many” é para contar coisas.", "“How old” é a idade.", "“How long” é o tamanho ou o tempo."]),
        mt([["How much is it?", "Quanto custa?"], ["Here you are", "Aqui está"], ["The bill, please", "A conta, por favor"], ["It’s five reais", "São cinco reais"]], "Frases para pagar."),
        ls("How much is the pizza", ["How much is the pizza"], "“How much is the pizza?” (Quanto custa a pizza?)"),
        ty("Peça a conta com educação", ["The bill please", "Can I have the bill please", "The check please", "Can I have the check please"], "“The bill, please” (inglês britânico) ou “the check, please” (americano).", "The b..."),
        tr("Aqui está", ["Here you are"], ["Here", "you", "are", "is", "your"], "“Here you are” é o que dizemos ao entregar algo."),
        hear("It is ten reais", ["five reais", "ten reais", "twenty reais", "two reais"], 1, "“Ten” é dez. Preste atenção: “ten” e “twenty” soam diferente."),
      ]),
    ],
  },
];

// Unidades 5 a 10 (A2 e B1): geradas a partir do Tatoeba por scripts/build-english-library.py
UNITS.push(...LIBRARY_UNITS.map((u): Unit => ({ n: u.n, title: u.title, emoji: u.emoji, level: u.level, about: u.about, lessons: u.lessons.map((l) => L(u.n, l.n, l.title, l.exercises)) })));

// Sem exercícios de listening (ouvir e digitar / ouvir e tocar). Filtra depois de gerar os ids, para não mexer nos ids dos demais.
const isListening = (e: Exercise) => e.k === "ls" || (e.k === "mc" && !!e.say);
for (const u of UNITS) for (const l of u.lessons) l.exercises = l.exercises.filter((e) => !isListening(e));

export const LESSONS: Record<string, Lesson> = Object.fromEntries(UNITS.flatMap((u) => u.lessons).map((l) => [l.id, l]));
export const ALL_EXERCISES: Record<string, Exercise> = Object.fromEntries(Object.values(LESSONS).flatMap((l) => l.exercises).map((e) => [e.id, e]));
export const LESSON_ORDER: string[] = UNITS.flatMap((u) => u.lessons.map((l) => l.id));

/** Nível Lendário de uma unidade: 10 exercícios variados das três lições. Sem errar. */
export function legendaryExercises(unit: number): Exercise[] {
  const u = UNITS.find((x) => x.n === unit);
  if (!u) return [];
  const pool = u.lessons.flatMap((l) => l.exercises).filter((e) => e.k !== "mt");
  // pega espalhado entre as lições, de forma estável
  return pool.filter((_, i) => i % Math.max(1, Math.floor(pool.length / 10)) === 0).slice(0, 10);
}

/** Teste de nivelamento: 2 perguntas (escolha ou digitar) da última lição de cada unidade. */
export function placementExercises(): Exercise[] {
  return UNITS.slice(0, 4).flatMap((u) => u.lessons[2].exercises.filter((e) => e.k === "mc" || e.k === "ty").slice(0, 2));
}
/** Pontos do teste (0 a 8) -> unidade inicial (1 a 4). */
export function placementUnit(correct: number): number {
  return correct >= 7 ? 4 : correct >= 5 ? 3 : correct >= 3 ? 2 : 1;
}

/** Cartas de palavras (imagem/emoji -> digitar a palavra): os exercícios "ty" cujo prompt é um emoji. */
const EMOJI = /^[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}️]+$/u;
export function wordCards(): Exercise[] {
  return Object.values(ALL_EXERCISES).filter((e) => e.k === "ty" && EMOJI.test(e.prompt));
}
/** Exercícios de ouvir (treino de audição). */
export function listeningPool(): Exercise[] {
  return Object.values(ALL_EXERCISES).filter((e) => e.k === "ls" || (e.k === "mc" && !!e.say));
}

// ------------------------------------------------------------------ conversas roteirizadas

export const ROLEPLAYS: Roleplay[] = [
  {
    id: "retiro",
    title: "Novo amigo no retiro",
    emoji: "⛺",
    unit: 1,
    who: { name: "Pedro", emoji: "🧑", role: "Colega do retiro" },
    intro: "Você chegou ao retiro de jovens e conheceu o Pedro. Vamos conversar!",
    turns: [
      {
        npc: { en: "Hi! I’m Pedro. What’s your name?", pt: "Oi! Eu sou o Pedro. Qual é o seu nome?" },
        you: "Diga o seu nome.",
        options: [
          { en: "My name is Sam.", q: 2, why: "Perfeito: frase completa." },
          { en: "Sam.", q: 1, why: "Entendem, mas a frase completa soa melhor: My name is Sam." },
          { en: "I am fine.", q: 0, why: "Ele perguntou seu nome, não como você está." },
        ],
        re: ["^(my name is|my name's|i am|i'm) [a-z]+$"],
        keys: [["my", "name"]],
        tip: "Responda com “My name is ...” (meu nome é).",
        model: "My name is Sam.",
      },
      {
        npc: { en: "Nice to meet you! How are you today?", pt: "Prazer em conhecer você! Como você está hoje?" },
        you: "Diga que está bem e devolva a pergunta.",
        options: [
          { en: "I’m fine, thanks. And you?", q: 2, why: "Ótimo: respondeu e devolveu a pergunta." },
          { en: "Fine.", q: 1, why: "Serve, mas soa seco. Tente: I’m fine, thanks." },
          { en: "Goodbye.", q: 0, why: "“Goodbye” é despedida." },
        ],
        ans: ["I am fine thanks and you", "I'm fine thanks and you", "I am fine thanks", "I'm fine thanks", "I am good", "I'm good", "I'm good thanks", "I am good thanks", "I am great", "I'm great"],
        keys: [["fine"], ["good"], ["great"], ["well"]],
        tip: "Use “I’m fine, thanks.” e devolva: “And you?”.",
        model: "I’m fine, thanks. And you?",
      },
      {
        npc: { en: "I’m great! Where are you from?", pt: "Eu estou ótimo! De onde você é?" },
        you: "Diga que você é do Brasil.",
        options: [
          { en: "I’m from Brazil.", q: 2, why: "Perfeito: I’m from + país." },
          { en: "Brazil.", q: 1, why: "Funciona, mas tente a frase inteira." },
          { en: "I’m fifteen years old.", q: 0, why: "Ele perguntou de onde você é, não a idade." },
        ],
        ans: ["I am from Brazil", "I'm from Brazil", "I am Brazilian", "I'm Brazilian"],
        keys: [["brazil"], ["brazilian"]],
        tip: "Use “I’m from” + o nome do país.",
        model: "I’m from Brazil.",
      },
      {
        npc: { en: "Cool! How old are you?", pt: "Legal! Quantos anos você tem?" },
        you: "Diga que você tem 15 anos.",
        options: [
          { en: "I’m fifteen.", q: 2, why: "Certo: em inglês, a idade usa o verbo “ser”." },
          { en: "Fifteen.", q: 1, why: "Serve, mas a frase completa soa melhor." },
          { en: "I have fifteen years.", q: 0, why: "Em inglês é “I am fifteen”, não “I have”." },
        ],
        ans: ["I am fifteen", "I'm fifteen", "I am 15", "I'm 15", "I am fifteen years old", "I'm fifteen years old", "I am 15 years old", "I'm 15 years old"],
        keys: [["fifteen"], ["15"]],
        tip: "Em inglês, idade usa “I am”: I’m fifteen.",
        model: "I’m fifteen years old.",
      },
      {
        npc: { en: "Let’s go to the youth group together!", pt: "Vamos juntos para o grupo de jovens!" },
        you: "Aceite o convite com educação.",
        options: [
          { en: "Sure! Thank you!", q: 2, why: "Simpático e educado." },
          { en: "Yes.", q: 1, why: "Serve, mas soa seco." },
          { en: "Goodbye.", q: 0, why: "“Goodbye” é despedida." },
        ],
        ans: ["Sure thank you", "Sure", "Okay thank you", "OK thank you", "Yes thank you", "Yes please", "Sure thanks", "Great thank you", "Thank you"],
        keys: [["yes"], ["sure"], ["ok"], ["okay"], ["thanks"], ["thank"]],
        tip: "Aceite com simpatia: “Sure! Thank you!”.",
        model: "Sure! Thank you!",
      },
    ],
  },
  {
    id: "grupo",
    title: "Convite para o grupo de jovens",
    emoji: "🎶",
    unit: 2,
    who: { name: "Ana", emoji: "👧", role: "Amiga da igreja" },
    intro: "A Ana apresenta o irmão dela e convida você para o grupo de jovens.",
    turns: [
      {
        npc: { en: "Hi! This is my brother, Luke.", pt: "Oi! Este é o meu irmão, o Luke." },
        you: "Cumprimente o Luke.",
        options: [
          { en: "Nice to meet you, Luke!", q: 2, why: "Perfeito." },
          { en: "Hello.", q: 1, why: "Serve! “Nice to meet you” soa mais caloroso." },
          { en: "Goodbye, Luke.", q: 0, why: "“Goodbye” é despedida." },
        ],
        ans: ["Nice to meet you Luke", "Nice to meet you", "Hello Luke", "Hi Luke"],
        keys: [["hello"], ["hi"], ["nice"]],
        tip: "Ao conhecer alguém: “Nice to meet you!”.",
        model: "Nice to meet you, Luke!",
      },
      {
        npc: { en: "Luke is sixteen. How old are you?", pt: "O Luke tem dezesseis. Quantos anos você tem?" },
        you: "Diga que você tem 15 anos.",
        options: [
          { en: "I’m fifteen.", q: 2, why: "Certo." },
          { en: "Fifteen.", q: 1, why: "Serve, mas prefira a frase completa." },
          { en: "I have fifteen.", q: 0, why: "Em inglês: I am fifteen." },
        ],
        ans: ["I am fifteen", "I'm fifteen", "I am 15", "I'm 15", "I am fifteen years old", "I'm fifteen years old"],
        keys: [["fifteen"], ["15"]],
        tip: "Idade: “I’m fifteen” (verbo ser).",
        model: "I’m fifteen years old.",
      },
      {
        npc: { en: "We go to youth group on Friday. Do you want to come?", pt: "Nós vamos ao grupo de jovens na sexta. Você quer ir?" },
        you: "Aceite o convite.",
        options: [
          { en: "Yes, I want to come!", q: 2, why: "Perfeito." },
          { en: "Yes.", q: 1, why: "Serve, mas demonstre mais ânimo." },
          { en: "No, I am hungry.", q: 0, why: "Não responde ao convite." },
        ],
        ans: ["Yes I want to come", "Yes I do", "Yes please", "Yes I want to", "Sure I want to come", "I want to come", "I would love to", "Yes I would love to"],
        keys: [["yes"], ["sure"]],
        tip: "Aceite com “Yes, I want to come!”.",
        model: "Yes, I want to come!",
      },
      {
        npc: { en: "Great! Can your friend come too?", pt: "Ótimo! O seu amigo pode ir também?" },
        you: "Diga que sim: é o seu amigo Paul.",
        options: [
          { en: "Yes, my friend Paul can come.", q: 2, why: "Perfeito." },
          { en: "Yes.", q: 1, why: "Serve, mas conte quem é." },
          { en: "She is my friend.", q: 0, why: "Paul é homem: “he”, não “she”." },
        ],
        ans: ["Yes he is my friend Paul", "Yes he can", "Yes Paul can come", "Yes my friend can come", "Yes he can come", "Yes my friend Paul can come"],
        keys: [["yes"]],
        tip: "Para um homem, “he”: “Yes, he can come.”",
        model: "Yes, my friend Paul can come.",
      },
      {
        npc: { en: "Awesome! See you on Friday!", pt: "Demais! Até sexta!" },
        you: "Despeça-se.",
        options: [
          { en: "See you on Friday! Goodbye!", q: 2, why: "Perfeito." },
          { en: "Bye.", q: 1, why: "Serve!" },
          { en: "Good morning.", q: 0, why: "“Good morning” é bom dia." },
        ],
        ans: ["See you on Friday", "See you Friday", "See you on Friday goodbye", "Goodbye see you on Friday", "Thank you see you on Friday", "Bye see you Friday"],
        keys: [["see", "friday"], ["bye"], ["goodbye"]],
        tip: "Despeça-se: “See you on Friday!”.",
        model: "See you on Friday! Goodbye!",
      },
    ],
  },
  {
    id: "escola",
    title: "Na escola nova",
    emoji: "🏫",
    unit: 3,
    who: { name: "Professora Lia", emoji: "👩‍🏫", role: "Professora" },
    intro: "É o seu primeiro dia numa escola nova. A professora Lia recebe você.",
    turns: [
      {
        npc: { en: "Good morning! Are you the new student?", pt: "Bom dia! Você é o novo aluno?" },
        you: "Cumprimente e diga que sim.",
        options: [
          { en: "Good morning! Yes, I am.", q: 2, why: "Perfeito." },
          { en: "Yes.", q: 1, why: "Serve, mas cumprimente também." },
          { en: "Goodbye!", q: 0, why: "“Goodbye” é despedida." },
        ],
        ans: ["Good morning yes I am", "Yes I am", "Good morning yes"],
        keys: [["yes"]],
        tip: "Responda à pergunta: “Yes, I am.”",
        model: "Good morning! Yes, I am.",
      },
      {
        npc: { en: "Welcome! What is your name?", pt: "Bem-vindo! Qual é o seu nome?" },
        you: "Diga o seu nome.",
        options: [
          { en: "My name is Sam.", q: 2, why: "Perfeito." },
          { en: "Sam.", q: 1, why: "Serve, mas a frase inteira soa melhor." },
          { en: "Thank you.", q: 0, why: "Ela perguntou o seu nome." },
        ],
        re: ["^(my name is|my name's|i am|i'm) [a-z]+$"],
        keys: [["my", "name"]],
        tip: "“My name is ...”.",
        model: "My name is Sam.",
      },
      {
        npc: { en: "Do you have your notebook?", pt: "Você tem o seu caderno?" },
        you: "Diga que sim.",
        options: [
          { en: "Yes, I have my notebook.", q: 2, why: "Perfeito." },
          { en: "Yes.", q: 1, why: "Serve." },
          { en: "No, I am not.", q: 0, why: "“I have” é o que você usa para “eu tenho”." },
        ],
        ans: ["Yes I have my notebook", "Yes I do", "Yes I have it", "Yes I have"],
        keys: [["yes"]],
        tip: "“Do you have...?” responde-se “Yes, I do.” ou “Yes, I have...”.",
        model: "Yes, I have my notebook.",
      },
      {
        npc: { en: "Great. Our English class is on Monday and Friday.", pt: "Ótimo. Nossa aula de inglês é na segunda e na sexta." },
        you: "Pergunte onde fica a biblioteca.",
        options: [
          { en: "Where is the library?", q: 2, why: "Perfeito." },
          { en: "Library?", q: 1, why: "Entendem, mas faça a pergunta inteira." },
          { en: "What is library?", q: 0, why: "Para lugares, use “Where is...?”" },
        ],
        ans: ["Where is the library", "Where is the library please", "Excuse me where is the library"],
        keys: [["where", "library"]],
        tip: "Para perguntar onde fica: “Where is the ...?”.",
        model: "Where is the library?",
      },
      {
        npc: { en: "It’s here, next to the classroom. See you later!", pt: "É aqui, ao lado da sala. Até logo!" },
        you: "Agradeça e se despeça.",
        options: [
          { en: "Thank you! See you later!", q: 2, why: "Perfeito." },
          { en: "Thanks.", q: 1, why: "Serve, mas despeça-se também." },
          { en: "Please.", q: 0, why: "“Please” é por favor; para agradecer: Thank you." },
        ],
        ans: ["Thank you see you later", "Thanks see you later", "Thank you goodbye", "Thanks bye", "Thank you bye"],
        keys: [["thank"], ["thanks"]],
        tip: "Agradeça (“Thank you”) e despeça-se (“See you later”).",
        model: "Thank you! See you later!",
      },
    ],
  },
  {
    id: "lanchonete",
    title: "Na lanchonete",
    emoji: "🍕",
    unit: 4,
    who: { name: "Dona Rita", emoji: "🧑‍🍳", role: "Atendente" },
    intro: "Depois do culto, você vai à lanchonete e quer pedir um lanche.",
    turns: [
      {
        npc: { en: "Hi! Welcome. What would you like?", pt: "Oi! Bem-vindo. O que você gostaria?" },
        you: "Peça uma pizza.",
        options: [
          { en: "Can I have a pizza, please?", q: 2, why: "Pedido educado e correto." },
          { en: "Pizza.", q: 1, why: "Entendem, mas peça com educação: Can I have...?" },
          { en: "I am a pizza.", q: 0, why: "“I am” é “eu sou”." },
        ],
        ans: ["Can I have a pizza please", "I would like a pizza please", "I'd like a pizza please", "I want a pizza please", "Can I have a pizza"],
        keys: [["pizza"]],
        tip: "“Can I have ..., please?” é o jeito educado de pedir.",
        model: "Can I have a pizza, please?",
      },
      {
        npc: { en: "Sure. Anything to drink?", pt: "Claro. Algo para beber?" },
        you: "Peça um suco de laranja.",
        options: [
          { en: "An orange juice, please.", q: 2, why: "Correto: “an” antes de som de vogal." },
          { en: "Juice.", q: 1, why: "Serve, mas peça com mais detalhe." },
          { en: "I don’t like.", q: 0, why: "Não é um pedido." },
        ],
        ans: ["An orange juice please", "Orange juice please", "Can I have an orange juice please", "I would like an orange juice please", "I'd like an orange juice please"],
        keys: [["juice"]],
        tip: "Antes de “orange” usamos “an”: an orange juice.",
        model: "An orange juice, please.",
      },
      {
        npc: { en: "Do you want some water too?", pt: "Quer um pouco de água também?" },
        you: "Diga que não, obrigado.",
        options: [
          { en: "No, thank you.", q: 2, why: "Educado e correto." },
          { en: "No.", q: 1, why: "Serve, mas soa seco." },
          { en: "Yes, I am.", q: 0, why: "“Yes, I am” não responde a essa pergunta." },
        ],
        ans: ["No thank you", "No thanks", "No I'm fine thank you", "No I am fine thank you"],
        keys: [["no"]],
        tip: "Para recusar com educação: “No, thank you.”",
        model: "No, thank you.",
      },
      {
        npc: { en: "Here you are! That is twenty reais.", pt: "Aqui está! São vinte reais." },
        you: "Agradeça e pague.",
        options: [
          { en: "Thank you! Here you are.", q: 2, why: "Perfeito." },
          { en: "Thanks.", q: 1, why: "Serve." },
          { en: "Money.", q: 0, why: "Diga uma frase: Thank you! Here you are." },
        ],
        ans: ["Thank you here you are", "Thank you", "Thanks here you are", "Thank you very much", "Thanks"],
        keys: [["thank"], ["thanks"]],
        tip: "Agradeça e entregue o dinheiro: “Thank you! Here you are.”",
        model: "Thank you! Here you are.",
      },
      {
        npc: { en: "Enjoy your meal! Bye!", pt: "Bom apetite! Tchau!" },
        you: "Despeça-se.",
        options: [
          { en: "Thank you! Goodbye!", q: 2, why: "Perfeito." },
          { en: "Bye.", q: 1, why: "Serve." },
          { en: "Hello.", q: 0, why: "“Hello” é para chegar, não para sair." },
        ],
        ans: ["Thank you goodbye", "Thanks bye", "Thank you bye", "Goodbye", "Bye", "Bye thank you"],
        keys: [["bye"], ["goodbye"]],
        tip: "Ao sair, diga “Goodbye!” ou “Bye!”.",
        model: "Thank you! Goodbye!",
      },
    ],
  },
];

export const ROLEPLAY_BY_ID: Record<string, Roleplay> = Object.fromEntries(ROLEPLAYS.map((r) => [r.id, r]));
