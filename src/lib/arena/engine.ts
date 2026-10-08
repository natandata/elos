import { ARENA_CARDS, ARENA_CARD_BY_KEY, ATALAIA, SANTUARIO, botLevelForArena, levelMult, type ArenaCard } from "./cards";
import { CARD_UNLOCK_ARENA } from "./arenas";
import { DODGE, REINFORCE, comboMults } from "./campaignCards";
import { botDecide } from "./bot";
import {
  BRIDGES,
  DECK_SIZE,
  DOUBLE_MANA_TICK,
  HAND_SIZE,
  MANA_MAX,
  MANA_SECS_PER_POINT,
  MANA_START,
  MATCH_TICKS,
  JERICHO_TICKS,
  RIVER_BOT,
  RIVER_TOP,
  TICKS_PER_SEC,
  W,
  H,
  dist,
  inDeployZone,
  inField,
  nearestBridge,
  nextRand,
  onBridge,
  shuffleWith,
  teamOf,
  type Entity,
  type GameEvent,
  type GameState,
  type Input,
  type Side,
} from "./core";

const AGGRO = 6;

/** Baralho do computador: só cartas já liberadas na arena (sem `arena`, usa todas). */
export function pickBotDeck(seed: number, arena?: number): string[] {
  const pool = ARENA_CARDS.map((c) => c.key).filter((k) => arena === undefined || (CARD_UNLOCK_ARENA[k] ?? 0) <= arena);
  return shuffleWith(pool, (seed ^ 0x77777) | 0).slice(0, DECK_SIZE);
}

export type GameOpts = {
  /** níveis das cartas do jogador (lado 0) */
  levels?: Record<string, number>;
  /** arena em que se joga: define o baralho e o nível do computador */
  arena?: number;
  /** bônus de vida e dano do computador (0,3 = 30% mais difícil), pelo ranking do jogador */
  botBoost?: number;
  /** partida 1x1 entre jogadores: ninguém tem nível extra */
  pvp?: boolean;
  /** 1x1: nível das cartas de cada lado (partida de torneio entre vizinhos do ranking); sem isso, todos no nível 1 */
  pvpLevels?: [Record<string, number>, Record<string, number>];
  /** desafio Maná Duplo: o Maná enche em dobro desde o início (e em quádruplo no último minuto) */
  manaMult?: number;
};

function makeTower(id: number, side: Side, kind: "atalaia" | "santuario", lane: number, x: number, y: number): Entity {
  const t = kind === "atalaia" ? ATALAIA : SANTUARIO;
  return {
    id, side, type: "tower", card: kind, lane, x, y, px: x, py: y,
    hp: t.hp, maxHp: t.hp, radius: t.radius, dmg: t.dmg, atkTicks: Math.round(t.atkSpeed * TICKS_PER_SEC),
    range: t.range, speed: 0, flying: false, towersOnly: false, canHitAir: true, splash: 0, towerMult: 1,
    hitSlow: 0, hitSlowTicks: 0, healAmount: 0, healTicks: 0, healRadius: 0, cd: 0, slowUntil: 0, slowAmount: 0, knock: 0, variant: 0, born: 0, reinforced: false,
  };
}

// chaves antigas de cartas renomeadas (partidas abertas antes da troca)
const CARD_ALIAS: Record<string, string> = { anjo: "miguel" };
const unalias = (deck: string[]) => deck.map((k) => CARD_ALIAS[k] ?? k);

const SHUFFLE_SEEDS = [0xa5a5, 0x5a5a, 0x3c3c3c, 0xc3c3c3];
const RNG_SEEDS = [0x1234567, 0x7654321, 0x2468ace, 0x13579bd];

