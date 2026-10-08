// Os sobreviventes controlados pelo computador: procuram suprimentos, fogem das Trevas, lutam, fogem,
// seguem a tribo e, no fim, traem. Cada um tem agressividade e lealdade próprias (data/lore.ts).
import { WEAPONS } from "./data/items";
import type { Actor, Game } from "./sim";
import { blocked, findPath, type Container } from "./world";

export type BotMode = "loot" | "fight" | "flee" | "zone" | "follow" | "wander" | "investigate";

export type BotState = {
  thinkT: number;
  mode: BotMode;
  path: [number, number][];
  repathT: number;
  goalX: number;
  goalZ: number;
  target: number;
  los: boolean;
  /** há quanto tempo está vendo o alvo (tempo de reação antes de atirar) */
  seenT: number;
  lootId: number;
  lootSince: number;
  skip: Set<number>;
  strafe: number;
  strafeT: number;
  /** quem o atacou (id → até quando guarda raiva) */
  anger: Map<number, number>;
  heard: { x: number; z: number; t: number } | null;
  refuseT: number;
  stuckT: number;
  lastX: number;
  lastZ: number;
  dodgeT: number;
  skill: number;
  sprint: boolean;
  /** em que ponto do trajeto do avião pula (0..1) e para onde dirige o paraquedas */
  jumpAt: number;
  landX: number;
  landZ: number;
};

export function newBotState(rand: () => number, skillAdj = 0): BotState {
  return {
    thinkT: rand() * 0.4,
    mode: "wander",
    path: [],
    repathT: 0,
    goalX: 0,
    goalZ: 0,
    target: -1,
    los: false,
    seenT: 0,
    lootId: -1,
    lootSince: 0,
    skip: new Set(),
    strafe: rand() < 0.5 ? 1 : -1,
    strafeT: 0,
    anger: new Map(),
    heard: null,
    refuseT: 0,
    stuckT: 0,
    lastX: 0,
    lastZ: 0,
    dodgeT: 0,
    skill: Math.max(0.05, Math.min(0.95, 0.35 + rand() * 0.45 + skillAdj)),
    sprint: false,
    jumpAt: 0.5,
    landX: 0,
    landZ: 0,
  };
}

const dist = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z);

function hasRanged(a: Actor): boolean {
  return a.guns.some((g) => g && (g.mag > 0 || (WEAPONS[g.id].ammo ? a.ammo[WEAPONS[g.id].ammo!] > 0 : false)));
}

/** Empunha a melhor arma com munição; sem munição, vai de corpo a corpo. */
function pickWeapon(a: Actor, d: number) {
  let best: 0 | 1 | 2 = 0;
  let tier = -1;
  a.guns.forEach((g, i) => {
    if (!g) return;
    const wp = WEAPONS[g.id];
    const ammo = g.mag + (wp.ammo ? a.ammo[wp.ammo] : 0);
    if (ammo <= 0 || wp.tier <= tier) return;
    tier = wp.tier;
    best = (i + 1) as 1 | 2;
  });
  // de muito perto, quem tem machado ou bastão prefere bater
  if (best !== 0 && d < 2.4 && WEAPONS[a.melee].tier >= 2) best = 0;
  if (a.active !== best) {
    a.active = best;
    a.reloading = 0;
  }
}

function setGoal(g: Game, a: Actor, x: number, z: number, force = false) {
  const ai = a.ai!;
  if (!force && ai.repathT > 0 && Math.hypot(x - ai.goalX, z - ai.goalZ) < 4 && ai.path.length) return;
  ai.goalX = x;
  ai.goalZ = z;
  ai.path = findPath(g.world, a.x, a.z, x, z);
  ai.repathT = 1.4;
}

/** Ponto seguro para onde correr quando as Trevas chegam. */
function safePoint(g: Game, a: Actor): [number, number] | null {
  const d = g.dark;
  const cx = d.shrinking || g.darkCountdown() < 25 ? d.tx : d.x;
  const cz = d.shrinking || g.darkCountdown() < 25 ? d.tz : d.z;
  const r = d.shrinking || g.darkCountdown() < 25 ? d.tr : d.r;
  const off = Math.hypot(a.x - cx, a.z - cz);
  if (off < r - 6) return null;
  const k = Math.max(0, r * 0.55) / Math.max(off, 0.001);
  return [cx + (a.x - cx) * k, cz + (a.z - cz) * k];
}

