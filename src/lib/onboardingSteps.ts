export type TourStep = {
  /** Se ausente, o passo mostra o card sobre a tela em que a pessoa já está. */
  path?: string;
  /** Seletor CSS do elemento real a destacar — "h1" cai no título da tela (todo PageHeader tem um). */
  selector: string;
  title: string;
  body: string;
};

export const CRIA_TOUR: TourStep[] = [
  {
    selector: "h1",
    title: "Bem-vindo ao ELOS! 👋",
    body: "Esse é o app do seu Elo — aqui você acompanha missões, seu XP e conversa com o grupo. Vamos dar uma volta rápida pelas telas principais?",
  },
  {
    path: "/app/cria",
    selector: "[data-tour='xp-card']",
    title: "Seu XP",
    body: "Cada missão aprovada e cada dia respondendo o status rendem XP. Suba de nível e apareça no ranking do seu Elo.",
  },
  {
    path: "/app/cria/missoes",
    selector: "h1",
    title: "Missões",
    body: "Aqui aparecem as missões que seu líder (ou o admin) criou pra você. Envie pra aprovação quando terminar e ganhe o XP.",
  },
  {
    path: "/app/chat",
    selector: "h1",
    title: "Chat do Elo",
    body: "Fale com seu líder e o resto do grupo aqui. As mensagens somem depois de 24h.",
  },
  {
    path: "/app/feed",
    selector: "[data-tour='feed-composer']",
    title: "Explorar",
    body: "Poste fotos vistas por todo mundo da plataforma. Só as 9 mais recentes ficam no Explorar — a cada foto nova, a mais antiga sai. Reaja e comente nas dos outros.",
  },
  {
    path: "/app/perfil",
    selector: "h1",
    title: "Seu Perfil",
    body: "Ajuste seu nome, foto, crie um @ pra aparecer no feed, e ligue as notificações no celular. Pode rever esse tutorial aqui quando quiser.",
  },
];

export const LEADER_TOUR: TourStep[] = [
  {
    selector: "h1",
    title: "Bem-vindo, líder! 👋",
    body: "Você é responsável por acompanhar de perto os crias do seu Elo. Vamos passar pelas telas principais?",
  },
  {
    path: "/app/lider",
    selector: "[data-tour='xp-card']",
    title: "Seu painel",
    body: 'Aqui você vê o resumo do Elo: XP médio, ranking e um alerta imediato se algum cria responder "Mal" no status.',
  },
  {
    path: "/app/lider/status-crias",
    selector: "h1",
    title: "Status dos crias",
    body: "Veja o histórico de cada cria e registre o que foi feito depois de um alerta. Também é aqui que você aprova pedidos de conversa.",
  },
  {
    path: "/app/lider/missoes",
    selector: "h1",
    title: "Missões",
    body: "Crie missões individuais ou coletivas pros seus crias, e aprove o que eles enviarem. Missões do admin também aparecem aqui, marcadas.",
  },
  {
    path: "/app/chat",
    selector: "h1",
    title: "Chat do Elo",
    body: "Converse com todo o Elo. Se um cria mandar mensagem e ninguém responder em algumas horas, você recebe um lembrete.",
  },
  {
    path: "/app/feed",
    selector: "[data-tour='feed-composer']",
    title: "Explorar",
    body: "Poste fotos vistas por toda a plataforma, e destaque o melhor post da semana do seu Elo pelo menu ⋯ de qualquer post.",
  },
  {
    path: "/app/agenda",
    selector: "h1",
    title: "Agenda",
    body: "Veja e confirme presença em eventos do Elo e exclusivos de liderança.",
  },
  {
    path: "/app/perfil",
    selector: "h1",
    title: "Seu Perfil",
    body: "Ajuste seus dados, crie um @, ligue notificações no celular. Pode rever esse tutorial por aqui quando quiser.",
  },
];