function buildState(seed: number, decks: string[][], levels: Record<string, number>[], manaMult = 1): GameState {
  const players = decks.length;
  const shuffled = decks.map((d, i) => shuffleWith(unalias(d), seed ^ SHUFFLE_SEEDS[i]));
  const state: GameState = {
    tick: 0,
    seed,
    nextId: 1,
    players,
    mana: decks.map(() => MANA_START),
    slots: shuffled.map((d) => d.slice(0, HAND_SIZE)),
    queue: shuffled.map((d) => d.slice(HAND_SIZE)),
    entities: [],
    crowns: [0, 0],
    levels,
    rng: decks.map((_, i) => (seed ^ RNG_SEEDS[i]) | 0),
    over: false,
    winner: null,
    jericho: false,
    manaMult,
  };
  const mk = (side: Side, kind: "atalaia" | "santuario", lane: number, x: number, y: number) =>
    state.entities.push(makeTower(state.nextId++, side, kind, lane, x, y));
  mk(0, "atalaia", 0, 4, H - 5.5);
  mk(0, "atalaia", 1, W - 4, H - 5.5);
  mk(0, "santuario", -1, W / 2, H - 2.5);
  mk(1, "atalaia", 0, 4, 5.5);
  mk(1, "atalaia", 1, W - 4, 5.5);
  mk(1, "santuario", -1, W / 2, 2.5);
  return state;
}

export function createGame(seed: number, playerDeck: string[], botDeck?: string[], opts: GameOpts = {}): GameState {
  botDeck ??= pickBotDeck(seed, opts.arena);
  const boost = opts.pvp ? 0 : Math.max(-0.5, Math.min(2.5, Number(opts.botBoost) || 0));
  // o bônus multiplica vida e dano (equivale a níveis a mais, sem teto)
  const botLevel = opts.pvp ? 1 : 1 + (levelMult(botLevelForArena(opts.arena ?? 0)) * (1 + boost) - 1) / 0.05;
  const botLevels: Record<string, number> = {};
  for (const k of ARENA_CARD_BY_KEY.keys()) botLevels[k] = botLevel;
  const manaMult = opts.manaMult === 2 ? 2 : 1;
  if (opts.pvp) return buildState(seed, [playerDeck, botDeck], [opts.pvpLevels?.[0] ?? {}, opts.pvpLevels?.[1] ?? {}], manaMult);
  return buildState(seed, [playerDeck, botDeck], [opts.levels ?? {}, botLevels], manaMult);
}

/** Partida em duplas: 4 baralhos (jogadores 0–1 = lado 0, 2–3 = lado 1), todos no nível 1. */
export function createGameDuo(seed: number, decks: string[][], levels?: Record<string, number>[]): GameState {
  return buildState(seed, decks, decks.map((_, i) => levels?.[i] ?? {}));
}

function makeUnit(state: GameState, card: ArenaCard, side: Side, player: number, x: number, y: number, variant = 0): Entity {
  const m = levelMult(state.levels[player][card.key] ?? 1);
  const hp = Math.round((card.hp ?? 100) * m);
  return {
    id: state.nextId++, side, type: "unit", card: card.key, lane: -1, x, y, px: x, py: y,
    hp, maxHp: hp, radius: (card.radius ?? 0.5) * (card.crew && variant > 0 ? 0.5 : 1), dmg: Math.round((card.dmg ?? 10) * m),
    atkTicks: Math.max(1, Math.round((card.atkSpeed ?? 1) * TICKS_PER_SEC)), range: card.range ?? 0.8,
    speed: (card.speed ?? 1.5) / TICKS_PER_SEC, flying: !!card.flying, towersOnly: !!card.towersOnly,
    canHitAir: !!card.canHitAir, splash: card.splash ?? 0, towerMult: card.unitTowerMult ?? 1,
    hitSlow: card.hitSlow?.amount ?? 0, hitSlowTicks: Math.round((card.hitSlow?.secs ?? 0) * TICKS_PER_SEC),
    healAmount: card.heal?.amount ?? 0, healTicks: Math.round((card.heal?.secs ?? 0) * TICKS_PER_SEC), healRadius: card.heal?.radius ?? 0,
    cd: 0, slowUntil: 0, slowAmount: 0, knock: card.knockback ?? 0, variant, born: state.tick, reinforced: false,
  };
}

function spawnOffsets(n: number, side: Side): [number, number][] {
  const f = side === 0 ? 1 : -1;
  if (n === 3) return [[-0.7, 0], [0.7, 0], [0, 0.7 * f]];
  if (n === 4) return [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]];
  if (n === 2) return [[-0.5, 0], [0.5, 0]];
  return [[0, 0]];
}

