// ArenaSoccer · motor da partida (estilo Brasfoot + lances decisivos).
// A partida corre minuto a minuto, só com números (sem tela). Quando o seu time cria uma chance, o jogo devolve o lance para você
// jogar na mão (passe, cruzamento, chute); as chances do adversário e as que você deixar o time resolver saem por sorteio.
import type { RosterPlayer } from "./teams";

export type Pos = "GK" | "DF" | "MF" | "FW";
export type Side = 0 | 1;
export type Player = { num: number; pos: Pos; name: string; ovr: number; /** foto (arquivo em /public), se houver */ photo?: string; /** posição e força de origem, quando o jogador está jogando fora do lugar dele */ nat?: { pos: Pos; ovr: number } };
export type Formation = "4-4-2" | "4-3-3" | "3-5-2" | "4-2-3-1" | "5-3-2";
export type Mentality = "defend" | "balanced" | "attack";

export const FORMATIONS: Record<Formation, { df: number; mf: number; fw: number }> = {
  "4-4-2": { df: 4, mf: 4, fw: 2 },
  "4-3-3": { df: 4, mf: 3, fw: 3 },
  "3-5-2": { df: 3, mf: 5, fw: 2 },
  "4-2-3-1": { df: 4, mf: 5, fw: 1 },
  "5-3-2": { df: 5, mf: 3, fw: 2 },
};
export const MENTALITIES: Record<Mentality, { label: string; atk: number; def: number; tempo: number }> = {
  defend: { label: "Defensivo", atk: -3, def: 3, tempo: 0.88 },
  balanced: { label: "Equilibrado", atk: 0, def: 0, tempo: 1 },
  attack: { label: "Ofensivo", atk: 3, def: -3, tempo: 1.14 },
};

export type Lineup = { formation: Formation; mentality: Mentality; xi: Player[]; bench: Player[] };

/** Posição e força de origem do jogador (antes de qualquer troca de lugar). */
export const natural = (p: Player): { pos: Pos; ovr: number } => p.nat ?? { pos: p.pos, ovr: p.ovr };

/** Coloca o jogador numa vaga: fora da posição de origem ele rende menos (goleiro de linha ou linha no gol, muito menos). */
export function placeAt(p: Player, slot: Pos): Player {
  const n = natural(p);
  const pen = n.pos === slot ? 0 : n.pos === "GK" || slot === "GK" ? 25 : (n.pos === "DF" && slot === "FW") || (n.pos === "FW" && slot === "DF") ? 10 : 7;
  return { ...p, pos: slot, ovr: Math.max(40, n.ovr - pen), nat: n.pos === slot ? undefined : n };
}

export const toPlayer = (p: RosterPlayer): Player => ({ num: p[0], pos: p[1] as Pos, name: p[2], ovr: p[3], photo: p[4] ? `/arenasoccer/players/${p[4]}.jpg` : undefined });

/** Escolhe os 11 melhores para a formação. Faltou gente numa posição? Joga um de outra posição ali, com um desconto de força. */
export function pickLineup(squad: Player[], formation: Formation, mentality: Mentality = "balanced", force: Player[] = []): Lineup {
  const need: [Pos, number][] = [["GK", 1], ["DF", FORMATIONS[formation].df], ["MF", FORMATIONS[formation].mf], ["FW", FORMATIONS[formation].fw]];
  const left = squad.map((p) => (p.nat ? { ...p, pos: p.nat.pos, ovr: p.nat.ovr, nat: undefined } : p)).sort((a, b) => b.ovr - a.ovr);
  const xi: Player[] = [];
  const take = (p: Player, as: Pos, penalty: number) => {
    left.splice(left.indexOf(p), 1);
    xi.push(as === p.pos ? p : { ...p, pos: as, ovr: Math.max(40, p.ovr - penalty), nat: { pos: p.pos, ovr: p.ovr } });
  };
  for (const [pos, n] of need) {
    for (let i = 0; i < n; i++) {
      const own = force.find((f) => f.pos === pos && left.includes(f)) ?? left.find((p) => p.pos === pos);
      if (own) take(own, pos, 0);
      else {
        const alt = pos === "GK" ? undefined : left.find((p) => p.pos !== "GK" && (pos === "DF" ? p.pos === "MF" : pos === "FW" ? p.pos === "MF" : p.pos !== "MF"));
        const any = alt ?? left.find((p) => p.pos !== "GK") ?? left[0];
        if (any) take(any, pos, pos === "GK" ? 25 : 7);
      }
    }
  }
  return { formation, mentality, xi, bench: left.slice(0, 9) };
}

