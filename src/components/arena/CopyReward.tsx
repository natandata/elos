import { ARENA_CARD_BY_KEY } from "@/lib/arena/cards";
import { CardArt } from "./CardArt";

/** "+12 cartas do Davi" depois de uma batalha ou baú. */
export function CopyReward({ card, n }: { card?: string | null; n?: number }) {
  const c = card ? ARENA_CARD_BY_KEY.get(card) : undefined;
  if (!c || !n || n <= 0) return null;
  return (
    <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-sm font-black text-amber-900">
      <span className="flex h-7 w-7 items-center justify-center overflow-hidden">
        <CardArt card={c} className="h-7" />
      </span>
      +{n} {c.name}
    </p>
  );
}
