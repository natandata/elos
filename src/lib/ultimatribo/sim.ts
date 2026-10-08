// Simulação de A Última Tribo (modo Sobrevivência): sem desenho e sem rede, só as regras.
// O anfitrião (ou a partida solo) roda isto; o render.ts só mostra o estado.
import { AIRDROP_ITEMS, BASE_CAPACITY, CONSUMABLES, GEAR, LOOT_TABLES, MAX_GRENADES, WEAPONS, isAmmo, itemLabel, type AmmoKind, type WeaponDef } from "./data/items";
import { BOT_PROFILES, LORE_BY_ID } from "./data/lore";
import { thinkBot, type BotState, newBotState } from "./ai";
import { HALF, blocked, buildWorld, moveCircle, rayBoxes, rng, zoneAt, type Container, type World } from "./world";

export const ACTOR_R = 0.45;
export const WALK = 4.9;
export const SPRINT = 7.6;
export const MAX_TRIBE = 3;
export const PLANE_ALT = 150;
const CHUTE_ALT = 55;
const GRAVITY = 15;

export type Difficulty = "facil" | "normal" | "dificil";
export type GameOptions = { bots: number; difficulty: Difficulty };
const DIFF: Record<Difficulty, { dmg: number; skill: number; react: number }> = {
  facil: { dmg: 0.45, skill: -0.2, react: 0.9 },
  normal: { dmg: 0.68, skill: 0, react: 0.55 },
  dificil: { dmg: 0.9, skill: 0.2, react: 0.3 },
};

export type GunSlot = { id: string; mag: number };
/** 0 = em pé, 1 = agachado, 2 = deitado */
export type Stance = 0 | 1 | 2;

export type Actor = {
  id: number;
  name: string;
  bot: boolean;
  color: number;
  x: number;
  z: number;
  /** altura acima do chão (pulo e paraquedas) */
  y: number;
  vy: number;
  yaw: number;
  /** velocidade atual (para a animação de andar) */
  speed: number;
  /** onde está: no avião, caindo de paraquedas ou no chão */
  where: "plane" | "fall" | "ground";
  chute: boolean;
  stance: Stance;
  ads: boolean;
  /** abertura extra da mira por causa do recuo */
  bloom: number;
  hp: number;
  /** durabilidade do colete e do capacete */
  vestHp: number;
  helmHp: number;
  hunger: number;
  thirst: number;
  energy: number;
  boost: number;
  alive: boolean;
  melee: string;
  guns: [GunSlot | null, GunSlot | null];
  /** 0 = corpo a corpo, 1 e 2 = armas de fogo/besta */
  active: 0 | 1 | 2;
  ammo: Record<AmmoKind, number>;
  inv: Record<string, number>;
  grenades: number;
  /** nível de cada equipamento (0 = não tem) */
  gear: { mochila: number; colete: number; capacete: number; lanterna: number; radio: number };
  cooldown: number;
  reloading: number;
  using: { id: string; t: number; total: number } | null;
  /** gatilho apertado no passo anterior (armas não automáticas pedem soltar) */
  trigger: boolean;
  /** tribo (0 = sozinho) */
  team: number;
  kills: number;
  damageDealt: number;
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
  ads: boolean;
  /** mira assistida (toque): puxa para o inimigo mais perto do centro */
  assist: number;
  interact: boolean;
  jump: boolean;
  crouch: boolean;
  prone: boolean;
  reload: boolean;
  grenade: boolean;
  slot: 0 | 1 | 2 | null;
  use: "food" | "drink" | "med" | "boost" | null;
};

export const emptyInput = (): Input => ({ mx: 0, mz: 0, yaw: 0, sprint: false, fire: false, ads: false, assist: 0, interact: false, jump: false, crouch: false, prone: false, reload: false, grenade: false, slot: null, use: null });

export type Ev =
  | { t: "shot"; id: number; x0: number; z0: number; x1: number; z1: number; weapon: string }
  | { t: "melee"; id: number }
  | { t: "hit"; x: number; z: number; id: number; head: boolean; by: number }
  | { t: "death"; id: number; by: number }
  | { t: "feed"; text: string; tone: "info" | "good" | "bad" | "kill" }
  | { t: "toast"; text: string }
  | { t: "lore"; id: string }
  | { t: "open"; cid: number }
  | { t: "drop"; cid: number }
  | { t: "dark"; phase: number }
  | { t: "boom"; x: number; z: number }
  | { t: "land"; id: number }
  | { t: "jump"; id: number };

