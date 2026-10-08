// Simulação de A Última Tribo (modo Sobrevivência): sem desenho e sem rede, só as regras.
// O anfitrião (ou a partida solo) roda isto; o render.ts só mostra o estado.
import { BASE_CAPACITY, CONSUMABLES, GEAR, LOOT_TABLES, WEAPONS, isAmmo, itemLabel, type AmmoKind, type WeaponDef } from "./data/items";
import { BOT_PROFILES, LORE_BY_ID } from "./data/lore";
import { thinkBot, type BotState, newBotState } from "./ai";
import { HALF, blocked, buildWorld, moveCircle, rayBoxes, rng, zoneAt, type Container, type World } from "./world";

export const ACTOR_R = 0.45;
export const WALK = 5.2;
export const SPRINT = 8.3;
export const MAX_TRIBE = 3;

export type GunSlot = { id: string; mag: number };

export type Actor = {
  id: number;
  name: string;
  bot: boolean;
  color: number;
  x: number;
  z: number;
  yaw: number;
  /** velocidade atual (para a animação de andar) */
  speed: number;
  hp: number;
  armor: number;
  hunger: number;
  thirst: number;
  energy: number;
  alive: boolean;
  melee: string;
  guns: [GunSlot | null, GunSlot | null];
  /** 0 = corpo a corpo, 1 e 2 = armas de fogo/arco */
  active: 0 | 1 | 2;
  ammo: Record<AmmoKind, number>;
  inv: Record<string, number>;
  gear: Record<string, boolean>;
  cooldown: number;
  reloading: number;
  using: { id: string; t: number; total: number } | null;
  /** tribo (0 = sozinho) */
  team: number;
  kills: number;
  /** relógios de animação */
  swing: number;
  hurt: number;
  sinceHurt: number;
  deadT: number;
  place: number;
  aggression: number;
  loyalty: number;
  ai?: BotState;
};

export type Input = {
  /** andar: frente/trás e lado, no espaço da câmera (-1..1) */
  mx: number;
  mz: number;
  yaw: number;
  sprint: boolean;
  fire: boolean;
  /** mira assistida (toque): puxa para o inimigo mais perto do centro */
  assist: number;
  interact: boolean;
  reload: boolean;
  slot: 0 | 1 | 2 | null;
  use: "food" | "drink" | "med" | null;
  ally: boolean;
  trade: boolean;
};

export const emptyInput = (): Input => ({ mx: 0, mz: 0, yaw: 0, sprint: false, fire: false, assist: 0, interact: false, reload: false, slot: null, use: null, ally: false, trade: false });

export type Ev =
  | { t: "shot"; id: number; x0: number; z0: number; x1: number; z1: number; weapon: string }
  | { t: "melee"; id: number }
  | { t: "hit"; x: number; z: number; id: number }
  | { t: "death"; id: number; by: number }
  | { t: "feed"; text: string; tone: "info" | "good" | "bad" | "kill" }
  | { t: "toast"; text: string }
  | { t: "lore"; id: string }
  | { t: "open"; cid: number }
  | { t: "drop"; cid: number }
  | { t: "dark"; phase: number };

export type Dark = { x: number; z: number; r: number; fx: number; fz: number; fr: number; tx: number; tz: number; tr: number; t0: number; t1: number; phase: number; shrinking: boolean };

/** Fases das Trevas: [espera, tempo fechando, raio final]. */
const DARK_PHASES: [number, number, number][] = [
  [70, 50, 190],
  [55, 45, 110],
  [45, 40, 56],
  [35, 35, 22],
  [25, 30, 0],
];
const START_R = 350;

export type MatchStats = { place: number; won: boolean; kills: number; seconds: number; opened: number; lore: string[]; allies: number; players: number };

export class Game {
  world: World;
  actors: Actor[] = [];
  player: Actor;
  time = 0;
  dark: Dark;
  ev: Ev[] = [];
  over: MatchStats | null = null;
  opened = 0;
  loreFound: string[] = [];
  alliesMade = 0;
  /** aviso de tela: o que dá para fazer agora ("Abrir caixa", "Propor aliança a Rute") */
  prompt: { kind: "open" | "lore" | "ally" | "trade"; text: string } | null = null;
  private rand: () => number;
  private nextTeam = 1;
  private finalT = 0;

