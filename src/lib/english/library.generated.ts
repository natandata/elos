// GERADO por scripts/build-english-library.py. Não edite à mão: rode o script de novo.
// Frases do Tatoeba.org (CC BY 2.0 FR). Palavras e explicações escritas para o Babel. Veja a tela de créditos.
import type { RawExercise } from "./types";

export type LibraryUnit = { n: number; title: string; emoji: string; level: "A1" | "A2" | "B1"; about: string; lessons: { n: number; title: string; exercises: RawExercise[] }[] };

export const LIBRARY_UNITS: LibraryUnit[] = [
 {
  "n": 5,
  "title": "Minha rotina",
  "emoji": "⏰",
  "level": "A2",
  "about": "O dia a dia: de manhã, na escola e os hábitos.",
  "lessons": [
   {
    "n": 1,
    "title": "De manhã",
    "exercises": [
     {
      "k": "mc",
      "q": "Como se diz “acordar” em inglês?",
      "opts": [
       "hurry",
       "wake up",
       "early",
       "teeth"
      ],
      "a": 1,
      "ex": "“wake up” significa “acordar”."
     },
     {
      "k": "mt",
      "pairs": [
       [
        "get up",
        "levantar"
       ],
       [
        "shower",
        "banho / chuveiro"
       ],
       [
        "breakfast",
        "café da manhã"
       ],
       [
        "brush",
        "escovar"
       ]
      ],
      "ex": "Essas palavras aparecem nas frases desta lição: get up = levantar; shower = banho / chuveiro; breakfast = café da manhã; brush = escovar."
     },
     {
      "k": "tr",
      "pt": "Escovo os dentes toda manhã.",
      "ans": [
       "I brush my teeth every morning."
      ],
      "bank": [
       "I",
       "brush",
       "my",
       "teeth",
       "every",
       "morning",
       "we'll",
       "shower",
       "or"
      ],
      "ex": "“I brush my teeth every morning.” = “Escovo os dentes toda manhã.”."
     },
     {
      "k": "mc",
      "q": "Toque no que você ouviu",
      "opts": [
       "early",
       "teeth",
       "bed",
       "wake up"
      ],
      "a": 1,
      "ex": "Você ouviu “teeth”, que significa “dentes”.",
      "say": "teeth"
     },
     {
      "k": "ty",
      "prompt": "cedo",
      "ans": [
       "early"
      ],
      "ex": "“cedo” em inglês é “early”.",
      "hint": "Começa com “e”"
     },
     {
      "k": "ls",
      "say": "He was tired, so he went to bed early.",
      "ans": [
       "He was tired, so he went to bed early."
      ],
      "ex": "Você ouviu: “He was tired, so he went to bed early.” (Ele estava cansado, então foi dormir cedo.)."
     },
     {
      "k": "mc",
      "q": "Fui para a cama cedo porque estava cansado.  →  I went to ___ early because I was tired.",
      "opts": [
       "morning",
       "bed",
       "was",
       "Hurry"
      ],
      "a": 1,
      "ex": "“I went to bed early because I was tired.” = “Fui para a cama cedo porque estava cansado.”."
     },
     {
      "k": "tr",
      "pt": "Tom toma um banho toda manhã antes do café da manhã.",
      "ans": [
       "Tom takes a shower every morning before breakfast."
      ],
      "bank": [
       "Tom",
       "takes",
       "a",
       "shower",
       "every",
       "morning",
       "before",
       "breakfast",
       "or",
       "because",
       "Hurry"
      ],
      "ex": "“Tom takes a shower every morning before breakfast.” = “Tom toma um banho toda manhã antes do café da manhã.”."
     },
     {
      "k": "ty",
      "prompt": "Se apresse ou vamos nos atrasar!",
      "ans": [
       "Hurry up or we'll be late!"
      ],
      "ex": "“Se apresse ou vamos nos atrasar!” em inglês: “Hurry up or we'll be late!”.",
      "hint": "Escreva a frase inteira"
     },
     {
      "k": "ls",
      "say": "I got up late this morning.",
      "ans": [
       "I got up late this morning."
      ],
      "ex": "Você ouviu: “I got up late this morning.” (Eu me levantei tarde hoje de manhã.)."
     }
    ]
   },
   {
    "n": 2,
    "title": "Na escola",
    "exercises": [
     {
      "k": "mc",
      "q": "Como se diz “escola” em inglês?",
      "opts": [
       "test",
       "book",
       "school",
       "homework"
      ],
      "a": 2,
      "ex": "“school” significa “escola”."
     },
     {
      "k": "mt",
      "pairs": [
       [
        "class",
        "aula / turma"
       ],
       [
        "teacher",
        "professor(a)"
       ],
       [
        "homework",
        "dever de casa"
       ],
       [
        "study",
        "estudar"
       ]
      ],
      "ex": "Essas palavras aparecem nas frases desta lição: class = aula / turma; teacher = professor(a); homework = dever de casa; study = estudar."
     },
     {
      "k": "tr",
      "pt": "Quem nesta turma vem a pé para a escola?",
      "ans": [
       "Who in this class walks to school?"
      ],
      "bank": [
       "Who",
       "in",
       "this",
       "class",
       "walks",
       "to",
       "school",
       "on",
       "I'm",
       "lesson"
      ],
      "ex": "“Who in this class walks to school?” = “Quem nesta turma vem a pé para a escola?”."
     },
     {
      "k": "mc",
      "q": "Toque no que você ouviu",
      "opts": [
       "lesson",
       "test",
       "homework",
       "book"
      ],
      "a": 0,
      "ex": "Você ouviu “lesson”, que significa “lição”.",
      "say": "lesson"
     },
     {
      "k": "ty",
      "prompt": "prova",
      "ans": [
       "test"
      ],
      "ex": "“prova” em inglês é “test”.",
      "hint": "Começa com “t”"
     },
     {
      "k": "ls",
      "say": "Some students walk to school. Others go by bus.",
      "ans": [
       "Some students walk to school. Others go by bus."
      ],
      "ex": "Você ouviu: “Some students walk to school. Others go by bus.” (Alguns alunos vão para a escola. Outros vão de ônibus.)."
     },
     {
      "k": "mc",
      "q": "Eu estudo na escola.  →  I ___ at school.",
      "opts": [
       "I'm",
       "walks",
       "study",
       "students"
      ],
      "a": 2,
      "ex": "“I study at school.” = “Eu estudo na escola.”."
     },
     {
      "k": "tr",
      "pt": "Eu sou um professor de escola.",
      "ans": [
       "I'm a school teacher."
      ],
      "bank": [
       "I'm",
       "a",
       "school",
       "teacher",
       "book",
       "test",
       "Others"
      ],
      "ex": "“I'm a school teacher.” = “Eu sou um professor de escola.”."
     },
     {
      "k": "ty",
      "prompt": "Pego o ônibus para a escola.",
      "ans": [
       "I take the bus to school."
      ],
      "ex": "“Pego o ônibus para a escola.” em inglês: “I take the bus to school.”.",
      "hint": "Escreva a frase inteira"
     },
     {
      "k": "ls",
      "say": "Books are my best friends.",
      "ans": [
       "Books are my best friends."
      ],
      "ex": "Você ouviu: “Books are my best friends.” (Os livros são meus melhores amigos.)."
     }
    ]
   },
   {
    "n": 3,
    "title": "Meus hábitos",
    "exercises": [
     {
      "k": "mc",
      "q": "Como se diz “sempre” em inglês?",
      "opts": [
       "sometimes",
       "day",
       "always",
       "sleep"
      ],
      "a": 2,
      "ex": "“always” significa “sempre”."
     },
     {
      "k": "mt",
      "pairs": [
       [
        "usually",
        "geralmente"
       ],
       [
        "often",
        "frequentemente"
       ],
       [
        "sometimes",
        "às vezes"
       ],
       [
        "never",
        "nunca"
       ]
      ],
      "ex": "Essas palavras aparecem nas frases desta lição: usually = geralmente; often = frequentemente; sometimes = às vezes; never = nunca."
     },
     {
      "k": "tr",
      "pt": "Eu comi pizza todos os dias na semana passada.",
      "ans": [
       "I ate pizza every day last week."
      ],
      "bank": [
       "I",
       "ate",
       "pizza",
       "every",
       "day",
       "last",
       "week",
       "After",
       "Did",
       "sleep"
      ],
      "ex": "“I ate pizza every day last week.” = “Eu comi pizza todos os dias na semana passada.”."
     },
     {
      "k": "mc",
      "q": "Toque no que você ouviu",
      "opts": [
       "week",
       "every",
       "always",
       "usually"
      ],
      "a": 1,
      "ex": "Você ouviu “every”, que significa “todo / cada”.",
      "say": "every"
     },
     {
      "k": "ty",
      "prompt": "dia",
      "ans": [
       "day"
      ],
      "ex": "“dia” em inglês é “day”.",
      "hint": "Começa com “d”"
     },
     {
      "k": "ls",
      "say": "After dinner, he usually sleeps.",
      "ans": [
       "After dinner, he usually sleeps."
      ],
      "ex": "Você ouviu: “After dinner, he usually sleeps.” (Após o jantar, ele costuma dormir.)."
     },
     {
      "k": "mc",
      "q": "Costumo dormir oito horas por dia.  →  I ___ sleep eight hours a day.",
      "opts": [
       "last",
       "usually",
       "sleeps",
       "weekend"
      ],
      "a": 1,
      "ex": "“I usually sleep eight hours a day.” = “Costumo dormir oito horas por dia.”."
     },
     {
      "k": "tr",
      "pt": "Você dormiu o dia todo?",
      "ans": [
       "Did you sleep all day?"
      ],
      "bank": [
       "Did",
       "you",
       "sleep",
       "all",
       "day",
       "usually",
       "ate",
       "has"
      ],
      "ex": "“Did you sleep all day?” = “Você dormiu o dia todo?”."
     },
     {
      "k": "ty",
      "prompt": "A semana tem sete dias.",
      "ans": [
       "A week has seven days."
      ],
      "ex": "“A semana tem sete dias.” em inglês: “A week has seven days.”.",
      "hint": "Escreva a frase inteira"
     },
     {
      "k": "ls",
      "say": "I never work on weekends.",
      "ans": [
       "I never work on weekends."
      ],
      "ex": "Você ouviu: “I never work on weekends.” (Eu nunca trabalho nos finais de semana.)."
     }
    ]
   }
  ]
 },
 {
  "n": 6,
  "title": "Onde fica?",
  "emoji": "🗺️",
  "level": "A2",
  "about": "Lugares da cidade, direções e transporte.",
  "lessons": [
   {
    "n": 1,
    "title": "Direções",
    "exercises": [
     {
      "k": "mc",
      "q": "Como se diz “rua” em inglês?",
      "opts": [
       "cross",
       "next",
       "street",
       "straight"
      ],
      "a": 2,
      "ex": "“street” significa “rua”."
     },
     {
      "k": "mt",
      "pairs": [
       [
        "corner",
        "esquina"
       ],
       [
        "left",
        "esquerda"
       ],
       [
        "right",
        "direita / certo"
       ],
       [
        "straight",
        "reto"
       ]
      ],
      "ex": "Essas palavras aparecem nas frases desta lição: corner = esquina; left = esquerda; right = direita / certo; straight = reto."
     },
     {
      "k": "tr",
      "pt": "Vire à esquerda na próxima esquina.",
      "ans": [
       "Turn left at the next corner."
      ],
      "bank": [
       "Turn",
       "left",
       "at",
       "the",
       "next",
       "corner",
       "need",
       "Do",
       "straight"
      ],
      "ex": "“Turn left at the next corner.” = “Vire à esquerda na próxima esquina.”."
     },
     {
      "k": "mc",
      "q": "Toque no que você ouviu",
      "opts": [
       "cross",
       "right",
       "near",
       "far"
      ],
      "a": 2,
      "ex": "Você ouviu “near”, que significa “perto”.",
      "say": "near"
     },
     {
      "k": "ty",
      "prompt": "longe",
      "ans": [
       "far"
      ],
      "ex": "“longe” em inglês é “far”.",
      "hint": "Começa com “f”"
     },
     {
      "k": "ls",
      "say": "When you get to Park Street, turn right.",
      "ans": [
       "When you get to Park Street, turn right."
      ],
      "ex": "Você ouviu: “When you get to Park Street, turn right.” (Quando você chegar na Park Street, vire à direita.)."
     },
     {
      "k": "mc",
      "q": "Fui embora imediatamente.  →  I ___ right away.",
      "opts": [
       "map",
       "wrong",
       "between",
       "left"
      ],
      "a": 3,
      "ex": "“I left right away.” = “Fui embora imediatamente.”."
     },
     {
      "k": "tr",
      "pt": "Vire à próxima esquerda.",
      "ans": [
       "Take the next left."
      ],
      "bank": [
       "Take",
       "the",
       "next",
       "left",
       "crossed",
       "street",
       "It's"
      ],
      "ex": "“Take the next left.” = “Vire à próxima esquerda.”."
     },
     {
      "k": "ty",
      "prompt": "É ali do lado.",
      "ans": [
       "It's right next door."
      ],
      "ex": "“É ali do lado.” em inglês: “It's right next door.”.",
      "hint": "Escreva a frase inteira"
     },
     {
      "k": "ls",
      "say": "I crossed the street.",
      "ans": [
       "I crossed the street."
      ],
      "ex": "Você ouviu: “I crossed the street.” (Eu atravessei a rua.)."
     }
    ]
   },
   {
    "n": 2,
    "title": "Na cidade",
    "exercises": [
     {
      "k": "mc",
      "q": "Como se diz “cidade” em inglês?",
      "opts": [
       "church",
       "city",
       "hospital",
       "park"
      ],
      "a": 1,
      "ex": "“city” significa “cidade”."
     },
     {
      "k": "mt",
      "pairs": [
       [
        "bank",
        "banco"
       ],
       [
        "station",
        "estação"
       ],
       [
        "hospital",
        "hospital"
       ],
       [
        "store",
        "loja"
       ]
      ],
      "ex": "Essas palavras aparecem nas frases desta lição: bank = banco; station = estação; hospital = hospital; store = loja."
     },
     {
      "k": "tr",
      "pt": "Estamos construindo uma ponte.",
      "ans": [
       "We're building a bridge."
      ],
      "bank": [
       "We're",
       "building",
       "a",
       "bridge",
       "market",
       "the",
       "Park"
      ],
      "ex": "“We're building a bridge.” = “Estamos construindo uma ponte.”."
     },
     {
      "k": "mc",
      "q": "Toque no que você ouviu",
      "opts": [
       "market",
       "bridge",
       "building",
       "station"
      ],
      "a": 0,
      "ex": "Você ouviu “market”, que significa “mercado”.",
      "say": "market"
     },
     {
      "k": "ty",
      "prompt": "parque",
      "ans": [
       "park"
      ],
      "ex": "“parque” em inglês é “park”.",
      "hint": "Começa com “p”"
     },
     {
      "k": "ls",
      "say": "Tom has a store on Park Street.",
      "ans": [
       "Tom has a store on Park Street."
      ],
      "ex": "Você ouviu: “Tom has a store on Park Street.” (O Tom tem uma loja na Park Street.)."
     },
     {
      "k": "mc",
      "q": "Há uma biblioteca em nossa cidade.  →  There is a ___ in our city.",
      "opts": [
       "our",
       "has",
       "library",
       "borrow"
      ],
      "a": 2,
      "ex": "“There is a library in our city.” = “Há uma biblioteca em nossa cidade.”."
     },
     {
      "k": "tr",
      "pt": "Tem um banco perto da estação?",
      "ans": [
       "Is there a bank near the station?"
      ],
      "bank": [
       "Is",
       "there",
       "a",
       "bank",
       "near",
       "the",
       "station",
       "Park",
       "library",
       "We're"
      ],
      "ex": "“Is there a bank near the station?” = “Tem um banco perto da estação?”."
     },
     {
      "k": "ty",
      "prompt": "O Tom tem um restaurante na Park Street.",
      "ans": [
       "Tom has a restaurant on Park Street."
      ],
      "ex": "“O Tom tem um restaurante na Park Street.” em inglês: “Tom has a restaurant on Park Street.”.",
      "hint": "Escreva a frase inteira"
     },
     {
      "k": "ls",
      "say": "I borrow them from the city library.",
      "ans": [
       "I borrow them from the city library."
      ],
      "ex": "Você ouviu: “I borrow them from the city library.” (Eu os pego emprestados na biblioteca da cidade.)."
     }
    ]
   },
   {
    "n": 3,
    "title": "Transporte",
    "exercises": [
     {
      "k": "mc",
      "q": "Como se diz “trem” em inglês?",
      "opts": [
       "plane",
       "airport",
       "taxi",
       "train"
      ],
      "a": 3,
      "ex": "“train” significa “trem”."
     },
     {
      "k": "mt",
      "pairs": [
       [
        "car",
        "carro"
       ],
       [
        "bike",
        "bicicleta"
       ],
       [
        "taxi",
        "táxi"
       ],
       [
        "subway",
        "metrô"
       ]
      ],
      "ex": "Essas palavras aparecem nas frases desta lição: car = carro; bike = bicicleta; taxi = táxi; subway = metrô."
     },
     {
      "k": "tr",
      "pt": "Eu vou andar de bicicleta.",
      "ans": [
       "I'll ride my bike."
      ],
      "bank": [
       "I'll",
       "ride",
       "my",
       "bike",
       "the",
       "I'd",
       "train"
      ],
      "ex": "“I'll ride my bike.” = “Eu vou andar de bicicleta.”."
     },
     {
      "k": "mc",
      "q": "Toque no que você ouviu",
      "opts": [
       "car",
       "plane",
       "ticket",
       "ride"
      ],
      "a": 2,
      "ex": "Você ouviu “ticket”, que significa “passagem / ingresso”.",
      "say": "ticket"
     },
     {
      "k": "ty",
      "prompt": "aeroporto",
      "ans": [
       "airport"
      ],
      "ex": "“aeroporto” em inglês é “airport”.",
      "hint": "Começa com “a”"
     },
     {
      "k": "ls",
      "say": "I can drive a car.",
      "ans": [
       "I can drive a car."
      ],
      "ex": "Você ouviu: “I can drive a car.” (Eu sei dirigir carro.)."
     },
     {
      "k": "mc",
      "q": "Ele comprou um bilhete de avião.  →  He bought a ___ ticket.",
      "opts": [
       "plane",
       "bike",
       "drive",
       "ride"
      ],
      "a": 0,
      "ex": "“He bought a plane ticket.” = “Ele comprou um bilhete de avião.”."
     },
     {
      "k": "tr",
      "pt": "Eu preciso de um taxi para o aeroporto.",
      "ans": [
       "I need a taxi to the airport."
      ],
      "bank": [
       "I",
       "need",
       "a",
       "taxi",
       "to",
       "the",
       "airport",
       "Are",
       "plane",
       "drive"
      ],
      "ex": "“I need a taxi to the airport.” = “Eu preciso de um taxi para o aeroporto.”."
     },
     {
      "k": "ty",
      "prompt": "Que tipo de carro você dirige?",
      "ans": [
       "What kind of car do you drive?"
      ],
      "ex": "“Que tipo de carro você dirige?” em inglês: “What kind of car do you drive?”.",
      "hint": "Escreva a frase inteira"
     },
     {
      "k": "ls",
      "say": "Are the train tickets expensive?",
      "ans": [
       "Are the train tickets expensive?"
      ],
      "ex": "Você ouviu: “Are the train tickets expensive?” (As passagens de trem são caras?)."
     }
    ]
   }
  ]
 },
 {
  "n": 7,
  "title": "O que você fez?",
  "emoji": "⏪",
  "level": "A2",
  "about": "Passado simples: ontem, verbos regulares e irregulares.",
  "lessons": [
   {
    "n": 1,
    "title": "Ontem",
    "exercises": [
     {
      "k": "mc",
      "q": "Como se diz “ontem” em inglês?",
      "opts": [
       "called",
       "yesterday",
       "last",
       "played"
      ],
      "a": 1,
      "ex": "“yesterday” significa “ontem”."
     },
     {
      "k": "mt",
      "pairs": [
       [
        "ago",
        "atrás (tempo)"
       ],
       [
        "last",
        "último / passado"
       ],
       [
        "was",
        "era / estava"
       ],
       [
        "were",
        "eram / estavam"
       ]
      ],
      "ex": "Essas palavras aparecem nas frases desta lição: ago = atrás (tempo); last = último / passado; was = era / estava; were = eram / estavam."
     },
     {
      "k": "tr",
      "pt": "Ontem foi o último dia de escola.",
      "ans": [
       "Yesterday was the last day of school."
      ],
      "bank": [
       "Yesterday",
       "was",
       "the",
       "last",
       "day",
       "of",
       "school",
       "you",
       "helped",
       "watched"
      ],
      "ex": "“Yesterday was the last day of school.” = “Ontem foi o último dia de escola.”."
     },
     {
      "k": "mc",
      "q": "Toque no que você ouviu",
      "opts": [
       "watched",
       "played",
       "visited",
       "helped"
      ],
      "a": 1,
      "ex": "Você ouviu “played”, que significa “jogou / tocou”.",
      "say": "played"
     },
     {
      "k": "ty",
      "prompt": "assistiu",
      "ans": [
       "watched"
      ],
      "ex": "“assistiu” em inglês é “watched”.",
      "hint": "Começa com “w”"
     },
     {
      "k": "ls",
      "say": "When was the last time you were sick?",
      "ans": [
       "When was the last time you were sick?"
      ],
      "ex": "Você ouviu: “When was the last time you were sick?” (Quando foi a última vez que você ficou doente?)."
     },
     {
      "k": "mc",
      "q": "A noite passada foi divertida.  →  ___ night was fun.",
      "opts": [
       "yesterday",
       "Last",
       "ago",
       "were"
      ],
      "a": 1,
      "ex": "“Last night was fun.” = “A noite passada foi divertida.”."
     },
     {
      "k": "tr",
      "pt": "Há quanto tempo foi isso?",
      "ans": [
       "How long ago was it?"
      ],
      "bank": [
       "How",
       "long",
       "ago",
       "was",
       "it",
       "time",
       "visited",
       "helped"
      ],
      "ex": "“How long ago was it?” = “Há quanto tempo foi isso?”."
     },
     {
      "k": "ty",
      "prompt": "Nós ficamos em último lugar.",
      "ans": [
       "We were in last place."
      ],
      "ex": "“Nós ficamos em último lugar.” em inglês: “We were in last place.”.",
      "hint": "Escreva a frase inteira"
     },
     {
      "k": "ls",
      "say": "I watched TV yesterday.",
      "ans": [
       "I watched TV yesterday."
      ],
      "ex": "Você ouviu: “I watched TV yesterday.” (Eu assisti TV ontem.)."
     }
    ]
   },
   {
    "n": 2,
    "title": "Verbos irregulares",
    "exercises": [
     {
      "k": "mc",
      "q": "Como se diz “foi” em inglês?",
      "opts": [
       "went",
       "had",
       "ate",
       "saw"
      ],
      "a": 0,
      "ex": "“went” significa “foi”."
     },
     {
      "k": "mt",
      "pairs": [
       [
        "saw",
        "viu"
       ],
       [
        "ate",
        "comeu"
       ],
       [
        "had",
        "teve / tinha"
       ],
       [
        "came",
        "veio"
       ]
      ],
      "ex": "Essas palavras aparecem nas frases desta lição: saw = viu; ate = comeu; had = teve / tinha; came = veio."
     },
     {
      "k": "tr",
      "pt": "Ele retirou o que havia dito sobre ela.",
      "ans": [
       "He took back what he had said about her."
      ],
      "bank": [
       "He",
       "took",
       "back",
       "what",
       "he",
       "had",
       "said",
       "about",
       "her",
       "went",
       "my",
       "We"
      ],
      "ex": "“He took back what he had said about her.” = “Ele retirou o que havia dito sobre ela.”."
     },
     {
      "k": "mc",
      "q": "Toque no que você ouviu",
      "opts": [
       "said",
       "took",
       "lost",
       "bought"
      ],
      "a": 1,
      "ex": "Você ouviu “took”, que significa “pegou / levou”.",
      "say": "took"
     },
     {
      "k": "ty",
      "prompt": "fez (criou)",
      "ans": [
       "made"
      ],
      "ex": "“fez (criou)” em inglês é “made”.",
      "hint": "Começa com “m”"
     },
     {
      "k": "ls",
      "say": "My friend said he had bought a new watch.",
      "ans": [
       "My friend said he had bought a new watch."
      ],
      "ex": "Você ouviu: “My friend said he had bought a new watch.” (Meu amigo disse que comprara um relógio novo.)."
     },
     {
      "k": "mc",
      "q": "Tom achou as chaves que pensou ter perdido.  →  Tom ___ the keys he thought he had lost.",
      "opts": [
       "bought",
       "found",
       "made",
       "pen"
      ],
      "a": 1,
      "ex": "“Tom found the keys he thought he had lost.” = “Tom achou as chaves que pensou ter perdido.”."
     },
     {
      "k": "tr",
      "pt": "Eu tinha perdido minha caneta.",
      "ans": [
       "I had lost my pen."
      ],
      "bank": [
       "I",
       "had",
       "lost",
       "my",
       "pen",
       "all",
       "you",
       "cake"
      ],
      "ex": "“I had lost my pen.” = “Eu tinha perdido minha caneta.”."
     },
     {
      "k": "ty",
      "prompt": "Demos tudo o que tínhamos.",
      "ans": [
       "We gave all we had."
      ],
      "ex": "“Demos tudo o que tínhamos.” em inglês: “We gave all we had.”.",
      "hint": "Escreva a frase inteira"
     },
     {
      "k": "ls",
      "say": "I made a bet and lost.",
      "ans": [
       "I made a bet and lost."
      ],
      "ex": "Você ouviu: “I made a bet and lost.” (Fiz uma aposta e perdi.)."
     }
    ]
   },
   {
    "n": 3,
    "title": "Fim de semana",
    "exercises": [
     {
      "k": "mc",
      "q": "Como se diz “festa” em inglês?",
      "opts": [
       "birthday",
       "movie",
       "beach",
       "party"
      ],
      "a": 3,
      "ex": "“party” significa “festa”."
     },
     {
      "k": "mt",
      "pairs": [
       [
        "movie",
        "filme"
       ],
       [
        "trip",
        "viagem"
       ],
       [
        "beach",
        "praia"
       ],
       [
        "cousin",
        "primo(a)"
       ]
      ],
      "ex": "Essas palavras aparecem nas frases desta lição: movie = filme; trip = viagem; beach = praia; cousin = primo(a)."
     },
     {
      "k": "tr",
      "pt": "Nós dançamos com a música.",
      "ans": [
       "We danced to the music."
      ],
      "bank": [
       "We",
       "danced",
       "to",
       "the",
       "music",
       "is",
       "Tom",
       "Everyone"
      ],
      "ex": "“We danced to the music.” = “Nós dançamos com a música.”."
     },
     {
      "k": "mc",
      "q": "Toque no que você ouviu",
      "opts": [
       "trip",
       "grandmother",
       "sang",
       "cousin"
      ],
      "a": 1,
      "ex": "Você ouviu “grandmother”, que significa “avó”.",
      "say": "grandmother"
     },
     {
      "k": "ty",
      "prompt": "aniversário",
      "ans": [
       "birthday"
      ],
      "ex": "“aniversário” em inglês é “birthday”.",
      "hint": "Começa com “b”"
     },
     {
      "k": "ls",
      "say": "Music is a gift from God.",
      "ans": [
       "Music is a gift from God."
      ],
      "ex": "Você ouviu: “Music is a gift from God.” (A música é um dom de Deus.)."
     },
     {
      "k": "mc",
      "q": "Tom cantou e Maria dançou.  →  Tom ___ and Mary danced.",
      "opts": [
       "and",
       "beach",
       "birthday",
       "sang"
      ],
      "a": 3,
      "ex": "“Tom sang and Mary danced.” = “Tom cantou e Maria dançou.”."
     },
     {
      "k": "tr",
      "pt": "Meus primos moram na praia.",
      "ans": [
       "My cousins live on the beach."
      ],
      "bank": [
       "My",
       "cousins",
       "live",
       "on",
       "the",
       "beach",
       "grandmother",
       "Mary",
       "It"
      ],
      "ex": "“My cousins live on the beach.” = “Meus primos moram na praia.”."
     },
     {
      "k": "ty",
      "prompt": "A minha festa de aniversário é amanhã.",
      "ans": [
       "My birthday party is tomorrow."
      ],
      "ex": "“A minha festa de aniversário é amanhã.” em inglês: “My birthday party is tomorrow.”.",
      "hint": "Escreva a frase inteira"
     },
     {
      "k": "ls",
      "say": "Tom was invited to a beach party.",
      "ans": [
       "Tom was invited to a beach party."
      ],
      "ex": "Você ouviu: “Tom was invited to a beach party.” (Tom foi convidado a uma festa na praia.)."
     }
    ]
   }
  ]
 },
 {
  "n": 8,
  "title": "Planos e sonhos",
  "emoji": "🚀",
  "level": "A2",
  "about": "O futuro: amanhã, planos, profissões e decisões.",
  "lessons": [
   {
    "n": 1,
    "title": "Amanhã",
    "exercises": [
     {
      "k": "mc",
      "q": "Como se diz “amanhã” em inglês?",
      "opts": [
       "going",
       "tomorrow",
       "maybe",
       "soon"
      ],
      "a": 1,
      "ex": "“tomorrow” significa “amanhã”."
     },
     {
      "k": "mt",
      "pairs": [
       [
        "tonight",
        "hoje à noite"
       ],
       [
        "soon",
        "em breve"
       ],
       [
        "plan",
        "plano / planejar"
       ],
       [
        "maybe",
        "talvez"
       ]
      ],
      "ex": "Essas palavras aparecem nas frases desta lição: tonight = hoje à noite; soon = em breve; plan = plano / planejar; maybe = talvez."
     },
     {
      "k": "tr",
      "pt": "Tom vai me encontrar mais tarde.",
      "ans": [
       "Tom will meet me later."
      ],
      "bank": [
       "Tom",
       "will",
       "meet",
       "me",
       "later",
       "waiting",
       "again",
       "planning"
      ],
      "ex": "“Tom will meet me later.” = “Tom vai me encontrar mais tarde.”."
     },
     {
      "k": "mc",
      "q": "Toque no que você ouviu",
      "opts": [
       "ready",
       "later",
       "will",
       "maybe"
      ],
      "a": 2,
      "ex": "Você ouviu “will”, que significa “vai (futuro)”.",
      "say": "will"
     },
     {
      "k": "ty",
      "prompt": "indo / vai",
      "ans": [
       "going"
      ],
      "ex": "“indo / vai” em inglês é “going”.",
      "hint": "Começa com “g”"
     },
     {
      "k": "ls",
      "say": "I hope we meet again soon.",
      "ans": [
       "I hope we meet again soon."
      ],
      "ex": "Você ouviu: “I hope we meet again soon.” (Espero te reencontrar em breve.)."
     },
     {
      "k": "mc",
      "q": "Talvez Tom espere por nós.  →  ___ Tom will wait for us.",
      "opts": [
       "going",
       "room",
       "tonight",
       "Maybe"
      ],
      "a": 3,
      "ex": "“Maybe Tom will wait for us.” = “Talvez Tom espere por nós.”."
     },
     {
      "k": "tr",
      "pt": "Eu vou encontrar ele amanhã.",
      "ans": [
       "I'm going to meet him tomorrow."
      ],
      "bank": [
       "I'm",
       "going",
       "to",
       "meet",
       "him",
       "tomorrow",
       "will",
       "soon",
       "the"
      ],
      "ex": "“I'm going to meet him tomorrow.” = “Eu vou encontrar ele amanhã.”."
     },
     {
      "k": "ty",
      "prompt": "Planejamos ir amanhã.",
      "ans": [
       "We're planning on going tomorrow."
      ],
      "ex": "“Planejamos ir amanhã.” em inglês: “We're planning on going tomorrow.”.",
      "hint": "Escreva a frase inteira"
     },
     {
      "k": "ls",
      "say": "I'll meet you later.",
      "ans": [
       "I'll meet you later."
      ],
      "ex": "Você ouviu: “I'll meet you later.” (Eu te encontro mais tarde.)."
     }
    ]
   },
   {
    "n": 2,
    "title": "Sonhos",
    "exercises": [
     {
      "k": "mc",
      "q": "Como se diz “sonho / sonhar” em inglês?",
      "opts": [
       "travel",
       "dream",
       "job",
       "become"
      ],
      "a": 1,
      "ex": "“dream” significa “sonho / sonhar”."
     },
     {
      "k": "mt",
      "pairs": [
       [
        "future",
        "futuro"
       ],
       [
        "college",
        "faculdade"
       ],
       [
        "job",
        "emprego"
       ],
       [
        "doctor",
        "médico(a)"
       ]
      ],
      "ex": "Essas palavras aparecem nas frases desta lição: future = futuro; college = faculdade; job = emprego; doctor = médico(a)."
     },
     {
      "k": "tr",
      "pt": "Eu quero ser famoso.",
      "ans": [
       "I want to become famous."
      ],
      "bank": [
       "I",
       "want",
       "to",
       "become",
       "famous",
       "job",
       "future",
       "My"
      ],
      "ex": "“I want to become famous.” = “Eu quero ser famoso.”."
     },
     {
      "k": "mc",
      "q": "Toque no que você ouviu",
      "opts": [
       "build",
       "engineer",
       "famous",
       "dream"
      ],
      "a": 1,
      "ex": "Você ouviu “engineer”, que significa “engenheiro(a)”.",
      "say": "engineer"
     },
     {
      "k": "ty",
      "prompt": "famoso",
      "ans": [
       "famous"
      ],
      "ex": "“famoso” em inglês é “famous”.",
      "hint": "Começa com “f”"
     },
     {
      "k": "ls",
      "say": "He is famous as a doctor.",
      "ans": [
       "He is famous as a doctor."
      ],
      "ex": "Você ouviu: “He is famous as a doctor.” (Ele é famoso como médico.)."
     },
     {
      "k": "mc",
      "q": "Meu sonho é ser professor.  →  My ___ is to become a teacher.",
      "opts": [
       "travel",
       "build",
       "dream",
       "teacher"
      ],
      "a": 2,
      "ex": "“My dream is to become a teacher.” = “Meu sonho é ser professor.”."
     },
     {
      "k": "tr",
      "pt": "Quero um emprego.",
      "ans": [
       "I want a job."
      ],
      "bank": [
       "I",
       "want",
       "a",
       "job",
       "lot",
       "famous",
       "He"
      ],
      "ex": "“I want a job.” = “Quero um emprego.”."
     },
     {
      "k": "ty",
      "prompt": "Eu era médico.",
      "ans": [
       "I was a doctor."
      ],
      "ex": "“Eu era médico.” em inglês: “I was a doctor.”.",
      "hint": "Escreva a frase inteira"
     },
     {
      "k": "ls",
      "say": "I travel a lot.",
      "ans": [
       "I travel a lot."
      ],
      "ex": "Você ouviu: “I travel a lot.” (Eu viajo muito.)."
     }
    ]
   },
   {
    "n": 3,
    "title": "Decisões",
    "exercises": [
     {
      "k": "mc",
      "q": "Como se diz “decidir” em inglês?",
      "opts": [
       "try",
       "finish",
       "promise",
       "decide"
      ],
      "a": 3,
      "ex": "“decide” significa “decidir”."
     },
     {
      "k": "mt",
      "pairs": [
       [
        "choose",
        "escolher"
       ],
       [
        "promise",
        "prometer"
       ],
       [
        "try",
        "tentar"
       ],
       [
        "invite",
        "convidar"
       ]
      ],
      "ex": "Essas palavras aparecem nas frases desta lição: choose = escolher; promise = prometer; try = tentar; invite = convidar."
     },
     {
      "k": "tr",
      "pt": "Procurei esquecer.",
      "ans": [
       "I tried to forget."
      ],
      "bank": [
       "I",
       "tried",
       "to",
       "forget",
       "change",
       "believe",
       "you"
      ],
      "ex": "“I tried to forget.” = “Procurei esquecer.”."
     },
     {
      "k": "mc",
      "q": "Toque no que você ouviu",
      "opts": [
       "decide",
       "prepare",
       "change",
       "promise"
      ],
      "a": 1,
      "ex": "Você ouviu “prepare”, que significa “preparar”.",
      "say": "prepare"
     },
     {
      "k": "ty",
      "prompt": "mudar / troco",
      "ans": [
       "change"
      ],
      "ex": "“mudar / troco” em inglês é “change”.",
      "hint": "Começa com “c”"
     },
     {
      "k": "ls",
      "say": "Tom decided to try.",
      "ans": [
       "Tom decided to try."
      ],
      "ex": "Você ouviu: “Tom decided to try.” (Tom decidiu tentar.)."
     },
     {
      "k": "mc",
      "q": "Eu prometo que vou tentar.  →  I ___ that I'll try.",
      "opts": [
       "forget",
       "it's",
       "promise",
       "worth"
      ],
      "a": 2,
      "ex": "“I promise that I'll try.” = “Eu prometo que vou tentar.”."
     },
     {
      "k": "tr",
      "pt": "Não esqueça sua promessa.",
      "ans": [
       "Don't forget your promise."
      ],
      "bank": [
       "Don't",
       "forget",
       "your",
       "promise",
       "what",
       "believe",
       "choose"
      ],
      "ex": "“Don't forget your promise.” = “Não esqueça sua promessa.”."
     },
     {
      "k": "ty",
      "prompt": "Eu acho que vale a pena tentar.",
      "ans": [
       "I believe it's worth trying."
      ],
      "ex": "“Eu acho que vale a pena tentar.” em inglês: “I believe it's worth trying.”.",
      "hint": "Escreva a frase inteira"
     },
     {
      "k": "ls",
      "say": "Let's finish what we started.",
      "ans": [
       "Let's finish what we started."
      ],
      "ex": "Você ouviu: “Let's finish what we started.” (Vamos terminar o que começamos.)."
     }
    ]
   }
  ]
 },
 {
  "n": 9,
  "title": "Minha opinião",
  "emoji": "💬",
  "level": "B1",
  "about": "Dar opinião, descrever coisas e conversar com argumentos.",
  "lessons": [
   {
    "n": 1,
    "title": "Dar opinião",
    "exercises": [
     {
      "k": "mc",
      "q": "Como se diz “pensar / achar” em inglês?",
      "opts": [
       "honestly",
       "agree",
       "think",
       "really"
      ],
      "a": 2,
      "ex": "“think” significa “pensar / achar”."
     },
     {
      "k": "mt",
      "pairs": [
       [
        "opinion",
        "opinião"
       ],
       [
        "agree",
        "concordar"
       ],
       [
        "disagree",
        "discordar"
       ],
       [
        "because",
        "porque"
       ]
      ],
      "ex": "Essas palavras aparecem nas frases desta lição: opinion = opinião; agree = concordar; disagree = discordar; because = porque."
     },
     {
      "k": "tr",
      "pt": "Você realmente achou que o Tom estava errado?",
      "ans": [
       "Did you really think Tom was wrong?"
      ],
      "bank": [
       "Did",
       "you",
       "really",
       "think",
       "Tom",
       "was",
       "wrong",
       "are",
       "probably",
       "buy"
      ],
      "ex": "“Did you really think Tom was wrong?” = “Você realmente achou que o Tom estava errado?”."
     },
     {
      "k": "mc",
      "q": "Toque no que você ouviu",
      "opts": [
       "really",
       "sure",
       "opinion",
       "wrong"
      ],
      "a": 0,
      "ex": "Você ouviu “really”, que significa “realmente”.",
      "say": "really"
     },
     {
      "k": "ty",
      "prompt": "provavelmente",
      "ans": [
       "probably"
      ],
      "ex": "“provavelmente” em inglês é “probably”.",
      "hint": "Começa com “p”"
     },
     {
      "k": "ls",
      "say": "I think I agree.",
      "ans": [
       "I think I agree."
      ],
      "ex": "Você ouviu: “I think I agree.” (Eu acho que concordo.)."
     },
     {
      "k": "mc",
      "q": "Não tenho certeza se eu concordo.  →  I'm not ___ I agree.",
      "opts": [
       "expensive",
       "sure",
       "true",
       "wrong"
      ],
      "a": 1,
      "ex": "“I'm not sure I agree.” = “Não tenho certeza se eu concordo.”."
     },
     {
      "k": "tr",
      "pt": "É provável que você esteja errada.",
      "ans": [
       "You are probably wrong."
      ],
      "bank": [
       "You",
       "are",
       "probably",
       "wrong",
       "do",
       "was",
       "with"
      ],
      "ex": "“You are probably wrong.” = “É provável que você esteja errada.”."
     },
     {
      "k": "ty",
      "prompt": "Eu concordo com a opinião dele.",
      "ans": [
       "I agree with his opinion."
      ],
      "ex": "“Eu concordo com a opinião dele.” em inglês: “I agree with his opinion.”.",
      "hint": "Escreva a frase inteira"
     },
     {
      "k": "ls",
      "say": "What do you honestly think?",
      "ans": [
       "What do you honestly think?"
      ],
      "ex": "Você ouviu: “What do you honestly think?” (O que você pensa, realmente?)."
     }
    ]
   },
   {
    "n": 2,
    "title": "Descrever",
    "exercises": [
     {
      "k": "mc",
      "q": "Como se diz “interessante” em inglês?",
      "opts": [
       "important",
       "interesting",
       "strange",
       "easy"
      ],
      "a": 1,
      "ex": "“interesting” significa “interessante”."
     },
     {
      "k": "mt",
      "pairs": [
       [
        "boring",
        "chato / entediante"
       ],
       [
        "funny",
        "engraçado"
       ],
       [
        "beautiful",
        "bonito / lindo"
       ],
       [
        "dangerous",
        "perigoso"
       ]
      ],
      "ex": "Essas palavras aparecem nas frases desta lição: boring = chato / entediante; funny = engraçado; beautiful = bonito / lindo; dangerous = perigoso."
     },
     {
      "k": "tr",
      "pt": "O trabalho é interessante, mas nem sempre fácil.",
      "ans": [
       "The job is interesting, but not always easy."
      ],
      "bank": [
       "The",
       "job",
       "is",
       "interesting",
       "but",
       "not",
       "always",
       "easy",
       "boring",
       "important",
       "am"
      ],
      "ex": "“The job is interesting, but not always easy.” = “O trabalho é interessante, mas nem sempre fácil.”."
     },
     {
      "k": "mc",
      "q": "Toque no que você ouviu",
      "opts": [
       "funny",
       "dangerous",
       "terrible",
       "easy"
      ],
      "a": 3,
      "ex": "Você ouviu “easy”, que significa “fácil”.",
      "say": "easy"
     },
     {
      "k": "ty",
      "prompt": "difícil",
      "ans": [
       "difficult"
      ],
      "ex": "“difícil” em inglês é “difficult”.",
      "hint": "Começa com “d”"
     },
     {
      "k": "ls",
      "say": "Tom is so funny.",
      "ans": [
       "Tom is so funny."
      ],
      "ex": "Você ouviu: “Tom is so funny.” (Tom é muito engraçado.)."
     },
     {
      "k": "mc",
      "q": "Foi fácil demais.  →  It was too ___",
      "opts": [
       "easy",
       "dangerous",
       "beautiful",
       "important"
      ],
      "a": 0,
      "ex": "“It was too easy.” = “Foi fácil demais.”."
     },
     {
      "k": "tr",
      "pt": "Estou te aborrecendo?",
      "ans": [
       "Am I boring you?"
      ],
      "bank": [
       "Am",
       "I",
       "boring",
       "you",
       "too",
       "was",
       "is"
      ],
      "ex": "“Am I boring you?” = “Estou te aborrecendo?”."
     },
     {
      "k": "ty",
      "prompt": "Que homem estranho!",
      "ans": [
       "What a strange man!"
      ],
      "ex": "“Que homem estranho!” em inglês: “What a strange man!”.",
      "hint": "Escreva a frase inteira"
     },
     {
      "k": "ls",
      "say": "Why is Tom special?",
      "ans": [
       "Why is Tom special?"
      ],
      "ex": "Você ouviu: “Why is Tom special?” (Por que o Tom é especial?)."
     }
    ]
   },
   {
    "n": 3,
    "title": "Conversar",
    "exercises": [
     {
      "k": "mc",
      "q": "Como se diz “exemplo” em inglês?",
      "opts": [
       "but",
       "although",
       "reason",
       "example"
      ],
      "a": 3,
      "ex": "“example” significa “exemplo”."
     },
     {
      "k": "mt",
      "pairs": [
       [
        "reason",
        "motivo / razão"
       ],
       [
        "but",
        "mas"
       ],
       [
        "also",
        "também"
       ],
       [
        "instead",
        "em vez disso"
       ]
      ],
      "ex": "Essas palavras aparecem nas frases desta lição: reason = motivo / razão; but = mas; also = também; instead = em vez disso."
     },
     {
      "k": "tr",
      "pt": "Ele é bastante inteligente pra responder a todas as perguntas.",
      "ans": [
       "He is smart enough to answer all the questions."
      ],
      "bank": [
       "He",
       "is",
       "smart",
       "enough",
       "to",
       "answer",
       "all",
       "the",
       "questions",
       "answers",
       "question",
       "together"
      ],
      "ex": "“He is smart enough to answer all the questions.” = “Ele é bastante inteligente pra responder a todas as perguntas.”."
     },
     {
      "k": "mc",
      "q": "Toque no que você ouviu",
      "opts": [
       "question",
       "although",
       "instead",
       "problem"
      ],
      "a": 1,
      "ex": "Você ouviu “although”, que significa “embora”.",
      "say": "although"
     },
     {
      "k": "ty",
      "prompt": "juntos",
      "ans": [
       "together"
      ],
      "ex": "“juntos” em inglês é “together”.",
      "hint": "Começa com “t”"
     },
     {
      "k": "ls",
      "say": "I answered the question.",
      "ans": [
       "I answered the question."
      ],
      "ex": "Você ouviu: “I answered the question.” (Eu respondi à pergunta.)."
     },
     {
      "k": "mc",
      "q": "A ideia era suficientemente simples.  →  The ___ was simple enough.",
      "opts": [
       "enough",
       "sorry",
       "saw",
       "idea"
      ],
      "a": 3,
      "ex": "“The idea was simple enough.” = “A ideia era suficientemente simples.”."
     },
     {
      "k": "tr",
      "pt": "Sinto muito, mas minha resposta é não.",
      "ans": [
       "I'm sorry, but my answer is no."
      ],
      "bank": [
       "I'm",
       "sorry",
       "but",
       "my",
       "answer",
       "is",
       "no",
       "be",
       "also",
       "was"
      ],
      "ex": "“I'm sorry, but my answer is no.” = “Sinto muito, mas minha resposta é não.”."
     },
     {
      "k": "ty",
      "prompt": "Nem todas as perguntas têm respostas.",
      "ans": [
       "Not all questions have answers."
      ],
      "ex": "“Nem todas as perguntas têm respostas.” em inglês: “Not all questions have answers.”.",
      "hint": "Escreva a frase inteira"
     },
     {
      "k": "ls",
      "say": "That seems to be reason enough.",
      "ans": [
       "That seems to be reason enough."
      ],
      "ex": "Você ouviu: “That seems to be reason enough.” (Isso parece ser motivo suficiente.)."
     }
    ]
   }
  ]
 },
 {
  "n": 10,
  "title": "Viagem e emergências",
  "emoji": "✈️",
  "level": "B1",
  "about": "Aeroporto, compras e o que dizer quando precisa de ajuda.",
  "lessons": [
   {
    "n": 1,
    "title": "Viagem",
    "exercises": [
     {
      "k": "mc",
      "q": "Como se diz “passaporte” em inglês?",
      "opts": [
       "suitcase",
       "hotel",
       "luggage",
       "passport"
      ],
      "a": 3,
      "ex": "“passport” significa “passaporte”."
     },
     {
      "k": "mt",
      "pairs": [
       [
        "luggage",
        "bagagem"
       ],
       [
        "suitcase",
        "mala"
       ],
       [
        "flight",
        "voo"
       ],
       [
        "hotel",
        "hotel"
       ]
      ],
      "ex": "Essas palavras aparecem nas frases desta lição: luggage = bagagem; suitcase = mala; flight = voo; hotel = hotel."
     },
     {
      "k": "tr",
      "pt": "Meu voo estava atrasado.",
      "ans": [
       "My flight was delayed."
      ],
      "bank": [
       "My",
       "flight",
       "was",
       "delayed",
       "luggage",
       "open",
       "not"
      ],
      "ex": "“My flight was delayed.” = “Meu voo estava atrasado.”."
     },
     {
      "k": "mc",
      "q": "Toque no que você ouviu",
      "opts": [
       "reservation",
       "leave",
       "delay",
       "flight"
      ],
      "a": 0,
      "ex": "Você ouviu “reservation”, que significa “reserva”.",
      "say": "reservation"
     },
     {
      "k": "ty",
      "prompt": "portão",
      "ans": [
       "gate"
      ],
      "ex": "“portão” em inglês é “gate”.",
      "hint": "Começa com “g”"
     },
     {
      "k": "ls",
      "say": "Tom arrived at the hotel.",
      "ans": [
       "Tom arrived at the hotel."
      ],
      "ex": "Você ouviu: “Tom arrived at the hotel.” (Tom chegou ao hotel.)."
     },
     {
      "k": "mc",
      "q": "Deixe a sua bagagem aqui.  →  ___ your suitcase here.",
      "opts": [
       "suitcase",
       "Leave",
       "reservation",
       "here"
      ],
      "a": 1,
      "ex": "“Leave your suitcase here.” = “Deixe a sua bagagem aqui.”."
     },
     {
      "k": "tr",
      "pt": "Minha bagagem não chegou. O que houve?",
      "ans": [
       "My luggage didn't arrive. What happened?"
      ],
      "bank": [
       "My",
       "luggage",
       "didn't",
       "arrive",
       "What",
       "happened",
       "reservation",
       "The",
       "have"
      ],
      "ex": "“My luggage didn't arrive. What happened?” = “Minha bagagem não chegou. O que houve?”."
     },
     {
      "k": "ty",
      "prompt": "O portão está aberto.",
      "ans": [
       "The gate is open."
      ],
      "ex": "“O portão está aberto.” em inglês: “The gate is open.”.",
      "hint": "Escreva a frase inteira"
     },
     {
      "k": "ls",
      "say": "I'm at the hotel.",
      "ans": [
       "I'm at the hotel."
      ],
      "ex": "Você ouviu: “I'm at the hotel.” (Estou no hotel.)."
     }
    ]
   },
   {
    "n": 2,
    "title": "Compras",
    "exercises": [
     {
      "k": "mc",
      "q": "Como se diz “dinheiro” em inglês?",
      "opts": [
       "money",
       "pay",
       "card",
       "bag"
      ],
      "a": 0,
      "ex": "“money” significa “dinheiro”."
     },
     {
      "k": "mt",
      "pairs": [
       [
        "price",
        "preço"
       ],
       [
        "cheap",
        "barato"
       ],
       [
        "expensive",
        "caro"
       ],
       [
        "receipt",
        "recibo"
       ]
      ],
      "ex": "Essas palavras aparecem nas frases desta lição: price = preço; cheap = barato; expensive = caro; receipt = recibo."
     },
     {
      "k": "tr",
      "pt": "Nós podemos pagar em dinheiro.",
      "ans": [
       "We can pay cash."
      ],
      "bank": [
       "We",
       "can",
       "pay",
       "cash",
       "do",
       "price",
       "bags"
      ],
      "ex": "“We can pay cash.” = “Nós podemos pagar em dinheiro.”."
     },
     {
      "k": "mc",
      "q": "Toque no que você ouviu",
      "opts": [
       "size",
       "money",
       "card",
       "bag"
      ],
      "a": 0,
      "ex": "Você ouviu “size”, que significa “tamanho”.",
      "say": "size"
     },
     {
      "k": "ty",
      "prompt": "desconto",
      "ans": [
       "discount"
      ],
      "ex": "“desconto” em inglês é “discount”.",
      "hint": "Começa com “d”"
     },
     {
      "k": "ls",
      "say": "It's a small price to pay.",
      "ans": [
       "It's a small price to pay."
      ],
      "ex": "Você ouviu: “It's a small price to pay.” (É um pequeno preço a pagar.)."
     },
     {
      "k": "mc",
      "q": "Não há dinheiro na minha bolsa.  →  There is no ___ in my bag.",
      "opts": [
       "money",
       "expensive",
       "card",
       "shopping"
      ],
      "a": 0,
      "ex": "“There is no money in my bag.” = “Não há dinheiro na minha bolsa.”."
     },
     {
      "k": "tr",
      "pt": "Quantas sacolas a senhora tem?",
      "ans": [
       "How many shopping bags do you have?"
      ],
      "bank": [
       "How",
       "many",
       "shopping",
       "bags",
       "do",
       "you",
       "have",
       "expensive",
       "This",
       "a"
      ],
      "ex": "“How many shopping bags do you have?” = “Quantas sacolas a senhora tem?”."
     },
     {
      "k": "ty",
      "prompt": "Este casaco é caro, mas vale o preço.",
      "ans": [
       "This coat is expensive, but it's worth the price."
      ],
      "ex": "“Este casaco é caro, mas vale o preço.” em inglês: “This coat is expensive, but it's worth the price.”.",
      "hint": "Escreva a frase inteira"
     },
     {
      "k": "ls",
      "say": "I need a bag.",
      "ans": [
       "I need a bag."
      ],
      "ex": "Você ouviu: “I need a bag.” (Preciso de uma bolsa.)."
     }
    ]
   },
   {
    "n": 3,
    "title": "Emergências",
    "exercises": [
     {
      "k": "mc",
      "q": "Como se diz “ajuda / ajudar” em inglês?",
      "opts": [
       "careful",
       "help",
       "ambulance",
       "hurt"
      ],
      "a": 1,
      "ex": "“help” significa “ajuda / ajudar”."
     },
     {
      "k": "mt",
      "pairs": [
       [
        "emergency",
        "emergência"
       ],
       [
        "police",
        "polícia"
       ],
       [
        "medicine",
        "remédio"
       ],
       [
        "pain",
        "dor"
       ]
      ],
      "ex": "Essas palavras aparecem nas frases desta lição: emergency = emergência; police = polícia; medicine = remédio; pain = dor."
     },
     {
      "k": "tr",
      "pt": "Ela se feriu no acidente.",
      "ans": [
       "She was hurt in the accident."
      ],
      "bank": [
       "She",
       "was",
       "hurt",
       "in",
       "the",
       "accident",
       "him",
       "pain",
       "help"
      ],
      "ex": "“She was hurt in the accident.” = “Ela se feriu no acidente.”."
     },
     {
      "k": "mc",
      "q": "Toque no que você ouviu",
      "opts": [
       "ambulance",
       "sick",
       "hurt",
       "pain"
      ],
      "a": 1,
      "ex": "Você ouviu “sick”, que significa “doente”.",
      "say": "sick"
     },
     {
      "k": "ty",
      "prompt": "ambulância",
      "ans": [
       "ambulance"
      ],
      "ex": "“ambulância” em inglês é “ambulance”.",
      "hint": "Começa com “a”"
     },
     {
      "k": "ls",
      "say": "Be careful not to hurt yourself.",
      "ans": [
       "Be careful not to hurt yourself."
      ],
      "ex": "Você ouviu: “Be careful not to hurt yourself.” (Cuidado para não se machucar.)."
     },
     {
      "k": "mc",
      "q": "O remédio não ajudou nada.  →  The ___ didn't help at all.",
      "opts": [
       "medicine",
       "yourself",
       "helps",
       "Tom"
      ],
      "a": 0,
      "ex": "“The medicine didn't help at all.” = “O remédio não ajudou nada.”."
     },
     {
      "k": "tr",
      "pt": "Você estará seguro de qualquer perigo aqui.",
      "ans": [
       "You'll be safe from any danger here."
      ],
      "bank": [
       "You'll",
       "be",
       "safe",
       "from",
       "any",
       "danger",
       "here",
       "accident",
       "help",
       "Mary"
      ],
      "ex": "“You'll be safe from any danger here.” = “Você estará seguro de qualquer perigo aqui.”."
     },
     {
      "k": "ty",
      "prompt": "Tom ajuda Mary, mas ela não o ajuda.",
      "ans": [
       "Tom helps Mary, but she doesn't help him."
      ],
      "ex": "“Tom ajuda Mary, mas ela não o ajuda.” em inglês: “Tom helps Mary, but she doesn't help him.”.",
      "hint": "Escreva a frase inteira"
     },
     {
      "k": "ls",
      "say": "The accident happened because he wasn't careful.",
      "ans": [
       "The accident happened because he wasn't careful."
      ],
      "ex": "Você ouviu: “The accident happened because he wasn't careful.” (O acidente aconteceu porque ele não teve cuidado.)."
     }
    ]
   }
  ]
 }
] as LibraryUnit[];

/** Colaboradores do Tatoeba cujas frases estão nas unidades geradas. */
export const TATOEBA_AUTHORS: string[] = ["CM", "Advanced", "Amastan", "Bran", "Brasiliense", "CH", "CK", "DJ_Saidez", "DavidDias", "Dejo", "DracoKall", "Eldad", "France", "Gyuri", "Hakaku", "Hybrid", "JGEN", "JGGG", "KimiP", "LeeSooHa", "MarlonX19", "Matheus", "Micsmithel", "MrJuice", "Nylez", "Ricardo14", "Scott", "Source_VOA", "Spamster", "ToinhoAlam", "Zifre", "ajdavidl", "akira_ito", "alexmarcelo", "autuno", "belgavox", "bill", "brauliobezerra", "carlosalberto", "carloseperola", "changsubbs", "cntrational", "darinmex", "elencw", "erikspen", "hayastan", "heo598", "hiroy", "human600", "josivangoncalves", "jvlopes91", "keira_n", "lucasmg123", "mailohilohi", "minshirui", "paula_guisard", "piksea", "piterkeo", "pne", "roger_rf", "rwv", "sugoi", "xtofu80"];
