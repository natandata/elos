// Sincronização "lockstep" da partida em tempo real (1x1 e duplas): todos os
// aparelhos rodam o mesmo motor e só trocam as jogadas. Cada jogada vale um
// pouco no futuro (PVP_INPUT_DELAY ticks) pra dar tempo de chegar nos outros;
// cada aviso diz "já te mandei tudo até o tick X", e o motor só avança até onde
// TODOS os outros já garantiram. Sem DOM nem rede: quem transporta as mensagens
// é o componente.

import { ARENA_CARD_BY_KEY } from "./cards";
import { HAND_SIZE, inDeployZone, inField, teamOf, type GameEvent, type GameState, type Input, type Side } from "./core";
import { createGame, createGameDuo, stateHash, step } from "./engine";
import { DUO_HEARTBEAT, DUO_INPUT_DELAY, PVP_HEARTBEAT, PVP_INPUT_DELAY, PVP_MAX_INPUTS, orderInputs } from "./pvp";

/** Mensagem trocada entre os aparelhos. */
export type Frame = {
  /** quem enviou (jogador 0–3). Sem isso, vale "o outro" do 1x1. */
  p?: number;
  /** índice (na lista de quem enviou) da primeira jogada em `inputs` */
  from: number;
  inputs: Input[];
  /** já mandei todas as minhas jogadas com tick < upTo */
  upTo: number;
  /** quantas jogadas de cada jogador eu já recebi (índice = jogador); no 1x1 também aceita um número só */
  got: number | number[];
  /** conferência: [tick, hash do estado] */
  cs?: [number, number];
};

const CHECK_EVERY = 40;

type OwnInput = Input & { cardKey: string };

export class Lockstep {
  readonly game: GameState;
  /** meu número de jogador (no 1x1 é igual ao lado) */
  readonly me: number;
  readonly mySide: Side;
  private n: number;
  /** atraso das jogadas e intervalo dos avisos (ticks) */
  readonly delay: number;
  private heartbeat: number;
  private own: OwnInput[] = [];
  private theirs: Input[][];
  /** quantas das minhas jogadas cada colega já confirmou */
  private peerGot: number[];
  private remoteUpTo: number[];
  /** colega que saiu: quantas jogadas dele valem (a última contagem que ele mandou) */
  private goneCount: (number | null)[];
  private lastSentTick: number;
  private dirty = true;
  private localChecks = new Map<number, number>();
  private remoteChecks: Map<number, number>[];
  desynced = false;

  /** `decks`: 2 (1x1) ou 4 (duplas); `me`: meu número de jogador. */
  constructor(seed: number, decks: string[][], me: number, arena = 0) {
    this.n = decks.length;
    this.delay = this.n > 2 ? DUO_INPUT_DELAY : PVP_INPUT_DELAY;
    this.heartbeat = this.n > 2 ? DUO_HEARTBEAT : PVP_HEARTBEAT;
    this.lastSentTick = -this.heartbeat;
    this.game = this.n === 2 ? createGame(seed, decks[0], decks[1], { arena, pvp: true }) : createGameDuo(seed, decks);
    this.me = me;
    this.mySide = teamOf(this.n, me);
    this.theirs = decks.map(() => []);
    this.peerGot = decks.map(() => 0);
    this.remoteUpTo = decks.map(() => this.delay);
    this.goneCount = decks.map(() => null);
    this.remoteChecks = decks.map(() => new Map());
  }

  private peers(): number[] {
    return Array.from({ length: this.n }, (_, i) => i).filter((i) => i !== this.me);
  }

  /** Minhas jogadas, limpas, pro relatório final. */
  get ownInputs(): Input[] {
    return this.own.map(({ tick, side, slot, x, y }) => ({ tick, side, slot, x, y }));
  }

  /** Jogadas dos outros como eu recebi (no 1x1, só as do colega). */
  get theirInputs(): Input[] {
    return this.theirs.flatMap((l, i) => (i === this.me ? [] : l.map(({ tick, side, slot, x, y }) => ({ tick, side, slot, x, y }))));
  }

  /** Jogadas recebidas, por jogador (relatório das duplas). */
  seenBy(): Record<number, Input[]> {
    const out: Record<number, Input[]> = {};
    this.peers().forEach((i) => {
      out[i] = this.theirs[i].map(({ tick, side, slot, x, y }) => ({ tick, side, slot, x, y }));
    });
    return out;
  }

  /** Jogadas minhas que ainda não rodaram (a carta fica "reservada"). */
  pendingSlots(): Set<number> {
    const s = new Set<number>();
    for (const i of this.own) if (i.tick >= this.game.tick) s.add(i.slot);
    return s;
  }

  private pendingCost(): number {
    let c = 0;
    for (const i of this.own) {
      if (i.tick < this.game.tick) continue;
      c += ARENA_CARD_BY_KEY.get(i.cardKey)?.cost ?? 0;
    }
    return c;
  }