function decide(g: Game, a: Actor) {
  const ai = a.ai!;
  const p = g.player;
  const withPlayer = g.allies(a, p) && p.alive;

  // ---- quem está à vista
  let enemy: Actor | null = null;
  let ed = 46;
  for (const o of g.actors) {
    if (o === a || !o.alive || o.where !== "ground" || g.allies(a, o)) continue;
    let d = dist(a, o);
    // quem está agachado ou deitado é mais difícil de notar
    const seen = d * (o.stance === 2 ? 2.2 : o.stance === 1 ? 1.4 : 1);
    if (seen >= 46 && (ai.anger.get(o.id) ?? 0) < g.time) continue;
    d = Math.min(d, 45.9);
    if (d < ed && !blocked(g.world, a.x, a.z, o.x, o.z)) {
      ed = d;
      enemy = o;
    }
  }

  // ---- lealdade fraca: trai quando o aliado está por um fio e sobram poucos
  if (withPlayer && a.loyalty < 0.45 && g.alive <= 4 && p.hp < 35 && dist(a, p) < 14 && Math.random() < 0.06) {
    g.breakTribe(a, p);
    ai.anger.set(p.id, g.time + 999);
  }

  // ---- cuidar do corpo quando ninguém está em cima
  if (!a.using && (!enemy || ed > 16)) {
    if (a.hp < 60 && g.countGroup(a, "med")) g.useGroup(a, "med");
    else if (a.hp < 92 && a.boost < 15 && g.countGroup(a, "boost")) g.useGroup(a, "boost");
    else if (a.thirst < 42 && g.countGroup(a, "drink")) g.useGroup(a, "drink");
    else if (a.hunger < 42 && g.countGroup(a, "food")) g.useGroup(a, "food");
  }

  // ---- as Trevas mandam em tudo, menos numa briga colada
  const safe = safePoint(g, a);
  if (safe && !(enemy && ed < 6)) {
    ai.mode = "zone";
    ai.sprint = g.inDark(a.x, a.z) || g.dark.shrinking;
    ai.target = -1;
    return setGoal(g, a, safe[0], safe[1]);
  }

  // ---- lutar ou fugir
  if (enemy) {
    const angry = (ai.anger.get(enemy.id) ?? 0) > g.time;
    const ranged = hasRanged(a);
    const weak = a.hp < 30 && a.aggression < 0.85;
    const protect = withPlayer && ed < 30;
    const engage = angry || protect || ed < 7 || (a.aggression > 0.45 && (ranged || ed < 16)) || (enemy.hp < 35 && a.aggression > 0.3);
    if (engage && !weak) {
      if (ai.target !== enemy.id) ai.seenT = 0;
      ai.mode = "fight";
      ai.target = enemy.id;
      ai.los = true;
      ai.sprint = !ranged && ed > 4;
      pickWeapon(a, ed);
      return;
    }
    if (ed < 24 || weak) {
      ai.mode = "flee";
      ai.target = -1;
      ai.sprint = true;
      const k = 34 / Math.max(ed, 0.01);
      let fx = a.x + (a.x - enemy.x) * k;
      let fz = a.z + (a.z - enemy.z) * k;
      // não foge para dentro das Trevas
      const off = Math.hypot(fx - g.dark.x, fz - g.dark.z);
      if (off > g.dark.r - 8) {
        const s = Math.max(0, g.dark.r - 10) / off;
        fx = g.dark.x + (fx - g.dark.x) * s;
        fz = g.dark.z + (fz - g.dark.z) * s;
      }
      return setGoal(g, a, fx, fz);
    }
  }
  ai.target = -1;
  ai.sprint = false;

  // ---- segue a tribo do jogador
  if (withPlayer) {
    const d = dist(a, p);
    if (d > 9) {
      ai.mode = "follow";
      ai.sprint = d > 18;
      return setGoal(g, a, p.x, p.z);
    }
  }

  // ---- foi ver o barulho
  if (ai.heard && g.time - ai.heard.t < 8 && a.aggression > 0.55 && !withPlayer) {
    ai.mode = "investigate";
    return setGoal(g, a, ai.heard.x, ai.heard.z);
  }

  // ---- procurar suprimentos
  const anchor = withPlayer ? p : a;
  let best: Container | null = null;
  let bd = withPlayer ? 20 : 1e9;
  for (const c of g.world.containers) {
    if (c.opened || ai.skip.has(c.id) || (c.y ?? 0) > 0.5) continue;
    if (Math.hypot(c.x - g.dark.tx, c.z - g.dark.tz) > Math.max(g.dark.tr, 30) + 20 && g.dark.phase > 0) continue;
    if (g.inDark(c.x, c.z)) continue;
    // a caixa de suprimentos atrai os mais ousados de longe
    const d = dist(anchor, c) + (c.id === ai.lootId ? -6 : 0) - (c.kind === "airdrop" ? a.aggression * 90 : 0);
    if (d < bd) {
      bd = d;
      best = c;
    }
  }
  if (best) {
    ai.mode = "loot";
    // insiste no máximo 14 s na mesma caixa: se não chega, larga
    if (ai.lootId !== best.id) ai.lootSince = g.time;
    else if (g.time - ai.lootSince > 14) {
      ai.skip.add(best.id);
      ai.lootId = -1;
      return;
    }
    ai.lootId = best.id;
    return setGoal(g, a, best.x, best.z);
  }
  if (withPlayer) {
    ai.mode = "follow";
    ai.path = [];
    return;
  }
  ai.mode = "wander";
  if (!ai.path.length) {
    const ang = Math.random() * 6.28;
    const rr = Math.random() * Math.max(6, g.dark.tr * 0.7);
    setGoal(g, a, g.dark.tx + Math.cos(ang) * rr, g.dark.tz + Math.sin(ang) * rr, true);
  }
}