/** Força por setor (0–100), já com a mentalidade. */
export function ratings(l: Lineup): { att: number; mid: number; def: number; gk: number } {
  const avg = (pos: Pos) => {
    const a = l.xi.filter((p) => p.pos === pos);
    return a.length ? a.reduce((s, p) => s + p.ovr, 0) / a.length : 55;
  };
  const m = MENTALITIES[l.mentality];
  const fw = avg("FW");
  const mf = avg("MF");
  const df = avg("DF");
  return { att: fw * 0.6 + mf * 0.4 + m.atk, mid: mf * 0.7 + fw * 0.15 + df * 0.15, def: df * 0.7 + mf * 0.3 + m.def, gk: avg("GK") };
}

/** Melhor formação para o elenco (a que dá a escalação mais forte). */
export function bestFormation(squad: Player[], force: Player[] = []): Formation {
  let best: Formation = "4-4-2";
  let bestScore = -1;
  for (const f of Object.keys(FORMATIONS) as Formation[]) {
    const l = pickLineup(squad, f, "balanced", force);
    const sc = l.xi.reduce((s, p) => s + p.ovr, 0);
    if (sc > bestScore + 0.5) {
      bestScore = sc;
      best = f;
    }
  }
  return best;
}

export type Rng = () => number;
export function mulberry(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T,>(rng: Rng, arr: T[]): T => arr[Math.floor(rng() * arr.length)];
const gauss = (rng: Rng): number => {
  let u = 0;
  while (u === 0) u = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
};
const clamp = (x: number, a: number, b: number): number => Math.max(a, Math.min(b, x));

export type ChanceKind = "open" | "counter" | "cross" | "corner" | "freekick" | "penalty";
export type Chance = { id: number; min: number; side: Side; kind: ChanceKind; shooter: Player; assister?: Player };
export type OutcomeKind = "goal" | "saved" | "post" | "bar" | "miss" | "blocked" | "intercepted";
/** `land` = onde a bola foi parar no gol e `keeper` = onde o goleiro foi (mesma escala da mira), para a animação. */
export type Outcome = { kind: OutcomeKind; goal: boolean; text: string; land?: Aim; keeper?: Aim };
export type LogEntry = { min: number; side: Side | null; icon: string; text: string; big?: boolean; /** busto de quem fez a jogada */ photo?: string };
export type Goal = { side: Side; min: number; scorer: string; assist?: string };

export type Match = {
  rng: Rng;
  min: number;
  half: 1 | 2;
  score: [number, number];
  lineups: [Lineup, Lineup];
  subsLeft: [number, number];
  log: LogEntry[];
  goals: Goal[];
  stats: { shots: [number, number]; onTarget: [number, number] };
  chanceSeq: number;
  /** o lado controlado por uma pessoa (null = tudo automático) */
  human: Side | null | "both";
  /** modo carreira: só os lances em que esse jogador participa (chute ou passe) são seus; os outros saem no automático */
  control: string | null;
  /** partida entre duas pessoas: os lances decisivos saem de uma agenda justa (mesmo número e mesmos tipos para os dois lados) */
  schedule: { min: number; side: Side; kind: ChanceKind }[] | null;
};

/** Lances decisivos por lado numa partida entre duas pessoas. */
export const FAIR_CHANCES = 7;

/**
 * Agenda justa: cada lado recebe exatamente `n` lances, dos mesmos tipos (a mesma quantidade de pênaltis, faltas, escanteios...),
 * espalhados pelos 90 minutos e alternando entre os lados.
 */
export function buildSchedule(rng: Rng, n: number): { min: number; side: Side; kind: ChanceKind }[] {
  const roll = (): ChanceKind => {
    const r = rng();
    return r < 0.035 ? "penalty" : r < 0.11 ? "freekick" : r < 0.22 ? "corner" : r < 0.42 ? "cross" : r < 0.52 ? "counter" : "open";
  };
  const kinds = Array.from({ length: n }, roll);
  const shuffled = (): ChanceKind[] => [...kinds].sort(() => rng() - 0.5);
  const own: [ChanceKind[], ChanceKind[]] = [shuffled(), shuffled()];
  const slots = n * 2;
  const width = 84 / slots;
  const out: { min: number; side: Side; kind: ChanceKind }[] = [];
  const used = new Set<number>();
  for (let k = 0; k < n; k++) {
    const first: Side = rng() < 0.5 ? 0 : 1;
    for (const [j, side] of ([first, (1 - first) as Side] as Side[]).entries()) {
      let min = 3 + Math.floor((k * 2 + j) * width + rng() * (width - 1));
      while (min === 45 || min === 46 || used.has(min)) min++;
      used.add(min);
      out.push({ min, side, kind: own[side].pop() as ChanceKind });
    }
  }
  return out.sort((a, b) => a.min - b.min);
}

/** Esse lado é jogado por uma pessoa? */
export const isHuman = (m: Match, s: Side): boolean => m.human === "both" || m.human === s;

export function createMatch(lineups: [Lineup, Lineup], seed: number, human: Side | null | "both" = 0, control: string | null = null): Match {
  const m: Match = { rng: mulberry(seed), min: 0, half: 1, score: [0, 0], lineups, subsLeft: [3, 3], log: [], goals: [], stats: { shots: [0, 0], onTarget: [0, 0] }, chanceSeq: 0, human, control, schedule: null };
  if (human === "both") m.schedule = buildSchedule(m.rng, FAIR_CHANCES);
  m.log.push({ min: 0, side: null, icon: "📣", text: "Bola rolando!" });
  return m;
}

const KIND_BASE: Record<ChanceKind, number> = { open: 0.13, counter: 0.19, cross: 0.12, corner: 0.085, freekick: 0.065, penalty: 0.77 };

/** Quanto a pontaria de quem joga o lance melhora a chance de gol em relação ao sorteio (ainda abaixo do dobro e meio). */
export const HUMAN_EDGE = 1.7;

/** Probabilidade de gol de uma chance resolvida no automático. */
export function autoGoalProb(m: Match, c: Chance): number {
  const me = ratings(m.lineups[c.side]);
  const op = ratings(m.lineups[1 - c.side]);
  const p = KIND_BASE[c.kind] * Math.exp((c.shooter.ovr - op.gk) / 60) * (1 + (me.att - op.def) / 220);
  return clamp(p, 0.02, c.kind === "penalty" ? 0.92 : 0.7);
}

function weightedShooter(m: Match, side: Side, kind: ChanceKind): Player {
  const xi = m.lineups[side].xi.filter((p) => p.pos !== "GK");
  const w = xi.map((p) => {
    const posW = kind === "corner" ? { DF: 2.4, MF: 1.2, FW: 3.5, GK: 0 }[p.pos] : { DF: 0.5, MF: 2.2, FW: 5, GK: 0 }[p.pos];
    return posW * Math.max(0.2, (p.ovr - 40) / 30) * (m.control && p.name === m.control ? 2.6 : 1);
  });
  let r = m.rng() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < xi.length; i++) {
    r -= w[i];
    if (r <= 0) return xi[i];
  }
  return xi[xi.length - 1];
}

