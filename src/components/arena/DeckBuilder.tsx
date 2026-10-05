"use client";

import { useState } from "react";
import { ARENA_CARDS, ARENA_CARD_BY_KEY, MAX_CARD_LEVEL, STARTER_DECK, levelMult, upgradeCost, type ArenaCard } from "@/lib/arena/cards";
import { ARENAS, CARD_UNLOCK_ARENA, isCardUnlocked } from "@/lib/arena/arenas";
import { CARD_LORE } from "@/lib/arena/cardLore";
import { CardArt } from "./CardArt";

const SIZE = 8;

function Tile({ card, picked, locked, level, copies, onClick }: { card: ArenaCard; picked?: boolean; locked?: boolean; level?: number; copies?: number; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative w-full rounded-2xl border-2 bg-[var(--card)] p-2 text-center transition active:scale-95 ${
        picked ? "border-violet-500 ring-2 ring-violet-400/40" : "border-[var(--line)]"
      }`}
    >
      <span className="absolute -left-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-amber-800 bg-gradient-to-b from-yellow-200 to-amber-500 text-xs font-black text-[#5a2f05]">{card.cost}</span>
      {card.kind === "spell" ? (
        <span className="absolute -right-1 -top-1 rounded-full bg-amber-500 px-1.5 text-[9px] font-black text-white">PODER</span>
      ) : null}
      {locked ? <span className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/55 text-2xl" aria-hidden>🔒</span> : null}
      <div className="flex h-14 items-end justify-center">
        {card.art ? <CardArt card={card} className="h-14" /> : <span className="text-3xl" aria-hidden>{card.emoji}</span>}
      </div>
      <p className="mt-1 text-[10px] font-bold leading-tight">{card.name}</p>
      {level ? <p className="text-[9px] font-black text-violet-500">Nv.{level}</p> : null}
      {level && level < MAX_CARD_LEVEL ? (
        <div className="relative mx-auto mt-0.5 h-3 w-full overflow-hidden rounded-full bg-black/25">
          <div
            className={`h-full ${(copies ?? 0) >= upgradeCost(level + 1) ? "bg-emerald-500" : "bg-sky-500"}`}
            style={{ width: `${Math.min(100, ((copies ?? 0) / upgradeCost(level + 1)) * 100)}%` }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black leading-none text-white [text-shadow:0_0_2px_#000]">
            {copies ?? 0}/{upgradeCost(level + 1)}
          </span>
        </div>
      ) : null}
    </button>
  );
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

/** Números da carta no nível atual. */
function statRows(c: ArenaCard, level: number): [string, string][] {
  const m = levelMult(level);
  if (c.kind === "spell") {
    const rows: [string, string][] = [
      ["💥 Dano", String(Math.round((c.spellDmg ?? 0) * m))],
      ["⭕ Área", `${c.radiusSpell} tiles`],
    ];
    if (c.towerMult !== undefined) rows.push(["🏰 Contra construções", pct(c.towerMult)]);
    return rows;
  }
  const rows: [string, string][] = [["❤️ Vida", String(Math.round((c.hp ?? 0) * m))]];
  if (c.dmg) rows.push(["⚔️ Dano por golpe", String(Math.round(c.dmg * m))]);
  if (c.dmg && c.atkSpeed) rows.push(["⏱️ Golpes por segundo", (1 / c.atkSpeed).toFixed(1)]);
  rows.push(["🎯 Alcance", c.range && c.range > 1.5 ? `Longo (${c.range})` : c.dmg ? "Corpo a corpo" : "—"]);
  if (c.count && c.count > 1) rows.push(["👥 Tropas", String(c.count)]);
  rows.push(["👟 Velocidade", String(c.speed ?? 1.5)]);
  return rows;
}

/** Habilidades especiais da carta, em frases curtas. */
function abilities(c: ArenaCard): string[] {
  const out: string[] = [];
  if (c.kind === "spell") {
    out.push(c.desc);
    if (c.slow) out.push(`🐢 Deixa os inimigos ${pct(c.slow)} mais lentos por ${c.slowSecs} s.`);
    return out;
  }
  if (c.flying) out.push("🕊️ Voa: passa por cima do rio e das tropas.");
  if (c.canHitAir) out.push("🎯 Acerta também quem voa.");
  if (c.splash) out.push("💫 Dano em área: o golpe pega quem está em volta do alvo.");
  if (c.unitTowerMult && c.unitTowerMult > 1) out.push(`🏰 Muito dano em construções (+${Math.round((c.unitTowerMult - 1) * 100)}%).`);
  if (c.towersOnly) out.push("🏰 Só ataca construções.");
  if (c.hitSlow) out.push(`🐢 Cada golpe deixa o alvo ${pct(c.hitSlow.amount)} mais lento por ${c.hitSlow.secs} s.`);
  if (c.heal) out.push(`💚 Cura ${c.heal.amount} de vida dos aliados por perto a cada ${c.heal.secs} s.`);
  if (!c.dmg) out.push("🕊️ Não ataca: só ajuda os aliados.");
  if (out.length === 0) out.push("Sem habilidade especial: é força bruta no corpo a corpo.");
  return out;
}

export function DeckBuilder({
  initial,
  best,
  levels,
  copies,
  onUpgrade,
  saving,
  error,
  onSave,
  onCancel,
}: {
  initial: string[];
  best: number;
  levels: Record<string, number>;
  copies: Record<string, number>;
  onUpgrade: (key: string) => Promise<string | null>;
  saving: boolean;
  error: string | null;
  onSave: (deck: string[]) => void;
  onCancel: () => void;
}) {
  const [deck, setDeck] = useState<string[]>(initial);
  const [upBusy, setUpBusy] = useState(false);
  const [upMsg, setUpMsg] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  function show(key: string) {
    setUpMsg(null);
    setOpen(key);
  }

  function toggleDeck(key: string) {
    if (!isCardUnlocked(key, best)) return;
    setDeck((d) => (d.includes(key) ? d.filter((k) => k !== key) : d.length < SIZE ? [...d, key] : d));
  }

  const avg = deck.length ? deck.reduce((n, k) => n + (ARENA_CARD_BY_KEY.get(k)?.cost ?? 0), 0) / deck.length : 0;
  const ready = deck.length === SIZE;
  const detail = open ? ARENA_CARD_BY_KEY.get(open) : undefined;

  return (
    <div>
      <div className="mb-2 flex items-end justify-between">
        <p className="text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
          Seu baralho · {deck.length}/{SIZE}
        </p>
        <p className="text-sm font-black">
          🍞 {avg.toFixed(1)} <span className="text-xs font-bold text-[var(--muted)]">custo médio</span>
        </p>
      </div>
      <div className="mb-4 grid grid-cols-4 gap-2">
        {Array.from({ length: SIZE }, (_, i) => {
          const c = deck[i] ? ARENA_CARD_BY_KEY.get(deck[i]) : undefined;
          return c ? (
            <Tile key={c.key} card={c} picked level={levels[c.key] ?? 1} copies={copies[c.key] ?? 0} onClick={() => show(c.key)} />
          ) : (
            <div key={i} className="flex h-[104px] items-center justify-center rounded-2xl border-2 border-dashed border-[var(--line)] text-xl font-black text-[var(--muted)]">
              +
            </div>
          );
        })}
      </div>

      <p className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Todas as cartas · toque para ver detalhes</p>
      <div className="mb-4 grid grid-cols-4 gap-2">
        {[...ARENA_CARDS]
          .sort((a, b) => (CARD_UNLOCK_ARENA[a.key] ?? 0) - (CARD_UNLOCK_ARENA[b.key] ?? 0) || a.cost - b.cost)
          .map((c) => (
            <div key={c.key} className={deck.includes(c.key) ? "opacity-45" : ""}>
              <Tile card={c} locked={!isCardUnlocked(c.key, best)} level={isCardUnlocked(c.key, best) ? (levels[c.key] ?? 1) : undefined} copies={copies[c.key] ?? 0} onClick={() => show(c.key)} />
            </div>
          ))}
      </div>

      {error ? <p className="mb-3 text-center text-sm font-semibold text-rose-600">{error}</p> : null}
      <button type="button" disabled={!ready || saving} onClick={() => onSave(deck)} className="btn btn-primary w-full !py-3 disabled:opacity-50">
        {saving ? "Salvando…" : ready ? "Salvar baralho" : `Faltam ${SIZE - deck.length} cartas`}
      </button>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setDeck(STARTER_DECK)} className="btn btn-ghost">
          Baralho inicial
        </button>
        <button type="button" onClick={onCancel} className="btn btn-ghost">
          Cancelar
        </button>
      </div>

      {detail ? (
        <CardSheet
          card={detail}
          unlocked={isCardUnlocked(detail.key, best)}
          level={levels[detail.key] ?? 1}
          have={copies[detail.key] ?? 0}
          inDeck={deck.includes(detail.key)}
          deckFull={deck.length >= SIZE}
          upBusy={upBusy}
          upMsg={upMsg}
          onClose={() => setOpen(null)}
          onToggleDeck={() => toggleDeck(detail.key)}
          onUpgrade={async () => {
            setUpBusy(true);
            setUpMsg(await onUpgrade(detail.key));
            setUpBusy(false);
          }}
        />
      ) : null}
    </div>
  );
}

function CardSheet({
  card,
  unlocked,
  level,
  have,
  inDeck,
  deckFull,
  upBusy,
  upMsg,
  onClose,
  onToggleDeck,
  onUpgrade,
}: {
  card: ArenaCard;
  unlocked: boolean;
  level: number;
  have: number;
  inDeck: boolean;
  deckFull: boolean;
  upBusy: boolean;
  upMsg: string | null;
  onClose: () => void;
  onToggleDeck: () => void;
  onUpgrade: () => void;
}) {
  const lore = CARD_LORE[card.key];
  const need = level < MAX_CARD_LEVEL ? upgradeCost(level + 1) : 0;
  const canUp = unlocked && level < MAX_CARD_LEVEL && have >= need;
  const arena = ARENAS[CARD_UNLOCK_ARENA[card.key] ?? 0];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose} role="dialog" aria-modal="true" aria-label={card.name}>
      <div className="max-h-[90vh] w-full max-w-[460px] overflow-y-auto rounded-t-3xl bg-[var(--bg)] p-4 pb-6 shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <div className="flex h-24 w-20 shrink-0 items-end justify-center rounded-2xl bg-gradient-to-b from-[#4a90e2] to-[#2d62b8] p-1">
            {card.art ? <CardArt card={card} className="h-[88px]" /> : <span className="text-5xl" aria-hidden>{card.emoji}</span>}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xl font-black leading-tight">{card.name}</p>
            <p className="text-sm font-bold text-amber-600">
              🍞 {card.cost} de Maná {card.kind === "spell" ? "· Poder" : ""}
            </p>
            {unlocked ? <p className="text-sm font-black text-violet-500">Nível {level}{level >= MAX_CARD_LEVEL ? " (máximo)" : ""}</p> : null}
            <p className="mt-1 text-xs font-semibold text-[var(--muted)]">{card.desc}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="shrink-0 rounded-full bg-[var(--card)] px-3 py-1.5 text-lg font-black">
            ✕
          </button>
        </div>

        {unlocked ? (
          <div className="card mt-4 p-3">
            <p className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">Cartas do herói</p>
            {level >= MAX_CARD_LEVEL ? (
              <p className="mt-1 text-sm font-black text-amber-600">⭐ Nível máximo</p>
            ) : (
              <>
                <div className="relative mt-1 h-5 overflow-hidden rounded-full bg-black/25">
                  <div className={`h-full ${have >= need ? "bg-emerald-500" : "bg-sky-500"}`} style={{ width: `${Math.min(100, (have / need) * 100)}%` }} />
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-white [text-shadow:0_0_2px_#000]">
                    {have}/{need}
                  </span>
                </div>
                <button type="button" disabled={upBusy || !canUp} onClick={onUpgrade} className="btn btn-primary mt-2 w-full !py-2.5 disabled:opacity-50">
                  {upBusy ? "Evoluindo…" : canUp ? `⬆️ Evoluir para o nível ${level + 1}` : `Faltam ${need - have} cartas pra evoluir`}
                </button>
              </>
            )}
            {upMsg ? <p className="mt-1 text-xs font-bold text-rose-600">{upMsg}</p> : null}
          </div>
        ) : (
          <p className="mt-4 rounded-2xl bg-amber-400/15 px-3 py-2 text-sm font-black text-amber-600">
            🔒 Libera na arena {arena.emoji} {arena.name} ({arena.min} 🏆)
          </p>
        )}

        {lore ? (
          <div className="card mt-3 p-3">
            <p className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">📖 A história</p>
            <p className="mt-1 text-sm font-semibold leading-relaxed">{lore.story}</p>
            <p className="mt-2 text-xs font-black text-amber-600">Leia na Bíblia: {lore.ref}</p>
          </div>
        ) : null}

        {lore ? (
          <div className="card mt-3 p-3">
            <p className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">⚔️ Como ataca</p>
            <p className="mt-1 text-sm font-semibold leading-relaxed">{lore.attack}</p>
          </div>
        ) : null}

        <div className="card mt-3 p-3">
          <p className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">📊 Detalhes (nível {level})</p>
          <dl className="mt-1 divide-y divide-[var(--line)]">
            {statRows(card, level).map(([k, v]) => (
              <div key={k} className="flex justify-between py-1.5 text-sm">
                <dt className="font-semibold text-[var(--muted)]">{k}</dt>
                <dd className="font-black">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-xs font-black uppercase tracking-wide text-[var(--muted)]">✨ Habilidades</p>
          <ul className="mt-1 space-y-1 text-sm font-semibold">
            {abilities(card).map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>

        {unlocked ? (
          <button
            type="button"
            disabled={!inDeck && deckFull}
            onClick={onToggleDeck}
            className={`btn mt-4 w-full !py-3 disabled:opacity-50 ${inDeck ? "btn-ghost" : "btn-primary"}`}
          >
            {inDeck ? "Tirar do baralho" : deckFull ? "Baralho cheio (tire outra carta antes)" : "Pôr no baralho"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