export type Dark = { x: number; z: number; r: number; fx: number; fz: number; fr: number; tx: number; tz: number; tr: number; t0: number; t1: number; phase: number; shrinking: boolean };
export type Grenade = { id: number; x: number; z: number; y: number; vx: number; vz: number; vy: number; t: number; by: number };
export type Plane = { x0: number; z0: number; x1: number; z1: number; x: number; z: number; yaw: number; t: number; dur: number; active: boolean };

/** Fases das Trevas: [espera, tempo fechando, raio final]. */
const DARK_PHASES: [number, number, number][] = [
  [100, 50, 190],
  [55, 45, 110],
  [45, 40, 56],
  [35, 35, 22],
  [25, 30, 0],
];
const START_R = 350;
const AIRDROP_AT = 150;

export type MatchStats = { place: number; won: boolean; kills: number; seconds: number; opened: number; lore: string[]; allies: number; players: number; damage: number };

export class Game {
  world: World;
  actors: Actor[] = [];
  player: Actor;
  time = 0;
  dark: Dark;
  plane: Plane;
  grenades: Grenade[] = [];
  ev: Ev[] = [];
  over: MatchStats | null = null;
  opened = 0;
  loreFound: string[] = [];
  alliesMade = 0;
  /** aviso de tela: o que dá para fazer agora ("Pegar", "Propor aliança a Rute") */
  prompt: { kind: "open" | "ally" | "trade" | "jump"; text: string } | null = null;
  diff: { dmg: number; skill: number; react: number };
  private rand: () => number;
  private nextTeam = 1;
  private finalT = 0;
  private nextGrenade = 0;
  private airdropDone = false;
  /** montes em que o jogador já mexeu e nada serviu (id → até quando ignorar) */
  private ignore = new Map<number, number>();

  constructor(seed: number, playerName: string, color: number, opts: Partial<GameOptions> = {}) {
    const bots = Math.max(1, Math.min(BOT_PROFILES.length, opts.bots ?? 9));
    this.diff = DIFF[opts.difficulty ?? "normal"];
    this.world = buildWorld(seed);
    this.rand = rng(seed ^ 0x9e3779b9);

    // o avião cruza o mapa passando perto do centro
    const ang = this.rand() * Math.PI * 2;
    const off = (this.rand() - 0.5) * 120;
    const dx = Math.cos(ang);
    const dz = Math.sin(ang);
    const cx = -dz * off;
    const cz = dx * off;
    const L = HALF + 30;
    this.plane = { x0: cx - dx * L, z0: cz - dz * L, x1: cx + dx * L, z1: cz + dz * L, x: cx - dx * L, z: cz - dz * L, yaw: Math.atan2(dx, dz), t: 0, dur: 26, active: true };

    this.player = this.spawn(0, playerName, false, color, 0.5, 0.5);
    const profiles = [...BOT_PROFILES].sort(() => this.rand() - 0.5).slice(0, bots);
    profiles.forEach((p, i) => {
      const a = this.spawn(i + 1, p.name, true, p.color, p.aggression, p.loyalty);
      a.ai = newBotState(this.rand, this.diff.skill);
      a.ai.jumpAt = 0.12 + this.rand() * 0.72;
    });
    // duas duplas já chegam como tribo e pulam juntas
    const loyal = this.actors.filter((a) => a.bot).sort((a, b) => b.loyalty - a.loyalty);
    for (let k = 0; k + 1 < Math.min(4, loyal.length); k += 2) {
      const t = 100 + k;
      loyal[k].team = t;
      loyal[k + 1].team = t;
      loyal[k + 1].ai!.jumpAt = loyal[k].ai!.jumpAt + 0.01;
    }
    this.dark = { x: 0, z: 0, r: START_R, fx: 0, fz: 0, fr: START_R, tx: 0, tz: 0, tr: START_R, t0: 0, t1: DARK_PHASES[0][0], phase: 0, shrinking: false };
    this.planDark();
  }