function castSpell(state: GameState, card: ArenaCard, side: Side, player: number, x: number, y: number, ev: GameEvent[]) {
  const r = card.radiusSpell ?? 2;
  for (const e of state.entities) {
    if (e.side === side || e.hp <= 0) continue;
    if (dist(x, y, e.x, e.y) > r + e.radius) continue;
    const dmg = (card.spellDmg ?? 0) * levelMult(state.levels[player][card.key] ?? 1) * (e.type === "tower" ? (card.towerMult ?? 1) : 1);
    e.hp -= dmg;
    ev.push({ t: "hit", id: e.id, x: e.x, y: e.y, dmg, side: e.side });
    if (card.slow && e.type === "unit") {
      e.slowUntil = state.tick + Math.round((card.slowSecs ?? 2) * TICKS_PER_SEC);
      e.slowAmount = card.slow;
    }
  }
  ev.push({ t: "spell", key: card.key, x, y, r });
}

/** Aplica uma jogada. Devolve false (e não muda nada) se for inválida. */
export function applyInput(state: GameState, input: Input, ev: GameEvent[] = []): boolean {
  const { slot, x, y } = input;
  const player = input.player ?? input.side;
  if (state.over || !Number.isInteger(player) || player < 0 || player >= state.players) return false;
  const side = teamOf(state.players, player);
  if (input.side !== side) return false;
  if (state.blind && state.tick < state.blind[side]) return false;
  if (!Number.isInteger(slot) || slot < 0 || slot >= HAND_SIZE) return false;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  const key = state.slots[player][slot];
  const card = ARENA_CARD_BY_KEY.get(key);
  if (!card) return false;
  if (state.mana[player] + 1e-9 < card.cost) return false;
  if (card.kind === "unit" ? !inDeployZone(side, x, y, state) : !inField(x, y)) return false;

  state.mana[player] -= card.cost;
  state.slots[player][slot] = state.queue[player].shift()!;
  state.queue[player].push(key);

  if (card.kind === "spell") {
    castSpell(state, card, side, player, x, y, ev);
  } else {
    spawnOffsets(card.count ?? 1, side).forEach(([ox, oy], i) => {
      state.entities.push(makeUnit(state, card, side, player, Math.min(W - 0.3, Math.max(0.3, x + ox)), y + oy, i));
    });
    ev.push({ t: "spawn", x, y, card: card.key });
    if (card.blind) {
      // brilho que cega o adversário: ele não joga cartas por um tempo
      const ticks = Math.round(card.blind * TICKS_PER_SEC);
      state.blind ??= [0, 0];
      state.blind[1 - side] = Math.max(state.blind[1 - side], state.tick + ticks);
      ev.push({ t: "blind", side: (1 - side) as Side, ticks });
    }
  }
  return true;
}

// ------------------------------------------------------------ alvos

function nearestEnemyUnit(state: GameState, e: Entity, maxDist: number): Entity | null {
  let best: Entity | null = null;
  let bestD = maxDist;
  for (const o of state.entities) {
    if (o.side === e.side || o.type !== "unit" || o.hp <= 0) continue;
    if (o.flying && !e.canHitAir) continue;
    const d = dist(e.x, e.y, o.x, o.y);
    if (d < bestD) {
      best = o;
      bestD = d;
    }
  }
  return best;
}

function laneTower(state: GameState, e: Entity): Entity | null {
  const lane = e.x < W / 2 ? 0 : 1;
  let king: Entity | null = null;
  for (const o of state.entities) {
    if (o.side === e.side || o.type !== "tower" || o.hp <= 0) continue;
    if (o.lane === lane) return o;
    if (o.lane === -1) king = o;
  }
  return king;
}

function chooseTarget(state: GameState, e: Entity): Entity | null {
  if (!e.towersOnly) {
    const u = nearestEnemyUnit(state, e, AGGRO);
    if (u) return u;
  }
  return laneTower(state, e);
}

// ------------------------------------------------------------ movimento

function waypoint(e: Entity, tx: number, ty: number): [number, number] {
  if (e.flying) return [tx, ty];
  const above = e.y < RIVER_TOP;
  const below = e.y > RIVER_BOT;
  const inRiver = !above && !below;
  const targetAbove = ty < RIVER_TOP;
  const targetBelow = ty > RIVER_BOT;
  const needCross = inRiver || (above && targetBelow) || (below && targetAbove);
  if (!needCross) return [tx, ty];
  const bx = nearestBridge(e.x);
  if (inRiver) return [bx, ty >= e.y ? RIVER_BOT + 0.3 : RIVER_TOP - 0.3];
  if (Math.abs(e.x - bx) > 0.5) return [bx, above ? RIVER_TOP - 0.3 : RIVER_BOT + 0.3];
  return [bx, above ? RIVER_BOT + 0.3 : RIVER_TOP - 0.3];
}

