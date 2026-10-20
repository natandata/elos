import { redirect } from "next/navigation";
import { LessonPlayer } from "@/components/english/LessonPlayer";
import { requireRole } from "@/lib/auth";
import { placementExercises } from "@/lib/english/content";
import { getEnglishState } from "@/lib/english/data.server";
import { createClient } from "@/lib/supabase/server";

const HOME = "/app/jogos/ingles";

export default async function NivelamentoPage() {
  const { profile } = await requireRole("cria", "leader", "admin");
  const state = await getEnglishState(await createClient(), profile.id);
  // o teste vale só no começo (antes de qualquer lição)
  if (state.placementDone || state.totalDone > 0) redirect(HOME);
  return <LessonPlayer mode="placement" keyId="nivelamento" title="Teste de nivelamento" exercises={placementExercises()} backHref={HOME} nextHref={HOME} nextLabel="Ir para a trilha" />;
}
