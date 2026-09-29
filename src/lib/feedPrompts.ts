// Tema do dia do Explorar: mesmo tema pra todo mundo o dia inteiro (prova
// social — "várias pessoas postando sobre a mesma coisa hoje" puxa mais gente
// a postar do que um convite genérico). Escolha determinística por dia do
// ano, sem tabela nova: só uma lista fixa + o mesmo cálculo de "hoje" (fuso
// de São Paulo) já usado em record_devotional_streak()/todayBR().
const PROMPTS = [
  "Um momento que te fez sorrir hoje",
  "Algo que você aprendeu essa semana",
  "Seu lanche ou refeição de hoje",
  "Uma foto com alguém do seu Elo",
  "O que você está lendo ou ouvindo agora",
  "Um lugar onde você esteve hoje",
  "Algo pelo que você é grato hoje",
  "Sua vibe de hoje, em uma foto",
  "Um detalhe pequeno que passaria despercebido",
  "Algo que te lembrou de Deus hoje",
  "Uma conquista, por menor que seja",
  "Quem te fez companhia hoje",
  "Uma foto de bastidor do seu dia",
  "Algo bonito que você viu hoje",
  "Seu momento de descanso do dia",
] as const;

function todayBR(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

/** Índice estável pro dia inteiro: soma dos dígitos da data ("YYYY-MM-DD"
 *  sem os hífens) módulo o tamanho da lista — não precisa calcular dia do
 *  ano, só evita repetir o tema de ontem sempre no mesmo padrão previsível. */
export function dailyFeedPrompt(): string {
  const digits = todayBR().replace(/-/g, "");
  let hash = 0;
  for (const ch of digits) hash = (hash * 31 + Number(ch)) % PROMPTS.length;
  return PROMPTS[hash];
}