  /** Agenda uma jogada minha pra daqui a PVP_INPUT_DELAY ticks. */
  schedule(slot: number, x: number, y: number): Input | null {
    const g = this.game;
    if (g.over || this.own.length >= PVP_MAX_INPUTS) return null;
    if (!Number.isInteger(slot) || slot < 0 || slot >= HAND_SIZE) return null;
    if (this.pendingSlots().has(slot)) return null;
    const card = ARENA_CARD_BY_KEY.get(g.slots[this.me][slot]);
    if (!card) return null;
    if (g.mana[this.me] - this.pendingCost() + 1e-9 < card.cost) return null;
    if (card.kind === "unit" ? !inDeployZone(this.mySide, x, y, g) : !inField(x, y)) return null;
    const input: OwnInput = {
      tick: g.tick + this.delay,
      side: this.mySide,
      slot,
      x: Math.round(x * 100) / 100,
      y: Math.round(y * 100) / 100,
      cardKey: card.key,
      ...(this.n > 2 ? { player: this.me } : {}),
    };
    this.own.push(input);
    this.dirty = true;
    return input;
  }

  /** Recebe uma mensagem de outro jogador. */
  receive(f: Frame): void {
    if (!f || !Array.isArray(f.inputs)) return;
    const from = typeof f.p === "number" ? f.p : this.n === 2 ? 1 - this.me : -1;
    if (!Number.isInteger(from) || from < 0 || from >= this.n || from === this.me) return;
    const side = teamOf(this.n, from);
    const list = this.theirs[from];
    f.inputs.forEach((raw, i) => {
      const idx = f.from + i;
      if (idx !== list.length) return; // duplicada, adiantada ou fora de ordem
      if (!Number.isInteger(raw.tick) || !Number.isInteger(raw.slot) || !Number.isFinite(raw.x) || !Number.isFinite(raw.y)) return;
      // jogada no passado: o colega furou a própria garantia (ou algo quebrou)
      if (raw.tick < this.game.tick) this.desynced = true;
      list.push({ tick: raw.tick, side, slot: raw.slot, x: raw.x, y: raw.y, ...(this.n > 2 ? { player: from } : {}) });
    });
    if (Number.isFinite(f.upTo)) this.remoteUpTo[from] = Math.max(this.remoteUpTo[from], f.upTo);
    const gotMine = Array.isArray(f.got) ? f.got[this.me] : f.got;
    if (Number.isFinite(gotMine)) this.peerGot[from] = Math.max(this.peerGot[from], Math.min(gotMine, this.own.length));
    if (f.cs) {
      this.remoteChecks[from].set(f.cs[0], f.cs[1]);
      const mine = this.localChecks.get(f.cs[0]);
      if (mine !== undefined && mine !== f.cs[1]) this.desynced = true;
    }
    this.maybeGone(from);
  }

  /** Um colega avisou que saiu da partida (com quantas jogadas ele mandou). */
  peerLeft(player: number, count: number): void {
    if (player < 0 || player >= this.n || player === this.me) return;
    this.goneCount[player] = count;
    this.maybeGone(player);
  }

  private maybeGone(p: number) {
    const c = this.goneCount[p];
    if (c !== null && this.theirs[p].length >= c) this.remoteUpTo[p] = Number.POSITIVE_INFINITY;
  }

  /** Quem já saiu da partida. */
  leftPlayers(): number[] {
    return this.peers().filter((i) => this.goneCount[i] !== null);
  }

  /** Quantas jogadas minhas existem (pro aviso de saída). */
  get ownCount(): number {
    return this.own.length;
  }

  /** Roda um tick, se todos os colegas já garantiram as jogadas deles até aqui. */
  tryStep(): GameEvent[] | null {
    const g = this.game;
    if (g.over) return [];
    for (const p of this.peers()) if (this.remoteUpTo[p] <= g.tick) return null;
    const all: Input[] = [];
    for (const i of this.own) if (i.tick === g.tick) all.push(i);
    for (const l of this.theirs) for (const i of l) if (i.tick === g.tick) all.push(i);
    const ev = step(g, orderInputs(all), []);
    if (g.tick % CHECK_EVERY === 0) {
      const h = stateHash(g);
      this.localChecks.set(g.tick, h);
      for (const p of this.peers()) {
        const theirs = this.remoteChecks[p].get(g.tick);
        if (theirs !== undefined && theirs !== h) this.desynced = true;
      }
    }
    return ev;
  }

  /** Estamos esperando algum colega? */
  get stalled(): boolean {
    return !this.game.over && this.peers().some((p) => this.remoteUpTo[p] <= this.game.tick);
  }

  /** Quem está nos segurando agora (jogadores sem garantia pro tick atual). */
  waitingFor(): number[] {
    return this.peers().filter((p) => this.remoteUpTo[p] <= this.game.tick);
  }

  /** Mensagem a mandar agora (ou null). Chame a cada volta do laço. */
  takeFrame(force = false): Frame | null {
    const g = this.game;
    const due = g.tick >= this.lastSentTick + this.heartbeat;
    if (!force && !this.dirty && !due) return null;
    this.dirty = false;
    this.lastSentTick = g.tick;
    const lastCheck = Math.floor(g.tick / CHECK_EVERY) * CHECK_EVERY;
    const h = this.localChecks.get(lastCheck);
    // reenvia a partir do que o colega MAIS atrasado ainda não confirmou (quem saiu não conta)
    const active = this.peers().filter((p) => this.goneCount[p] === null);
    const from = active.length ? Math.min(...active.map((p) => this.peerGot[p])) : this.own.length;
    const frame: Frame = {
      p: this.me,
      from,
      inputs: this.own.slice(from).map(({ tick, side, slot, x, y }) => ({ tick, side, slot, x, y })),
      upTo: g.tick + this.delay,
      got: this.theirs.map((l) => l.length),
    };
    if (h !== undefined) frame.cs = [lastCheck, h];
    return frame;
  }
}