function moveToward(e: Entity, tx: number, ty: number, step: number) {
  const dx = tx - e.x;
  const dy = ty - e.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d <= step) {
    e.x = tx;
    e.y = ty;
  } else {
    e.x += (dx / d) * step;
    e.y += (dy / d) * step;
  }
}

/** Empurra o alvo para longe de quem bateu, sem sair do campo nem cair no rio fora das pontes. */
function knockBack(from: Entity, target: Entity) {
  const dx = target.x - from.x;
  const dy = target.y - from.y;
  const d = Math.sqrt(dx * dx + dy * dy) || 1;
  const above = target.y < RIVER_TOP;
  const below = target.y > RIVER_BOT;
  let nx = target.x + (dx / d) * from.knock;
  let ny = target.y + (dy / d) * from.knock;
  nx = Math.min(W - 0.3, Math.max(0.3, nx));
  ny = Math.min(H - 0.3, Math.max(0.3, ny));
  if (!onBridge(nx) && ny > RIVER_TOP - 0.2 && ny < RIVER_BOT + 0.2) ny = above ? RIVER_TOP - 0.2 : below ? RIVER_BOT + 0.2 : target.y;
  target.x = nx;
  target.y = ny;
}

function dealAttack(state: GameState, e: Entity, target: Entity, ev: GameEvent[]) {
  const combo = e.type === "unit" ? comboMults(state.entities, e.side, e.card).dmg : 1;
  // Mbappé desvia de metade dos ataques de Marcelinho e Henrique
  if (target.type === "unit" && DODGE.from.has(e.card) && target.card === DODGE.card && nextRand(state, target.side) < DODGE.chance) {
    ev.push({ t: "attack", from: e.id, to: target.id, fromCard: e.card, x1: e.x, y1: e.y, x2: target.x, y2: target.y, ranged: e.range > 1.5, side: e.side, dmg: 0 });
    ev.push({ t: "dodge", id: target.id, x: target.x, y: target.y });
    e.cd = e.atkTicks;
    return;
  }
  const dmg = e.dmg * combo * (target.type === "tower" ? e.towerMult : 1);
  target.hp -= dmg;
  if (e.hitSlow > 0 && target.type === "unit") {
    const stillSlow = state.tick < target.slowUntil;
    target.slowAmount = stillSlow ? Math.max(target.slowAmount, e.hitSlow) : e.hitSlow;
    target.slowUntil = state.tick + e.hitSlowTicks;
  }
  ev.push({ t: "attack", from: e.id, to: target.id, fromCard: e.card, x1: e.x, y1: e.y, x2: target.x, y2: target.y, ranged: e.range > 1.5, side: e.side, dmg });
  ev.push({ t: "hit", id: target.id, x: target.x, y: target.y, dmg, side: target.side });
  if (e.knock > 0 && target.type === "unit" && !target.flying && target.hp > 0) knockBack(e, target);
  if (e.splash > 0) {
    for (const o of state.entities) {
      if (o === target || o.side === e.side || o.type !== "unit" || o.hp <= 0) continue;
      if (dist(target.x, target.y, o.x, o.y) <= e.splash) {
        if (DODGE.from.has(e.card) && o.card === DODGE.card && nextRand(state, o.side) < DODGE.chance) {
          ev.push({ t: "dodge", id: o.id, x: o.x, y: o.y });
          continue;
        }
        o.hp -= e.dmg * combo;
        ev.push({ t: "hit", id: o.id, x: o.x, y: o.y, dmg: e.dmg * combo, side: o.side });
      }
    }
  }
  e.cd = e.atkTicks;
}

function updateTower(state: GameState, e: Entity, ev: GameEvent[]) {
  if (e.cd > 0) e.cd--;
  const target = nearestEnemyUnit(state, e, e.range + 1);
  if (!target) return;
  if (dist(e.x, e.y, target.x, target.y) > e.range + target.radius) return;
  if (e.cd <= 0) dealAttack(state, e, target, ev);
}