/** Sorteia o tipo de chance. */
function rollKind(m: Match, side: Side): ChanceKind {
  const att = MENTALITIES[m.lineups[side].mentality];
  const r = m.rng();
  const counter = att.tempo < 1 ? 0.16 : 0.1;
  if (r < 0.035) return "penalty";
  if (r < 0.035 + 0.075) return "freekick";
  if (r < 0.11 + 0.11) return "corner";
  if (r < 0.22 + 0.2) return "cross";
  if (r < 0.42 + counter) return "counter";
  return "open";
}

const KIND_TEXT: Record<ChanceKind, string> = {
  open: "Jogada trabalhada",
  counter: "Contra-ataque veloz",
  cross: "Bola levantada na área",
  corner: "Escanteio",
  freekick: "Falta perigosa",
  penalty: "PÊNALTI!",
};

/**
 * Avança um minuto. Chances do adversário (e as suas, se não houver pessoa jogando) são resolvidas aqui.
 * Se o lado humano criou uma chance, ela volta em `chance` e a partida espera você resolver (jogando ou no automático).
 */
export function stepMinute(m: Match): { chance?: Chance; ended?: "half" | "full" } {
  if (m.min >= 90) return { ended: "full" };
  m.min += 1;
  if (m.min === 46 && m.half === 1) {
    m.half = 2;
    m.log.push({ min: 45, side: null, icon: "⏸️", text: `Fim do primeiro tempo: ${m.score[0]} x ${m.score[1]}` });
    m.min = 45;
    return { ended: "half" };
  }
  if (m.schedule) {
    // partida entre duas pessoas: só os lances da agenda justa acontecem
    let pending: Chance | undefined;
    const due = m.schedule.find((e) => e.min === m.min);
    if (due) {
      const shooter = weightedShooter(m, due.side, due.kind);
      const mates = m.lineups[due.side].xi.filter((x) => x !== shooter && x.pos !== "GK");
      const assister = due.kind === "penalty" || due.kind === "freekick" ? undefined : pick(m.rng, mates);
      const chance: Chance = { id: ++m.chanceSeq, min: m.min, side: due.side, kind: due.kind, shooter, assister };
      if (isHuman(m, due.side)) pending = chance;
      else applyOutcome(m, chance, autoOutcome(m, chance));
    }
    aiManage(m);
    return pending ? { chance: pending } : {};
  }
  const r0 = ratings(m.lineups[0]);
  const r1 = ratings(m.lineups[1]);
  const share0 = 1 / (1 + Math.exp(-(r0.mid - r1.mid) / 16));
  const tempo = (MENTALITIES[m.lineups[0].mentality].tempo + MENTALITIES[m.lineups[1].mentality].tempo) / 2;
  let human: Chance | undefined;
  const order: Side[] = m.rng() < 0.5 ? [0, 1] : [1, 0];
  for (const s of order) {
    const me = s === 0 ? r0 : r1;
    const op = s === 0 ? r1 : r0;
    const share = s === 0 ? share0 : 1 - share0;
    const p = clamp(0.1 * tempo * MENTALITIES[m.lineups[s].mentality].tempo * (0.5 + share) * (1 + (me.att - op.def) / 200), 0.02, 0.4);
    if (m.rng() >= p) continue;
    const kind = rollKind(m, s);
    const shooter = weightedShooter(m, s, kind);
    const mates = m.lineups[s].xi.filter((x) => x !== shooter && x.pos !== "GK");
    let assister = kind === "penalty" || kind === "freekick" ? undefined : pick(m.rng, mates);
    const star = m.control && isHuman(m, s) ? mates.find((x) => x.name === m.control) : undefined;
    if (star && assister && assister !== star && m.rng() < 0.3) assister = star;
    const chance: Chance = { id: ++m.chanceSeq, min: m.min, side: s, kind, shooter, assister };
    const mine = m.control ? shooter.name === m.control || assister?.name === m.control : true;
    // lances de bola parada são sempre seus; os de jogo corrido só viram lance decisivo quando são "grandes" (cerca de 6 em cada 10)
    const big = kind === "penalty" || kind === "freekick" || kind === "corner" || m.rng() < 0.6;
    if (isHuman(m, s) && !human && mine && big) {
      human = chance;
      continue;
    }
    applyOutcome(m, chance, autoOutcome(m, chance));
  }
  aiManage(m);
  return human ? { chance: human } : {};
}

