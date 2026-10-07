// ArenaSoccer: computador. Quem está mais perto da bola ataca (vai por trás dela e chuta para o gol); os outros cobrem o campo.
import { BALL_R, PLAYER_R, type Disc, type Game, type Level } from "./engine";

const LEVELS: Record<Level, { speed: number; lead: number; aim: number; react: number; kickBias: number }> = {
  easy: { speed: 0.72, lead: 0.08, aim: 0.55, react: 0.2, kickBias: 0.5 },
  normal: { speed: 0.88, lead: 0.2, aim: 0.28, react: 0.1, kickBias: 0.8 },
  hard: { speed: 1, lead: 0.3, aim: 0.1, react: 0.05, kickBias: 1 },
};

type Brain = { t: number; mx: number; my: number; kick: boolean; aimY: number; aimT: number };
const brains = new WeakMap<Disc, Brain>();

function brain(d: Disc): Brain {
  let b = brains.get(d);
  if (!b) {
    b = { t: Math.random() * 0.1, mx: 0, my: 0, kick: false, aimY: 0, aimT: 0 };
    brains.set(d, b);
  }
  return b;
}

/** Atualiza a entrada (direção e chute) de todos os discos controlados pelo computador. */
export function thinkAll(g: Game, level: Level | [Level, Level], dt: number): void {
  if (g.phase !== "play") {
    for (const p of g.players) if (!p.human) p.input = { mx: 0, my: 0, kick: false };
    return;
  }
  const ball = g.ball;
  // quem ataca em cada time: o mais perto da bola
  const chaser: Record<number, Disc | null> = { 0: null, 1: null };
  const dist = (p: Disc) => Math.hypot(ball.x - p.x, ball.y - p.y);
  for (const p of g.players) {
    const c = chaser[p.team];
    if (!c || dist(p) < dist(c)) chaser[p.team] = p;
  }
  for (const p of g.players) {
    if (p.human) continue;
    const L = LEVELS[Array.isArray(level) ? level[p.team as 0 | 1] : level];
    const br = brain(p);
    br.t -= dt;
    br.aimT -= dt;
    if (br.aimT <= 0) {
      br.aimT = 0.6 + Math.random() * 0.6;
      br.aimY = (Math.random() * 2 - 1) * L.aim * g.goalH * 0.5;
    }
    if (br.t > 0) {
      p.input = { mx: br.mx, my: br.my, kick: br.kick };
      br.kick = false;
      continue;
    }
    br.t = L.react * (0.6 + Math.random() * 0.8);
    const team = p.team as 0 | 1;
    const dir = team === 0 ? 1 : -1;
    const ownX = team === 0 ? 0 : g.w;
    const atkX = team === 0 ? g.w : 0;
    const goalY = g.h / 2 + br.aimY;
    let tx: number;
    let ty: number;
    let kick = false;
    if (chaser[team] === p) {
      const px = ball.x + ball.vx * L.lead;
      const py = ball.y + ball.vy * L.lead;
      let sx = atkX - px;
      let sy = goalY - py;
      const sl = Math.hypot(sx, sy) || 1;
      sx /= sl;
      sy /= sl;
      const reach = PLAYER_R + BALL_R;
      // posição do jogador em relação à bola, no eixo do chute: "along" < 0 = estou atrás da bola (bom)
      const rx = p.x - px;
      const ry = p.y - py;
      const along = rx * sx + ry * sy;
      const cross = rx * -sy + ry * sx;
      if (along < -reach * 0.9 && Math.abs(cross) < reach * 1.3) {
        // alinhado atrás da bola: vai nela
        tx = px - sx * 2;
        ty = py - sy * 2;
      } else {
        // contorna a bola pelo lado em que já está, sem empurrá-la para o próprio gol
        const side = Math.abs(cross) < 6 ? (py < g.h / 2 ? 1 : -1) : Math.sign(cross);
        const wx = px - sx * (reach + 8) + -sy * side * (reach + 22);
        const wy = py - sy * (reach + 8) + sx * side * (reach + 22);
        const ax = px - sx * (reach + 6);
        const ay = py - sy * (reach + 6);
        if (along > -reach * 0.5) {
          tx = wx;
          ty = wy;
        } else {
          tx = ax;
          ty = ay;
        }
      }
      const d = dist(p);
      if (d < reach + 11) {
        const dx = (ball.x - p.x) / (d || 1);
        const dy = (ball.y - p.y) / (d || 1);
        const align = dx * sx + dy * sy;
        // chuta quando a bola vai na direção do gol; perto do próprio gol, qualquer chute que a afaste serve
        const danger = Math.abs(ball.x - ownX) < g.w * 0.22;
        const away = dx * dir > 0.2;
        if (align > 0.6 * L.kickBias || (danger && away)) kick = Math.random() < 0.55 + 0.45 * L.kickBias;
      }
    } else {
      // cobertura: fica entre a bola e o próprio gol; o último da fila segura mais atrás
      const mates = g.players.filter((q) => q.team === team).sort((a, b) => Math.abs(a.x - ownX) - Math.abs(b.x - ownX));
      const rank = mates.indexOf(p);
      const depth = rank === 0 && mates.length > 1 ? 0.12 : 0.28 + rank * 0.06;
      const bx = ball.x;
      tx = ownX + (bx - ownX) * (depth + 0.18);
      tx = team === 0 ? Math.min(tx, g.w * 0.55) : Math.max(tx, g.w * 0.45);
      ty = g.h / 2 + (ball.y - g.h / 2) * 0.5 + (rank - (mates.length - 1) / 2) * 90;
      if (dist(p) < PLAYER_R + BALL_R + 10 && (ball.x - p.x) * dir > 8) kick = Math.random() < 0.5;
    }
    const mx = tx - p.x;
    const my = ty - p.y;
    const len = Math.hypot(mx, my);
    const k = len > 8 ? L.speed : (L.speed * len) / 8;
    br.mx = len > 0.001 ? (mx / len) * k : 0;
    br.my = len > 0.001 ? (my / len) * k : 0;
    br.kick = kick;
    p.input = { mx: br.mx, my: br.my, kick };
  }
}
