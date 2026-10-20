import Link from "next/link";

// Peças da Sala de Jogos: cabeçalho, os dois cards de categoria e o seletor de categoria.

export type RoomCategory = "divertidos" | "educativos";

export function RoomHero({ streak, doneToday, totalToday, coins, subtitle }: { streak: number; doneToday: number; totalToday: number; coins: number; subtitle?: string }) {
  return (
    <header className="mb-5 pt-1 text-center">
      <p className="gr-pop inline-block text-4xl" aria-hidden>
        🕹️
      </p>
      <h1 className="gr-title mt-1">Sala de Jogos</h1>
      <p className="mx-auto mt-2 max-w-sm text-sm font-semibold text-white/85">{subtitle ?? "Escolha o seu jogo, junte XP e cartas e suba no ranking do seu Elo."}</p>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <span className="gr-chip">
          🔥 {streak} {streak === 1 ? "dia seguido" : "dias seguidos"}
        </span>
        {totalToday > 0 ? (
          <span className="gr-chip">
            ✅ {doneToday}/{totalToday} educativos hoje
          </span>
        ) : null}
        <span className="gr-chip">🪙 {coins} denários</span>
      </div>
    </header>
  );
}

const FUN_COVERS = ["/arena/capa.webp", "/dress/capa.webp", "/minearena/capa.webp", "/arenasoccer/capa.webp"];

/** Os dois cards da Sala: Jogos Divertidos e Jogos Educativos. */
export function CategoryCards({ funCount, eduCount, eduDone, eduTotal }: { funCount: number; eduCount: number; eduDone: number; eduTotal: number }) {
  return (
    <section className="mb-6 grid gap-4 sm:grid-cols-2" aria-label="Categorias de jogos">
      <Link href="/app/jogos?cat=divertidos" className="gr-cat gr-cat-fun" aria-label="Jogos Divertidos">
        <div className="gr-cat-inner">
          <div className="grid grid-cols-2 gap-1.5 overflow-hidden rounded-2xl">
            {FUN_COVERS.map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt="" className="aspect-[16/10] w-full object-cover" draggable={false} loading="lazy" />
            ))}
          </div>
          <div className="mt-3 flex items-start justify-between gap-2">
            <div>
              <p className="text-2xl font-black leading-tight">🎉 Jogos Divertidos</p>
              <p className="mt-1 text-sm font-semibold text-white/80">Batalhas, futebol, aventuras e criatividade com os heróis da Bíblia.</p>
            </div>
            <span className="shrink-0 rounded-full bg-amber-300 px-2.5 py-1 text-xs font-black text-amber-950">{funCount} jogos</span>
          </div>
          <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-white px-4 py-1.5 text-sm font-black text-fuchsia-900">▶ Jogar agora</span>
        </div>
      </Link>

      <Link href="/app/jogos?cat=educativos" className="gr-cat gr-cat-edu" aria-label="Jogos Educativos">
        <div className="gr-cat-inner">
          <div className="grid grid-cols-4 gap-1.5 overflow-hidden rounded-2xl bg-white/10 p-2 text-center text-4xl sm:aspect-[32/10]">
            {["🧠", "📖", "🕵️", "⏳"].map((e, i) => (
              <span key={e} className="gr-pop flex items-center justify-center rounded-xl bg-white/10 py-3" style={{ animationDelay: `${i * 0.35}s` }} aria-hidden>
                {e}
              </span>
            ))}
          </div>
          <div className="mt-3 flex items-start justify-between gap-2">
            <div>
              <p className="text-2xl font-black leading-tight">📚 Jogos Educativos</p>
              <p className="mt-1 text-sm font-semibold text-white/80">Aprenda a Bíblia jogando: quiz, versículos, personagens e história. Ganhe XP e cartas.</p>
            </div>
            <span className="shrink-0 rounded-full bg-emerald-300 px-2.5 py-1 text-xs font-black text-emerald-950">{eduCount} jogos</span>
          </div>
          {eduTotal > 0 ? (
            <div className="mt-3">
              <div className="h-2.5 overflow-hidden rounded-full bg-white/20">
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-cyan-300" style={{ width: `${Math.round((eduDone / eduTotal) * 100)}%` }} />
              </div>
              <p className="mt-1 text-xs font-bold text-white/80">
                {eduDone}/{eduTotal} feitos hoje {eduDone >= eduTotal ? "· tudo em dia! 🎉" : "· bora completar!"}
              </p>
            </div>
          ) : null}
          <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-white px-4 py-1.5 text-sm font-black text-indigo-900">▶ Jogar agora</span>
        </div>
      </Link>
    </section>
  );
}

/** Barra de dentro de uma categoria: volta para a Sala e troca de categoria. */
export function CategoryBar({ current }: { current: RoomCategory }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <Link href="/app/jogos" className="gr-chip">
        ← Sala de Jogos
      </Link>
      <nav className="gr-seg" aria-label="Trocar de categoria">
        <Link href="/app/jogos?cat=divertidos" data-on={current === "divertidos"}>
          🎉 Divertidos
        </Link>
        <Link href="/app/jogos?cat=educativos" data-on={current === "educativos"}>
          📚 Educativos
        </Link>
      </nav>
    </div>
  );
}
