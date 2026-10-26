import Link from "next/link";
import { LESSON_ORDER, ROLEPLAYS, UNITS, wordCards } from "@/lib/english/content";
import { CALL_MINUTES } from "@/lib/babel/leaders";
import type { EnglishState } from "@/lib/english/data.server";
import { legendaryId, legendaryUnlocked, lessonUnlocked, nextLesson, roleplayUnlocked } from "@/lib/english/progress";
import { BabelTop } from "./BabelTop";
import { MascotSays, type Mood } from "./BabelMascot";
import { IcoBoost, IcoCards, IcoChat, IcoCheck, IcoCrown, IcoHeadphones, IcoLock, IcoStar, IcoTarget } from "./icons";

// Trilha do Babel: barra de status, faixa verde por unidade e caminho em zigue-zague (lições, conversa e nível lendário), mais treinos.

type NodeState = "done" | "next" | "open" | "locked";
type Kind = "lesson" | "chat" | "legend" | "leader";

// deslocamento horizontal (px) de cada bolinha, formando a curva do caminho
const WAVE = [0, 38, 62, 38, 0, -38, -62, -38];

function PathNode({ idx, href, kind, state, label, stars }: { idx: number; href: string; kind: Kind; state: NodeState; label: string; stars?: number }) {
  const cls = state === "locked" ? "locked" : state === "done" ? "done" : kind === "chat" ? "chat" : kind === "legend" || kind === "leader" ? "legend" : "todo";
  const icon = state === "locked" ? <IcoLock className="h-7 w-7" /> : state === "done" ? <IcoCheck className="h-9 w-9" /> : kind === "chat" ? <IcoChat className="h-8 w-8" /> : kind === "legend" || kind === "leader" ? <IcoCrown className="h-8 w-8" /> : <IcoStar className="h-8 w-8" />;
  const node = (
    <>
      {state === "next" ? <span className="bb-start">Começar</span> : null}
      <span className={`bb-node ${cls} ${state === "next" ? "next" : ""}`}>{icon}</span>
    </>
  );
  return (
    <div className="bb-node-wrap" style={{ transform: `translateX(${WAVE[idx % WAVE.length]}px)` }}>
      {state === "locked" ? (
        <div aria-disabled>{node}</div>
      ) : (
        <Link href={href} className="relative flex flex-col items-center" aria-label={label}>
          {node}
        </Link>
      )}
      <p className="bb-node-lbl">{label}</p>
      {stars ? (
        <p className="mt-0.5 flex gap-0.5 text-[var(--bb-gold)]" aria-label={`${stars} estrelas`}>
          {[1, 2, 3].map((s) => (
            <IcoStar key={s} className={`h-3.5 w-3.5 ${s <= stars ? "" : "opacity-25"}`} />
          ))}
        </p>
      ) : null}
    </div>
  );
}

function Hub({ href, icon, title, sub, badge }: { href: string; icon: React.ReactNode; title: string; sub: string; badge?: number }) {
  return (
    <Link href={href} className="bb-card bb-hub relative transition active:translate-y-0.5">
      {badge ? <span className="absolute right-3 top-3 rounded-full bg-[var(--bb-red)] px-2 py-0.5 text-xs font-extrabold text-white">{badge}</span> : null}
      <span className="flex h-12 w-12 shrink-0 items-center justify-center">{icon}</span>
      <span className="min-w-0">
        <span className="block text-base font-extrabold uppercase tracking-wide">{title}</span>
        <span className="bb-sub block">{sub}</span>
      </span>
    </Link>
  );
}

function bab(state: EnglishState, next: string | null): { mood: Mood; text: string } {
  const b = state.babel;
  if (state.totalDone === 0) return { mood: "cheer", text: "Oi! Eu sou o Bab, o guardião da torre. Vamos aprender inglês juntos? Comece pela primeira lição!" };
  if (b.hearts === 0) return { mood: "sad", text: "Eita, acabaram os seus corações. Treine os erros para ganhar um de volta!" };
  if (!next) return { mood: "proud", text: "Você terminou todas as lições! Agora falta o último nível: uma conversa de 10 minutos com o Natan ou a Rebeca." };
  if (state.streak > 0 && !state.doneToday) return { mood: "worried", text: `Faça uma lição hoje para manter a sua ofensiva de ${state.streak} ${state.streak === 1 ? "dia" : "dias"}!` };
  if (b.today.xp >= b.goal) return { mood: "cheer", text: "Meta do dia batida! Continue e suba na liga." };
  if (b.today.xp > 0) return { mood: "proud", text: `Boa! Faltam ${b.goal - b.today.xp} XP para a meta de hoje.` };
  return { mood: "happy", text: "Pronto para a próxima lição? Vai ser rapidinho!" };
}