  private spawn(id: number, name: string, bot: boolean, color: number, aggression: number, loyalty: number): Actor {
    const a: Actor = {
      id,
      name,
      bot,
      color,
      x: this.plane.x,
      z: this.plane.z,
      y: PLANE_ALT,
      vy: 0,
      yaw: this.plane.yaw,
      speed: 0,
      where: "plane",
      chute: false,
      stance: 0,
      ads: false,
      bloom: 0,
      hp: 100,
      vestHp: 0,
      helmHp: 0,
      hunger: 78,
      thirst: 72,
      energy: 100,
      boost: 0,
      alive: true,
      melee: "punho",
      guns: [null, null],
      active: 0,
      ammo: { bala: 0, cartucho: 0, flecha: 0 },
      inv: {},
      grenades: 0,
      gear: { mochila: 0, colete: 0, capacete: 0, lanterna: 0, radio: 0 },
      cooldown: 0,
      reloading: 0,
      using: null,
      trigger: false,
      team: 0,
      kills: 0,
      damageDealt: 0,
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
    return BASE_CAPACITY + (a.gear.mochila ? (GEAR[`mochila${a.gear.mochila}`].capacity ?? 0) : 0);
  }
  carried(a: Actor): number {
    let n = a.grenades;
    for (const k in a.inv) n += a.inv[k];
    return n;
  }
  allies(a: Actor, b: Actor): boolean {
    return a.team !== 0 && a.team === b.team;
  }
  countGroup(a: Actor, group: "food" | "drink" | "med" | "boost"): number {
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
  /** Abertura da mira agora: arma, postura, mira, recuo, movimento e pulo. */
  spreadOf(a: Actor): number {
    const wp = this.weaponOf(a);
    if (wp.kind === "melee") return 0;
    const stance = a.stance === 2 ? 0.55 : a.stance === 1 ? 0.75 : 1;
    return wp.spread * stance * (a.ads ? 0.4 : 1) + a.bloom + (a.speed / WALK) * 0.018 * (a.ads ? 0.5 : 1) + (a.y > 0.05 ? 0.09 : 0);
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
    const lim = HALF - 40;
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

  // ---------------------------------------------------------------- avião e paraquedas
  private updatePlane(dt: number, inp: Input) {
    const pl = this.plane;
    if (pl.active) {
      pl.t += dt;
      const k = Math.min(1, pl.t / pl.dur);
      pl.x = pl.x0 + (pl.x1 - pl.x0) * k;
      pl.z = pl.z0 + (pl.z1 - pl.z0) * k;
      if (k >= 1) pl.active = false;
      for (const a of this.actors) {
        if (a.where !== "plane") continue;
        a.x = pl.x;
        a.z = pl.z;
        a.y = PLANE_ALT;
        const inside = Math.abs(a.x) < HALF - 12 && Math.abs(a.z) < HALF - 12;
        const want = a.bot ? k >= a.ai!.jumpAt : (inp.jump || inp.interact) && pl.t > 1.2;
        // quem não pula é empurrado para fora antes de o avião sair do mapa (a queda prende a pessoa dentro dele)
        if ((inside && want) || k > 0.9) this.leavePlane(a);
      }
    }
  }
  private leavePlane(a: Actor) {
    a.where = "fall";
    a.vy = -6;
    a.chute = false;
    this.ev.push({ t: "jump", id: a.id });
    if (a.ai) {
      // escolhe onde pousar: um ponto de suprimentos ao alcance do paraquedas
      const near = this.world.containers.filter((c) => Math.hypot(c.x - a.x, c.z - a.z) < 120);
      const c = near.length ? near[Math.floor(this.rand() * near.length)] : null;
      a.ai.landX = c ? c.x + (this.rand() - 0.5) * 6 : a.x;
      a.ai.landZ = c ? c.z + (this.rand() - 0.5) * 6 : a.z;
      a.ai.thinkT = 0;
    }
  }
  /** Queda: livre até certa altura, depois o paraquedas abre. Dá para dirigir até o chão. */
  private fall(a: Actor, mx: number, mz: number, dt: number) {
    if (!a.chute && a.y <= CHUTE_ALT) a.chute = true;
    const target = a.chute ? -7.5 : -26;
    a.vy += (target - a.vy) * Math.min(1, dt * 2.2);
    a.y += a.vy * dt;
    const len = Math.hypot(mx, mz);
    const speed = (a.chute ? 11 : 15) * Math.min(1, len);
    if (len > 0.05) {
      const s = Math.sin(a.yaw);
      const c = Math.cos(a.yaw);
      a.x += ((s * mz - c * mx) / len) * speed * dt;
      a.z += ((c * mz + s * mx) / len) * speed * dt;
    }
    const lim = HALF - 4;
    a.x = Math.max(-lim, Math.min(lim, a.x));
    a.z = Math.max(-lim, Math.min(lim, a.z));
    a.speed = 0;
    if (a.y <= 0) {
      a.y = 0;
      a.vy = 0;
      a.where = "ground";
      a.chute = false;
      // se caiu dentro de uma construção, é empurrado para fora
      [a.x, a.z] = moveCircle(this.world, a.x, a.z, 0, 0, ACTOR_R);
      this.ev.push({ t: "land", id: a.id });
    }
  }

  // ---------------------------------------------------------------- saque
  private rollContainer(c: Container) {
    if (c.items) return;
    const table = LOOT_TABLES[c.table] ?? LOOT_TABLES.casa;
    const r = rng(this.world.seed * 7919 + c.id * 104729);
    const total = table.reduce((s, e) => s + e.w, 0);
    const items: Record<string, number> = {};
    const n = 3 + Math.floor(r() * 3);
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
    // como no PUBG, arma no chão vem com munição por perto
    for (const id of Object.keys(items)) {
      const wp = WEAPONS[id];
      if (wp?.ammo) items[wp.ammo] = (items[wp.ammo] ?? 0) + wp.mag * 2;
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
        if (a.active === slot + 1) a.reloading = 0;
      }
      a.guns[slot] = { id, mag: wp.mag };
      if (a.active === 0) a.active = (slot + 1) as 1 | 2;
      return 1;
    }
    if (isAmmo(id)) {
      a.ammo[id] += n;
      return n;
    }
    if (id === "granada") {
      const room = Math.min(MAX_GRENADES - a.grenades, this.capacity(a) - this.carried(a));
      const take = Math.max(0, Math.min(n, room));
      a.grenades += take;
      return take;
    }
    const g = GEAR[id];
    if (g) {
      const cur = a.gear[g.slot];
      if (g.slot === "colete" || g.slot === "capacete") {
        const key = g.slot === "colete" ? "vestHp" : "helmHp";
        // nível maior troca; mesmo nível só vale se o atual estiver gasto
        if (g.level < cur || (g.level === cur && a[key] >= (g.armor ?? 0))) return 0;
        a.gear[g.slot] = g.level;
        a[key] = g.armor ?? 0;
        return 1;
      }
      if (g.level <= cur) return 0;
      a.gear[g.slot] = g.level;
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
      // nada serviu: o aviso desse monte some por um tempo, para não ficar insistindo
      if (!got.length && left) this.ignore.set(c.id, this.time + 25);
      if (got.length) this.opened++;
      this.ev.push({ t: "toast", text: got.length ? got.join("  ") : left ? "Nada aqui serve agora (mochila cheia ou equipamento pior)." : "Vazio." });
    }
  }

  private dropBag(a: Actor) {
    const items: Record<string, number> = { ...a.inv };
    for (const k of ["bala", "cartucho", "flecha"] as AmmoKind[]) if (a.ammo[k]) items[k] = a.ammo[k];
    for (const g of a.guns) if (g) items[g.id] = 1;
    if (a.melee !== "punho") items[a.melee] = 1;
    if (a.grenades) items.granada = a.grenades;
    for (const slot of ["mochila", "colete", "capacete"] as const) if (a.gear[slot]) items[`${slot}${a.gear[slot]}`] = 1;
    if (a.gear.lanterna) items.lanterna = 1;
    if (a.gear.radio) items.radio = 1;
    if (!Object.keys(items).length) return;
    const c: Container = { id: 10000 + a.id, x: a.x, z: a.z, table: "casa", opened: false, kind: "mochila", items };
    this.world.containers.push(c);
    this.ev.push({ t: "drop", cid: c.id });
  }

  /** A caixa de suprimentos desce de paraquedas dentro da próxima área segura. */
  private airdrop() {
    this.airdropDone = true;
    const d = this.dark;
    let x = d.tx;
    let z = d.tz;
    for (let t = 0; t < 30; t++) {
      const ang = this.rand() * 6.28;
      const rr = this.rand() * Math.max(10, d.tr * 0.7);
      x = d.tx + Math.cos(ang) * rr;
      z = d.tz + Math.sin(ang) * rr;
      const [nx, nz] = moveCircle(this.world, x, z, 0, 0, 1.5);
      if (Math.hypot(nx - x, nz - z) < 0.01) break;
      x = nx;
      z = nz;
    }
    const c: Container = { id: 20000, x, z, table: "casa", opened: false, kind: "airdrop", items: { ...AIRDROP_ITEMS }, y: 110 };
    this.world.containers.push(c);
    this.ev.push({ t: "drop", cid: c.id });
    this.feed("📦 Uma caixa de suprimentos está caindo de paraquedas!", "good");
  }

  // ---------------------------------------------------------------- usar comida e remédio
  /** Escolhe o melhor item do grupo para a necessidade de agora e começa a usar. */
  useGroup(a: Actor, group: "food" | "drink" | "med" | "boost"): boolean {
    if (a.using || a.where !== "ground") return false;
    let best: string | null = null;
    let bestScore = 0;
    if (group === "med") {
      // como um jogador faria: abaixo de 75, primeiros socorros se a vida está baixa, senão bandagem; o kit fica para o fim
      const has = (id: string) => (a.inv[id] ?? 0) > 0;
      if (a.hp < 75) best = a.hp < 50 && has("socorros") ? "socorros" : has("bandagem") ? "bandagem" : has("socorros") ? "socorros" : has("kit") ? "kit" : null;
      else if (a.hp < 99.5 && has("kit")) best = "kit";
      if (best) {
        a.using = { id: best, t: 0, total: CONSUMABLES[best].useTime };
        a.ads = false;
        return true;
      }
    }
    for (const id in a.inv) {
      const c = CONSUMABLES[id];
      if (!a.inv[id] || c?.group !== group) continue;
      let need: number;
      let gives: number;
      if (group === "med") {
        need = Math.min(100, c.hpCap ?? 100) - a.hp;
        gives = c.hp ?? 0;
      } else if (group === "boost") {
        need = 100 - a.boost;
        gives = c.boost ?? 0;
      } else if (group === "drink") {
        need = 100 - a.thirst;
        gives = c.thirst ?? 0;
      } else {
        need = 100 - a.hunger;
        gives = c.hunger ?? 0;
      }
      if (need <= 0.5) continue;
      // o que repõe mais sem desperdiçar (e sem gastar tempo demais num arranhão)
      const score = Math.min(need, gives) - Math.max(0, gives - need) * 0.3 + 0.01;
      if (score > bestScore) {
        bestScore = score;
        best = id;
      }
    }
    if (!best) {
      if (a === this.player && this.countGroup(a, group)) this.ev.push({ t: "toast", text: group === "med" ? "Bandagem e primeiros socorros só curam até 75 de vida." : "Você não precisa disso agora." });
      return false;
    }
    a.using = { id: best, t: 0, total: CONSUMABLES[best].useTime };
    a.ads = false;
    return true;
  }
  private finishUse(a: Actor) {
    const c = CONSUMABLES[a.using!.id];
    a.inv[c.id] = (a.inv[c.id] ?? 1) - 1;
    if (a.inv[c.id] <= 0) delete a.inv[c.id];
    a.hunger = Math.min(100, a.hunger + (c.hunger ?? 0));
    a.thirst = Math.min(100, a.thirst + (c.thirst ?? 0));
    if (c.hp) a.hp = Math.max(a.hp, Math.min(c.hpCap ?? 100, a.hp + c.hp));
    a.energy = Math.min(100, a.energy + (c.energy ?? 0));
    a.boost = Math.min(100, a.boost + (c.boost ?? 0));
    a.using = null;
  }

  // ---------------------------------------------------------------- combate
  private damage(target: Actor, amount: number, by: Actor | null, cause: "trevas" | "fome" | "arma" = "trevas", head = false) {
    if (!target.alive || target.where !== "ground") return;
    let dmg = amount;
    if (cause === "arma") {
      // capacete protege a cabeça e colete o corpo; os dois se gastam
      const slot = head ? "capacete" : "colete";
      const key = head ? "helmHp" : "vestHp";
      const lv = target.gear[slot];
      if (lv && target[key] > 0) {
        const absorbed = dmg * (GEAR[`${slot}${lv}`].reduce ?? 0);
        dmg -= absorbed;
        target[key] -= absorbed * 1.4;
        if (target[key] <= 0) {
          target[key] = 0;
          target.gear[slot] = 0;
        }
      }
    }
    const before = target.hp;
    target.hp -= dmg;
    if (by && by !== target) by.damageDealt += Math.min(before, dmg);
    if (cause === "arma") {
      target.hurt = 0.25;
      target.sinceHurt = 0;
      if (target.using) target.using = null;
    }
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

  private kill(a: Actor, by: Actor | null, cause: "trevas" | "fome" | "arma" = "trevas") {
    a.alive = false;
    a.hp = 0;
    a.place = this.alive + 1;
    a.using = null;
    a.ads = false;
    this.dropBag(a);
    if (by && by !== a) by.kills++;
    this.ev.push({ t: "death", id: a.id, by: by ? by.id : -1 });
    const left = this.alive;
    const me = a === this.player;
    if (by && by !== a) this.feed(`${by === this.player ? "Você" : by.name} eliminou ${me ? "você" : a.name} com ${this.weaponOf(by).name} · restam ${left}`, by === this.player ? "kill" : me ? "bad" : "info");
    else if (cause === "fome") this.feed(`${me ? "Você não resistiu" : `${a.name} não resistiu`} à fome e à sede · restam ${left}`, me ? "bad" : "info");
    else this.feed(`As Trevas levaram ${me ? "você" : a.name} · restam ${left}`, me ? "bad" : "info");
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
    return { place, won, kills: this.player.kills, seconds: Math.round(this.time), opened: this.opened, lore: [...this.loreFound], allies: this.alliesMade, players: this.actors.length, damage: Math.round(this.player.damageDealt) };
  }

  /** Dispara ou golpeia com a arma em uso. `err` é o erro de mira dos sobreviventes do computador. */
  attack(a: Actor, err = 0): boolean {
    if (a.cooldown > 0 || a.using || a.reloading > 0 || !a.alive || a.where !== "ground") return false;
    const wp = this.weaponOf(a);
    if (wp.kind === "melee") {
      a.cooldown = wp.cooldown;
      a.swing = 0.3;
      this.ev.push({ t: "melee", id: a.id });
      let best: Actor | null = null;
      let bd = wp.range;
      for (const o of this.actors) {
        if (o === a || !o.alive || o.where !== "ground") continue;
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
        this.ev.push({ t: "hit", x: best.x, z: best.z, id: best.id, head: false, by: a.id });
        this.damage(best, wp.damage * (a.bot ? this.diff.dmg + 0.1 : 1), a, "arma");
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
    const spread = this.spreadOf(a) + err;
    for (let p = 0; p < wp.pellets; p++) {
      const ang = a.yaw + (this.rand() - 0.5) * 2 * spread;
      const dx = Math.sin(ang);
      const dz = Math.cos(ang);
      let max = rayBoxes(this.world, a.x, a.z, dx, dz, wp.range);
      let hit: Actor | null = null;
      for (const o of this.actors) {
        if (o === a || !o.alive || o.where !== "ground") continue;
        if (a.bot && this.allies(a, o)) continue;
        const rx = o.x - a.x;
        const rz = o.z - a.z;
        const t = rx * dx + rz * dz;
        if (t < 0.3 || t > max) continue;
        const perp = Math.abs(rx * dz - rz * dx);
        // deitado ou agachado é um alvo menor
        if (perp > (o.stance === 2 ? 0.42 : o.stance === 1 ? 0.52 : 0.62)) continue;
        max = t;
        hit = o;
      }
      this.ev.push({ t: "shot", id: a.id, x0: a.x, z0: a.z, x1: a.x + dx * max, z1: a.z + dz * max, weapon: wp.id });
      if (hit) {
        const head = wp.pellets === 1 && this.rand() < (a.ads ? 0.24 : 0.14) * (a.bot ? 0.6 : 1);
        this.ev.push({ t: "hit", x: hit.x, z: hit.z, id: hit.id, head, by: a.id });
        this.damage(hit, wp.damage * (head ? 2 : 1) * (a.bot ? this.diff.dmg : 1), a, "arma", head);
      }
    }
    a.bloom = Math.min(0.1, a.bloom + wp.recoil);
    // barulho: quem ouve vem ver (ou foge)
    if (wp.noise > 0) this.noise(a, wp.noise);
    if (g.mag <= 0) this.reload(a);
    return true;
  }

  private noise(a: Actor | null, radius: number, x = a?.x ?? 0, z = a?.z ?? 0) {
    for (const o of this.actors) if (o.ai && o.alive && o !== a && !(a && this.allies(o, a)) && Math.hypot(o.x - x, o.z - z) < radius) o.ai.heard = { x, z, t: this.time };
  }

  reload(a: Actor) {
    if (a.active === 0 || a.reloading > 0) return;
    const g = a.guns[a.active - 1];
    if (!g) return;
    const wp = WEAPONS[g.id];
    if (!wp.ammo || g.mag >= wp.mag || a.ammo[wp.ammo] <= 0) return;
    a.reloading = wp.reload;
    a.ads = false;
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

  throwGrenade(a: Actor) {
    if (a.grenades <= 0 || a.cooldown > 0 || a.using || a.where !== "ground") return;
    a.grenades--;
    a.cooldown = 0.8;
    a.swing = 0.3;
    const s = Math.sin(a.yaw);
    const c = Math.cos(a.yaw);
    this.grenades.push({ id: this.nextGrenade++, x: a.x + s * 0.6, z: a.z + c * 0.6, y: 1.5, vx: s * 17, vz: c * 17, vy: 6.5, t: 2.6, by: a.id });
    this.ev.push({ t: "melee", id: a.id });
  }
  private updateGrenades(dt: number) {
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const g = this.grenades[i];
      g.t -= dt;
      g.vy -= GRAVITY * dt;
      const sp = Math.hypot(g.vx, g.vz);
      if (sp > 0.01) {
        const step = sp * dt;
        const wall = rayBoxes(this.world, g.x, g.z, g.vx / sp, g.vz / sp, step + 0.2);
        if (wall < step + 0.2) {
          // bate na parede e volta
          g.vx *= -0.35;
          g.vz *= -0.35;
        } else {
          g.x += g.vx * dt;
          g.z += g.vz * dt;
        }
      }
      g.y += g.vy * dt;
      if (g.y <= 0.1) {
        g.y = 0.1;
        g.vy = Math.abs(g.vy) * 0.3;
        g.vx *= 0.55;
        g.vz *= 0.55;
      }
      if (g.t <= 0) {
        this.grenades.splice(i, 1);
        this.ev.push({ t: "boom", x: g.x, z: g.z });
        const by = this.actors[g.by];
        for (const o of this.actors) {
          if (!o.alive || o.where !== "ground") continue;
          const d = Math.hypot(o.x - g.x, o.z - g.z);
          if (d > 8.5 || blocked(this.world, g.x, g.z, o.x, o.z)) continue;
          this.ev.push({ t: "hit", x: o.x, z: o.z, id: o.id, head: false, by: g.by });
          this.damage(o, 120 * (1 - d / 8.5) * (o.stance === 2 ? 0.8 : 1), by, "arma");
        }
        this.noise(null, 110, g.x, g.z);
      }
    }
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
      ai.target = -1;
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
    // munição que você usa e o outro não
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
    if (this.finalT === 0) this.feed(alive.includes(this.player) ? "Só a sua tribo restou. Mas só um pode vencer..." : "Só uma tribo restou. Mas só um pode vencer...", "bad");
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
    this.updatePlane(dt, inp);
    if (!this.airdropDone && this.time >= AIRDROP_AT) this.airdrop();
    for (const c of this.world.containers) if (c.y && c.y > 0) c.y = Math.max(0, c.y - dt * 9);
    this.updateGrenades(dt);
    const p = this.player;
    this.prompt = null;

    // ---- jogador
    if (p.alive) {
      p.yaw = inp.yaw;
      if (p.where === "plane") {
        if (this.plane.t > 1.2) this.prompt = { kind: "jump", text: "Pular do avião" };
      } else if (p.where === "fall") this.fall(p, inp.mx, inp.mz, dt);
      else this.playerGround(p, inp, dt);
    }

    // ---- sobreviventes do computador
    for (const a of this.actors) {
      if (!a.ai || !a.alive) continue;
      if (a.where === "fall") {
        // dirige o paraquedas para o ponto que escolheu
        const ai = a.ai;
        const dx = ai.landX - a.x;
        const dz = ai.landZ - a.z;
        a.yaw = Math.atan2(dx, dz);
        this.fall(a, 0, Math.hypot(dx, dz) > 3 ? 1 : 0, dt);
      } else if (a.where === "ground") thinkBot(this, a, dt);
    }

    // ---- corpo: fome, sede, energia, relógios
    for (const a of this.actors) {
      if (!a.alive) {
        a.deadT += dt;
        continue;
      }
      if (a.where !== "ground") continue;
      a.cooldown = Math.max(0, a.cooldown - dt);
      a.swing = Math.max(0, a.swing - dt);
      a.hurt = Math.max(0, a.hurt - dt);
      a.bloom = Math.max(0, a.bloom - dt * 0.13);
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
      // pulo
      if (a.y > 0 || a.vy > 0) {
        a.vy -= GRAVITY * dt;
        a.y += a.vy * dt;
        if (a.y <= 0) {
          a.y = 0;
          a.vy = 0;
        }
      }
      a.hunger = Math.max(0, a.hunger - dt * 0.17);
      a.thirst = Math.max(0, a.thirst - dt * 0.23);
      if (a.boost > 0) {
        a.boost = Math.max(0, a.boost - dt * 0.9);
        if (a.hp < 100) a.hp = Math.min(100, a.hp + dt * 0.9);
      }
      if (a.hunger <= 0 || a.thirst <= 0) this.damage(a, dt * 1.3, null, "fome");
      else if (a.hunger > 50 && a.thirst > 50 && a.sinceHurt > 8 && a.hp < 100) a.hp = Math.min(100, a.hp + dt * 0.35);
      if (a.alive && this.inDark(a.x, a.z)) this.damage(a, dt * (2.5 + this.dark.phase * 2.2), null, "trevas");
    }
    this.finalBetrayal(dt);
    this.checkOver();
  }

  private playerGround(p: Actor, inp: Input, dt: number) {
    if (inp.slot !== null && (inp.slot === 0 || p.guns[inp.slot - 1]) && p.active !== inp.slot) {
      p.reloading = 0;
      p.active = inp.slot;
      p.cooldown = Math.max(p.cooldown, 0.25);
    }
    if (inp.use) this.useGroup(p, inp.use);
    if (inp.reload) this.reload(p);
    if (inp.grenade) this.throwGrenade(p);
    // posturas: agachar e deitar alternam; pular levanta
    if (inp.crouch) p.stance = p.stance === 1 ? 0 : 1;
    if (inp.prone) p.stance = p.stance === 2 ? 0 : 2;
    if (inp.jump && p.y <= 0) {
      if (p.stance !== 0) p.stance = 0;
      else if (p.energy > 6 && !p.using) {
        p.vy = 5.3;
        p.y = 0.01;
        p.energy -= 6;
      }
    }
    const wp = this.weaponOf(p);
    p.ads = inp.ads && wp.kind !== "melee" && !p.using && p.reloading <= 0 && p.y <= 0;
    // mira assistida: puxa para o inimigo mais perto do centro da tela
    if (inp.assist > 0 && inp.fire) {
      let best = inp.assist;
      let target = p.yaw;
      for (const o of this.actors) {
        if (o === p || !o.alive || o.where !== "ground" || this.allies(o, p)) continue;
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
    // armas que não são automáticas pedem soltar o gatilho entre os tiros
    if (inp.fire && (wp.auto || !p.trigger)) this.attack(p);
    p.trigger = inp.fire;
    const len = Math.hypot(inp.mx, inp.mz);
    const canSprint = inp.sprint && p.stance === 0 && !p.ads && p.energy > 2 && len > 0.2 && inp.mz > -0.2;
    this.moveActor(p, len > 0.05 ? inp.mx / Math.max(1, len) : 0, len > 0.05 ? inp.mz / Math.max(1, len) : 0, canSprint, dt);
    this.updatePrompt(inp);
  }

  /** Anda no sentido (mx lado, mz frente) em relação ao olhar do sobrevivente. */
  moveActor(a: Actor, mx: number, mz: number, sprint: boolean, dt: number) {
    const moving = Math.hypot(mx, mz) > 0.05;
    const weak = a.hunger < 25 || a.thirst < 25;
    let speed = sprint ? SPRINT : WALK;
    if (a.stance === 1) speed *= 0.55;
    if (a.stance === 2) speed *= 0.22;
    if (a.ads) speed *= 0.6;
    if (weak) speed *= 0.86;
    if (a.boost > 50) speed *= 1.05;
    if (a.using) speed *= 0.4;
    if (mz < -0.3) speed *= 0.75;
    if (sprint && moving) a.energy = Math.max(0, a.energy - dt * 11);
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
    let bd = 2.8;
    for (const c of this.world.containers) {
      if (c.opened || (c.y ?? 0) > 0.5 || (this.ignore.get(c.id) ?? 0) > this.time) continue;
      const d = Math.hypot(c.x - p.x, c.z - p.z);
      if (d < bd) {
        bd = d;
        best = c;
      }
    }
    if (best) {
      this.prompt = { kind: "open", text: best.kind === "mochila" ? "Pegar o que o sobrevivente deixou" : best.kind === "airdrop" ? "Abrir a caixa de suprimentos" : best.kind === "carro" ? "Revistar o porta-malas" : "Pegar os suprimentos" };
      if (inp.interact) this.openContainer(p, best);
      return;
    }
    let near: Actor | null = null;
    let nd = 9;
    for (const o of this.actors) {
      if (!o.bot || !o.alive || o.where !== "ground") continue;
      const d = Math.hypot(o.x - p.x, o.z - p.z);
      if (d < nd && !blocked(this.world, p.x, p.z, o.x, o.z)) {
        nd = d;
        near = o;
      }
    }
    if (near) {
      if (this.allies(near, p)) {
        this.prompt = { kind: "trade", text: `Trocar com ${near.name}` };
        if (inp.interact) this.trade(near);
      } else {
        this.prompt = { kind: "ally", text: `Propor aliança a ${near.name}` };
        if (inp.interact) this.propose(near);
      }
    }
  }

  zoneName(): string {
    return zoneAt(this.player.x, this.player.z)?.name ?? "Terra de ninguém";
  }
}
