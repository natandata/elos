// ArenaSoccer online em equipe: o estado da sala e a montagem da partida (igual nos aparelhos de todos).
import type { MatchSpec, Slot } from "./engine";
import type { PlaySpec } from "@/components/arenasoccer/ArenaSoccerGame";
import type { Seat } from "./net";
import { autoPick, kitOf, levelFor, loadCup, loadLeague, resolveKits, type LeagueKey, type RosterPlayer, type Team } from "./teams";

/** "cup:2026" ou "league:br" + o id do time dentro dela. */
export type TeamRef = { src: string; id: string };
/** `pick` é o índice do jogador em `team.players`; -1 deixa o computador escolher. */
export type Member = { uid: string; name: string; side: 0 | 1; pick: number };
export type RoomState = { per: 2 | 3 | 4; teams: [TeamRef, TeamRef]; hostUid: string; members: Member[] };

export async function loadTeam(ref: TeamRef): Promise<Team | null> {
  const [kind, key] = ref.src.split(":");
  const list = kind === "cup" ? (await loadCup(Number(key))).teams : kind === "league" ? (await loadLeague(key as LeagueKey)).teams : [];
  return list.find((t) => t.id === ref.id) ?? null;
}

const DEPTH: Record<string, number> = { FW: 0, MF: 1, DF: 2, GK: 3 };
const slotOf = (p: RosterPlayer): Slot => ({ num: p[0], pos: p[1], name: p[2], ovr: p[3] });

/** Quantos já estão em cada lado. */
export const countSide = (s: RoomState, side: 0 | 1) => s.members.filter((m) => m.side === side).length;

/** Monta a partida: quem é gente joga com o jogador escolhido; as vagas vazias o computador preenche. */
export function buildMatch(state: RoomState, teams: [Team, Team]): { spec: PlaySpec; seats: Record<string, Seat> } {
  const per = state.per;
  const sides: { slot: Slot; uid?: string }[][] = [[], []];
  for (const side of [0, 1] as const) {
    const team = teams[side];
    const used = new Set<number>();
    const entries: { slot: Slot; uid?: string }[] = [];
    for (const m of state.members.filter((x) => x.side === side).slice(0, per)) {
      let idx = m.pick >= 0 && m.pick < team.players.length && !used.has(m.pick) ? m.pick : -1;
      if (idx < 0) {
        // sem escolha (ou repetida): o melhor que sobrou, dando preferência a quem não é goleiro
        idx = team.players
          .map((p, i) => ({ p, i }))
          .filter((x) => !used.has(x.i) && x.p[1] !== "GK")
          .sort((a, b) => b.p[3] - a.p[3])[0]?.i ?? 0;
      }
      used.add(idx);
      entries.push({ slot: slotOf(team.players[idx]), uid: m.uid });
    }
    for (const p of autoPick(team, per + used.size)) {
      if (entries.length >= per) break;
      if (entries.some((e) => e.slot.num === p[0] && e.slot.name === p[2])) continue;
      entries.push({ slot: slotOf(p) });
    }
    entries.sort((a, b) => (DEPTH[a.slot.pos] ?? 2) - (DEPTH[b.slot.pos] ?? 2) || b.slot.ovr - a.slot.ovr);
    sides[side] = entries.slice(0, per);
  }
  const match: MatchSpec = { teams: [sides[0].map((e) => e.slot), sides[1].map((e) => e.slot)], secs: 200, goalsToWin: 5 };
  const [k0, k1] = resolveKits(kitOf(teams[0]), kitOf(teams[1]));
  const spec: PlaySpec = { match, kits: [k0, k1], names: [teams[0].name, teams[1].name], level: [levelFor(teams[1].str, teams[0].str), levelFor(teams[0].str, teams[1].str)], label: `${per} × ${per}` };
  const humanDiscs: { uid: string; side: 0 | 1; disc: number }[] = [];
  for (const side of [0, 1] as const) sides[side].forEach((e, i) => e.uid && humanDiscs.push({ uid: e.uid, side, disc: side * per + i }));
  const seats: Record<string, Seat> = {};
  for (const h of humanDiscs) seats[h.uid] = { side: h.side, disc: h.disc, remote: humanDiscs.filter((o) => o.uid !== h.uid).map((o) => o.disc) };
  return { spec, seats };
}
