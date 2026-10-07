// ArenaSoccer online: o aparelho de quem criou a sala (anfitrião) roda a partida e manda o estado ~20 vezes por segundo;
// o convidado manda só os controles e desenha o que recebe. O transporte (Realtime) é entregue pela tela.
import type { Game, GameEvent } from "./engine";

export type SoccerNet = {
  role: "host" | "guest";
  send: (event: "snap" | "inp" | "hello" | "skip", payload: unknown) => void;
  on: (event: "snap" | "inp" | "hello" | "skip", fn: (payload: unknown) => void) => () => void;
  myName: string;
  oppName: string;
  /** cor do disco do anfitrião (a do convidado é sempre a mais distinta dela) */
  hostColor: string;
};

/** Mensagem do convidado: controles no referencial do campo. */
export type InputMsg = { mx: number; my: number; kick: boolean };

/** Estado da partida que o anfitrião manda. */
export type Snap = {
  /** segundos da abertura (−1 = já acabou) */
  i: number;
  ph: Game["phase"];
  pt: number;
  s: [number, number];
  tl: number;
  ot: number;
  ol: number;
  pl: number;
  w: number;
  /** discos: x, y, vx, vy */
  p: number[][];
  b: number[];
  ev: GameEvent[];
};

const r1 = (n: number) => Math.round(n * 10) / 10;

export function makeSnap(g: Game, introT: number, ev: GameEvent[]): Snap {
  return {
    i: introT,
    ph: g.phase,
    pt: r1(g.phaseT),
    s: [g.score[0], g.score[1]],
    tl: r1(g.timeLeft),
    ot: g.overtime ? 1 : 0,
    ol: r1(g.overtimeLeft),
    pl: r1(g.played),
    w: g.winner === null ? -1 : g.winner,
    p: g.players.map((d) => [r1(d.x), r1(d.y), Math.round(d.vx), Math.round(d.vy)]),
    b: [r1(g.ball.x), r1(g.ball.y), Math.round(g.ball.vx), Math.round(g.ball.vy)],
    ev,
  };
}

/** Guarda os números do estado recebido no jogo do convidado (a posição só se aproxima do alvo, para o movimento ficar suave). */
export function applySnap(g: Game, s: Snap, targets: { x: number; y: number }[], ball: { x: number; y: number }): void {
  g.phase = s.ph;
  g.phaseT = s.pt;
  g.score = [s.s[0], s.s[1]];
  g.timeLeft = s.tl;
  g.overtime = !!s.ot;
  g.overtimeLeft = s.ol;
  g.played = s.pl;
  g.winner = s.w < 0 ? null : (s.w as 0 | 1);
  s.p.forEach((d, i) => {
    const p = g.players[i];
    if (!p) return;
    targets[i] = { x: d[0], y: d[1] };
    p.vx = d[2];
    p.vy = d[3];
  });
  ball.x = s.b[0];
  ball.y = s.b[1];
  g.ball.vx = s.b[2];
  g.ball.vy = s.b[3];
}