function nameOf(p: Player): string {
  const parts = p.name.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : p.name;
}

/** Resolve uma chance no sorteio. */
export function autoOutcome(m: Match, c: Chance): Outcome {
  m.stats.shots[c.side]++;
  const goal = m.rng() < autoGoalProb(m, c);
  const gk = m.lineups[1 - c.side].xi.find((p) => p.pos === "GK");
  const who = nameOf(c.shooter);
  if (goal) return { kind: "goal", goal: true, text: `${who} ${c.kind === "penalty" ? "converte o pênalti" : c.kind === "freekick" ? "cobra a falta e é GOL" : "finaliza e é GOL"}!` };
  const r = m.rng();
  if (r < 0.46) return { kind: "saved", goal: false, text: `${gk ? nameOf(gk) : "O goleiro"} defende o chute de ${who}.` };
  if (r < 0.7) return { kind: "miss", goal: false, text: `${who} chuta para fora.` };
  if (r < 0.86) return { kind: "blocked", goal: false, text: `A zaga bloqueia a finalização de ${who}.` };
  return { kind: m.rng() < 0.5 ? "post" : "bar", goal: false, text: `${who} acerta a trave! Quase!` };
}

/** Registra o resultado de uma chance (placar, log, estatísticas). */
export function applyOutcome(m: Match, c: Chance, o: Outcome): void {
  if (o.kind !== "blocked" && o.kind !== "miss" && o.kind !== "intercepted") m.stats.onTarget[c.side]++;
  const icon = o.goal ? "⚽" : o.kind === "saved" ? "🧤" : o.kind === "post" || o.kind === "bar" ? "🥅" : o.kind === "intercepted" ? "✋" : "💨";
  if (o.goal) {
    m.score[c.side]++;
    m.goals.push({ side: c.side, min: c.min, scorer: c.shooter.name, assist: c.assister?.name });
  }
  const actor = o.kind === "intercepted" ? (c.assister ?? c.shooter) : c.shooter;
  m.log.push({ min: c.min, side: c.side, icon, text: `${KIND_TEXT[c.kind]}. ${o.text}`, big: o.goal, photo: actor.photo });
}

