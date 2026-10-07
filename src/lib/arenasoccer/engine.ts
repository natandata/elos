// ArenaSoccer: motor de física 2D (puro, sem tela). Discos, bola, paredes, traves, gols, chute e partida.
// Coordenadas lógicas: o campo vai de (0,0) a (w,h). O time 0 (azul) defende o gol da esquerda e ataca para a direita.

export type Mode = "1v1" | "2v2" | "3v3" | "4v4";
export type Level = "easy" | "normal" | "hard";

export const MODES: Record<Mode, { per: number; w: number; h: number; goals: number; secs: number; label: string }> = {
  "1v1": { per: 1, w: 900, h: 520, goals: 3, secs: 180, label: "1 contra 1" },
  "2v2": { per: 2, w: 1000, h: 560, goals: 5, secs: 180, label: "2 contra 2" },
  "3v3": { per: 3, w: 1150, h: 640, goals: 5, secs: 240, label: "3 contra 3" },
  "4v4": { per: 4, w: 1300, h: 720, goals: 7, secs: 240, label: "4 contra 4" },
};

export const PLAYER_R = 24;
export const BALL_R = 13;
const PLAYER_MASS = 6;
const BALL_MASS = 1;
const MAX_SPEED = 330;
const MOVE_RATE = 10; // quão rápido a velocidade alcança a desejada (1/s)
const BALL_DRAG = 0.5;
const BALL_MAX = 1250;
const WALL_E = 0.82;
const CONTACT_E = 0.7;
const KICK_REACH = 14;
const KICK_POWER = 780;
const KICK_CD = 0.38;
const POST_R = 7;
export const GOAL_DEPTH = 58;
export const STEP = 1 / 120;
/** Cantos arredondados (a bola escapa dos cantos em vez de ficar presa). */
const CORNER_R = 72;

export type Input = { mx: number; my: number; kick: boolean };

export type Disc = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  mass: number;
  team: 0 | 1 | -1;
  human: boolean;
  input: Input;
  kickCd: number;
  /** segundos desde o último chute (para o efeito visual) */
  flash: number;
  /** colocação inicial (fração do campo) */
  home: { x: number; y: number };
};

export type Phase = "countdown" | "play" | "goal" | "end";

export type GameEvent = { k: "kick"; x: number; y: number; power: number } | { k: "wall"; x: number; y: number; v: number } | { k: "goal"; team: 0 | 1 } | { k: "whistle" } | { k: "tick"; n: number } | { k: "end" };

export type Game = {
  mode: Mode;
  w: number;
  h: number;
  goalH: number;
  gy0: number;
  gy1: number;
  players: Disc[];
  ball: Disc;
  score: [number, number];
  goalsToWin: number;
  timeLeft: number;
  overtime: boolean;
  overtimeLeft: number;
  phase: Phase;
  phaseT: number;
  lastScorer: 0 | 1 | null;
  winner: 0 | 1 | null;
  /** tempo jogado (s), sem contar contagens e comemorações */
  played: number;
  events: GameEvent[];
  acc: number;
  countN: number;
};

const FORMATION: [number, number][] = [
  [0.3, 0.5],
  [0.2, 0.3],
  [0.2, 0.7],
  [0.11, 0.5],
];

function mkDisc(id: number, r: number, mass: number, team: 0 | 1 | -1, human: boolean): Disc {
  return { id, x: 0, y: 0, vx: 0, vy: 0, r, mass, team, human, input: { mx: 0, my: 0, kick: false }, kickCd: 0, flash: 9, home: { x: 0.5, y: 0.5 } };
}

export function newGame(mode: Mode): Game {
  const m = MODES[mode];
  const goalH = Math.round(m.h * 0.31);
  const players: Disc[] = [];
  let id = 0;
  for (const team of [0, 1] as const) {
    for (let i = 0; i < m.per; i++) {
      const d = mkDisc(id++, PLAYER_R, PLAYER_MASS, team, team === 0 && i === 0);
      const f = FORMATION[i];
      d.home = { x: team === 0 ? f[0] : 1 - f[0], y: f[1] };
      players.push(d);
    }
  }
  const g: Game = {
    mode,
    w: m.w,
    h: m.h,
    goalH,
    gy0: (m.h - goalH) / 2,
    gy1: (m.h + goalH) / 2,
    players,
    ball: mkDisc(99, BALL_R, BALL_MASS, -1, false),
    score: [0, 0],
    goalsToWin: m.goals,
    timeLeft: m.secs,
    overtime: false,
    overtimeLeft: 60,
    phase: "countdown",
    phaseT: 3,
    lastScorer: null,
    winner: null,
    played: 0,
    events: [],
    acc: 0,
    countN: 3,
  };
  resetPositions(g);
  return g;
}

export function resetPositions(g: Game): void {
  for (const p of g.players) {
    p.x = p.home.x * g.w;
    p.y = p.home.y * g.h;
    p.vx = p.vy = 0;
    p.kickCd = 0;
  }
  g.ball.x = g.w / 2;
  g.ball.y = g.h / 2;
  g.ball.vx = g.ball.vy = 0;
}

