// Sincronização "lockstep" da partida 1x1: os dois aparelhos rodam o mesmo
// motor e só trocam as jogadas. Cada jogada vale um pouco no futuro
// (PVP_INPUT_DELAY ticks) pra dar tempo de chegar no outro lado; cada aviso
// diz "já te mandei tudo até o tick X", e o motor só avança até onde o colega
// já garantiu. Sem DOM nem rede: quem transporta as mensagens é o componente.

import { ARENA_CARD_BY_KEY } from "./cards";
import { HAND_SIZE, inDeployZone, inField, type GameEvent, type GameState, type Input, type Side } from "./core";
import { createGame, stateHash, step } from "./engine";
import { PVP_HEARTBEAT, PVP_INPUT_DELAY, PVP_MAX_INPUTS, orderInputs } from "./pvp";

/** Mensagem trocada entre os dois aparelhos. */
export type Frame = {
  /** índice (na lista de quem enviou) da primeira jogada em `inputs` */
  from: number;
  inputs: Input[];
  /** já mandei todas as minhas jogadas com tick < upTo */
  upTo: number;
  /** quantas jogadas suas eu já recebi */
  got: number;
  /** conferência: [tick, hash do estado] */
  cs?: [number, number];
};

const CHECK_EVERY = 40;

type OwnInput = Input & { cardKey: string };

export class Lockstep {
  readonly game: GameState;
  readonly mySide: Side;
  private own: OwnInput[] = [];
  private theirs: Input[] = [];
  /** quantas das minhas jogadas o colega já confirmou */
  private peerGot = 0;
  private remoteUpTo = PVP_INPUT_DELAY;
  private lastSentTick = -PVP_HEARTBEAT;
  private dirty = true;
  private localChecks = new Map<number, number>();
  private remoteChecks = new Map<number, number>();
  desynced = false;

  constructor(seed: number, decks: [string[], string[]], mySide: Side, arena = 0) {
    this.game = createGame(seed, decks[0], decks[1], { arena, pvp: true });
    this.mySide = mySide;
  }

  /** Minhas jogadas, limpas, pro relatório final. */
  get ownInputs(): Input[] {
    return this.own.map(({ tick, side, slot, x, y }) => ({ tick, side, slot, x, y }));
  }
  get theirInputs(): Input[] {
    return this.theirs;
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
    const card = ARENA_CARD_BY_KEY.get(g.slots[this.mySide][slot]);
    if (!card) return null;
    if (g.mana[this.mySide] - this.pendingCost() + 1e-9 < card.cost) return null;
    if (card.kind === "unit" ? !inDeployZone(this.mySide, x, y) : !inField(x, y)) return null;
    const input: OwnInput = {
      tick: g.tick + PVP_INPUT_DELAY,
      side: this.mySide,
      slot,
      x: Math.round(x * 100) / 100,
      y: Math.round(y * 100) / 100,
      cardKey: card.key,
    };
    this.own.push(input);
    this.dirty = true;
    return input;
  }

  /** Recebe uma mensagem do colega. */
  receive(f: Frame): void {
    if (!f || !Array.isArray(f.inputs)) return;
    const other = (1 - this.mySide) as Side;
    f.inputs.forEach((raw, i) => {
      const idx = f.from + i;
      if (idx !== this.theirs.length) return; // duplicada, adiantada ou fora de ordem
      if (!Number.isInteger(raw.tick) || !Number.isInteger(raw.slot) || !Number.isFinite(raw.x) || !Number.isFinite(raw.y)) return;
      // jogada no passado: o colega furou a própria garantia (ou algo quebrou)
      if (raw.tick < this.game.tick) this.desynced = true;
      this.theirs.push({ tick: raw.tick, side: other, slot: raw.slot, x: raw.x, y: raw.y });
    });
    if (Number.isFinite(f.upTo)) this.remoteUpTo = Math.max(this.remoteUpTo, f.upTo);
    if (Number.isFinite(f.got)) this.peerGot = Math.max(this.peerGot, Math.min(f.got, this.own.length));
    if (f.cs) {
      this.remoteChecks.set(f.cs[0], f.cs[1]);
      const mine = this.localChecks.get(f.cs[0]);
      if (mine !== undefined && mine !== f.cs[1]) this.desynced = true;
    }
  }

  /** Roda um tick, se o colega já garantiu as jogadas dele até aqui. */
  tryStep(): GameEvent[] | null {
    const g = this.game;
    if (g.over) return [];
    if (this.remoteUpTo <= g.tick) return null;
    const now = orderInputs([...this.own, ...this.theirs].filter((i) => i.tick === g.tick));
    const ev = step(g, now, []);
    if (g.tick % CHECK_EVERY === 0) {
      const h = stateHash(g);
      this.localChecks.set(g.tick, h);
      const theirs = this.remoteChecks.get(g.tick);
      if (theirs !== undefined && theirs !== h) this.desynced = true;
    }
    return ev;
  }

  /** Há quanto tempo (em ticks) estamos esperando o colega. */
  get stalled(): boolean {
    return !this.game.over && this.remoteUpTo <= this.game.tick;
  }

  /** Mensagem a mandar agora (ou null). Chame a cada volta do laço. */
  takeFrame(force = false): Frame | null {
    const g = this.game;
    const due = g.tick >= this.lastSentTick + PVP_HEARTBEAT;
    if (!force && !this.dirty && !due) return null;
    this.dirty = false;
    this.lastSentTick = g.tick;
    const lastCheck = Math.floor(g.tick / CHECK_EVERY) * CHECK_EVERY;
    const h = this.localChecks.get(lastCheck);
    const frame: Frame = {
      from: this.peerGot,
      inputs: this.own.slice(this.peerGot).map(({ tick, side, slot, x, y }) => ({ tick, side, slot, x, y })),
      upTo: g.tick + PVP_INPUT_DELAY,
      got: this.theirs.length,
    };
    if (h !== undefined) frame.cs = [lastCheck, h];
    return frame;
  }
}
