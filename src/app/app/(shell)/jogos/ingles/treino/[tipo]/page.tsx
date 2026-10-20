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
      <div className="mx-auto max-w-md text-center">
        <p className="text-6xl" aria-hidden>
          ✨
        </p>
        <h2 className="mt-2 text-2xl font-black">Nada para revisar</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">Quando você errar um exercício numa lição, ele aparece aqui para você refazer até dominar.</p>
        <Link href={HOME} className="btn btn-primary mt-5 w-full !py-3">
          Voltar à trilha
        </Link>
      </div>
    );
  }
  return <LessonPlayer mode="practice" keyId={tipo} title={title} exercises={exercises} backHref={HOME} />;
}
