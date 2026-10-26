import Link from "next/link";
import { notFound } from "next/navigation";
import { LessonPlayer } from "@/components/english/LessonPlayer";
import { requireRole } from "@/lib/auth";
import { ALL_EXERCISES, listeningPool, wordCards } from "@/lib/english/content";
import { getEnglishState } from "@/lib/english/data.server";
import { seededShuffle } from "@/lib/english/grade";
import { createClient } from "@/lib/supabase/server";
import type { Exercise } from "@/lib/english/types";

const HOME = "/app/jogos/ingles";

export default async function TreinoPage({ params }: { params: Promise<{ tipo: string }> }) {
  const { profile } = await requireRole("cria", "leader", "admin");
  const { tipo } = await params;
  if (!["erros", "palavras", "ouvir"].includes(tipo)) notFound();
  const state = await getEnglishState(await createClient(), profile.id);
  // mesma ordem durante o dia (semente = data), para a tela não "pular" ao recarregar
  const seed = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }) + profile.id;

  let exercises: Exercise[] = [];
  let title = "";
  if (tipo === "erros") {
    title = "Meus erros";
    exercises = state.pendingMistakes.map((id) => ALL_EXERCISES[id]).filter((e): e is Exercise => !!e).slice(0, 10);
  } else if (tipo === "palavras") {
    title = "Cartas de palavras";
    exercises = seededShuffle(wordCards(), seed).slice(0, 10);
  } else {
    title = "Treino de ouvir";
    exercises = seededShuffle(listeningPool(), seed).slice(0, 8);
  }

  if (exercises.length === 0) {
    return (
      <div className="flex min-h-[85dvh] flex-col text-center">
        <div className="flex flex-1 flex-col items-center justify-center">
          <p className="text-7xl" aria-hidden>
            ✨
          </p>
          <h2 className="bb-h mt-3 text-3xl">Nada para revisar</h2>
          <p className="bb-sub mt-2">Quando você errar um exercício numa lição, ele aparece aqui para você refazer até dominar.</p>
        </div>
        <div className="bb-foot">
          <Link href={HOME} className="bb-btn">
            Voltar à trilha
          </Link>
        </div>
      </div>
    );
  }
  return <LessonPlayer mode="practice" keyId={tipo} title={title} exercises={exercises} backHref={HOME} />;
}
