"use client";

import { useState } from "react";
import { ARENA_CARDS, ARENA_CARD_BY_KEY, STARTER_DECK, type ArenaCard } from "@/lib/arena/cards";
import { CardArt } from "./CardArt";

const SIZE = 8;

function Tile({ card, picked, onClick }: { card: ArenaCard; picked?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative w-full rounded-2xl border-2 bg-[var(--card)] p-2 text-center transition active:scale-95 ${
        picked ? "border-violet-500 ring-2 ring-violet-400/40" : "border-[var(--line)]"
      }`}
    >
      <span className="absolute -left-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-xs font-black text-white">{card.cost}</span>
      {card.kind === "spell" ? (
        <span className="absolute -right-1 -top-1 rounded-full bg-amber-500 px-1.5 text-[9px] font-black text-white">PODER</span>
      ) : null}
      <div className="flex h-14 items-end justify-center">
        {card.art ? <CardArt card={card} className="h-14" /> : <span className="text-3xl" aria-hidden>{card.emoji}</span>}
      </div>
      <p className="mt-1 text-[10px] font-bold leading-tight">{card.name}</p>
    </button>
  );
}

function Stats({ c }: { c: ArenaCard }) {
  const bits: string[] = [];
  if (c.kind === "spell") {
    bits.push(`Dano ${c.spellDmg}`, `Área ${c.radiusSpell}`);
  } else {
    bits.push(`Vida ${c.hp}`);
    if (c.dmg) bits.push(`Dano ${c.dmg}`);
    if (c.count && c.count > 1) bits.push(`${c.count} tropas`);
    bits.push(c.range && c.range > 1.5 ? "À distância" : c.dmg ? "Corpo a corpo" : "Apoio");
    if (c.flying) bits.push("Voa");
  }
  return <p className="mt-1 text-xs font-bold text-[var(--muted)]">{bits.join(" · ")}</p>;
}

export function DeckBuilder({
  initial,
  saving,
  error,
  onSave,
  onCancel,
}: {
  initial: string[];
  saving: boolean;
  error: string | null;
  onSave: (deck: string[]) => void;
  onCancel: () => void;
}) {
  const [deck, setDeck] = useState<string[]>(initial);
  const [info, setInfo] = useState<string>(initial[0] ?? ARENA_CARDS[0].key);

  function toggle(key: string) {
    setInfo(key);
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
            <Tile key={c.key} card={c} picked onClick={() => toggle(c.key)} />
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
            {detail.emoji} {detail.name} <span className="text-sm font-bold text-violet-600">· {detail.cost} de Maná</span>
          </p>
          <p className="text-sm font-semibold text-[var(--muted)]">{detail.desc}</p>
          <Stats c={detail} />
        </div>
      ) : null}

      <p className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Todas as cartas · toque para pôr ou tirar</p>
      <div className="mb-4 grid grid-cols-4 gap-2">
        {[...ARENA_CARDS]
          .sort((a, b) => a.cost - b.cost)
          .map((c) => (
            <div key={c.key} className={deck.includes(c.key) ? "opacity-45" : ""}>
              <Tile card={c} onClick={() => toggle(c.key)} />
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