export function EnglishHome({ state }: { state: EnglishState }) {
  const done = new Set(state.done.keys());
  const next = nextLesson(done, state.startUnit);
  const finished = !next;
  const allLessonsDone = LESSON_ORDER.every((id) => done.has(id));
  let counter = 0;

  return (
    <div className="bb-pad">
      <BabelTop state={state} />

      <Link href="/app/jogos/ingles/missoes" className="bb-card mt-4 flex items-center gap-3 p-3 transition active:translate-y-0.5">
        <div className="bb-ring" style={{ ["--p" as string]: Math.min(100, Math.round((state.babel.today.xp / state.babel.goal) * 100)) }}>
          <span>{state.babel.today.xp >= state.babel.goal ? <IcoCheck className="h-6 w-6 text-[var(--bb-green)]" /> : `${state.babel.today.xp}`}</span>
        </div>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-extrabold">Meta diária</span>
          <span className="bb-sub block">
            {state.babel.today.xp >= state.babel.goal ? "Meta batida! Continue para subir na liga." : `${state.babel.today.xp}/${state.babel.goal} XP hoje`}
          </span>
        </span>
        {state.babel.boostUntil ? <IcoBoost className="h-8 w-8 shrink-0" /> : null}
      </Link>

      <div className="mt-4">
        <MascotSays mood={bab(state, next).mood}>{bab(state, next).text}</MascotSays>
      </div>

      {!state.placementDone && state.totalDone === 0 ? (
        <Link href="/app/jogos/ingles/nivelamento" className="bb-card bb-hub mt-5 transition active:translate-y-0.5">
          <IcoTarget className="h-10 w-10 shrink-0" />
          <span className="min-w-0">
            <span className="block text-base font-extrabold">Já sabe um pouco de inglês?</span>
            <span className="bb-sub block">Faça o teste de nivelamento (8 perguntas, 2 minutos) e comece mais adiante.</span>
          </span>
        </Link>
      ) : null}

      {finished ? <p className="bb-card mt-5 px-4 py-3 text-center text-sm font-extrabold">Você terminou todas as lições! Peça sua conversa com o líder no último nível, ao fim da trilha.</p> : null}

      {UNITS.map((u) => {
        const rp = ROLEPLAYS.find((r) => r.id === u.roleplay);
        const rpOpen = rp ? roleplayUnlocked(u.n, done, state.startUnit) : false;
        const legOpen = legendaryUnlocked(u.n, done, state.startUnit);
        const legStars = state.done.get(legendaryId(u.n));
        const doneCount = u.lessons.filter((l) => state.done.has(l.id)).length;
        return (
          <section key={u.n}>
            <div className="bb-unit">
              <small>
                Unidade {u.n} · {u.level} · {doneCount}/{u.lessons.length}
              </small>
              <p>
                {u.emoji} {u.title}
              </p>
            </div>
            <div className="bb-path">
              {u.lessons.map((l) => {
                const unlocked = lessonUnlocked(l.id, done, state.startUnit);
                const stars = state.done.get(l.id);
                const st: NodeState = stars ? "done" : next === l.id ? "next" : unlocked ? "open" : "locked";
                return <PathNode key={l.id} idx={counter++} href={`/app/jogos/ingles/licao/${l.id}`} kind="lesson" state={st} label={l.title} stars={stars} />;
              })}
              {rp ? <PathNode idx={counter++} href={`/app/jogos/ingles/conversa/${rp.id}`} kind="chat" state={state.roleplayBest.has(rp.id) ? "done" : rpOpen ? "open" : "locked"} label={`Conversa: ${rp.title}`} /> : null}
              <PathNode idx={counter++} href={`/app/jogos/ingles/licao/${legendaryId(u.n)}`} kind="legend" state={legStars ? "done" : legOpen ? "open" : "locked"} label="Nível Lendário" stars={legStars} />
            </div>
          </section>
        );
      })}

      <section>
        <div className="bb-unit">
          <small>Último nível · {CALL_MINUTES} min</small>
          <p>🎤 Conversa com o líder</p>
        </div>
        <div className="bb-path">
          <PathNode
            idx={counter++}
            href="/app/jogos/ingles/lider"
            kind="leader"
            state={state.leaderCall?.status === "done" ? "done" : allLessonsDone || state.leaderCall ? (next === null && !state.leaderCall ? "next" : "open") : "locked"}
            label={state.leaderCall?.status === "scheduled" ? "Conversa marcada" : state.leaderCall ? "Pedido enviado" : allLessonsDone ? "Natan ou Rebeca" : "Termine as lições"}
          />
        </div>
      </section>

      <section className="mt-4">
        <h2 className="mb-3 text-xl font-extrabold">Treino</h2>
        <div className="grid gap-3">
          <Hub href="/app/jogos/ingles/treino/erros" icon={<IcoTarget className="h-10 w-10" />} title="Meus erros" sub="Refaça o que você errou" badge={state.pendingMistakes.length || undefined} />
          <Hub href="/app/jogos/ingles/treino/palavras" icon={<IcoCards className="h-10 w-10" />} title="Palavras" sub={`${wordCards().length} cartas para fixar`} />
          <Hub href="/app/jogos/ingles/treino/ouvir" icon={<IcoHeadphones className="h-10 w-10" />} title="Ouvir" sub="Treine o ouvido" />
        </div>
        <p className="bb-sub mt-3 text-center text-xs">Treinos não valem XP, mas ajudam a fixar. {LESSON_ORDER.length} lições no total nas {UNITS.length} unidades (A1 a B1).</p>
      </section>
    </div>
  );
}