/** Cura aliados por perto (Noé, Jesus). Roda a cada `healTicks`. */
function healAllies(state: GameState, e: Entity, ev: GameEvent[]) {
  if (e.healAmount <= 0 || e.healTicks <= 0 || state.tick % e.healTicks !== 0) return;
  for (const o of state.entities) {
    if (o === e || o.side !== e.side || o.type !== "unit" || o.hp <= 0 || o.hp >= o.maxHp) continue;
    if (dist(e.x, e.y, o.x, o.y) <= e.healRadius) {
      const before = o.hp;
      o.hp = Math.min(o.maxHp, o.hp + e.healAmount);
      ev.push({ t: "heal", id: o.id, x: o.x, y: o.y, amount: Math.round(o.hp - before) });
    }
  }
}

/** Apoio sem ataque (Jesus): acompanha o aliado mais avançado, sempre um pouco atrás dele. */
function followAlly(state: GameState, e: Entity) {
  let lead: Entity | null = null;
  for (const o of state.entities) {
    if (o === e || o.side !== e.side || o.type !== "unit" || o.hp <= 0 || o.dmg <= 0) continue;
    if (!lead || (e.side === 0 ? o.y < lead.y : o.y > lead.y)) lead = o;
  }
  if (!lead) return;
  const behind = e.side === 0 ? 1.8 : -1.8;
  const tx = lead.x;
  const ty = lead.y + behind;
  if (dist(e.x, e.y, tx, ty) < 0.8) return;
  const slowed = state.tick < e.slowUntil ? 1 - e.slowAmount : 1;
  const [wx, wy] = waypoint(e, tx, ty);
  moveToward(e, wx, wy, e.speed * slowed);
}

/** Amandinha: depois de 5 s viva, chegam mais 3 de cada bichinho que a acompanha. */
function reinforce(state: GameState, e: Entity, ev: GameEvent[]) {
  const card = ARENA_CARD_BY_KEY.get(e.card);
  if (e.reinforced || e.card !== REINFORCE.card || e.variant !== 0 || !card?.crew) return;
  if (state.tick - e.born < REINFORCE.afterSecs * TICKS_PER_SEC) return;
  e.reinforced = true;
  const side = e.side;
  const f = side === 0 ? 1 : -1;
  const n = REINFORCE.each;
  for (let v = 1; v < card.crew.length; v++) {
    for (let i = 0; i < n; i++) {
      const a = ((i + (v - 1) * n) / ((card.crew.length - 1) * n)) * Math.PI * 2;
      const x = Math.min(W - 0.3, Math.max(0.3, e.x + Math.cos(a) * 1.0));
      const y = e.y + Math.sin(a) * 0.8 * f;
      state.entities.push(makeUnit(state, card, side, side, x, y, v));
    }
  }
  ev.push({ t: "spawn", x: e.x, y: e.y, card: card.key });
}

function updateUnit(state: GameState, e: Entity, ev: GameEvent[]) {
  if (e.cd > 0) e.cd--;
  reinforce(state, e, ev);
  healAllies(state, e, ev);
  if (e.dmg <= 0) {
    followAlly(state, e);
    return;
  }
  const target = chooseTarget(state, e);
  if (!target) return;
  if (dist(e.x, e.y, target.x, target.y) <= e.range + target.radius) {
    if (e.cd <= 0) dealAttack(state, e, target, ev);
    return;
  }
  const slowed = (state.tick < e.slowUntil ? 1 - e.slowAmount : 1) * comboMults(state.entities, e.side, e.card).speed;
  const [wx, wy] = waypoint(e, target.x, target.y);
  moveToward(e, wx, wy, e.speed * slowed);
}

