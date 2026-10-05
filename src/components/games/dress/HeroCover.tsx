import { ARENA_CARD_BY_KEY } from "@/lib/arena/cards";
import type { DressCharacter } from "@/lib/games/dress/characters";

/**
 * Capa da rodada: a ilustração do herói da Arena (quando existe) sobre o cenário do personagem,
 * com o nome e a pista ao lado. Sem ilustração, aparece só o cartão de texto.
 */
export function HeroCover({ ch, label }: { ch: DressCharacter; label?: string }) {
  const card = ARENA_CARD_BY_KEY.get(ch.id);
  const hasArt = !!card?.art && card.kind === "unit";

  // sem ilustração da Arena: só o cartão de texto (nada de silhueta)
  if (!hasArt) {
    return (
      <div className="card mb-3 p-4">
        {label ? <p className="text-[10px] font-black uppercase tracking-wide text-fuchsia-600">{label}</p> : null}
        <h2 className="text-xl font-black">{ch.name}</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">{ch.clue}</p>
        <p className="mt-1 text-xs font-bold text-[var(--accent-strong)]">📖 {ch.ref}</p>
      </div>
    );
  }

  return (
    <div className="relative mb-3 flex min-h-[190px] items-stretch overflow-hidden rounded-2xl border-2 border-amber-300 shadow-md" style={{ background: `linear-gradient(180deg, ${ch.bg[0]} 0%, ${ch.bg[0]} 62%, ${ch.bg[1]} 62%, ${ch.bg[1]} 100%)` }}>
      <div className="relative flex w-[44%] shrink-0 items-end justify-center">
        <div className="absolute inset-x-0 bottom-1 mx-auto h-4 w-4/5 rounded-full bg-black/25 blur-sm" aria-hidden />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/arena/${ch.id}.webp`} alt={ch.name} className="relative z-10 max-h-[200px] w-auto max-w-full object-contain drop-shadow-[0_4px_6px_rgba(0,0,0,0.35)]" draggable={false} />
      </div>
      <div className="relative z-10 my-2 mr-2 flex min-w-0 flex-1 flex-col justify-center rounded-xl bg-white/90 p-3 text-slate-900">
        {label ? <p className="text-[10px] font-black uppercase tracking-wide text-fuchsia-600">{label}</p> : null}
        <h2 className="text-lg font-black leading-tight">{ch.name}</h2>
        <p className="mt-1 text-[13px] leading-snug text-slate-700">{ch.clue}</p>
        <p className="mt-1 text-xs font-bold text-violet-700">📖 {ch.ref}</p>
      </div>
    </div>
  );
}
