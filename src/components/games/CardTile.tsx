import { RARITY_LABEL, RARITY_STYLE, type GameCard } from "@/lib/games/cards";

/** Carta colecionável. `locked` mostra a silhueta de uma carta ainda não ganha. */
export function CardTile({ card, locked = false, big = false }: { card: GameCard; locked?: boolean; big?: boolean }) {
  if (locked) {
    return (
      <div className="flex aspect-[3/4] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--line)] bg-[var(--bg)] p-2 text-center">
        <span className="text-3xl opacity-40" aria-hidden>
          ❓
        </span>
        <span className="mt-1 text-[11px] font-bold text-[var(--muted)]">Bloqueada</span>
      </div>
    );
  }
  return (
    <div
      className={`flex flex-col items-center justify-between rounded-2xl border-2 p-2 text-center ${RARITY_STYLE[card.rarity]} ${
        big ? "aspect-[3/4] w-44 p-4" : "aspect-[3/4]"
      }`}
    >
      <span className={`font-black uppercase tracking-wide opacity-70 ${big ? "text-xs" : "text-[10px]"}`}>
        {RARITY_LABEL[card.rarity]}
      </span>
      <span className={big ? "text-7xl" : "text-4xl"} aria-hidden>
        {card.emoji}
      </span>
      <div>
        <p className={`font-black leading-tight ${big ? "text-lg" : "text-xs"}`}>{card.name}</p>
        {big ? <p className="mt-1 text-xs font-semibold opacity-80">{card.blurb}</p> : null}
      </div>
    </div>
  );
}
