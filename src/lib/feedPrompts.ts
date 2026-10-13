// Tema do dia do Elogram: mesmo tema pra todo mundo o dia inteiro (prova social —
// "várias pessoas postando sobre a mesma coisa hoje" puxa mais gente a postar do que
// um convite genérico). São 30 temas que giram em sequência, um por dia (sem repetir
// dentro de 30 dias), pelo dia do calendário de São Paulo. Sem tabela nova.
export type DailyTheme = { emoji: string; text: string };

const THEMES: readonly DailyTheme[] = [
  { emoji: "🍕", text: "O lanche que merece um “aleluia”" },
  { emoji: "🎧", text: "A música que não sai do seu fone" },
  { emoji: "📖", text: "Seu versículo do momento: no caderno ou na Bíblia" },
  { emoji: "🥱", text: "Selfie de quem acordou cedo (vale cara de sono)" },
  { emoji: "🐶", text: "Seu pet ou o bicho mais fofo que você viu hoje" },
  { emoji: "👟", text: "O tênis (ou chinelo) oficial do seu rolê" },
  { emoji: "🤝", text: "Você e um amigo do Elo em pose de dupla" },
  { emoji: "🌅", text: "O céu de hoje: sol, nuvem, chuva, vale tudo" },
  { emoji: "🎒", text: "O caos da sua mochila" },
  { emoji: "🎮", text: "O que você está jogando ou assistindo agora" },
  { emoji: "✏️", text: "Um desenho seu: pode ser rabisco, vale!" },
  { emoji: "🥤", text: "Sua bebida do dia, versão obra de arte" },
  { emoji: "🧠", text: "A matéria da escola que você ama (ou finge amar)" },
  { emoji: "🙌", text: "Um momento de adoração do seu jeito" },
  { emoji: "🤣", text: "A foto mais engraçada da sua galeria" },
  { emoji: "🪴", text: "Um cantinho do seu quarto" },
  { emoji: "🕺", text: "Seu passinho de dança (ou só o pé dele)" },
  { emoji: "🍫", text: "Seu doce favorito: confesse sem culpa" },
  { emoji: "🧢", text: "O acessório que tem a sua cara: boné, óculos, brinco…" },
  { emoji: "🏆", text: "Uma vitória de hoje, pequena ou gigante" },
  { emoji: "🚌", text: "O caminho da sua casa até o rolê" },
  { emoji: "🌳", text: "O verde mais bonito que você achou hoje" },
  { emoji: "🙏", text: "Pelo que você agradece hoje (escreva num papel!)" },
  { emoji: "🎸", text: "Seu instrumento, ou o que você sonha em tocar" },
  { emoji: "👀", text: "Algo que você viu e pensou “só Deus”" },
  { emoji: "🍳", text: "Sua refeição em modo chef" },
  { emoji: "🤪", text: "Sua careta mais criativa" },
  { emoji: "📚", text: "O que está na sua mesa de estudo" },
  { emoji: "💌", text: "Um bilhete de incentivo para alguém do Elo" },
  { emoji: "⚽", text: "Seu esporte ou brincadeira favorita" },
];

function todayBR(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

/** Tema de hoje: dia do calendário (SP) desde 1970, módulo 30 — um tema por dia, em rodízio. */
export function dailyFeedTheme(): DailyTheme {
  const [y, m, d] = todayBR().split("-").map(Number);
  const day = Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
  return THEMES[day % THEMES.length];
}

/** Só o texto (com o emoji na frente), pra mostrar dentro do formulário de postar. */
export function dailyFeedPrompt(): string {
  const t = dailyFeedTheme();
  return `${t.emoji} ${t.text}`;
}
