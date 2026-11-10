"use client";

import type { Team } from "@/lib/arenasoccer/teams";
import type { MatchResult } from "./ArenaSoccerGame";
import { MatchFlow } from "./ArenaSoccerMatch";

export { KitChip } from "./match/KitChip";

/**
 * Uma partida de campeonato: escalação e tática, o jogo (estilo Brasfoot, com lances decisivos jogados na mão) e o resultado.
 * `onDone` recebe o resultado. O lado 0 é sempre o seu time. (`secs`, `goalsToWin` e `color` ficam por compatibilidade com a Copa e o Brasileirão.)
 */
export function PlayFlow({ mine, opp, label, final, onDone, onSim, onBack }: { mine: Team; opp: Team; label: string; final?: string; secs?: number; goalsToWin?: number; color?: string; onDone: (r: MatchResult) => void; onSim?: () => void; onBack: () => void }) {
  return <MatchFlow mine={mine} opp={opp} label={label} final={final} onDone={onDone} onSim={onSim} onBack={onBack} />;
}