function clampSpeed(d: Disc, max: number): void {
  const s = Math.hypot(d.vx, d.vy);
  if (s > max) {
    d.vx *= max / s;
    d.vy *= max / s;
  }
}

/** Colisão círculo-círculo (impulso elástico com massas). */
function collide(a: Disc, b: Disc, e: number): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const min = a.r + b.r;
  const d2 = dx * dx + dy * dy;
  if (d2 >= min * min || d2 === 0) return false;
  const d = Math.sqrt(d2);
  const nx = dx / d;
  const ny = dy / d;
  const inv = 1 / a.mass + 1 / b.mass;
  const push = min - d;
  a.x -= nx * push * (1 / a.mass / inv);
  a.y -= ny * push * (1 / a.mass / inv);
  b.x += nx * push * (1 / b.mass / inv);
  b.y += ny * push * (1 / b.mass / inv);
  const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (rv < 0) {
    const j = (-(1 + e) * rv) / inv;
    a.vx -= (j / a.mass) * nx;
    a.vy -= (j / a.mass) * ny;
    b.vx += (j / b.mass) * nx;
    b.vy += (j / b.mass) * ny;
  }
  return true;
}

/** Bola contra um ponto fixo (trave). */
function hitPost(b: Disc, px: number, py: number): void {
  const dx = b.x - px;
  const dy = b.y - py;
  const min = b.r + POST_R;
  const d2 = dx * dx + dy * dy;
  if (d2 >= min * min || d2 === 0) return;
  const d = Math.sqrt(d2);
  const nx = dx / d;
  const ny = dy / d;
  b.x = px + nx * min;
  b.y = py + ny * min;
  const vn = b.vx * nx + b.vy * ny;
  if (vn < 0) {
    b.vx -= (1 + WALL_E) * vn * nx;
    b.vy -= (1 + WALL_E) * vn * ny;
  }
}

function ballWalls(g: Game, ev: GameEvent[]): void {
  const b = g.ball;
  const r = b.r;
  const bounce = (axis: "x" | "y", pos: number, sign: 1 | -1) => {
    const v = axis === "x" ? b.vx : b.vy;
    if (axis === "x") b.x = pos;
    else b.y = pos;
    if (v * sign < 0) {
      const nv = -v * WALL_E;
      if (axis === "x") b.vx = nv;
      else b.vy = nv;
      if (Math.abs(v) > 160) ev.push({ k: "wall", x: b.x, y: b.y, v: Math.abs(v) });
    }
  };
  const inMouth = b.y > g.gy0 && b.y < g.gy1;
  // paredes de cima e de baixo (e das caixas dos gols)
  if (b.x > 0 && b.x < g.w) {
    if (b.y < r) bounce("y", r, 1);
    else if (b.y > g.h - r) bounce("y", g.h - r, -1);
  } else {
    // dentro da caixa do gol: teto e piso são as bordas da boca
    if (b.y < g.gy0 + r) bounce("y", g.gy0 + r, 1);
    else if (b.y > g.gy1 - r) bounce("y", g.gy1 - r, -1);
  }
  // paredes esquerda e direita (com a boca do gol aberta)
  if (b.x < r && !inMouth) bounce("x", r, 1);
  if (b.x > g.w - r && !inMouth) bounce("x", g.w - r, -1);
  // fundo das caixas dos gols
  if (b.x < -GOAL_DEPTH + r) bounce("x", -GOAL_DEPTH + r, 1);
  if (b.x > g.w + GOAL_DEPTH - r) bounce("x", g.w + GOAL_DEPTH - r, -1);
  hitPost(b, 0, g.gy0);
  hitPost(b, 0, g.gy1);
  hitPost(b, g.w, g.gy0);
  hitPost(b, g.w, g.gy1);
  roundCorners(g, b, WALL_E);
}

/** Mantém o disco dentro dos cantos arredondados do campo; devolve true se encostou. */
function roundCorners(g: Game, d: Disc, e: number): void {
  const R = CORNER_R;
  const corners: [number, number, number, number][] = [
    [R, R, -1, -1],
    [g.w - R, R, 1, -1],
    [R, g.h - R, -1, 1],
    [g.w - R, g.h - R, 1, 1],
  ];
  for (const [cx, cy, sx, sy] of corners) {
    if ((d.x - cx) * sx <= 0 || (d.y - cy) * sy <= 0) continue;
    const dx = d.x - cx;
    const dy = d.y - cy;
    const dist = Math.hypot(dx, dy) || 1;
    const lim = R - d.r;
    if (dist <= lim) continue;
    const nx = dx / dist;
    const ny = dy / dist;
    d.x = cx + nx * lim;
    d.y = cy + ny * lim;
    const vn = d.vx * nx + d.vy * ny;
    if (vn > 0) {
      d.vx -= (1 + e) * vn * nx;
      d.vy -= (1 + e) * vn * ny;
    }
  }
}

