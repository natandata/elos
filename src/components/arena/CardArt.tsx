import type { ArenaCard } from "@/lib/arena/cards";
import { AT } from "./ArenaText";

/** Ilustração do herói (quando existe) ou o emoji da carta. */
export function CardArt({ card, className = "h-10" }: { card: ArenaCard; className?: string }) {
  if (card.art) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`/arena/${card.key}.${card.kind === "spell" ? "svg" : "webp"}`} alt={card.name} className={`mx-auto w-auto object-contain ${className}`} draggable={false} />;
  }
  return (
    <span className="block text-center text-2xl leading-none" aria-hidden>
      <AT>{card.emoji}</AT>
    </span>
  );
}
