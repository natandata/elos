// Estratégia de retorno por pessoa (painel de Retenção do admin). Puro e client-safe: recebe os sinais da pessoa (RPC admin_user_signals)
// e devolve UMA estratégia com o porquê, o aviso (push/sino) para ela abrir o app e o presente que a recebe no próximo acesso.

export type Signals = {
  first_name: string;
  role: string;
  signup: string;
  active_days: number;
  active_days_30: number;
  last_day: string | null;
  dev_streak: number;
  dev_date: string | null;
  status_streak: number;
  status_date: string | null;
  game_streak: number;
  game_date: string | null;
  has_push: boolean;
  features: Record<string, number>;
  games: Record<string, number>;
  last_offer: { created_at: string; claimed_at: string | null; shown_at: string | null; push: string; strategy: string; reward_xp: number } | null;
  elo_at_risk: number;
};

export type Bucket = "em_risco" | "dormente" | "perdido";

export type Strategy = {
  id: string;
  /** nome curto da estratégia */
  title: string;
  /** por que esta estratégia para esta pessoa (para o admin) */
  why: string;
  pushTitle: string;
  pushBody: string;
  /** cartão que a pessoa vê ao abrir o app */
  giftTitle: string;
  giftBody: string;
  ctaLabel: string;
  ctaHref: string;
  /** XP de presente (ELOS) */
  xp: number;
  /** aviso para o admin (ex.: sem push) */
  note?: string;
};

export const GAME_LABEL: Record<string, string> = {
  arena: "Arena dos Heróis",
  quiz: "Quiz do Dia",
  who: "Quem Sou Eu?",
  verse: "Complete o Versículo",
  quemdesenha: "Quem Desenha?",
  dress: "Vista o Herói",
  order: "Ordene os Fatos",
  memory: "Memória dos Heróis",
  duel: "Duelo 1x1",
  collection: "Coleção de cartas",
  madureira: "Shopping Elos",
  minearena: "MineArena",
  ultimatribo: "A Última Tribo",
  missao: "Missão Madureira",
  english: "Babel",
  tribos: "Clash of Tribos",
  arenasoccer: "ArenaSoccer",
  biblerush: "Bible Rush",
  arenacampanha: "Campanha da Arena",
};

const GAME_HREF: Record<string, string> = {
  arena: "/app/jogos/arena",
  quiz: "/app/jogos/quiz",
  who: "/app/jogos/quem-sou-eu",
  verse: "/app/jogos/versiculo",
  order: "/app/jogos/ordem",
  quemdesenha: "/app/jogos/quemdesenha",
  dress: "/app/jogos/vestir",
  memory: "/app/jogos/memoria",
  duel: "/app/jogos/duelo",
  collection: "/app/jogos/colecao",
  minearena: "/app/jogos/minearena",
  biblerush: "/app/jogos/biblerush",
  arenasoccer: "/app/jogos/arenasoccer",
  tribos: "/app/jogos/tribos",
  ultimatribo: "/app/jogos/ultimatribo",
  missao: "/app/jogos/missao",
  english: "/app/jogos/ingles",
};

// jogos que não são "jogo de verdade" no feed de atividade
const NOT_GAMES = new Set(["conteudo", "spotcria"]);

const daysBetween = (a: string, b: string) => Math.round((Date.parse(a + "T12:00:00Z") - Date.parse(b + "T12:00:00Z")) / 86_400_000);

/** Presente de XP por tamanho do sumiço. */
export const comebackXp = (bucket: Bucket) => (bucket === "em_risco" ? 2 : bucket === "dormente" ? 3 : 5);

function topEntry(rec: Record<string, number>, skip: Set<string> = new Set()): [string, number] | null {
  let best: [string, number] | null = null;
  for (const [k, v] of Object.entries(rec)) {
    if (skip.has(k)) continue;
    if (!best || v > best[1]) best = [k, v];
  }
  return best;
}

