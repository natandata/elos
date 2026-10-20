import Link from "next/link";
import { LESSON_ORDER, LESSONS, ROLEPLAYS, UNITS, wordCards } from "@/lib/english/content";
import type { EnglishState } from "@/lib/english/data.server";
import { legendaryId, legendaryUnlocked, lessonUnlocked, nextLesson, roleplayUnlocked } from "@/lib/english/progress";
import { XP_DAILY_LESSONS } from "@/lib/english/grade";

// Trilha do Inglês em Ação: meta do dia, próxima lição, unidades (lições, conversa e nível lendário) e treino.

function Node({ href, icon, title, sub, state, stars }: { href?: string; icon: string; title: string; sub?: string; state: "done" | "next" | "open" | "locked"; stars?: number }) {
  const tone = state === "done" ? "border-emerald-300 bg-emerald-50 text-emerald-950" : state === "next" ? "border-[var(--accent)] bg-[var(--accent-soft)] ring-2 ring-[var(--accent)]" : state === "open" ? "border-[var(--line)] bg-[var(--card)]" : "border-[var(--line)] bg-[var(--card)] opacity-55";
  const body = (
    <div className={`flex items-center gap-3 rounded-2xl border-2 px-3 py-3 transition active:scale-[0.99] ${tone}`}>
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl ${state === "locked" ? "bg-[var(--line)]" : "bg-white/80"}`} aria-hidden>
        {state === "locked" ? "🔒" : icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-black">{title}</p>
        {sub ? <p className="truncate text-xs font-semibold opacity-75">{sub}</p> : null}
      </div>
      {stars ? (
        <span className="shrink-0 text-base" aria-label={`${stars} estrelas`}>
          {"⭐".repeat(stars)}
        </span>
      ) : state === "next" ? (
        <span className="shrink-0 rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-black text-[var(--accent-ink)]">COMEÇAR</span>
      ) : null}
    </div>
  );
  return href && state !== "locked" ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    <div aria-disabled={state === "locked"}>{body}</div>
  );
}

export function EnglishHome({ state }: { state: EnglishState }) {
  const done = new Set(state.done.keys());
  const next = nextLesson(done, state.startUnit);
  const nextTitle = next ? LESSONS[next]?.title : null;
  const finished = !next;

  return (
    <div className="mx-auto max-w-xl">
      <header className="overflow-hidden rounded-3xl bg-gradient-to-br from-sky-600 via-indigo-600 to-fuchsia-600 p-5 text-white shadow-lg">
        <p className="text-xs font-black uppercase tracking-widest text-white/80">Jogo educativo</p>
        <h1 className="mt-1 text-3xl font-black leading-tight">Inglês em Ação 🗣️</h1>
        <p className="mt-1 text-sm font-semibold text-white/90">Aprenda inglês conversando: lições curtas, conversas com personagens e treino dos seus erros.</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
          <span className="rounded-full bg-white/20 px-3 py-1">🔥 {state.streak} {state.streak === 1 ? "dia" : "dias"} seguidos</span>
          <span className="rounded-full bg-white/20 px-3 py-1">
            ⭐ XP hoje: {state.xpLessons}/{XP_DAILY_LESSONS} lições{state.xpRoleplay ? " + conversa" : ""}
          </span>
        </div>
        {next ? (
          <Link href={`/app/jogos/ingles/licao/${next}`} className="mt-4 inline-block rounded-full bg-white px-5 py-2.5 text-sm font-black text-indigo-900 shadow">
            ▶ {state.totalDone === 0 ? "Começar" : "Continuar"}: {nextTitle}
          </Link>
        ) : null}
        {finished ? <p className="mt-4 rounded-2xl bg-white/20 px-3 py-2 text-sm font-black">Você terminou todas as lições disponíveis! Revise nos treinos. Mais unidades (A2 e B1) chegam em breve. 🎉</p> : null}
      </header>

      {!state.placementDone && state.totalDone === 0 ? (
        <Link href="/app/jogos/ingles/nivelamento" className="card mt-4 flex items-center gap-3 p-4 transition active:scale-[0.99]">
          <span className="text-3xl" aria-hidden>
            🎯
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-black">Já sabe um pouco de inglês?</span>
            <span className="block text-xs font-semibold text-[var(--muted)]">Faça o teste de nivelamento (8 perguntas, 2 minutos) e comece mais adiante.</span>
          </span>
          <span aria-hidden>→</span>
        </Link>
      ) : null}

      <section className="mt-5 space-y-5">
        {UNITS.map((u) => {
          const rp = ROLEPLAYS.find((r) => r.id === u.roleplay);
          const rpOpen = rp ? roleplayUnlocked(u.n, done, state.startUnit) : false;
          const legOpen = legendaryUnlocked(u.n, done, state.startUnit);
          const legStars = state.done.get(legendaryId(u.n));
          return (
            <div key={u.n}>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-3xl" aria-hidden>
                  {u.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">
                    Unidade {u.n} · {u.level}
                  </p>
                  <p className="truncate text-lg font-black leading-tight">{u.title}</p>
                </div>
              </div>
              <div className="space-y-2">
                {u.lessons.map((l) => {
                  const unlocked = lessonUnlocked(l.id, done, state.startUnit);
                  const stars = state.done.get(l.id);
                  const st = stars ? "done" : next === l.id ? "next" : unlocked ? "open" : "locked";
                  return <Node key={l.id} href={`/app/jogos/ingles/licao/${l.id}`} icon="📘" title={`Lição ${l.n}: ${l.title}`} sub={`${l.exercises.length} exercícios`} state={st} stars={stars} />;
                })}
                {rp ? (
                  <Node
                    href={`/app/jogos/ingles/conversa/${rp.id}`}
                    icon="💬"
                    title={`Conversa: ${rp.title}`}
                    sub={rpOpen ? (state.roleplayBest.has(rp.id) ? `Melhor precisão: ${state.roleplayBest.get(rp.id)}%` : `com ${rp.who.name} · +2 XP por dia`) : "Abre depois da lição 2"}
                    state={state.roleplayBest.has(rp.id) ? "done" : rpOpen ? "open" : "locked"}
                  />
                ) : null}
                <Node href={`/app/jogos/ingles/licao/${legendaryId(u.n)}`} icon="👑" title="Nível Lendário" sub={legOpen ? "10 exercícios sem errar · tentativas ilimitadas" : "Abre depois das 3 lições"} state={legStars ? "done" : legOpen ? "open" : "locked"} stars={legStars} />
              </div>
            </div>
          );
        })}
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-black uppercase tracking-wide text-[var(--muted)]">Treino</h2>
        <div className="grid grid-cols-3 gap-2">
          <Link href="/app/jogos/ingles/treino/erros" className="card relative flex flex-col items-center gap-1 p-3 text-center transition active:scale-[0.98]">
            {state.pendingMistakes.length ? <span className="absolute right-2 top-2 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-black text-white">{state.pendingMistakes.length}</span> : null}
            <span className="text-3xl" aria-hidden>
              🎯
            </span>
            <span className="text-sm font-black">Meus erros</span>
            <span className="text-[11px] font-semibold text-[var(--muted)]">refaça o que errou</span>
          </Link>
          <Link href="/app/jogos/ingles/treino/palavras" className="card flex flex-col items-center gap-1 p-3 text-center transition active:scale-[0.98]">
            <span className="text-3xl" aria-hidden>
              🃏
            </span>
            <span className="text-sm font-black">Palavras</span>
            <span className="text-[11px] font-semibold text-[var(--muted)]">{wordCards().length} cartas</span>
          </Link>
          <Link href="/app/jogos/ingles/treino/ouvir" className="card flex flex-col items-center gap-1 p-3 text-center transition active:scale-[0.98]">
            <span className="text-3xl" aria-hidden>
              🎧
            </span>
            <span className="text-sm font-black">Ouvir</span>
            <span className="text-[11px] font-semibold text-[var(--muted)]">treine o ouvido</span>
          </Link>
        </div>
        <p className="mt-2 text-center text-[11px] font-semibold text-[var(--muted)]">Treinos não valem XP, mas ajudam a fixar. {LESSON_ORDER.length} lições no total nesta etapa (nível A1).</p>
      </section>
    </div>
  );
}
