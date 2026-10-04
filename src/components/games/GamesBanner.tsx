import Link from "next/link";

/** Chamada pra tela de jogos na Home: mostra o que falta fazer hoje. */
export function GamesBanner({
  done,
  total,
  streak,
  duelsWaiting,
  chestOpen,
}: {
  done: number;
  total: number;
  streak: number;
  duelsWaiting: number;
  chestOpen: boolean;
}) {
  const allDone = done >= total;
  return (
    <Link
      href="/app/jogos"
      className="mb-5 block rounded-2xl border-2 border-violet-300 bg-gradient-to-br from-violet-100 to-fuchsia-100 px-5 py-4 text-violet-900 transition active:scale-[0.99]"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2.5 text-lg font-black">
          <span className="text-3xl" aria-hidden>
            🎮
          </span>
          Jogos bíblicos
        </span>
        <span className="text-sm font-bold opacity-80">Jogar →</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-sm font-bold">
        <span className="rounded-full bg-white/70 px-3 py-1">
          {allDone ? "✅ Tudo feito hoje!" : `🎯 ${done}/${total} feitos hoje`}
        </span>
        {streak > 0 ? <span className="rounded-full bg-white/70 px-3 py-1">🔥 {streak} {streak === 1 ? "dia" : "dias"}</span> : null}
        {duelsWaiting > 0 ? (
          <span className="rounded-full bg-rose-600 px-3 py-1 text-white">⚔️ {duelsWaiting} duelo{duelsWaiting > 1 ? "s" : ""} esperando</span>
        ) : null}
        {!chestOpen ? <span className="rounded-full bg-amber-300 px-3 py-1 text-amber-950">🎁 Baú do dia</span> : null}
      </div>
    </Link>
  );
}
