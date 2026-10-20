import { notFound, redirect } from "next/navigation";
import { LessonPlayer } from "@/components/english/LessonPlayer";
import { requireRole } from "@/lib/auth";
import { LESSONS, LESSON_ORDER, UNITS, legendaryExercises } from "@/lib/english/content";
import { getEnglishState } from "@/lib/english/data.server";
import { legendaryId, legendaryUnlocked, lessonUnlocked, parseLegendary } from "@/lib/english/progress";
import { createClient } from "@/lib/supabase/server";

const HOME = "/app/jogos/ingles";

export default async function LicaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { profile } = await requireRole("cria", "leader", "admin");
  const { id } = await params;
  const state = await getEnglishState(await createClient(), profile.id);
  const done = new Set(state.done.keys());

  const unit = parseLegendary(id);
  if (unit) {
    const u = UNITS.find((x) => x.n === unit);
    if (!u) notFound();
    if (!legendaryUnlocked(unit, done, state.startUnit)) redirect(HOME);
    return <LessonPlayer mode="legendary" keyId={legendaryId(unit)} title={`Nível Lendário: ${u.title}`} exercises={legendaryExercises(unit)} backHref={HOME} />;
  }

  const lesson = LESSONS[id];
  if (!lesson) notFound();
  if (!lessonUnlocked(id, done, state.startUnit)) redirect(HOME);
  const nextId = LESSON_ORDER[LESSON_ORDER.indexOf(id) + 1];
  return <LessonPlayer mode="lesson" keyId={id} title={lesson.title} exercises={lesson.exercises} backHref={HOME} nextHref={nextId ? `${HOME}/licao/${nextId}` : undefined} nextLabel={nextId ? `Próxima: ${LESSONS[nextId].title}` : undefined} />;
}
