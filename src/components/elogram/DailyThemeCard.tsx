import type { DailyTheme } from "@/lib/feedPrompts";

/** Card do "Tema do dia": degradê vivo, emoji grande e confete — chama mais a atenção que uma caixinha cinza. */
export function DailyThemeCard({ theme, streak }: { theme: DailyTheme; streak: number }) {
  return (
    <div className="relative mx-3 mb-3 overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-orange-400 p-[2px] shadow-lg">
      <div className="relative flex items-center gap-3.5 overflow-hidden rounded-[14px] bg-gradient-to-br from-violet-700/95 via-fuchsia-600/95 to-orange-500/95 px-4 py-3.5 text-white">
        {/* confete decorativo */}
        <span aria-hidden className="pointer-events-none absolute -right-3 -top-3 h-16 w-16 rounded-full bg-white/15" />
        <span aria-hidden className="pointer-events-none absolute -bottom-6 right-10 h-14 w-14 rounded-full bg-white/10" />
        <span aria-hidden className="pointer-events-none absolute right-4 top-2 text-sm opacity-80">✨</span>
        <span aria-hidden className="pointer-events-none absolute bottom-2 right-16 text-xs opacity-70">⭐</span>

        <span
          aria-hidden
          className="relative grid h-16 w-16 shrink-0 -rotate-6 place-items-center rounded-2xl bg-white/95 text-4xl shadow-[0_4px_0_rgba(0,0,0,0.22)]"
        >
          {theme.emoji}
        </span>

        <div className="relative min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-white/90">
            Tema do dia
            <span className="rounded-full bg-yellow-300 px-2 py-0.5 text-[10px] font-black tracking-normal text-yellow-950">
              +1 XP
            </span>
          </p>
          <p className="mt-1 text-[17px] font-extrabold leading-snug [text-shadow:0_1px_0_rgba(0,0,0,0.2)]">{theme.text}</p>
          {streak > 0 ? (
            <p className="mt-1.5 inline-block rounded-full bg-black/25 px-2.5 py-0.5 text-xs font-bold">
              🔥 {streak} {streak === 1 ? "dia seguido" : "dias seguidos"}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