/** Empurra tropas terrestres que se sobrepõem e tira quem caiu no rio fora da ponte. */
function separate(state: GameState) {
  const ground = state.entities.filter((e) => e.type === "unit" && !e.flying && e.hp > 0);
  for (let i = 0; i < ground.length; i++) {
    for (let j = i + 1; j < ground.length; j++) {
      const a = ground[i];
      const b = ground[j];
      const min = (a.radius + b.radius) * 0.9;
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let d = Math.sqrt(dx * dx + dy * dy);
      if (d >= min) continue;
      if (d < 1e-6) {
        dx = a.id % 2 === 0 ? 1 : -1;
        dy = 0;
        d = 1;
      }
      const push = (min - d) / 2;
      const ux = dx / d;
      const uy = dy / d;
      a.x -= ux * push;
      a.y -= uy * push;
      b.x += ux * push;
      b.y += uy * push;
    }
  }
  for (const e of ground) {
    e.x = Math.min(W - 0.3, Math.max(0.3, e.x));
    e.y = Math.min(H - 0.3, Math.max(0.3, e.y));
    if (e.y > RIVER_TOP && e.y < RIVER_BOT) {
      const onBr = BRIDGES.some((b) => Math.abs(e.x - b) <= 1.2);
      if (!onBr) e.y = e.py <= (RIVER_TOP + RIVER_BOT) / 2 ? RIVER_TOP : RIVER_BOT;
    }
  }
}

/** No tempo final vence quem tem mais coroas; coroas iguais (inclusive 0x0) é empate. */
function finishByTime(state: GameState) {
  state.over = true;
  state.winner = state.crowns[0] === state.crowns[1] ? null : state.crowns[0] > state.crowns[1] ? 0 : 1;
}

/** Avança 1 tick (1/20 s). `bots` = lados controlados pelo computador. */
export function step(state: GameState, inputs: Input[], bots: Side[] = [1]): GameEvent[] {
  const ev: GameEvent[] = [];
  if (state.over) return ev;
  for (const e of state.entities) {
    e.px = e.x;
    e.py = e.y;
  }

  for (const inp of inputs) if (inp.tick === state.tick) applyInput(state, inp, ev);
  for (const side of bots) {
    const inp = botDecide(state, side);
    if (inp) applyInput(state, inp, ev);
  }

  const rate = ((state.tick >= DOUBLE_MANA_TICK ? 2 : 1) * (state.manaMult ?? 1)) / (MANA_SECS_PER_POINT * TICKS_PER_SEC);
  for (let i = 0; i < state.mana.length; i++) state.mana[i] = Math.min(MANA_MAX, state.mana[i] + rate);

  for (const e of state.entities.slice()) {
    if (e.hp <= 0) continue;
    if (e.type === "tower") updateTower(state, e, ev);
    else updateUnit(state, e, ev);
  }
  separate(state);

  const alive: Entity[] = [];
  for (const e of state.entities) {
    if (e.hp > 0) {
      alive.push(e);
      continue;
    }
    ev.push({ t: "death", id: e.id, x: e.x, y: e.y, tower: e.type === "tower", card: e.card, side: e.side, flying: e.flying, radius: e.radius });
    if (e.type === "tower") {
      const winner = (1 - e.side) as Side;
      if (e.card === "santuario") {
        state.crowns[winner] = 3;
        if (!state.over) {
          state.over = true;
          state.winner = winner;
        }
      } else {
        state.crowns[winner] += 1;
      }
    }
  }
  state.entities = alive;

  state.tick++;
  if (!state.over) {
    if (state.jericho) {
      // morte súbita: a primeira torre que cair desempata; sem torre nenhuma até o fim do Jericó, é empate
      if (state.crowns[0] !== state.crowns[1] || state.tick >= MATCH_TICKS + JERICHO_TICKS) finishByTime(state);
    } else if (state.tick >= MATCH_TICKS) {
      if (state.crowns[0] === state.crowns[1]) {
        state.jericho = true;
        ev.push({ t: "jericho" });
      } else finishByTime(state);
    }
  }
  return ev;
}

/** Resumo numérico do estado — pra conferir que dois lados chegaram no mesmo lugar. */
export function stateHash(state: GameState): number {
  let h = 2166136261 ^ state.tick;
  const mix = (n: number) => {
    h ^= Math.round(n * 1000) | 0;
    h = Math.imul(h, 16777619);
  };
  mix(state.crowns[0]);
  mix(state.crowns[1]);
  for (const m of state.mana) mix(m);
  for (const e of state.entities) {
    mix(e.id);
    mix(e.x);
    mix(e.y);
    mix(e.hp);
  }
  return h >>> 0;
}