/** Deixa o time resolver uma chance sua. */
export function resolveAuto(m: Match, c: Chance): Outcome {
  const o = autoOutcome(m, c);
  applyOutcome(m, c, o);
  return o;
}

// ───────────── lances jogados na mão ─────────────

/** Mira no gol: x de −1 (trave esquerda) a +1 (trave direita); y de 0 (grama) a 1 (travessão). */
export type Aim = { x: number; y: number };

/** O chute que você mirou, como no Score Hero: a mira decide. Só erra se mirar mal ou se o goleiro estiver no caminho. */
export function shotOutcome(m: Match, c: Chance, aim: Aim, opts: { distance: number; header?: boolean; wall?: boolean; curve?: number; keeperX?: number; /** marcadores em cima da trajetória do chute */ blockers?: number }): Outcome {
  const rng = m.rng;
  m.stats.shots[c.side]++;
  const op = ratings(m.lineups[1 - c.side]);
  const gk = m.lineups[1 - c.side].xi.find((p) => p.pos === "GK");
  const who = nameOf(c.shooter);
  const curve = clamp(opts.curve ?? 0, 0, 1);
  // pontaria: erro pequeno, menor para craques; cabeceio e distância pioram um pouco
  const base = 0.02 + (92 - c.shooter.ovr) * 0.002 + (opts.header ? 0.03 : 0) + Math.max(0, opts.distance - 12) * 0.0015;
  const sigma = clamp(base, 0.015, 0.13) * (c.kind === "penalty" ? 0.6 : 1) * (1 + 0.4 * curve);
  // mirou dentro do gol: a bola vai dentro do gol (com um pequeno desvio), exceto numa escorregada rara,
  // mais comum em jogador fraco, chute de longe e cabeceio. Mirou fora: o erro de pontaria vale inteiro.
  const aimedIn = Math.abs(aim.x) <= 1 && aim.y >= 0 && aim.y <= 1;
  const slip = rng() < clamp(0.03 + (86 - c.shooter.ovr) * 0.002 + Math.max(0, opts.distance - 14) * 0.003 + (opts.header ? 0.03 : 0), 0.02, 0.14) * (c.kind === "penalty" ? 0.4 : 1);
  let x = aim.x + gauss(rng) * sigma;
  let y = aim.y + gauss(rng) * sigma * 0.8;
  if (aimedIn && !slip) {
    x = clamp(x, -0.985, 0.985);
    y = clamp(y, 0.02, 0.985);
  }
  const land = { x, y };
  if (opts.wall && y < 0.4 && rng() < 0.7 - curve * 0.55) return { kind: "blocked", goal: false, text: `A barreira bloqueia a cobrança de ${who}.`, land: { x: x * 0.4, y: 0.15 } };
  // só bloqueia quem está de fato na frente: um marcador sobre a trajetória (a curva ajuda a contornar)
  if (c.kind !== "penalty" && (opts.blockers ?? 0) > 0 && rng() < Math.min(0.7, (opts.blockers ?? 0) * (0.35 + Math.max(0, op.def - 75) * 0.004)) * (1 - curve * 0.7)) return { kind: "blocked", goal: false, text: `Um zagueiro se joga na frente e bloqueia o chute de ${who}!`, land: { x: x * 0.3, y: 0.1 } };
  if (Math.abs(x) > 1.06 || y > 1.06 || y < -0.02) return { kind: "miss", goal: false, text: y > 1.06 && Math.abs(x) <= 1.06 ? `${who} chuta por cima do travessão.` : `${who} chuta para fora.`, land };
  if (Math.abs(x) > 1 || y > 1) return { kind: Math.abs(x) > 1 ? "post" : "bar", goal: false, text: `${who} acerta ${Math.abs(x) > 1 ? "a trave" : "o travessão"}! Que susto!`, land };
  const gkOvr = gk?.ovr ?? 60;
  // o goleiro parte de onde você o viu; só chega no chute no meio do gol ou bem colocado de um lado
  const start = clamp(opts.keeperX ?? 0, -1, 1);
  const guess = rng() < clamp(0.25 + (gkOvr - 60) * 0.004 - curve * 0.12, 0.08, 0.42);
  const kx = guess ? clamp(Math.sign(x || 1) * (0.45 + rng() * 0.3), -1, 1) : clamp(start + (rng() < 0.5 ? -1 : 1) * (0.1 + rng() * 0.3), -1, 1);
  const ky = 0.2 + rng() * 0.2;
  const keeper = { x: kx, y: ky };
  const corner = Math.abs(x) > 0.68 && y > 0.62;
  const reach = (0.3 + (gkOvr - 60) * 0.003) * (corner ? 0.45 : 1) * (c.kind === "freekick" ? 0.9 : 1) * (1 - 0.25 * curve);
  const dist = Math.hypot((x - kx) * 0.9, (y - ky) * 1.25);
  if (dist < reach) return { kind: "saved", goal: false, text: `${gk ? nameOf(gk) : "O goleiro"} voa e defende o chute de ${who}!`, land, keeper: { x: x * 0.85, y: Math.max(0.2, y * 0.8) } };
  // defesa espetacular rara: nem o canto é gol garantido
  if (c.kind !== "penalty" && rng() < 0.06) return { kind: "saved", goal: false, text: `${gk ? nameOf(gk) : "O goleiro"} faz uma defesa espetacular no chute de ${who}!`, land, keeper: { x: x * 0.95, y: Math.max(0.25, y * 0.9) } };
  return { kind: "goal", goal: true, text: `${who} ${corner ? "coloca no ângulo" : "manda para a rede"}! GOL!`, land, keeper };
}