  constructor(seed: number, playerName: string, color: number, bots = 9) {
    this.world = buildWorld(seed);
    this.rand = rng(seed ^ 0x9e3779b9);
    const sp = [...this.world.spawns].sort(() => this.rand() - 0.5);
    this.player = this.spawn(0, playerName, false, color, sp[0], 0.5, 0.5);
    const profiles = [...BOT_PROFILES].sort(() => this.rand() - 0.5).slice(0, bots);
    profiles.forEach((p, i) => {
      const a = this.spawn(i + 1, p.name, true, p.color, sp[(i + 1) % sp.length], p.aggression, p.loyalty);
      a.ai = newBotState(this.rand);
    });
    // duas duplas já chegam como tribo (o jogador encontra alianças prontas pelo mapa)
    const loyal = this.actors.filter((a) => a.bot).sort((a, b) => b.loyalty - a.loyalty);
    for (let k = 0; k + 1 < Math.min(4, loyal.length); k += 2) {
      const t = 100 + k;
      loyal[k].team = t;
      loyal[k + 1].team = t;
      // nascem juntos
      loyal[k + 1].x = loyal[k].x + 2.5;
      loyal[k + 1].z = loyal[k].z + 1.5;
    }
    this.dark = { x: 0, z: 0, r: START_R, fx: 0, fz: 0, fr: START_R, tx: 0, tz: 0, tr: START_R, t0: 0, t1: DARK_PHASES[0][0], phase: 0, shrinking: false };
    this.planDark();
  }

  private spawn(id: number, name: string, bot: boolean, color: number, at: { x: number; z: number }, aggression: number, loyalty: number): Actor {
    const a: Actor = {
      id,
      name,
      bot,
      color,
      x: at.x,
      z: at.z,
      yaw: this.rand() * 6.28,
      speed: 0,
      hp: 100,
      armor: 0,
      hunger: 72,
      thirst: 66,
      energy: 100,
      alive: true,
      melee: "punho",
      guns: [null, null],
      active: 0,
      ammo: { bala: 0, cartucho: 0, flecha: 0 },
      inv: {},
      gear: {},
      cooldown: 0,
      reloading: 0,
      using: null,
      team: 0,
      kills: 0,
      swing: 0,
      hurt: 0,
      sinceHurt: 99,
      deadT: 0,
      place: 0,
      aggression,
      loyalty,
    };
    this.actors.push(a);
    return a;
  }

  // ---------------------------------------------------------------- consultas
  get alive(): number {
    let n = 0;
    for (const a of this.actors) if (a.alive) n++;
    return n;
  }
  weaponOf(a: Actor): WeaponDef {
    if (a.active === 0) return WEAPONS[a.melee];
    const g = a.guns[a.active - 1];
    return g ? WEAPONS[g.id] : WEAPONS[a.melee];
  }
  capacity(a: Actor): number {
    return BASE_CAPACITY + (a.gear.mochila ? (GEAR.mochila.capacity ?? 0) : 0);
  }
  carried(a: Actor): number {
    let n = 0;
    for (const k in a.inv) n += a.inv[k];
    return n;
  }
  allies(a: Actor, b: Actor): boolean {
    return a.team !== 0 && a.team === b.team;
  }
  countGroup(a: Actor, group: "food" | "drink" | "med"): number {
    let n = 0;
    for (const k in a.inv) if (CONSUMABLES[k]?.group === group) n += a.inv[k];
    return n;
  }
  inDark(x: number, z: number): boolean {
    return Math.hypot(x - this.dark.x, z - this.dark.z) > this.dark.r;
  }
  feed(text: string, tone: "info" | "good" | "bad" | "kill" = "info") {
    this.ev.push({ t: "feed", text, tone });
  }

