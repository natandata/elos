// Galeria: cada convidado atendido pela primeira vez entra aqui, com um resumo e a referência bíblica.

export type GalleryEntry = { id: string; emoji: string; name: string; kind: "Personagem" | "Representa o povo"; desc: string; ref: string };

const P = (id: string, emoji: string, name: string, desc: string, ref: string): GalleryEntry => ({ id, emoji, name, kind: "Personagem", desc, ref });
const R = (id: string, emoji: string, name: string, desc: string, ref: string): GalleryEntry => ({ id, emoji, name, kind: "Representa o povo", desc, ref });

export const GALLERY: GalleryEntry[] = [
  // Abraão
  P("tres", "🧔", "Os três visitantes", "Três homens que visitaram Abraão no calor do dia. Ele os recebeu com água, pão, bezerro, coalhada e leite.", "Gênesis 18:1–8"),
  R("visitante", "🧔", "Visitante", "Representa os viajantes que passavam pela tenda de Abraão e eram bem recebidos.", "Gênesis 18:2–5"),
  R("viajante", "🚶", "Viajante cansado", "Representa quem chega com fome e cansaço e encontra uma mesa preparada.", "Gênesis 18:5"),
  R("peregrino", "👳", "Peregrino", "Representa os estrangeiros acolhidos com hospitalidade. A Bíblia lembra de não esquecer de receber bem os estranhos.", "Hebreus 13:2"),
  R("pastor", "🧑‍🌾", "Pastor de Manre", "Representa os que cuidavam dos rebanhos de Abraão perto dos carvalhos de Manre.", "Gênesis 18:1 e 7"),
  R("jovem", "👦", "Jovem pastor", "Representa o moço que, na história, se apressou para preparar o bezerro.", "Gênesis 18:7"),
  // Jacó e Esaú
  P("esau", "🧑‍🦰", "Esaú", "Filho mais velho de Isaque. Voltou do campo com fome e trocou o seu direito de filho mais velho por um prato de guisado.", "Gênesis 25:29–34"),
  R("cacador", "🏹", "Caçador", "Representa os caçadores, como Esaú, que passavam os dias no campo.", "Gênesis 25:27"),
  R("pastor2", "👨‍🌾", "Pastor", "Representa os pastores de tendas, como Jacó, que cuidavam dos rebanhos.", "Gênesis 25:27"),
  R("servo", "🧒", "Servo", "Representa os servos que ajudavam nas tendas das famílias.", "Gênesis 25"),
  R("mercador", "🧔‍♂️", "Mercador de Gileade", "Representa as caravanas de mercadores que passavam pela região com suas especiarias.", "Gênesis 37:25"),
  // Páscoa
  R("familia", "👨‍👩‍👧", "Família israelita", "Representa as famílias que comeram a Páscoa em suas casas, prontas para partir.", "Êxodo 12:3–11"),
  R("avo", "👴", "Avô", "Representa os mais velhos do povo, que lembravam e contavam às novas gerações o que Deus fez.", "Êxodo 12:26–27"),
  R("mae", "👩", "Mãe", "Representa as mães de Israel, que prepararam o pão sem fermento às pressas.", "Êxodo 12:34"),
  R("jovem3", "🧑", "Jovem", "Representa os jovens de Israel na noite da libertação.", "Êxodo 12:31–32"),
  R("menina", "👧", "Menina", "Representa as crianças que participaram da primeira Páscoa com a família.", "Êxodo 12:21–27"),
  // Maná
  R("israelita", "🧑", "Israelita", "Representa o povo no deserto, que recolhia o maná a cada manhã.", "Êxodo 16:14–18"),
  R("familia4", "👨‍👩‍👦", "Família no deserto", "Representa as famílias que recolhiam, cada uma, o que precisava para o dia.", "Êxodo 16:16–18"),
  R("idosa", "👵", "Idosa", "Representa os mais velhos do acampamento, também sustentados por Deus.", "Êxodo 16"),
  R("menino4", "👦", "Menino", "Representa as crianças que cresceram comendo o pão do céu no deserto.", "Êxodo 16:35"),
  R("murmurador", "🙁", "Descontente", "Representa os que reclamaram da fome. Deus ouviu o murmúrio e deu pão e carne.", "Êxodo 16:7–12"),
  // Caná
  P("noivos", "🤵", "Os noivos", "O casal da festa de Caná da Galileia, onde Jesus fez o seu primeiro sinal.", "João 2:1–2 e 9–10"),
  P("mestresala", "🤵", "Mestre-sala", "Quem provou a água transformada em vinho e elogiou o bom vinho que ficou para o fim.", "João 2:9–10"),
  R("convidado", "🧑", "Convidado", "Representa os convidados da festa de casamento em Caná.", "João 2:2"),
  R("convidada", "👩", "Convidada", "Representa as convidadas da festa, que se alegravam com os noivos.", "João 2:2"),
  R("musico", "🎻", "Músico", "Representa a alegria das festas de casamento daquele tempo.", "João 2"),
  // Pães e peixes
  P("menino6", "👦", "O menino dos cinco pães", "Um menino que tinha cinco pães de cevada e dois peixes. Jesus usou o que ele tinha para alimentar a multidão.", "João 6:9"),
  R("mae6", "👩", "Mãe", "Representa as mães que seguiram Jesus com seus filhos, ouvindo-o até tarde.", "Mateus 14:21"),
  R("pescador", "🎣", "Pescador", "Representa os pescadores do mar da Galileia, onde Jesus ensinava.", "João 6:1"),
  R("familia6", "👨‍👩‍👧", "Família da multidão", "Representa as famílias que ficaram no monte e comeram até ficar satisfeitas.", "João 6:10–12"),
  P("discipulo", "🧑", "Discípulo", "Os discípulos distribuíram o pão e o peixe ao povo e recolheram doze cestos de sobras.", "João 6:11–13"),
];