const turn = (from: number, to: number, max: number): number => {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return from + Math.max(-max, Math.min(max, d));
};

export function thinkBot(g: Game, a: Actor, dt: number) {
  const ai = a.ai!;
  ai.thinkT -= dt;
  ai.repathT -= dt;
  ai.strafeT -= dt;
  ai.dodgeT -= dt;
  if (ai.thinkT <= 0) {
    ai.thinkT = 0.3 + Math.random() * 0.15;
    decide(g, a);
  }
  if (ai.strafeT <= 0) {
    ai.strafeT = 0.8 + Math.random() * 1.4;
    ai.strafe = Math.random() < 0.5 ? 1 : -1;
  }

  let mx = 0;
  let mz = 0;

  const target = ai.mode === "fight" ? g.actors[ai.target] : null;
  if (target && target.alive) {
    const d = dist(a, target);
    const los = !blocked(g.world, a.x, a.z, target.x, target.z);
    ai.los = los;
    if (los) {
      ai.seenT += dt;
      a.yaw = turn(a.yaw, Math.atan2(target.x - a.x, target.z - a.z), dt * 7);
      const wp = g.weaponOf(a);
      if (wp.kind === "melee") {
        a.stance = 0;
        a.ads = false;
        mz = d > wp.range * 0.8 ? 1 : 0;
        mx = d < 5 ? ai.strafe * 0.35 : 0;
        if (d < wp.range) g.attack(a);
      } else {
        const hi = Math.min(wp.range * 0.6, 26);
        const lo = Math.min(8, hi * 0.5);
        mz = d > hi ? 1 : d < lo ? -1 : 0;
        // de longe, para, agacha e mira; de perto, fica em pé e se mexe
        const steady = d > 16 && mz === 0;
        a.stance = steady ? 1 : 0;
        a.ads = steady;
        mx = steady ? 0 : ai.strafe * 0.7;
        if (a.grenades > 0 && d > 10 && d < 24 && Math.random() < dt * 0.12) g.throwGrenade(a);
        // erra mais de longe e nos primeiros instantes; os mais hábeis erram menos
        else if (ai.seenT > g.diff.react && d < wp.range) g.attack(a, 0.025 + (1 - ai.skill) * 0.085 + d * 0.001);
      }
    } else {
      ai.seenT = 0;
      a.stance = 0;
      a.ads = false;
      if (ai.repathT <= 0) setGoal(g, a, target.x, target.z, true);
      [mx, mz] = follow(g, a, dt);
    }
  } else if (ai.mode !== "fight" || !target) {
    a.stance = 0;
    a.ads = false;
    [mx, mz] = follow(g, a, dt);
    // chegou na caixa: abre
    if (ai.mode === "loot" && !a.using) {
      const c = g.world.containers.find((k) => k.id === ai.lootId);
      if (c && !c.opened && Math.hypot(c.x - a.x, c.z - a.z) < 2.4) {
        g.openContainer(a, c);
        // o que não coube fica na caixa para os outros: este não volta nela
        if (!c.opened) ai.skip.add(c.id);
        ai.lootId = -1;
        ai.thinkT = 0;
        ai.path = [];
      }
    }
  }

  // ---- travou em alguma coisa: dá um passo de lado e refaz o caminho
  ai.stuckT += dt;
  if (ai.stuckT > 1) {
    const moved = Math.hypot(a.x - ai.lastX, a.z - ai.lastZ);
    if ((Math.abs(mz) > 0.1 || Math.abs(mx) > 0.1) && moved < 0.5) {
      ai.dodgeT = 0.6;
      ai.strafe = -ai.strafe;
      ai.repathT = 0;
      ai.path = [];
    }
    ai.stuckT = 0;
    ai.lastX = a.x;
    ai.lastZ = a.z;
  }
  if (ai.dodgeT > 0) mx = ai.strafe;

  g.moveActor(a, mx, mz, ai.sprint && a.energy > 15, dt);
}

/** Segue o caminho atual; devolve o comando de andar. */
function follow(g: Game, a: Actor, dt: number): [number, number] {
  const ai = a.ai!;
  while (ai.path.length && Math.hypot(ai.path[0][0] - a.x, ai.path[0][1] - a.z) < 1.3) ai.path.shift();
  const next = ai.path[0];
  if (!next) return [0, 0];
  a.yaw = turn(a.yaw, Math.atan2(next[0] - a.x, next[1] - a.z), dt * 8);
  return [0, 1];
}
