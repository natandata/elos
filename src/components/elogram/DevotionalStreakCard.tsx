/** Card da sequência de devocional no perfil do Elogram — mesmo visual do card do Tema do dia. */
export function DevotionalStreakCard({ days, isMe }: { days: number; isMe: boolean }) {
  const label = days === 1 ? "dia seguido" : "dias seguidos";
  const sub =
    days > 0
      ? "fazendo devocional"
      : isMe
        ? "Faça o devocional de hoje e comece a sua sequência!"
        : "Ainda sem sequência de devocional";
  return (
    <div className="relative mb-1 overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-orange-400 p-[2px] shadow-lg">
      <div className="relative flex items-center gap-3.5 overflow-hidden rounded-[14px] bg-gradient-to-br from-violet-700/95 via-fuchsia-600/95 to-orange-500/95 px-4 py-3.5 text-white">
        <span aria-hidden className="pointer-events-none absolute -right-3 -top-3 h-16 w-16 rounded-full bg-white/15" />
        <span aria-hidden className="pointer-events-none absolute -bottom-6 right-10 h-14 w-14 rounded-full bg-white/10" />
        <span aria-hidden className="pointer-events-none absolute right-4 top-2 text-sm opacity-80">✨</span>
        <span aria-hidden className="pointer-events-none absolute bottom-2 right-16 text-xs opacity-70">⭐</span>

        <span
          aria-hidden
          className="relative grid h-16 w-16 shrink-0 -rotate-6 place-items-center rounded-2xl bg-white/95 text-4xl shadow-[0_4px_0_rgba(0,0,0,0.22)]"
        >
          {days > 0 ? "🔥" : "📖"}
        </span>

        <div className="relative min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-white/90">Sequência de devocional</p>
          {days > 0 ? (
            <p className="mt-1 flex items-baseline gap-1.5 [text-shadow:0_1px_0_rgba(0,0,0,0.2)]">
              <span className="text-4xl font-black leading-none tabular-nums">{days}</span>
              <span className="text-lg font-extrabold">{label}</span>
            </p>
          ) : (
            <p className="mt-1 text-[17px] font-extrabold leading-snug [text-shadow:0_1px_0_rgba(0,0,0,0.2)]">{sub}</p>
          )}
          {days > 0 ? <p className="mt-0.5 text-sm font-semibold text-white/90">{sub}</p> : null}
        </div>
      </div>
    </div>
  );
}