export function pickStrategy(s: Signals, bucket: Bucket, today: string): Strategy {
  const name = s.first_name?.trim() || "amigo";
  const xp = comebackXp(bucket);
  const lost = bucket === "perdido";
  const hello = lost ? `${name}, faz tempo que a gente não te vê por aqui!` : `${name}, sentimos a sua falta!`;
  const noPush = s.has_push ? undefined : "Esta pessoa não ativou as notificações: o aviso aparece só no sino, e o presente só quando ela abrir o app. Vale pedir ao líder para chamar no WhatsApp.";
  const base = { xp, note: noPush };

  // 1) líder: o que mais pesa é o Elo dele
  if (s.role === "leader") {
    const n = s.elo_at_risk;
    return {
      ...base,
      id: "leader_team",
      title: "Chamar o líder para cuidar do Elo",
      why: n > 0 ? `É líder e ${n} ${n === 1 ? "cria do Elo está sumido" : "crias do Elo estão sumidos"}. Voltar tem impacto direto na retenção do grupo.` : "É líder: quando ele volta, o Elo volta junto.",
      pushTitle: `👋 ${name}, o seu Elo está esperando`,
      pushBody: n > 0 ? `${n} ${n === 1 ? "cria do seu Elo está" : "crias do seu Elo estão"} sem abrir o app. Uma mensagem sua faz diferença.` : "Passa aqui hoje e dá um oi para o seu Elo.",
      giftTitle: hello,
      giftBody: n > 0 ? `Seu Elo tem ${n} ${n === 1 ? "pessoa" : "pessoas"} precisando de um chamado. Aqui vai ${xp} XP de boas-vindas.` : `Seu Elo sente a sua falta. Aqui vai ${xp} XP de boas-vindas.`,
      ctaLabel: "Ir para o chat do Elo",
      ctaHref: "/app/chat",
    };
  }

  // 2) sequência que acabou de quebrar (devocional, check-in ou jogos)
  const broke = (streak: number, date: string | null) => streak >= 3 && !!date && daysBetween(today, date) >= 2 && daysBetween(today, date) <= 14;
  if (broke(s.dev_streak, s.dev_date)) {
    return {
      ...base,
      id: "streak_devotional",
      title: "Retomar a sequência do devocional",
      why: `Tinha ${s.dev_streak} dias seguidos de devocional e parou há ${daysBetween(today, s.dev_date!)} dias. Quem já criou o hábito responde bem a "recomeçar a sequência".`,
      pushTitle: `📖 ${name}, sua sequência de ${s.dev_streak} dias parou`,
      pushBody: "Dá para recomeçar hoje: o devocional leva poucos minutos.",
      giftTitle: hello,
      giftBody: `Você chegou a ${s.dev_streak} dias seguidos de devocional. Recomece hoje e ganhe ${xp} XP de presente por voltar.`,
      ctaLabel: "Fazer o devocional",
      ctaHref: "/app/devocional",
    };
  }
  if (broke(s.status_streak, s.status_date)) {
    return {
      ...base,
      id: "streak_status",
      title: "Retomar a sequência do check-in",
      why: `Tinha ${s.status_streak} dias seguidos de check-in e parou há ${daysBetween(today, s.status_date!)} dias.`,
      pushTitle: `🔥 ${name}, sua sequência de ${s.status_streak} dias parou`,
      pushBody: "Responda o check-in de hoje e comece uma nova.",
      giftTitle: hello,
      giftBody: `Você chegou a ${s.status_streak} dias seguidos no check-in. Volte hoje e ganhe ${xp} XP de presente.`,
      ctaLabel: "Fazer o check-in",
      ctaHref: "/app/status",
    };
  }
  if (broke(s.game_streak, s.game_date)) {
    return {
      ...base,
      id: "streak_games",
      title: "Retomar a sequência nos jogos",
      why: `Tinha ${s.game_streak} dias seguidos jogando e parou há ${daysBetween(today, s.game_date!)} dias.`,
      pushTitle: `🎮 ${name}, sua sequência de ${s.game_streak} dias parou`,
      pushBody: "Um jogo rápido hoje e ela recomeça.",
      giftTitle: hello,
      giftBody: `Você chegou a ${s.game_streak} dias seguidos nos jogos. Volte hoje e ganhe ${xp} XP de presente.`,
      ctaLabel: "Ir para os jogos",
      ctaHref: "/app/jogos",
    };
  }

  // 3) quase não chegou a criar hábito
  if (s.active_days <= 2) {
    return {
      ...base,
      id: "first_steps",
      title: "Primeiro passo guiado",
      why: s.active_days === 0 ? "Entrou mas nunca chegou a usar o app. O mais importante é um primeiro passo fácil." : `Abriu só ${s.active_days} ${s.active_days === 1 ? "dia" : "dias"} desde que entrou: ainda não criou hábito.`,
      pushTitle: `👋 ${name}, o seu Elo já está no app`,
      pushBody: "Responda o check-in de hoje, leva 10 segundos, e ganhe XP.",
      giftTitle: `${name}, comece por aqui!`,
      giftBody: `O primeiro passo é rápido: responda o check-in de hoje e conheça o app. Aqui vai ${xp} XP para começar.`,
      ctaLabel: "Fazer o check-in",
      ctaHref: "/app/status",
    };
  }

  // 4) o que a pessoa mais gostava
  const game = topEntry(s.games, NOT_GAMES);
  const gameTotal = Object.entries(s.games).filter(([k]) => !NOT_GAMES.has(k)).reduce((a, [, v]) => a + v, 0);
  const feat = topEntry(s.features);
  const featN = feat?.[1] ?? 0;
  if (game && gameTotal >= 3 && game[1] >= featN / 2) {
    const label = GAME_LABEL[game[0]] ?? "os jogos";
    return {
      ...base,
      id: "favorite_game",
      title: `Trazer de volta pelo jogo favorito (${label})`,
      why: `O que mais fazia no app era jogar ${label} (${game[1]} jogadas nos últimos 90 dias). Voltar pelo que já gosta é o caminho mais curto.`,
      pushTitle: `🎮 ${name}, ${label} está te esperando`,
      pushBody: "Entre hoje e continue de onde parou.",
      giftTitle: hello,
      giftBody: `${label} continua aqui para você. Abra hoje e ganhe ${xp} XP de presente por voltar.`,
      ctaLabel: `Jogar ${label}`,
      ctaHref: GAME_HREF[game[0]] ?? "/app/jogos",
    };
  }
  if (feat) {
    const social = ["post", "story", "like", "comment"];
    if (social.includes(feat[0])) {
      return {
        ...base,
        id: "social_elogram",
        title: "Trazer de volta pelo Elogram",
        why: "Participava mais pelo Elogram (posts, stories, curtidas). Ver o que os amigos postaram é o gatilho mais forte para ele.",
        pushTitle: `💬 ${name}, tem gente postando no Elogram`,
        pushBody: "Veja o que os seus amigos compartilharam.",
        giftTitle: hello,
        giftBody: `Tem novidade no Elogram esperando você. Abra hoje e ganhe ${xp} XP de presente.`,
        ctaLabel: "Abrir o Elogram",
        ctaHref: "/app/elogram",
      };
    }
    if (feat[0] === "chat" || feat[0] === "dm") {
      return {
        ...base,
        id: "social_chat",
        title: "Trazer de volta pelas conversas",
        why: "Participava mais nas conversas (chat do Elo e mensagens). O gatilho é alguém esperando resposta.",
        pushTitle: `💬 ${name}, o seu Elo está conversando`,
        pushBody: "Tem mensagem esperando no chat.",
        giftTitle: hello,
        giftBody: `O pessoal do seu Elo está conversando. Abra hoje e ganhe ${xp} XP de presente.`,
        ctaLabel: "Abrir o chat",
        ctaHref: "/app/chat",
      };
    }
    if (feat[0] === "devotional") {
      return {
        ...base,
        id: "habit_devotional",
        title: "Trazer de volta pelo devocional",
        why: "O devocional era o hábito dele. Um lembrete na hora certa costuma bastar.",
        pushTitle: `📖 ${name}, o devocional de hoje te espera`,
        pushBody: "Poucos minutos com Deus. Que tal agora?",
        giftTitle: hello,
        giftBody: `O devocional de hoje está pronto. Abra e ganhe ${xp} XP de presente por voltar.`,
        ctaLabel: "Fazer o devocional",
        ctaHref: "/app/devocional",
      };
    }
    if (feat[0] === "status") {
      return {
        ...base,
        id: "habit_status",
        title: "Trazer de volta pelo check-in",
        why: "O check-in diário era o hábito dele. Ele é rápido, então é uma porta de entrada fácil.",
        pushTitle: `🙂 ${name}, como você está hoje?`,
        pushBody: "Responda o check-in em 10 segundos.",
        giftTitle: hello,
        giftBody: `Conta como você está hoje e ganhe ${xp} XP de presente por voltar.`,
        ctaLabel: "Responder o check-in",
        ctaHref: "/app/status",
      };
    }
  }

  // 5) geral
  return {
    ...base,
    id: "general",
    title: "Convite geral para voltar",
    why: "Sem um padrão claro de uso. O melhor é um convite simples com um presente pequeno.",
    pushTitle: `👋 ${name}, sentimos a sua falta`,
    pushBody: "Tem novidade no ELOS e um presente esperando por você.",
    giftTitle: hello,
    giftBody: `Preparamos um presente de ${xp} XP para você voltar. Tem novidade esperando.`,
    ctaLabel: "Ver as novidades",
    ctaHref: "/app",
  };
}

/** Situação da última estratégia ativada para a pessoa (para o admin acompanhar o resultado). */
export function offerStatus(s: Signals, today: string): { label: string; tone: "neutral" | "good" | "warn"; blocked: boolean } | null {
  const o = s.last_offer;
  if (!o) return null;
  const sentDay = new Date(o.created_at).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const ago = Math.max(0, daysBetween(today, sentDay));
  const when = ago === 0 ? "hoje" : `há ${ago} ${ago === 1 ? "dia" : "dias"}`;
  if (o.claimed_at) return { label: `Voltou e resgatou o presente (ativada ${when})`, tone: "good", blocked: ago < 7 };
  if (o.shown_at) return { label: `Abriu o app depois da estratégia (ativada ${when})`, tone: "good", blocked: ago < 7 };
  return { label: `Ativada ${when}: aguardando a pessoa abrir o app${o.push === "pending" ? " (aviso sai às 20h)" : ""}`, tone: "warn", blocked: ago < 7 };
}
