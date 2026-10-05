"use client";

import { useState } from "react";
import { ARENA_CARDS, ARENA_CARD_BY_KEY, MAX_CARD_LEVEL, STARTER_DECK, levelMult, upgradeCost, type ArenaCard } from "@/lib/arena/cards";
import { ARENAS, CARD_UNLOCK_ARENA, isCardUnlocked } from "@/lib/arena/arenas";
import { CardArt } from "./CardArt";

const SIZE = 8;

function Tile({ card, picked, locked, level, onClick }: { card: ArenaCard; picked?: boolean; locked?: boolean; level?: number; onClick?: () => void }) {
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
    </button>
  );
}

function Stats({ c, level }: { c: ArenaCard; level: number }) {
  const bits: string[] = [];
  const m = levelMult(level);
  if (c.kind === "spell") {
    bits.push(`Dano ${Math.round((c.spellDmg ?? 0) * m)}`, `Área ${c.radiusSpell}`);
  } else {
    bits.push(`Vida ${Math.round((c.hp ?? 0) * m)}`);
    if (c.dmg) bits.push(`Dano ${Math.round(c.dmg * m)}`);
    if (c.count && c.count > 1) bits.push(`${c.count} tropas`);
    bits.push(c.range && c.range > 1.5 ? "À distância" : c.dmg ? "Corpo a corpo" : "Apoio");
    if (c.flying) bits.push("Voa");
  }
  return <p className="mt-1 text-xs font-bold text-[var(--muted)]">{bits.join(" · ")}</p>;
}

export function DeckBuilder({
  initial,
  best,
  levels,
  scrolls,
  onUpgrade,
  saving,
  error,
  onSave,
  onCancel,
}: {
  initial: string[];
  best: number;
  levels: Record<string, number>;
  scrolls: number;
  onUpgrade: (key: string) => Promise<string | null>;
  saving: boolean;
  error: string | null;
  onSave: (deck: string[]) => void;
  onCancel: () => void;
}) {
  const [deck, setDeck] = useState<string[]>(initial);
  const [upBusy, setUpBusy] = useState(false);
  const [upMsg, setUpMsg] = useState<string | null>(null);
  const [info, setInfo] = useState<string>(initial[0] ?? ARENA_CARDS[0].key);

  function toggle(key: string) {
    setInfo(key);
    setUpMsg(null);
    if (!isCardUnlocked(key, best)) return;
    setDeck((d) => (d.includes(key) ? d.filter((k) => k !== key) : d.length < SIZE ? [...d, key] : d));
  }

  const avg = deck.length ? deck.reduce((n, k) => n + (ARENA_CARD_BY_KEY.get(k)?.cost ?? 0), 0) / deck.length : 0;
  const detail = ARENA_CARD_BY_KEY.get(info);
  const ready = deck.length === SIZE;

  return (
    <div>
      <div className="mb-2 flex items-end justify-between">
        <p className="text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
          Seu baralho · {deck.length}/{SIZE}
        </p>
        <p className="text-sm font-black">
          💧 {avg.toFixed(1)} <span className="text-xs font-bold text-[var(--muted)]">custo médio</span>
        </p>
      </div>
      <div className="mb-4 grid grid-cols-4 gap-2">
        {Array.from({ length: SIZE }, (_, i) => {
          const c = deck[i] ? ARENA_CARD_BY_KEY.get(deck[i]) : undefined;
          return c ? (
            <Tile key={c.key} card={c} picked level={levels[c.key] ?? 1} onClick={() => toggle(c.key)} />
          ) : (
            <div key={i} className="flex h-[104px] items-center justify-center rounded-2xl border-2 border-dashed border-[var(--line)] text-xl font-black text-[var(--muted)]">
              +
            </div>
          );
        })}
      </div>

      {detail ? (
        <div className="card mb-4 p-3">
          <p className="font-black">
            {detail.emoji} {detail.name} <span className="text-sm font-bold text-amber-600">· {detail.cost} de Maná</span>
          </p>
          <p className="text-sm font-semibold text-[var(--muted)]">{detail.desc}</p>
          <Stats c={detail} level={levels[detail.key] ?? 1} />
          {isCardUnlocked(detail.key, best) ? (
            (levels[detail.key] ?? 1) >= MAX_CARD_LEVEL ? (
              <p className="mt-2 text-xs font-black text-amber-600">⭐ Nível máximo</p>
            ) : (
              <button
                type="button"
                disabled={upBusy || scrolls < upgradeCost((levels[detail.key] ?? 1) + 1)}
                onClick={async () => {
                  setUpBusy(true);
                  setUpMsg(await onUpgrade(detail.key));
                  setUpBusy(false);
                }}
                className="btn btn-ghost mt-2 !py-2 !text-sm disabled:opacity-50"
              >
                ⬆️ Evoluir para Nv.{(levels[detail.key] ?? 1) + 1} · {upgradeCost((levels[detail.key] ?? 1) + 1)} 📜 <span className="text-[var(--muted)]">(você tem {scrolls})</span>
              </button>
            )
          ) : null}
          {upMsg ? <p className="mt-1 text-xs font-bold text-rose-600">{upMsg}</p> : null}
          {!isCardUnlocked(detail.key, best) ? (
            <p className="mt-1 text-xs font-black text-amber-600">
              🔒 Libera na arena {ARENAS[CARD_UNLOCK_ARENA[detail.key]].emoji} {ARENAS[CARD_UNLOCK_ARENA[detail.key]].name} ({ARENAS[CARD_UNLOCK_ARENA[detail.key]].min} 🏆)
            </p>
          ) : null}
        </div>
      ) : null}

      <p className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Todas as cartas · toque para pôr ou tirar</p>
      <div className="mb-4 grid grid-cols-4 gap-2">
        {[...ARENA_CARDS]
          .sort((a, b) => (CARD_UNLOCK_ARENA[a.key] ?? 0) - (CARD_UNLOCK_ARENA[b.key] ?? 0) || a.cost - b.cost)
          .map((c) => (
            <div key={c.key} className={deck.includes(c.key) ? "opacity-45" : ""}>
              <Tile card={c} locked={!isCardUnlocked(c.key, best)} level={isCardUnlocked(c.key, best) ? (levels[c.key] ?? 1) : undefined} onClick={() => toggle(c.key)} />
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
    </div>
  );
}
