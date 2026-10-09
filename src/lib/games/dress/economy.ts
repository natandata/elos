// Economia do "Vista o Herói" (client-safe). A conta de verdade é feita no banco (migração 0182); aqui ficam só os textos e números que a tela mostra.

/** Bilhetes Dourados por colocação numa partida com as amigas. */
export const PLACE_TICKETS = [30, 20, 10] as const;
/** No Mega Desfile os prêmios valem o dobro. */
export const MEGA_MULTIPLIER = 2;
/** Quantos bilhetes valem 1 XP. */
export const TICKETS_PER_XP = 300;
export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 10;

export type MissionKey = "d_play3" | "d_vote15" | "d_podium" | "w_play10" | "w_play25" | "w_win2" | "w_vote60" | "w_mega" | "o_firstwin";

export const MISSION_TEXT: Record<MissionKey, { icon: string; title: string; hint: string }> = {
  d_play3: { icon: "🎭", title: "Jogue 3 partidas hoje", hint: "Qualquer partida com as amigas conta." },
  d_vote15: { icon: "⭐", title: "Dê estrelas para 15 looks hoje", hint: "Avalie as outras modelos no desfile." },
  d_podium: { icon: "🏅", title: "Chegue ao pódio hoje", hint: "Fique entre as 3 primeiras de uma partida." },
  w_play10: { icon: "🎪", title: "Jogue 10 partidas na semana", hint: "A semana vai de segunda a domingo." },
  w_play25: { icon: "🌟", title: "Jogue 25 partidas na semana", hint: "Para as incansáveis!" },
  w_win2: { icon: "👑", title: "Vença 2 partidas na semana", hint: "1º lugar com pelo menos 3 jogadoras." },
  w_vote60: { icon: "💫", title: "Dê 60 estrelas na semana", hint: "Cada nota que você dá conta uma vez." },
  w_mega: { icon: "🎆", title: "Participe do Mega Desfile", hint: "Todo domingo, às 15h." },
  o_firstwin: { icon: "🏆", title: "Sua primeira vitória", hint: "Vale uma vez só. Seja a 1ª da passarela!" },
};

export type Mission = { key: MissionKey; period: "day" | "week" | "once"; target: number; reward: number; progress: number; claimed: boolean };

export const PERIOD_LABEL: Record<Mission["period"], string> = { day: "Hoje", week: "Esta semana", once: "Conquista" };
