import { ARENA_CARD_BY_KEY } from "@/lib/arena/cards";
import type { DressCharacter } from "@/lib/games/dress/characters";
import { PaperDoll } from "./PaperDoll";

/**
 * Capa da rodada: a ilustração do herói da Arena (quando existe) sobre o cenário do personagem,
 * com o nome e a pista ao lado. Sem ilustração, aparece a silhueta (sem revelar nenhuma peça).
 */
export function HeroCover({ ch, label }: { ch: DressCharacter; label?: string }) {
  const card = ARENA_CARD_BY_KEY.get(ch.id);
  const hasArt = !!card?.art && card.kind === "unit";

  return (
    <div className="relative mb-3 flex min-h-[190px] items-stretch overflow-hidden rounded-2xl border-2 border-amber-300 shadow-md" style={{ background: `linear-gradient(180deg, ${ch.bg[0]} 0%, ${ch.bg[0]} 62%, ${ch.bg[1]} 62%, ${ch.bg[1]} 100%)` }}>
      <div className="relative flex w-[44%] shrink-0 items-end justify-center">
        <div className="absolute inset-x-0 bottom-1 mx-auto h-4 w-4/5 rounded-full bg-black/25 blur-sm" aria-hidden />
        {hasArt ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/arena/${ch.id}.webp`} alt={ch.name} className="relative z-10 max-h-[200px] w-auto max-w-full object-contain drop-shadow-[0_4px_6px_rgba(0,0,0,0.35)]" draggable={false} />
        ) : (
          <div className="relative z-10 flex h-[190px] items-end justify-center">
            <PaperDoll base={ch.base} look={{ tunic: "tunic_simple" }} className="h-[180px] w-auto [filter:brightness(0)_opacity(0.55)]" title={`Silhueta de ${ch.name}`} />
            <span className="absolute inset-0 flex items-center justify-center text-5xl font-black text-white/90 [text-shadow:0_2px_6px_rgba(0,0,0,0.5)]" aria-hidden>
              ?
            </span>
          </div>
        )}
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
