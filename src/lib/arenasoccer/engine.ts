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
  /** jogador de verdade (seleções, clubes, carreira): nome, número, posição e força (50–99) */
  name: string;
  num: number;
  pos: string;
  ovr: number;
};

/** Um jogador escalado: vem das seleções, dos clubes ou do modo carreira. */
export type Slot = { name: string; num: number; pos: string; ovr: number };
/** Partida com times de verdade: cada lado escala de 1 a 4 jogadores; o primeiro do time 0 é o que você controla. */
export type MatchSpec = { teams: [Slot[], Slot[]]; secs: number; goalsToWin: number };

/** Velocidade e força do chute mudam pouco com a força do jogador (de 0,93 a 1,07), para ninguém ficar injogável. */
export const ovrMul = (ovr: number): number => Math.max(0.93, Math.min(1.07, 0.93 + (ovr - 50) * 0.0035));

export type Phase = "countdown" | "play" | "goal" | "end";

export type GameEvent = { k: "kick"; x: number; y: number; power: number } | { k: "wall"; x: number; y: number; v: number } | { k: "goal"; team: 0 | 1; scorer?: number; assist?: number; own?: boolean; at?: number } | { k: "whistle" } | { k: "tick"; n: number } | { k: "end" };

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
  /** últimos toques na bola (índice do disco e tempo jogado), do mais recente para o mais antigo */
  touches: { i: number; t: number }[];
  /** gols, assistências e gols contra por disco (índice em `players`) */
  stats: { goals: number; assists: number; own: number }[];
};

const FORMATION: [number, number][] = [
  [0.3, 0.5],
  [0.2, 0.3],
  [0.2, 0.7],
  [0.11, 0.5],
];

function mkDisc(id: number, r: number, mass: number, team: 0 | 1 | -1, human: boolean): Disc {
  return { id, x: 0, y: 0, vx: 0, vy: 0, r, mass, team, human, input: { mx: 0, my: 0, kick: false }, kickCd: 0, flash: 9, home: { x: 0.5, y: 0.5 }, name: "", num: 0, pos: "MF", ovr: 70 };
}

export function newGame(mode: Mode, spec?: MatchSpec): Game {
  const m = MODES[spec ? (`${Math.max(1, Math.min(4, spec.teams[0].length))}v${Math.max(1, Math.min(4, spec.teams[0].length))}` as Mode) : mode];
  const goalH = Math.round(m.h * 0.31);
  const players: Disc[] = [];
  let id = 0;
  for (const team of [0, 1] as const) {
    for (let i = 0; i < m.per; i++) {
      const d = mkDisc(id++, PLAYER_R, PLAYER_MASS, team, team === 0 && i === 0);
      const f = FORMATION[i];
      d.home = { x: team === 0 ? f[0] : 1 - f[0], y: f[1] };
      const sl = spec?.teams[team][i];
      if (sl) {
        d.name = sl.name;
        d.num = sl.num;
        d.pos = sl.pos;
        d.ovr = sl.ovr;
      }
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
    goalsToWin: spec?.goalsToWin ?? m.goals,
    timeLeft: spec?.secs ?? m.secs,
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
    touches: [],
    stats: players.map(() => ({ goals: 0, assists: 0, own: 0 })),
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
    const top = MAX_SPEED * ovrMul(p.ovr);
    p.vx += (mx * top - p.vx) * k;
    p.vy += (my * top - p.vy) * k;
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
    const pw = KICK_POWER * ovrMul(p.ovr);
    b.vx = b.vx * 0.25 + nx * pw + p.vx * 0.45;
    b.vy = b.vy * 0.25 + ny * pw + p.vy * 0.45;
    clampSpeed(b, BALL_MAX);
    touch(g, p);
    g.events.push({ k: "kick", x: b.x, y: b.y, power: Math.hypot(b.vx, b.vy) });
  }
}

/** Registra o toque de um disco na bola (para saber quem fez o gol e quem deu o passe). */
function touch(g: Game, p: Disc): void {
  const i = g.players.indexOf(p);
  if (i < 0) return;
  const last = g.touches[0];
  if (last && last.i === i) {
    last.t = g.played;
    return;
  }
  g.touches.unshift({ i, t: g.played });
  if (g.touches.length > 4) g.touches.length = 4;
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
  for (const p of g.players) if (collide(p, b, CONTACT_E)) touch(g, p);
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  const drag = Math.exp(-BALL_DRAG * dt);
  b.vx *= drag;
  b.vy *= drag;
  clampSpeed(b, BALL_MAX);
  ballWalls(g, g.events);
  // bola prensada contra a parede: quem a empurra é que recua (não deixa a bola "dentro" do disco)
  for (const p of g.players) {
    const dx = p.x - b.x;
    const dy = p.y - b.y;
    const min = p.r + b.r;
    const d2 = dx * dx + dy * dy;
    if (d2 < min * min && d2 > 0) {
      const d = Math.sqrt(d2);
      p.x = b.x + (dx / d) * min;
      p.y = b.y + (dy / d) * min;
      p.x = Math.max(p.r, Math.min(g.w - p.r, p.x));
      p.y = Math.max(p.r, Math.min(g.h - p.r, p.y));
    }
  }
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
    const ev: GameEvent = { k: "goal", team, at: Math.round(g.played) };
    // quem fez o gol: o último toque de quem atacou (até 3,5 s antes; desvio de zagueiro não tira o gol de quem chutou)
    const k = g.touches.findIndex((x) => g.players[x.i].team === team && g.played - x.t < 3.5);
    if (k >= 0) {
      const sc = g.touches[k];
      ev.scorer = sc.i;
      g.stats[sc.i].goals++;
      // assistência: o toque anterior, se foi de um companheiro, até 6 s antes
      const prev = g.touches.slice(k + 1).find((x) => x.i !== sc.i);
      if (prev && g.players[prev.i].team === team && sc.t - prev.t < 6) {
        ev.assist = prev.i;
        g.stats[prev.i].assists++;
      }
    } else if (g.touches[0] && g.players[g.touches[0].i].team !== team && g.played - g.touches[0].t < 6) {
      // gol contra: o último toque foi de quem defendia
      ev.scorer = g.touches[0].i;
      ev.own = true;
      g.stats[g.touches[0].i].own++;
    }
    g.touches.length = 0;
    g.events.push(ev);
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
