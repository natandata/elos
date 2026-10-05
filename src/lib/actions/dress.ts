"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayBR } from "@/lib/games/engine";
import { gameOpenFor } from "@/lib/games/releaseServer";
import { SLOTS, type Slot } from "@/lib/games/dress/items";
import { MAX_SCORE, ROUNDS_PER_DAY, dailyCharacters, dressDrawDate, roundOptions, scoreRound, ticketsFor, type SlotResult } from "@/lib/games/dress/engine";

async function player() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data: profile } = await supabase.from("profiles").select("id, role").eq("id", user.id).maybeSingle<{ id: string; role: string }>();
  if (!profile || (profile.role !== "cria" && profile.role !== "leader")) redirect("/");
  const admin = createAdminClient();
  if (!admin) throw new Error("Jogos indisponíveis no momento.");
  return { admin, userId: profile.id };
}

type Play = {
  id: string;
  variant: number;
  answers: { character: string; picks: Record<string, string>; score: number }[];
  score: number;
  finished: boolean;
};
const COLS = "id, variant, answers, score, finished";

const CLOSED = "O Vista o Herói abre no dia 09/10. Volte lá!";

/** Começa (ou continua) o jogo do dia. */
export async function startDress(): Promise<{ error?: string }> {
  const c = await player();
  if (!(await gameOpenFor("dress", c.userId))) return { error: CLOSED };
  const date = todayBR();
  const { data: existing } = await c.admin.from("dress_plays").select("id").eq("user_id", c.userId).eq("play_date", date).eq("variant", 0).maybeSingle();
  if (!existing) {
    const { error } = await c.admin.from("dress_plays").insert({ user_id: c.userId, play_date: date, variant: 0 });
    if (error && error.code !== "23505") return { error: "Não foi possível começar. Tente de novo." };
  }
  revalidatePath("/app/jogos/vestir");
  return {};
}

/** Jogar de novo no mesmo dia (treino: personagens diferentes, sem bilhetes). */
export async function startDressPractice(): Promise<{ error?: string }> {
  const c = await player();
  if (!(await gameOpenFor("dress", c.userId))) return { error: CLOSED };
  const date = todayBR();
  const { data: rows } = await c.admin.from("dress_plays").select(COLS).eq("user_id", c.userId).eq("play_date", date).order("variant", { ascending: false }).limit(1).returns<Play[]>();
  const latest = rows?.[0];
  if (!latest) return { error: "Jogue o desafio do dia primeiro." };
  if (!latest.finished) return { error: "Termine a rodada atual antes." };
  const { error } = await c.admin.from("dress_plays").insert({ user_id: c.userId, play_date: date, variant: latest.variant + 1 });
  if (error && error.code !== "23505") return { error: "Não foi possível começar o treino. Tente de novo." };
  revalidatePath("/app/jogos/vestir");
  return {};
}

export type DressSubmit = {
  error?: string;
  roundScore?: number;
  slots?: SlotResult[];
  finished?: boolean;
  totalScore?: number;
  tickets?: number;
};

/** Confere o look montado pra personagem da vez (o servidor refaz as opções e corrige). */
export async function submitDressRound(picks: Record<string, string>): Promise<DressSubmit> {
  const c = await player();
  if (!(await gameOpenFor("dress", c.userId))) return { error: CLOSED };
  const date = todayBR();
  const { data: rows } = await c.admin.from("dress_plays").select(COLS).eq("user_id", c.userId).eq("play_date", date).order("variant", { ascending: false }).limit(1).returns<Play[]>();
  const play = rows?.[0];
  if (!play) return { error: "Comece o jogo primeiro." };
  if (play.finished) return { error: "Você já terminou este jogo." };

  const idx = play.answers.length;
  const drawDate = dressDrawDate(date, play.variant);
  const character = dailyCharacters(drawDate)[idx];
  if (!character) return { error: "Rodada inválida." };

  // cada escolha tem que ser uma das opções oferecidas
  const options = roundOptions(character.id, drawDate);
  const clean: Record<string, string> = {};
  for (const s of SLOTS) {
    const pick = picks?.[s.key];
    if (typeof pick !== "string" || !options[s.key as Slot].includes(pick)) return { error: "Escolha uma peça em cada espaço." };
    clean[s.key] = pick;
  }

  const { score, slots } = scoreRound(character.id, clean);
  const answers = [...play.answers, { character: character.id, picks: clean, score }];
  const total = play.score + score;
  const finished = answers.length >= ROUNDS_PER_DAY;

  // grava de forma condicional: duas abas não pagam duas vezes
  const { data: saved } = await c.admin
    .from("dress_plays")
    .update({ answers, score: total, rounds: idx + 1, finished, finished_at: finished ? new Date().toISOString() : null })
    .eq("id", play.id)
    .eq("finished", false)
    .eq("rounds", idx)
    .select("id");
  if (!saved || saved.length === 0) return { error: "Esta rodada já foi enviada. Atualize a página." };

  let tickets = 0;
  if (finished && play.variant === 0) {
    tickets = ticketsFor(total);
    await c.admin.from("dress_plays").update({ tickets_awarded: tickets }).eq("id", play.id);
    await c.admin.rpc("dress_apply_result", { p_user: c.userId, p_delta: tickets, p_perfect: total >= MAX_SCORE });
  }
  revalidatePath("/app/jogos/vestir");
  return { roundScore: score, slots, finished, totalScore: total, tickets };
}
