"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { logGameActivity } from "@/lib/games/activity";
import { gameOpenFor } from "@/lib/games/releaseServer";
import { ALL_EXERCISES, LESSONS, ROLEPLAY_BY_ID } from "@/lib/english/content";
import { lessonUnlocked, legendaryUnlocked, parseLegendary, roleplayUnlocked } from "@/lib/english/progress";
import { getEnglishState } from "@/lib/english/data.server";

export type EnglishFinish = {
  kind: "lesson" | "legendary" | "roleplay" | "practice" | "placement";
  key: string;
  correct: number;
  total: number;
  secs: number;
  /** exercícios errados de primeira */
  wrong?: string[];
  /** exercícios de revisão acertados */
  fixed?: string[];
  complexity?: number;
  turns?: { turn: number; reply: string; q: number }[];
  startUnit?: number;
};
export type EnglishResult = { error?: string; xp?: number; stars?: number; streak?: number; valid?: boolean };

const int = (v: unknown, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.floor(Number(v)) || 0));

/**
 * Fecha uma lição, nível lendário, conversa, treino ou o nivelamento. O servidor confere que a lição existe e está
 * liberada, limpa os números que vieram do aparelho e deixa o banco pagar o XP (com tempo mínimo e teto por dia).
 */
export async function finishEnglish(input: EnglishFinish): Promise<EnglishResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Entre de novo para salvar o progresso." };
  if (!(await gameOpenFor("english", user.id))) return { error: "Jogo indisponível." };
  const admin = createAdminClient();
  if (!admin) return { error: "Progresso indisponível no momento." };

  const kind = input?.kind;
  if (!["lesson", "legendary", "roleplay", "practice", "placement"].includes(kind)) return { error: "Pedido inválido." };
  const key = String(input.key ?? "").slice(0, 40);
  const state = await getEnglishState(supabase, user.id);
  const done = new Set(state.done.keys());

  let total = int(input.total, 1, 40);
  if (kind === "lesson") {
    const l = LESSONS[key];
    if (!l) return { error: "Lição não encontrada." };
    if (!lessonUnlocked(key, done, state.startUnit)) return { error: "Essa lição ainda está bloqueada." };
    total = l.exercises.length;
  } else if (kind === "legendary") {
    const unit = parseLegendary(key);
    if (!unit || !legendaryUnlocked(unit, done, state.startUnit)) return { error: "Esse nível ainda está bloqueado." };
  } else if (kind === "roleplay") {
    const r = ROLEPLAY_BY_ID[key];
    if (!r) return { error: "Conversa não encontrada." };
    if (!roleplayUnlocked(r.unit, done, state.startUnit)) return { error: "Essa conversa ainda está bloqueada." };
    total = r.turns.length;
  } else if (kind === "practice" && !["erros", "palavras", "ouvir"].includes(key)) {
    return { error: "Treino inválido." };
  }

  const known = (ids: unknown) => (Array.isArray(ids) ? ids.map(String).filter((id) => !!ALL_EXERCISES[id]).slice(0, 40) : []);
  const wrong = [...new Set(known(input.wrong))];
  const fixed = [...new Set(known(input.fixed))];
  const correct = kind === "roleplay" ? int(input.correct, 0, 100) : int(input.correct, 0, total);
  const turns = kind === "roleplay" && Array.isArray(input.turns) ? input.turns.slice(0, 10).map((t) => ({ turn: int(t.turn, 0, 9), reply: String(t.reply ?? "").slice(0, 160), q: int(t.q, 0, 2) })) : null;

  const { data, error } = await admin.rpc("english_finish", {
    p_user: user.id,
    p_kind: kind,
    p_key: key,
    p_correct: correct,
    p_total: total,
    p_secs: int(input.secs, 0, 7200),
    p_wrong: wrong,
    p_fixed: fixed,
    p_complexity: int(input.complexity, 0, 100),
    p_turns: turns,
    p_start_unit: kind === "placement" ? int(input.startUnit, 1, 4) : null,
  });
  if (error || !data) return { error: "Não foi possível salvar o progresso." };
  const r = data as { xp: number; stars: number; streak: number; valid: boolean };

  const what = kind === "lesson" ? `lição ${LESSONS[key]?.title ?? key} (${r.stars}★)` : kind === "legendary" ? `nível lendário ${key}` : kind === "roleplay" ? `conversa "${ROLEPLAY_BY_ID[key]?.title ?? key}" (${correct}% de precisão)` : kind === "placement" ? `teste de nivelamento (unidade ${input.startUnit})` : `treino de ${key}`;
  if (kind !== "practice") await logGameActivity(user.id, "english", "play", `Inglês em Ação: ${what}${r.xp ? ` · +${r.xp} XP` : ""}`, 0);
  revalidatePath("/app/jogos/ingles");
  revalidatePath("/app/jogos");
  return { xp: r.xp, stars: r.stars, streak: r.streak, valid: r.valid };
}

/** Aluno avisa que um exercício ou fala está errado/estranho: o admin vê em "Atividade recente". */
export async function reportEnglishContent(exerciseId: string, note?: string): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Entre de novo." };
  const id = String(exerciseId ?? "").slice(0, 40);
  await logGameActivity(user.id, "english", "report", `Reportou conteúdo do Inglês: ${id}${note ? ` (${String(note).slice(0, 80)})` : ""}`, 5);
  return { ok: true };
}