function movePlayers(g: Game, dt: number): void {
  const k = 1 - Math.exp(-MOVE_RATE * dt);
  for (const p of g.players) {
    let mx = p.input.mx;
    let my = p.input.my;
    const len = Math.hypot(mx, my);
    if (len > 1) {
      mx /= len;
      my /= len;
    }
    p.vx += (mx * MAX_SPEED - p.vx) * k;
    p.vy += (my * MAX_SPEED - p.vy) * k;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.kickCd = Math.max(0, p.kickCd - dt);
    p.flash += dt;
    if (p.x < p.r) {
      p.x = p.r;
      p.vx = Math.max(0, p.vx);
    } else if (p.x > g.w - p.r) {
      p.x = g.w - p.r;
      p.vx = Math.min(0, p.vx);
    }
    if (p.y < p.r) {
      p.y = p.r;
      p.vy = Math.max(0, p.vy);
    } else if (p.y > g.h - p.r) {
      p.y = g.h - p.r;
      p.vy = Math.min(0, p.vy);
    }
    roundCorners(g, p, 0);
  }
}

function tryKicks(g: Game): void {
  const b = g.ball;
  for (const p of g.players) {
    if (!p.input.kick || p.kickCd > 0) continue;
    p.kickCd = KICK_CD;
    p.flash = 0;
    const dx = b.x - p.x;
    const dy = b.y - p.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d > p.r + b.r + KICK_REACH) continue;
    const nx = dx / d;
    const ny = dy / d;
    b.vx = b.vx * 0.25 + nx * KICK_POWER + p.vx * 0.45;
    b.vy = b.vy * 0.25 + ny * KICK_POWER + p.vy * 0.45;
    clampSpeed(b, BALL_MAX);
    g.events.push({ k: "kick", x: b.x, y: b.y, power: Math.hypot(b.vx, b.vy) });
  }
}

function physics(g: Game, dt: number, free: boolean): void {
  if (free) movePlayers(g, dt);
  else
    for (const p of g.players) {
      p.vx = p.vy = 0;
      p.flash += dt;
    }
  for (let i = 0; i < g.players.length; i++) for (let j = i + 1; j < g.players.length; j++) collide(g.players[i], g.players[j], 0.25);
  const b = g.ball;
  if (free) tryKicks(g);
  for (const p of g.players) collide(p, b, CONTACT_E);
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  const drag = Math.exp(-BALL_DRAG * dt);
  b.vx *= drag;
  b.vy *= drag;
  clampSpeed(b, BALL_MAX);
  ballWalls(g, g.events);
}

function startCountdown(g: Game, secs: number): void {
  resetPositions(g);
  g.phase = "countdown";
  g.phaseT = secs;
  g.countN = Math.ceil(secs);
}

function finish(g: Game): void {
  g.phase = "end";
  g.phaseT = 0;
  g.winner = g.score[0] === g.score[1] ? null : g.score[0] > g.score[1] ? 0 : 1;
  g.events.push({ k: "end" });
}

/** Avança a simulação em passos fixos. */
export function advance(g: Game, dt: number): void {
  g.acc += Math.min(dt, 0.1);
  while (g.acc >= STEP) {
    g.acc -= STEP;
    stepOnce(g, STEP);
  }
}

function stepOnce(g: Game, dt: number): void {
  if (g.phase === "end") {
    physics(g, dt, false);
    return;
  }
  if (g.phase === "countdown") {
    physics(g, dt, false);
    g.phaseT -= dt;
    const n = Math.ceil(g.phaseT);
    if (n !== g.countN && n > 0) {
      g.countN = n;
      g.events.push({ k: "tick", n });
    }
    if (g.phaseT <= 0) {
      g.phase = "play";
      g.events.push({ k: "whistle" });
    }
    return;
  }
  if (g.phase === "goal") {
    physics(g, dt, false);
    g.phaseT -= dt;
    if (g.phaseT <= 0) {
      const over = g.score[0] >= g.goalsToWin || g.score[1] >= g.goalsToWin || g.overtime;
      if (over) finish(g);
      else startCountdown(g, 3);
    }
    return;
  }
  physics(g, dt, true);
  g.played += dt;
  if (g.overtime) g.overtimeLeft -= dt;
  else g.timeLeft -= dt;
  const b = g.ball;
  if (b.x < 0 || b.x > g.w) {
    const team: 0 | 1 = b.x > g.w ? 0 : 1;
    g.score[team]++;
    g.lastScorer = team;
    g.phase = "goal";
    g.phaseT = 2.6;
    g.events.push({ k: "goal", team });
    return;
  }
  if (!g.overtime && g.timeLeft <= 0) {
    g.timeLeft = 0;
    if (g.score[0] === g.score[1]) {
      g.overtime = true;
      g.events.push({ k: "whistle" });
    } else finish(g);
  } else if (g.overtime && g.overtimeLeft <= 0) {
    g.overtimeLeft = 0;
    finish(g);
  }
}