  // ---------------------------------------------------------------- as Trevas
  private planDark() {
    const d = this.dark;
    const ph = DARK_PHASES[d.phase];
    if (!ph) return;
    d.fx = d.x;
    d.fz = d.z;
    d.fr = d.r;
    d.tr = ph[2];
    // o novo círculo cabe dentro do atual e fica dentro do mapa
    const slack = Math.max(0, d.r - d.tr);
    const ang = this.rand() * 6.28;
    const dist = this.rand() * slack * 0.75;
    const lim = HALF - 30;
    d.tx = Math.max(-lim, Math.min(lim, d.x + Math.cos(ang) * dist));
    d.tz = Math.max(-lim, Math.min(lim, d.z + Math.sin(ang) * dist));
    d.t0 = this.time + ph[0];
    d.t1 = d.t0 + ph[1];
    d.shrinking = false;
  }
  private updateDark() {
    const d = this.dark;
    if (!DARK_PHASES[d.phase]) return;
    if (this.time >= d.t0 && !d.shrinking) {
      d.shrinking = true;
      this.ev.push({ t: "dark", phase: d.phase + 1 });
      this.feed("As Trevas estão avançando. Corra para a área segura.", "bad");
    }
    if (d.shrinking) {
      const k = Math.min(1, (this.time - d.t0) / (d.t1 - d.t0));
      d.x = d.fx + (d.tx - d.fx) * k;
      d.z = d.fz + (d.tz - d.fz) * k;
      d.r = d.fr + (d.tr - d.fr) * k;
      if (k >= 1) {
        d.phase++;
        this.planDark();
      }
    }
  }
  /** segundos até as Trevas voltarem a andar (0 se já estão andando) */
  darkCountdown(): number {
    return this.dark.shrinking || !DARK_PHASES[this.dark.phase] ? 0 : Math.max(0, this.dark.t0 - this.time);
  }

