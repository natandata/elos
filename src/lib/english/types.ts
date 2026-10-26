// Babel: tipos do conteúdo e das conversas. Client-safe (nada de banco aqui).
// Os textos ensinados são em inglês; as instruções e explicações são em português (pt-BR).

/** Escolha: ler a pergunta (use ___ para lacuna) e tocar na opção certa. Com `say`, o aluno ouve a frase em vez de ler. */
export type McEx = { k: "mc"; q: string; opts: string[]; a: number; ex: string; why?: (string | null)[]; say?: string };
/** Montar a frase com o banco de palavras (português -> inglês). `ans` aceita variações; `bank` tem as palavras e as distrações. */
export type TrEx = { k: "tr"; pt: string; ans: string[]; bank: string[]; ex: string };
/** Digitar a resposta em inglês (tradução, carta de imagem, "diga digitando"). `prompt` pode ser um emoji ou uma pergunta. */
export type TyEx = { k: "ty"; prompt: string; hint?: string; ans: string[]; ex: string };
/** Ligar pares inglês <-> português. */
export type MtEx = { k: "mt"; pairs: [string, string][]; ex: string };
/** Ouvir a frase e digitar o que ouviu. */
export type LsEx = { k: "ls"; say: string; ans: string[]; ex: string };

export type Exercise = (McEx | TrEx | TyEx | MtEx | LsEx) & { id: string };
/** Exercício como escrito no conteúdo (o `id` é gerado a partir da lição). */
export type RawExercise = McEx | TrEx | TyEx | MtEx | LsEx;

export type Lesson = { id: string; unit: number; n: number; title: string; exercises: Exercise[] };
export type Unit = { n: number; title: string; emoji: string; level: "A1" | "A2" | "B1"; about: string; lessons: Lesson[]; roleplay?: string };

/** Uma vez do aluno numa conversa: escolher entre respostas prontas e/ou digitar. */
export type RpOption = { en: string; q: 2 | 1 | 0; why: string };
export type RpTurn = {
  npc: { en: string; pt: string };
  /** O que a pessoa quer dizer (instrução em português). */
  you: string;
  options?: RpOption[];
  /** Respostas digitadas que valem como certas. */
  ans?: string[];
  /** Padrões (expressão regular, sobre o texto já normalizado) que valem como certos, ex.: "my name is <qualquer nome>". */
  re?: string[];
  /** Grupos de palavras: bastam as de UM dos grupos para valer como "quase" (resposta parcial). */
  keys?: string[][];
  /** Dica quando erra ou fica parcial. */
  tip: string;
  /** Resposta-modelo, mostrada no fim como frase nova. */
  model: string;
};
export type Roleplay = { id: string; title: string; emoji: string; unit: number; who: { name: string; emoji: string; role: string }; intro: string; turns: RpTurn[] };

export type TurnResult = { turn: number; reply: string; q: 0 | 1 | 2 };
export type RpReport = { accuracy: number; complexity: number; complexityLabel: string; words: number; tips: string[]; phrases: string[] };
