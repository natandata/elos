import { ARENA_CARD_BY_KEY } from "./cards";
import { BRIDGES, H, RIVER_BOT, RIVER_TOP, W, nextRand, type GameState, type Input, type Side } from "./core";

/**
 * Computador da Arena: decide a cada meio segundo. Defende quando há inimigos
 * perto da sua metade e ataca quando o Maná está quase cheio. Só usa o estado
 * do jogo e o próprio sorteio — assim o servidor consegue refazer a partida.
 */
export function botDecide(state: GameState, side: Side): Input | null {
  if (state.over || state.tick % 10 !== 5) return null;

  const mana = state.mana[side];
  const hand = state.slots[side].map((key, slot) => ({ slot, card: ARENA_CARD_BY_KEY.get(key)! }));
  // apoio sem ataque (Jesus) só entra quando já há aliados em campo pra acompanhar
  const allies = state.entities.filter((e) => e.side === side && e.type === "unit" && e.hp > 0 && e.dmg > 0).length;
  const playable = hand.filter((h) => h.card && h.card.cost <= mana + 1e-9 && ((h.card.dmg ?? 1) > 0 || h.card.kind === "spell" || allies >= 2));
  if (playable.length === 0) return null;

  const enemy = (1 - side) as Side;
  const onMyHalf = (y: number) => (side === 0 ? y > RIVER_BOT - 2 : y < RIVER_TOP + 2);
  const threats = state.entities.filter((e) => e.side === enemy && e.type === "unit" && e.hp > 0 && onMyHalf(e.y));

  if (threats.length > 0) {
    let cx = 0;
    let cy = 0;
    let total = 0;
    for (const t of threats) {
      cx += t.x;
      cy += t.y;
      total += t.hp;
    }
    cx /= threats.length;
    cy /= threats.length;

    // poderes valem a pena contra grupos ou muita vida junta
    if (threats.length >= 3 || total >= 420) {
      const spell = playable.find((h) => h.card.kind === "spell" && h.card.key !== "trombetas");
      if (spell) return { tick: state.tick, side, slot: spell.slot, x: cx, y: cy };
    }

    const hasAir = threats.some((t) => t.flying);
    const units = playable.filter((h) => h.card.kind === "unit" && !h.card.towersOnly && (!hasAir || h.card.canHitAir));
    const pool = units.length > 0 ? units : playable.filter((h) => h.card.kind === "unit" && !h.card.towersOnly);
    if (pool.length === 0) return null;
    let best = pool[0];
    let bestScore = -1;
    for (const h of pool) {
      const c = h.card;
      const score = (((c.hp ?? 0) * (c.dmg ?? 0)) / Math.max(1, c.cost)) * (c.count ?? 1);
      if (score > bestScore) {
        best = h;
        bestScore = score;
      }
    }
    const x = Math.min(W - 1, Math.max(1, cx));
    const y =
      side === 1
        ? Math.min(RIVER_TOP - 0.8, Math.max(1, cy - 2))
        : Math.max(RIVER_BOT + 0.8, Math.min(H - 1, cy + 2));
    return { tick: state.tick, side, slot: best.slot, x, y };
  }

  // sem ameaça: ataca quando o Maná está quase cheio
  const wantsPush = mana >= 7 || (mana >= 5 && nextRand(state, side) < 0.3);
  if (!wantsPush) return null;

  const attackers = playable.filter((h) => h.card.kind === "unit");
  if (attackers.length === 0) return null;
  // prefere a tropa mais cara que cabe no Maná (tanques abrem caminho)
  attackers.sort((a, b) => b.card.cost - a.card.cost);
  const pick = attackers[Math.floor(nextRand(state, side) * Math.min(2, attackers.length))];
  const lane = nextRand(state, side) < 0.5 ? BRIDGES[0] : BRIDGES[1];
  const y = side === 1 ? RIVER_TOP - 1.5 : RIVER_BOT + 1.5;
  return { tick: state.tick, side, slot: pick.slot, x: lane, y };
}
