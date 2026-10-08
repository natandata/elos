// Sugestões do devocional de 15 minutos (tela inicial). Passagens da Bíblia NVI ligadas a questões que
// adolescentes enfrentam. Só a referência, o tema e as perguntas: o texto é lido na Bíblia (NVI) do jovem.

export type Suggestion = {
  theme: string;
  ref: string;
  /** pergunta para pensar depois de ler */
  ask: string;
  /** motivo de oração para o começo e o fim */
  pray: string;
};

export const SUGGESTIONS: Suggestion[] = [
  { theme: "Ansiedade", ref: "Filipenses 4:6-7", ask: "O que está te deixando ansioso hoje? Que parte dele você consegue entregar a Deus agora?", pray: "Entregar as preocupações e pedir a paz de Deus" },
  { theme: "Quem eu sou", ref: "Salmos 139:13-16", ask: "O que muda na forma como você se vê se Deus planejou cada detalhe seu?", pray: "Agradecer por ter sido feito de forma especial" },
  { theme: "Pressão dos amigos", ref: "Provérbios 13:20", ask: "Quem te puxa para perto de Deus? E quem te afasta?", pray: "Pedir sabedoria para escolher boas amizades" },
  { theme: "Medo do futuro", ref: "Jeremias 29:11-13", ask: "Qual é o seu maior medo sobre o futuro? O que Deus promete aqui para quem o busca?", pray: "Confiar o futuro a Deus" },
  { theme: "Pureza", ref: "Salmos 119:9-11", ask: "Como a Palavra guardada no coração ajuda você a dizer não ao que machuca?", pray: "Pedir ajuda para viver de forma pura" },
  { theme: "Solidão", ref: "Salmos 34:17-18", ask: "Quando você se sentiu sozinho, quem esteve perto? Como Deus se aproxima de quem sofre?", pray: "Sentir a presença de Deus e lembrar de quem está só" },
  { theme: "Quando eu falho", ref: "Provérbios 24:16", ask: "Qual foi a última vez que você caiu? O que significa levantar de novo com Deus?", pray: "Pedir força para recomeçar sem desistir" },
  { theme: "Perdão", ref: "Efésios 4:31-32", ask: "Existe alguém que você precisa perdoar? Qual é o primeiro passo?", pray: "Pedir um coração que perdoa como Cristo perdoou" },
  { theme: "Comparação", ref: "1 Samuel 16:7", ask: "Com quem você costuma se comparar? O que Deus olha em você?", pray: "Agradecer pelo valor que Deus vê em você" },
  { theme: "Redes sociais", ref: "Gálatas 1:10", ask: "Você posta e age para agradar a quem? O que mudaria se agradar a Deus fosse a prioridade?", pray: "Pedir liberdade da busca por curtidas e aprovação" },
  { theme: "Raiva", ref: "Tiago 1:19-20", ask: "O que costuma te irritar? Como ser mais rápido para ouvir e mais lento para se irar?", pray: "Pedir domínio sobre as emoções" },
  { theme: "Propósito", ref: "Eclesiastes 12:1", ask: "Por que lembrar de Deus agora, na juventude, é tão importante?", pray: "Entregar os planos e a juventude a Deus" },
  { theme: "Honrar os pais", ref: "Efésios 6:1-3", ask: "Em que situação é mais difícil obedecer em casa? O que você pode fazer diferente hoje?", pray: "Orar pela sua família e por paciência em casa" },
  { theme: "Dúvidas na fé", ref: "Marcos 9:23-24", ask: "Quais dúvidas você tem? Como dizer a Deus, como esse pai: eu creio, ajuda a minha incredulidade?", pray: "Ser sincero com Deus sobre as dúvidas" },
  { theme: "Tentação", ref: "1 Coríntios 10:13", ask: "Qual tentação mais te ronda? Que saída Deus já te deu?", pray: "Pedir ajuda para enxergar a saída" },
  { theme: "Estudos e trabalho", ref: "Colossenses 3:23", ask: "O que muda se você estudar e trabalhar como para o Senhor?", pray: "Pedir disposição e foco" },
  { theme: "Amizade verdadeira", ref: "Eclesiastes 4:9-10", ask: "Que tipo de amigo você é? Quem precisa da sua companhia hoje?", pray: "Agradecer pelos amigos e orar por um deles" },
  { theme: "Tristeza", ref: "Salmos 42:5", ask: "Do que a sua alma está abatida? O que significa esperar em Deus nesse momento?", pray: "Derramar o coração diante de Deus" },
  { theme: "Verdade", ref: "Efésios 4:25", ask: "Em que situação é mais tentador mentir? Como ser sincero com amor?", pray: "Pedir coragem para falar a verdade" },
  { theme: "Gratidão", ref: "1 Tessalonicenses 5:16-18", ask: "Por quais três coisas você é grato hoje, mesmo num dia difícil?", pray: "Fazer uma oração só de gratidão" },
  { theme: "Coragem", ref: "Josué 1:9", ask: "O que te dá medo de enfrentar? Como saber que Deus está com você nisso?", pray: "Pedir coragem para uma situação concreta" },
  { theme: "Palavras", ref: "Efésios 4:29", ask: "Suas palavras de hoje edificaram ou machucaram alguém?", pray: "Pedir que suas palavras abençoem" },
  { theme: "Bullying e ofensas", ref: "Romanos 12:17-21", ask: "Como vencer o mal com o bem quando alguém te trata mal?", pray: "Orar por quem te machuca" },
  { theme: "Paz", ref: "João 14:27", ask: "Qual é a diferença entre a paz de Jesus e a paz que o mundo oferece?", pray: "Receber a paz de Cristo" },
  { theme: "Tempo e telas", ref: "Efésios 5:15-16", ask: "Onde o seu tempo mais vai? Você tem aproveitado bem as oportunidades?", pray: "Pedir sabedoria para usar o tempo" },
  { theme: "Meu corpo", ref: "1 Coríntios 6:19-20", ask: "O que significa honrar a Deus com o corpo que ele te deu?", pray: "Agradecer pelo corpo e pedir cuidado" },
  { theme: "Não desistir", ref: "Gálatas 6:9", ask: "Em que você está cansado de fazer o bem? O que Deus promete para quem não desanima?", pray: "Pedir perseverança" },
  { theme: "Humildade", ref: "Filipenses 2:3-4", ask: "Como você pode colocar alguém à frente de você hoje?", pray: "Pedir um coração humilde" },
  { theme: "Boas escolhas", ref: "Provérbios 3:5-6", ask: "Qual decisão você está tomando agora? Já pediu direção a Deus?", pray: "Entregar uma decisão a Deus" },
  { theme: "Generosidade", ref: "2 Coríntios 9:7", ask: "O que você pode dar hoje: tempo, ajuda, atenção?", pray: "Pedir um coração alegre para dar" },
  { theme: "Liberdade dos vícios", ref: "Gálatas 5:1", ask: "O que tem prendido você? Com quem pode conversar sobre isso?", pray: "Pedir libertação e coragem para buscar ajuda" },
  { theme: "Perdas e luto", ref: "João 11:25-26", ask: "O que a promessa de Jesus sobre a vida muda diante da perda?", pray: "Consolo para quem está de luto" },
  { theme: "Ser luz", ref: "Mateus 5:14-16", ask: "Onde você é a única luz num lugar? Como brilhar sem se exibir?", pray: "Pedir que sua vida aponte para Deus" },
  { theme: "Cansaço", ref: "Mateus 11:28-30", ask: "O que está pesando em você? O que significa descansar em Jesus?", pray: "Entregar o cansaço" },
  { theme: "Inveja", ref: "Provérbios 14:30", ask: "O que você inveja? O que isso diz sobre o que você valoriza?", pray: "Pedir contentamento" },
  { theme: "Esperança", ref: "Romanos 15:13", ask: "Do que você precisa de esperança agora?", pray: "Pedir alegria e esperança" },
  { theme: "Aprender a orar", ref: "Mateus 7:7-8", ask: "Qual pedido você ainda não fez a Deus por achar pequeno ou grande demais?", pray: "Pedir, buscar e bater à porta" },
  { theme: "Firmeza", ref: "Daniel 1:8", ask: "Em que situação você precisa decidir ser fiel, mesmo que todos ao redor façam diferente?", pray: "Pedir firmeza nas convicções" },
  { theme: "Ser diferente", ref: "Romanos 12:2", ask: "Em que você tem se moldado ao mundo? O que é renovar a mente?", pray: "Pedir uma mente renovada" },
  { theme: "Nova vida", ref: "2 Coríntios 5:17", ask: "O que o velho eu precisa deixar para trás hoje?", pray: "Agradecer por ser nova criação em Cristo" },
  { theme: "Amar o próximo", ref: "João 13:34-35", ask: "Quem é difícil de amar para você? Como amar na prática?", pray: "Pedir amor como o de Cristo" },
  { theme: "Autocontrole", ref: "Provérbios 25:28", ask: "Em que área você mais perde o controle? O que protege a sua cidade por dentro?", pray: "Pedir domínio próprio" },
  { theme: "Quando Deus parece calado", ref: "Isaías 55:8-9", ask: "Que oração parece sem resposta? O que significa confiar nos caminhos de Deus?", pray: "Confiar mesmo sem entender" },
  { theme: "Provações", ref: "Tiago 1:2-4", ask: "Que provação você enfrenta? O que Deus pode estar formando em você?", pray: "Pedir perseverança na prova" },
  { theme: "Contentamento", ref: "Filipenses 4:11-13", ask: "O que você acha que precisa ter para ser feliz? O que Paulo aprendeu?", pray: "Pedir um coração contente" },
  { theme: "Missão", ref: "Mateus 28:19-20", ask: "Quem poderia ouvir de Jesus por meio de você esta semana?", pray: "Orar por um amigo que não conhece Jesus" },
  { theme: "Confiança", ref: "Salmos 56:3-4", ask: "Quando o medo vem, em quem você confia?", pray: "Declarar confiança em Deus" },
  { theme: "Culpa", ref: "1 João 1:9", ask: "Há algo que você precisa confessar a Deus para se sentir livre?", pray: "Confessar e receber perdão" },
  { theme: "Sabedoria", ref: "Tiago 1:5", ask: "Em que você precisa de sabedoria hoje?", pray: "Pedir sabedoria sem duvidar" },
  { theme: "Fé que age", ref: "Tiago 2:17-18", ask: "Que atitude concreta mostra a fé que você diz ter?", pray: "Pedir uma fé que se vê nas ações" },
  { theme: "Encorajar", ref: "1 Tessalonicenses 5:11", ask: "Quem precisa de uma palavra de ânimo hoje? Que tal enviar agora?", pray: "Orar por alguém desanimado" },
  { theme: "Identidade em Deus", ref: "Efésios 2:10", ask: "Que boas obras Deus preparou para você fazer?", pray: "Agradecer por ser obra de Deus" },
  { theme: "Rejeição", ref: "Salmos 27:10", ask: "Quando você se sentiu rejeitado, como foi saber que Deus te acolhe?", pray: "Entregar a dor da rejeição" },
  { theme: "Medo de falar de Jesus", ref: "2 Timóteo 1:7", ask: "O que mais te trava para falar da sua fé?", pray: "Pedir poder, amor e equilíbrio" },
  { theme: "Escolher o bem", ref: "Romanos 12:9", ask: "O que significa amar sem fingimento e fugir do mal?", pray: "Pedir um amor sincero" },
  { theme: "Mudanças", ref: "Salmos 46:1-2", ask: "O que está mudando na sua vida? Onde está o seu refúgio?", pray: "Encontrar refúgio em Deus" },
  { theme: "Sonhos e talentos", ref: "1 Pedro 4:10", ask: "Que dom você tem para servir aos outros?", pray: "Pedir ajuda para usar os dons" },
  { theme: "Domingo e igreja", ref: "Hebreus 10:24-25", ask: "O que a comunidade da igreja tem ajudado você a viver?", pray: "Agradecer pelos irmãos" },
];

/** Passagem do dia: muda todo dia e percorre a lista toda antes de repetir. */
export function suggestionFor(isoDate: string): Suggestion {
  const day = Math.floor(new Date(`${isoDate}T00:00:00Z`).getTime() / 86_400_000);
  return SUGGESTIONS[((day % SUGGESTIONS.length) + SUGGESTIONS.length) % SUGGESTIONS.length];
}
