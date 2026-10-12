/** Aparece NA HORA ao trocar de aba do Elogram, enquanto a tela nova chega do servidor. */
export default function ElogramLoading() {
  return (
    <div className="animate-pulse" aria-hidden>
      <div className="flex items-center justify-between px-3 pb-3 pt-4">
        <div className="h-7 w-7 rounded-lg bg-[var(--line)]" />
        <div className="h-7 w-28 rounded-lg bg-[var(--line)]" />
        <div className="h-7 w-7 rounded-lg bg-[var(--line)]" />
      </div>
      <div className="flex gap-3 overflow-hidden px-3 pb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex w-[74px] shrink-0 flex-col items-center gap-2">
            <div className="h-[68px] w-[68px] rounded-full bg-[var(--line)]" />
            <div className="h-3 w-12 rounded bg-[var(--line)]" />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2.5 px-3 pb-2.5">
        <div className="h-8 w-8 rounded-full bg-[var(--line)]" />
        <div className="h-4 w-32 rounded bg-[var(--line)]" />
      </div>
      <div className="aspect-[4/5] w-full bg-[var(--line)]" />
    </div>
  );
}