  // ---------------------------------------------------------------- saque
  private rollContainer(c: Container) {
    if (c.items) return;
    const table = LOOT_TABLES[c.table] ?? LOOT_TABLES.casa;
    const r = rng(this.world.seed * 7919 + c.id * 104729);
    const total = table.reduce((s, e) => s + e.w, 0);
    const items: Record<string, number> = {};
    const n = 2 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      let roll = r() * total;
      for (const e of table) {
        roll -= e.w;
        if (roll <= 0) {
          const q = e.n ? e.n[0] + Math.floor(r() * (e.n[1] - e.n[0] + 1)) : 1;
          items[e.id] = (items[e.id] ?? 0) + q;
          break;
        }
      }
    }
    c.items = items;
  }

  /** Entrega um item. Devolve quantos couberam. */
  give(a: Actor, id: string, n: number): number {
    const wp = WEAPONS[id];
    if (wp) {
      if (wp.kind === "melee") {
        if (wp.tier <= WEAPONS[a.melee].tier) return 0;
        a.melee = id;
        return 1;
      }
      const same = a.guns.findIndex((g) => g?.id === id);
      if (same >= 0) {
        if (wp.ammo) a.ammo[wp.ammo] += wp.mag;
        return 1;
      }
      let slot = a.guns.findIndex((g) => !g);
      if (slot < 0) {
        const t0 = WEAPONS[a.guns[0]!.id].tier;
        const t1 = WEAPONS[a.guns[1]!.id].tier;
        slot = t0 <= t1 ? 0 : 1;
        if (wp.tier <= Math.min(t0, t1)) return 0;
      }
      a.guns[slot] = { id, mag: wp.mag };
      if (a.active === 0 || a.active === slot + 1) a.active = (slot + 1) as 1 | 2;
      return 1;
    }
    if (isAmmo(id)) {
      a.ammo[id] += n;
      return n;
    }
    if (GEAR[id]) {
      const g = GEAR[id];
      if (g.armor) {
        const max = (a.gear.colete || id === "colete" ? 60 : 0) + (a.gear.capacete || id === "capacete" ? 30 : 0);
        if (a.gear[id] && a.armor >= max) return 0;
        a.gear[id] = true;
        a.armor = Math.min(max, a.armor + g.armor);
        return 1;
      }
      if (a.gear[id]) return 0;
      a.gear[id] = true;
      return 1;
    }
    if (CONSUMABLES[id]) {
      const room = this.capacity(a) - this.carried(a);
      const take = Math.max(0, Math.min(n, room));
      if (take) a.inv[id] = (a.inv[id] ?? 0) + take;
      return take;
    }
    return 0;
  }

  openContainer(a: Actor, c: Container) {
    this.rollContainer(c);
    const items = c.items!;
    const got: string[] = [];
    let left = 0;
    for (const id of Object.keys(items)) {
      const took = this.give(a, id, items[id]);
      if (took) {
        const l = itemLabel(id);
        got.push(`${l.emoji} ${l.name}${took > 1 ? ` x${took}` : ""}`);
      }
      items[id] -= took;
      if (items[id] <= 0) delete items[id];
      else left += items[id];
    }
    if (left === 0) {
      c.opened = true;
      this.ev.push({ t: "open", cid: c.id });
    }
    if (a === this.player) {
      this.opened++;
      this.ev.push({ t: "toast", text: got.length ? got.join("  ") : left ? "Mochila cheia: nada coube." : "Vazio." });
    }
  }

  private dropBag(a: Actor) {
    const items: Record<string, number> = { ...a.inv };
    for (const k of ["bala", "cartucho", "flecha"] as AmmoKind[]) if (a.ammo[k]) items[k] = a.ammo[k];
    for (const g of a.guns) if (g) items[g.id] = 1;
    if (a.melee !== "punho") items[a.melee] = 1;
    for (const g in a.gear) if (a.gear[g]) items[g] = 1;
    if (!Object.keys(items).length) return;
    const c: Container = { id: 10000 + a.id, x: a.x, z: a.z, table: "casa", opened: false, kind: "mochila", items };
    this.world.containers.push(c);
    this.ev.push({ t: "drop", cid: c.id });
  }

  // ---------------------------------------------------------------- usar comida e remédio
  /** Escolhe o melhor item do grupo para a necessidade de agora e começa a usar. */
  useGroup(a: Actor, group: "food" | "drink" | "med"): boolean {
    if (a.using) return false;
    let best: string | null = null;
    let bestScore = -1;
    for (const id in a.inv) {
      const c = CONSUMABLES[id];
      if (!a.inv[id] || c?.group !== group) continue;
      // o que repõe mais sem desperdiçar
      const need = group === "med" ? 100 - a.hp : group === "drink" ? 100 - a.thirst : 100 - a.hunger;
      const gives = group === "med" ? (c.hp ?? 0) : group === "drink" ? (c.thirst ?? 0) : (c.hunger ?? 0);
      const score = Math.min(need, gives) - Math.max(0, gives - need) * 0.3;
      if (score > bestScore) {
        bestScore = score;
        best = id;
      }
    }
    if (!best) return false;
    a.using = { id: best, t: 0, total: CONSUMABLES[best].useTime };
    return true;
  }
  private finishUse(a: Actor) {
    const c = CONSUMABLES[a.using!.id];
    a.inv[c.id] = (a.inv[c.id] ?? 1) - 1;
    if (a.inv[c.id] <= 0) delete a.inv[c.id];
    a.hunger = Math.min(100, a.hunger + (c.hunger ?? 0));
    a.thirst = Math.min(100, a.thirst + (c.thirst ?? 0));
    a.hp = Math.min(100, a.hp + (c.hp ?? 0));
    a.energy = Math.min(100, a.energy + (c.energy ?? 0));
    a.using = null;
  }

  // ---------------------------------------------------------------- combate
  private damage(target: Actor, amount: number, by: Actor | null, cause: "trevas" | "fome" = "trevas") {
    if (!target.alive) return;
    let dmg = amount;
    if (target.armor > 0) {
      const absorbed = Math.min(target.armor, dmg * 0.55);
      target.armor -= absorbed;
      dmg -= absorbed;
    }
    target.hp -= dmg;
    target.hurt = 0.25;
    target.sinceHurt = 0;
    if (target.using) target.using = null;
    if (by && by !== target) {
      // ferir alguém da própria tribo é traição: a aliança acaba ali
      if (this.allies(by, target)) this.breakTribe(by, target);
      if (target.ai) target.ai.anger.set(by.id, this.time + 40);
      // os aliados do ferido também se voltam contra o agressor
      for (const o of this.actors) if (o.ai && o.alive && o !== by && this.allies(o, target)) o.ai.anger.set(by.id, this.time + 30);
    }
    if (target.hp <= 0) this.kill(target, by, cause);
  }

  breakTribe(traitor: Actor, victim: Actor) {
    const team = traitor.team;
    traitor.team = 0;
    for (const o of this.actors) if (o.team === team && o.ai) o.ai.anger.set(traitor.id, this.time + 120);
    const left = this.actors.filter((o) => o.alive && o.team === team);
    if (left.length < 2) for (const o of left) o.team = 0;
    if (traitor === this.player) this.feed(`Você traiu ${victim.name}. A tribo acabou.`, "bad");
    else if (victim === this.player) this.feed(`${traitor.name} traiu você!`, "bad");
    else this.feed(`${traitor.name} traiu ${victim.name}.`, "info");
  }

  private kill(a: Actor, by: Actor | null, cause: "trevas" | "fome" = "trevas") {
    a.alive = false;
    a.hp = 0;
    a.place = this.alive + 1;
    a.using = null;
    this.dropBag(a);
    if (by && by !== a) by.kills++;
    this.ev.push({ t: "death", id: a.id, by: by ? by.id : -1 });
    const left = this.alive;
    if (by && by !== a) this.feed(`${by === this.player ? "Você" : by.name} eliminou ${a === this.player ? "você" : a.name} · restam ${left}`, by === this.player ? "kill" : a === this.player ? "bad" : "info");
    else if (cause === "fome") this.feed(`${a === this.player ? "Você não resistiu" : `${a.name} não resistiu`} à fome e à sede · restam ${left}`, a === this.player ? "bad" : "info");
    else this.feed(`As Trevas levaram ${a === this.player ? "você" : a.name} · restam ${left}`, a === this.player ? "bad" : "info");
    // tribo de um só deixa de ser tribo
    if (a.team) {
      const mates = this.actors.filter((o) => o.alive && o.team === a.team);
      if (mates.length === 1) mates[0].team = 0;
    }
    this.checkOver();
  }

  private checkOver() {
    if (this.over) return;
    const p = this.player;
    if (!p.alive) this.over = this.stats(false, p.place);
    else if (this.alive === 1) {
      p.place = 1;
      this.over = this.stats(true, 1);
    }
  }
  private stats(won: boolean, place: number): MatchStats {
    return { place, won, kills: this.player.kills, seconds: Math.round(this.time), opened: this.opened, lore: [...this.loreFound], allies: this.alliesMade, players: this.actors.length };
  }

  /** Dispara ou golpeia com a arma em uso. `err` é o erro de mira dos sobreviventes do computador. */
  attack(a: Actor, err = 0): boolean {
    if (a.cooldown > 0 || a.using || a.reloading > 0 || !a.alive) return false;
    const wp = this.weaponOf(a);
    if (wp.kind === "melee") {
      a.cooldown = wp.cooldown;
      a.swing = 0.3;
      this.ev.push({ t: "melee", id: a.id });
      let best: Actor | null = null;
      let bd = wp.range;
      for (const o of this.actors) {
        if (o === a || !o.alive) continue;
        if (a.bot && this.allies(a, o)) continue;
        const dx = o.x - a.x;
        const dz = o.z - a.z;
        const d = Math.hypot(dx, dz);
        if (d > bd) continue;
        const ang = Math.atan2(dx, dz);
        let diff = ang - a.yaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        if (Math.abs(diff) > 1.1) continue;
        bd = d;
        best = o;
      }
      if (best) {
        this.ev.push({ t: "hit", x: best.x, z: best.z, id: best.id });
        this.damage(best, wp.damage * (a.bot ? 0.8 : 1), a);
      }
      return true;
    }
    const g = a.guns[a.active - 1]!;
    if (g.mag <= 0) {
      this.reload(a);
      return false;
    }
    g.mag--;
    a.cooldown = wp.cooldown;
    a.swing = 0.12;
    for (let p = 0; p < wp.pellets; p++) {
      const ang = a.yaw + (this.rand() - 0.5) * 2 * (wp.spread + err);
      const dx = Math.sin(ang);
      const dz = Math.cos(ang);
      let max = rayBoxes(this.world, a.x, a.z, dx, dz, wp.range);
      let hit: Actor | null = null;
      for (const o of this.actors) {
        if (o === a || !o.alive) continue;
        if (a.bot && this.allies(a, o)) continue;
        const rx = o.x - a.x;
        const rz = o.z - a.z;
        const t = rx * dx + rz * dz;
        if (t < 0.3 || t > max) continue;
        const perp = Math.abs(rx * dz - rz * dx);
        if (perp > 0.62) continue;
        max = t;
        hit = o;
      }
      this.ev.push({ t: "shot", id: a.id, x0: a.x, z0: a.z, x1: a.x + dx * max, z1: a.z + dz * max, weapon: wp.id });
      if (hit) {
        this.ev.push({ t: "hit", x: hit.x, z: hit.z, id: hit.id });
        this.damage(hit, wp.damage * (a.bot ? 0.7 : 1), a);
      }
    }
    // barulho: quem ouve vem ver (ou foge)
    if (wp.noise > 0)
      for (const o of this.actors)
        if (o.ai && o.alive && o !== a && !this.allies(o, a) && Math.hypot(o.x - a.x, o.z - a.z) < wp.noise) o.ai.heard = { x: a.x, z: a.z, t: this.time };
    if (g.mag <= 0) this.reload(a);
    return true;
  }

  reload(a: Actor) {
    if (a.active === 0 || a.reloading > 0) return;
    const g = a.guns[a.active - 1];
    if (!g) return;
    const wp = WEAPONS[g.id];
    if (!wp.ammo || g.mag >= wp.mag || a.ammo[wp.ammo] <= 0) return;
    a.reloading = wp.reload;
  }
  private finishReload(a: Actor) {
    const g = a.guns[a.active - 1];
    if (!g) return;
    const wp = WEAPONS[g.id];
    if (!wp.ammo) return;
    const need = Math.min(wp.mag - g.mag, a.ammo[wp.ammo]);
    g.mag += need;
    a.ammo[wp.ammo] -= need;
  }

  // ---------------------------------------------------------------- alianças
  /** O jogador propõe tribo ao sobrevivente mais perto. */
  propose(bot: Actor) {
    const p = this.player;
    const ai = bot.ai!;
    if (this.time < ai.refuseT) return this.feed(`${bot.name} ainda não quer conversa.`, "info");
    const mine = this.actors.filter((o) => o.alive && p.team !== 0 && o.team === p.team).length;
    if (mine >= MAX_TRIBE) return this.feed(`A tribo já tem ${MAX_TRIBE} pessoas.`, "info");
    if (bot.team !== 0) {
      ai.refuseT = this.time + 25;
      return this.feed(`${bot.name} já tem uma tribo.`, "info");
    }
    const angry = (ai.anger.get(p.id) ?? 0) > this.time;
    const chance = angry ? 0 : 0.2 + bot.loyalty * 0.65 - bot.aggression * 0.25 + (this.alive <= 4 ? -0.15 : 0);
    if (this.rand() < chance) {
      if (!p.team) p.team = this.nextTeam++;
      bot.team = p.team;
      ai.anger.delete(p.id);
      this.alliesMade++;
      this.feed(`${bot.name} aceitou. Vocês agora são uma tribo.`, "good");
    } else {
      ai.refuseT = this.time + 30;
      if (bot.aggression > 0.7 && this.rand() < 0.5) {
        ai.anger.set(p.id, this.time + 30);
        this.feed(`${bot.name} recusou e sacou a arma!`, "bad");
      } else this.feed(`${bot.name} recusou a aliança.`, "info");
    }
  }

  /** Troca entre aliados: cada um dá ao outro uma unidade do que tem sobrando e o outro não tem. */
  trade(bot: Actor) {
    const p = this.player;
    const moved: string[] = [];
    const pass = (from: Actor, to: Actor, label: string) => {
      for (const id of Object.keys(from.inv)) {
        if (from.inv[id] < 2 || (to.inv[id] ?? 0) > 0) continue;
        if (this.capacity(to) - this.carried(to) < 1) return;
        from.inv[id]--;
        to.inv[id] = (to.inv[id] ?? 0) + 1;
        const l = itemLabel(id);
        moved.push(`${label} ${l.emoji} ${l.name}`);
      }
    };
    pass(bot, p, `${bot.name} te deu`);
    pass(p, bot, "Você deu");
    // munição que o outro usa e você não
    for (const k of ["bala", "cartucho", "flecha"] as AmmoKind[]) {
      const uses = (a: Actor) => a.guns.some((g) => g && WEAPONS[g.id].ammo === k);
      if (uses(p) && !uses(bot) && bot.ammo[k] > 0) {
        p.ammo[k] += bot.ammo[k];
        moved.push(`${bot.name} te deu ${bot.ammo[k]} ${itemLabel(k).name.toLowerCase()}`);
        bot.ammo[k] = 0;
      }
    }
    this.ev.push({ t: "toast", text: moved.length ? moved.join(" · ") : "Nada para trocar agora." });
  }

  /** No fim, quando só a tribo resta, a aliança acaba: só um pode vencer. */
  private finalBetrayal(dt: number) {
    const alive = this.actors.filter((a) => a.alive);
    if (alive.length < 2) return;
    const team = alive[0].team;
    const allSame = team !== 0 && alive.every((a) => a.team === team);
    if (!allSame) {
      this.finalT = 0;
      return;
    }
    if (this.finalT === 0) this.feed("Só a sua tribo restou. Mas só um pode vencer...", "bad");
    this.finalT += dt;
    if (this.finalT > 7) {
      for (const a of alive) {
        a.team = 0;
        if (a.ai) for (const o of alive) if (o !== a) a.ai.anger.set(o.id, this.time + 999);
      }
      this.feed("A tribo se desfez. Cada um por si.", "bad");
      this.finalT = 0;
    }
  }

  // ---------------------------------------------------------------- passo da simulação
  update(dt: number, inp: Input) {
    if (this.over) return;
    this.time += dt;
    this.updateDark();
    const p = this.player;

    // ---- jogador
    if (p.alive) {
      p.yaw = inp.yaw;
      if (inp.slot !== null) {
        if (inp.slot === 0 || p.guns[inp.slot - 1]) {
          if (p.active !== inp.slot) p.reloading = 0;
          p.active = inp.slot;
        }
      }
      if (inp.use) this.useGroup(p, inp.use);
      if (inp.reload) this.reload(p);
      // mira assistida: puxa para o inimigo mais perto do centro da tela
      if (inp.assist > 0 && inp.fire) {
        const wp = this.weaponOf(p);
        let best = inp.assist;
        let target = p.yaw;
        for (const o of this.actors) {
          if (o === p || !o.alive || this.allies(o, p)) continue;
          const dx = o.x - p.x;
          const dz = o.z - p.z;
          const d = Math.hypot(dx, dz);
          if (d > Math.max(6, wp.range) || blocked(this.world, p.x, p.z, o.x, o.z)) continue;
          const ang = Math.atan2(dx, dz);
          let diff = ang - p.yaw;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          if (Math.abs(diff) < best) {
            best = Math.abs(diff);
            target = ang;
          }
        }
        p.yaw = target;
      }
      if (inp.fire) this.attack(p);
      const len = Math.hypot(inp.mx, inp.mz);
      const canSprint = inp.sprint && p.energy > 2 && len > 0.2 && inp.mz > -0.2;
      this.moveActor(p, len > 0.05 ? inp.mx / Math.max(1, len) : 0, len > 0.05 ? inp.mz / Math.max(1, len) : 0, canSprint, dt);
      this.updatePrompt(inp);
    }

    // ---- sobreviventes do computador
    for (const a of this.actors) if (a.ai && a.alive) thinkBot(this, a, dt);

    // ---- corpo: fome, sede, energia, relógios
    for (const a of this.actors) {
      if (!a.alive) {
        a.deadT += dt;
        continue;
      }
      a.cooldown = Math.max(0, a.cooldown - dt);
      a.swing = Math.max(0, a.swing - dt);
      a.hurt = Math.max(0, a.hurt - dt);
      a.sinceHurt += dt;
      if (a.reloading > 0) {
        a.reloading -= dt;
        if (a.reloading <= 0) {
          a.reloading = 0;
          this.finishReload(a);
        }
      }
      if (a.using) {
        a.using.t += dt;
        if (a.using.t >= a.using.total) this.finishUse(a);
      }
      a.hunger = Math.max(0, a.hunger - dt * 0.185);
      a.thirst = Math.max(0, a.thirst - dt * 0.25);
      if (a.hunger <= 0 || a.thirst <= 0) this.damage(a, dt * 1.3, null, "fome");
      else if (a.hunger > 50 && a.thirst > 50 && a.sinceHurt > 6 && a.hp < 100) a.hp = Math.min(100, a.hp + dt * 0.7);
      if (a.alive && this.inDark(a.x, a.z)) this.damage(a, dt * (3 + this.dark.phase * 2.2), null);
    }
    this.finalBetrayal(dt);
    this.checkOver();
  }

  /** Anda no sentido (mx lado, mz frente) em relação ao olhar do sobrevivente. */
  moveActor(a: Actor, mx: number, mz: number, sprint: boolean, dt: number) {
    const moving = Math.hypot(mx, mz) > 0.05;
    const weak = a.hunger < 25 || a.thirst < 25;
    let speed = sprint ? SPRINT : WALK;
    if (weak) speed *= 0.86;
    if (a.using) speed *= 0.4;
    if (mz < -0.3) speed *= 0.75;
    if (sprint && moving) a.energy = Math.max(0, a.energy - dt * 13);
    else a.energy = Math.min(100, a.energy + dt * (moving ? 7 : 13) * (weak ? 0.5 : 1));
    if (!moving) {
      a.speed = 0;
      return;
    }
    const s = Math.sin(a.yaw);
    const c = Math.cos(a.yaw);
    // frente = (sin, cos); direita na tela = (-cos, sin), porque a câmera olha para +Z
    const dx = (s * mz - c * mx) * speed * dt;
    const dz = (c * mz + s * mx) * speed * dt;
    const [nx, nz] = moveCircle(this.world, a.x, a.z, dx, dz, ACTOR_R);
    a.speed = Math.hypot(nx - a.x, nz - a.z) / Math.max(dt, 1e-4);
    a.x = nx;
    a.z = nz;
  }

  private updatePrompt(inp: Input) {
    const p = this.player;
    this.prompt = null;
    // narrativa: pega só de passar perto
    for (const l of this.world.lore) {
      if (l.taken || Math.hypot(l.x - p.x, l.z - p.z) > 1.8) continue;
      l.taken = true;
      this.loreFound.push(l.lore);
      this.ev.push({ t: "lore", id: l.lore });
      const lore = LORE_BY_ID.get(l.lore);
      // uma palavra de ânimo: a Bíblia devolve um pouco de energia
      if (lore?.kind === "biblia") p.energy = Math.min(100, p.energy + 35);
    }
    let best: Container | null = null;
    let bd = 2.6;
    for (const c of this.world.containers) {
      if (c.opened) continue;
      const d = Math.hypot(c.x - p.x, c.z - p.z);
      if (d < bd) {
        bd = d;
        best = c;
      }
    }
    if (best) {
      this.prompt = { kind: "open", text: best.kind === "mochila" ? "Pegar a mochila caída" : best.kind === "carro" ? "Revistar o porta-malas" : "Abrir a caixa" };
      if (inp.interact) this.openContainer(p, best);
      return;
    }
    let near: Actor | null = null;
    let nd = 9;
    for (const o of this.actors) {
      if (!o.bot || !o.alive) continue;
      const d = Math.hypot(o.x - p.x, o.z - p.z);
      if (d < nd && !blocked(this.world, p.x, p.z, o.x, o.z)) {
        nd = d;
        near = o;
      }
    }
    if (near) {
      if (this.allies(near, p)) {
        this.prompt = { kind: "trade", text: `Trocar com ${near.name}` };
        if (inp.trade || inp.interact) this.trade(near);
      } else {
        this.prompt = { kind: "ally", text: `Propor aliança a ${near.name}` };
        if (inp.ally || inp.interact) this.propose(near);
      }
    }
  }

  zoneName(): string {
    return zoneAt(this.player.x, this.player.z)?.name ?? "Terra de ninguém";
  }
}