/** O passe ou cruzamento que você desenhou. `blockers` = marcadores perto da linha; `length` em metros. */
export function passOutcome(m: Match, c: Chance, line: { length: number; blockers: number; aerial: boolean; curve?: number }): Outcome {
  const passer = c.assister ?? c.shooter;
  const p = clamp(0.07 + line.length / 70 * 0.4 + line.blockers * 0.16 + (line.curve ?? 0) * 0.06 - (passer.ovr - 70) * 0.004, 0.03, 0.85) * (line.aerial ? 0.55 : 1);
  if (m.rng() < p) return { kind: "intercepted", goal: false, text: `${nameOf(passer)} tenta o passe, mas a defesa corta!` };
  return { kind: "saved", goal: false, text: "Passe certo!" };
}

/** Pontos de jogada do seu time: nota de 0 a 1 de quão bem você jogou o lance (só para o aviso na tela). */
export function aimQuality(aim: Aim): number {
  const edge = Math.max(Math.abs(aim.x), aim.y * 1.1);
  return clamp(edge, 0, 1);
}

// ───────────── tática e substituições ─────────────

export function setTactics(m: Match, side: Side, opts: { formation?: Formation; mentality?: Mentality }): void {
  const l = m.lineups[side];
  if (opts.mentality) l.mentality = opts.mentality;
  if (opts.formation && opts.formation !== l.formation) {
    const all = [...l.xi, ...l.bench].map((p) => ({ ...p }));
    // volta os jogadores para a posição de origem antes de remontar
    const keep = isHuman(m, side) && m.control ? all.filter((p) => p.name === m.control) : [];
    const next = pickLineup(all, opts.formation, l.mentality, keep);
    m.lineups[side] = next;
  }
}

export function substitute(m: Match, side: Side, outIdx: number, benchIdx: number): boolean {
  const l = m.lineups[side];
  if (m.subsLeft[side] <= 0 || !l.xi[outIdx] || !l.bench[benchIdx]) return false;
  const out = l.xi[outIdx];
  const inn = l.bench[benchIdx];
  l.xi[outIdx] = placeAt(inn, out.pos);
  l.bench[benchIdx] = natural(out).pos === out.pos ? out : { ...out, pos: natural(out).pos, ovr: natural(out).ovr, nat: undefined };
  m.subsLeft[side]--;
  m.log.push({ min: m.min, side, icon: "🔁", text: `Substituição: sai ${nameOf(out)}, entra ${nameOf(inn)}.`, photo: inn.photo });
  return true;
}

/** O computador mexe no time: mais ataque quando perde no fim, recuo quando ganha, uma troca aos 60. */
function aiManage(m: Match): void {
  for (const s of [0, 1] as Side[]) {
    if (isHuman(m, s)) continue;
    const l = m.lineups[s];
    const diff = m.score[s] - m.score[1 - s];
    if (m.min === 70 && diff < 0 && l.mentality !== "attack") {
      l.mentality = "attack";
      m.log.push({ min: m.min, side: s, icon: "📋", text: "O treinador adversário manda o time para o ataque." });
    }
    if (m.min === 80 && diff > 0 && l.mentality !== "defend") {
      l.mentality = "defend";
      m.log.push({ min: m.min, side: s, icon: "📋", text: "O adversário recua para segurar o resultado." });
    }
    if (m.min === 62 && m.subsLeft[s] > 0) {
      const wi = l.xi.reduce((b, p, i) => (p.pos !== "GK" && p.ovr < l.xi[b].ovr ? i : b), l.xi.findIndex((p) => p.pos !== "GK"));
      const bi = l.bench.findIndex((p) => p.pos === l.xi[wi].pos && p.ovr >= l.xi[wi].ovr - 3);
      if (bi >= 0) substitute(m, s, wi, bi);
    }
  }
}

/** Joga o que falta no automático (usado em "Simular"). */
export function simulateAll(m: Match): void {
  for (;;) {
    const r = stepMinute(m);
    if (r.chance) resolveAuto(m, r.chance);
    if (r.ended === "full") break;
    if (r.ended === "half") continue;
    if (m.min >= 90) {
      m.log.push({ min: 90, side: null, icon: "🏁", text: `Fim de jogo: ${m.score[0]} x ${m.score[1]}` });
      break;
    }
  }
}

export function finish(m: Match): void {
  if (m.log[m.log.length - 1]?.icon !== "🏁") m.log.push({ min: 90, side: null, icon: "🏁", text: `Fim de jogo: ${m.score[0]} x ${m.score[1]}` });
}

export function resultOf(m: Match): { goalsFor: number; goalsAgainst: number; result: "win" | "loss" | "draw"; scorers: { team: 0 | 1; name: string; at: number; assist?: string }[]; mine: { name: string; goals: number; assists: number; own: number }[] } {
  const [a, b] = m.score;
  const mine = new Map<string, { name: string; goals: number; assists: number; own: number }>();
  for (const g of m.goals) {
    if (g.side !== 0) continue;
    const s = mine.get(g.scorer) ?? { name: g.scorer, goals: 0, assists: 0, own: 0 };
    s.goals++;
    mine.set(g.scorer, s);
    if (g.assist) {
      const t = mine.get(g.assist) ?? { name: g.assist, goals: 0, assists: 0, own: 0 };
      t.assists++;
      mine.set(g.assist, t);
    }
  }
  return {
    goalsFor: a,
    goalsAgainst: b,
    result: a > b ? "win" : a < b ? "loss" : "draw",
    scorers: m.goals.map((g) => ({ team: g.side, name: g.scorer, at: g.min * 60, assist: g.assist })),
    mine: [...mine.values()],
  };
}
