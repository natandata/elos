"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUsers } from "@/lib/push-server";
import { CARDS, CARD_BY_KEY, RARITY_WEIGHT, type GameCard } from "@/lib/games/cards";
import {
  dailyOrder,
  dailyQuestions,
  dailyWho,
  duelQuestions,
  todayBR,
  weightedPick,
  WHO_MAX_GUESSES,
  xpForQuiz,
  xpForVerse,
} from "@/lib/games/engine";

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>;
type Ctx = { userId: string; name: string; role: string; eloId: string | null; admin: AdminClient };

type DuelRow = {
  id: string;
  challenger_id: string;
  opponent_id: string;
  challenger_score: number | null;
  opponent_score: number | null;
};

type Play = { id: string; answers: unknown[]; score: number; finished: boolean; xp_awarded: number };

async function context(): Promise<Ctx> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, elo_id")
    .eq("id", user.id)
    .maybeSingle<{ id: string; full_name: string; role: string; elo_id: string | null }>();
  if (!profile) redirect("/");
  if (profile.role !== "cria" && profile.role !== "leader") {
    throw new Error("Os jogos são só para crias e líderes.");
  }

  const admin = createAdminClient();
  if (!admin) throw new Error("Jogos indisponíveis no momento.");
  return { userId: profile.id, name: profile.full_name, role: profile.role, eloId: profile.elo_id, admin };
}

async function getOrCreatePlay(
  c: Ctx,
  game: "quiz" | "verse" | "who" | "order" | "duel" | "chest",
  duelId: string | null = null,
): Promise<Play> {
  const date = todayBR();
  const find = async () => {
    let q = c.admin
      .from("game_plays")
      .select("id, answers, score, finished, xp_awarded")
      .eq("user_id", c.userId)
      .eq("game", game);
    q = duelId ? q.eq("duel_id", duelId) : q.eq("play_date", date).is("duel_id", null);
    const { data } = await q.maybeSingle<Play>();
    return data;
  };

  const existing = await find();
  if (existing) return existing;

  const { data: created, error } = await c.admin
    .from("game_plays")
    .insert({ user_id: c.userId, game, play_date: date, duel_id: duelId })
    .select("id, answers, score, finished, xp_awarded")
    .single<Play>();
  if (created) return created;

  // outra aba criou no mesmo instante: lê de novo
  const again = await find();
  if (again) return again;
  throw new Error(error?.message ?? "Não foi possível iniciar o jogo.");
}

async function giveCard(c: Ctx, key: string, source: string): Promise<GameCard | null> {
  const card = CARD_BY_KEY.get(key);
  if (!card) return null;
  const { data } = await c.admin
    .from("user_cards")
    .upsert({ user_id: c.userId, card_key: key, source }, { onConflict: "user_id,card_key", ignoreDuplicates: true })
    .select("card_key");
  if (!data || data.length === 0) return null; // já tinha
  await c.admin.rpc("check_and_grant_achievements", { p_user: c.userId });
  return card;
}

async function randomNewCard(c: Ctx, source: string): Promise<GameCard | null> {
  const { data } = await c.admin.from("user_cards").select("card_key").eq("user_id", c.userId);
  const owned = new Set(((data ?? []) as { card_key: string }[]).map((r) => r.card_key));
  const pool = CARDS.filter((card) => !owned.has(card.key));
  const pick = weightedPick(pool, (card) => RARITY_WEIGHT[card.rarity]);
  return pick ? giveCard(c, pick.key, source) : null;
}

async function notify(c: Ctx, userId: string, title: string, body: string, link: string) {
  try {
    await c.admin.from("notifications").insert({ user_id: userId, title, body, link, category: "jogos" });
    await sendPushToUsers([userId], { title, body, url: link });
  } catch {
    // aviso é secundário: nunca derruba o jogo
  }
}

function refresh() {
  revalidatePath("/app", "layout");
}

// ------------------------------------------------------------ quiz / versículo / duelo

export type AnswerResult = {
  error?: string;
  /** quantas já estavam respondidas (pra ressincronizar a tela) */
  answered?: number;
  correct?: boolean;
  correctIdx?: number;
  ref?: string;
  score?: number;
  done?: boolean;
  xp?: number;
  card?: GameCard | null;
  duel?: { status: string; mine: number; theirs: number | null; won: boolean | null } | null;
};

export async function answerQuestion(input: {
  game: "quiz" | "verse" | "duel";
  idx: number;
  choice: number;
  duelId?: string;
}): Promise<AnswerResult> {
  const c = await context();
  const { game, idx, choice, duelId } = input;
  if (!Number.isInteger(idx) || !Number.isInteger(choice)) return { error: "Resposta inválida." };

  let duel: DuelRow | null = null;
  if (game === "duel") {
    if (!duelId) return { error: "Duelo inválido." };
    const { data } = await c.admin
      .from("game_duels")
      .select("id, challenger_id, opponent_id, challenger_score, opponent_score, status")
      .eq("id", duelId)
      .maybeSingle();
    duel = data as DuelRow | null;
    if (!duel || (duel.challenger_id !== c.userId && duel.opponent_id !== c.userId)) {
      return { error: "Duelo não encontrado." };
    }
  }

  const questions = game === "duel" ? duelQuestions(duelId!) : dailyQuestions(game);
  if (idx < 0 || idx >= questions.length) return { error: "Pergunta inválida." };

  const play = await getOrCreatePlay(c, game, game === "duel" ? duelId! : null);
  if (play.finished) return { error: "Você já terminou esse jogo.", answered: questions.length, done: true };

  const answers = (play.answers ?? []) as number[];
  if (idx !== answers.length) return { error: "Tela desatualizada.", answered: answers.length };
  if (choice < 0 || choice >= questions[idx].options.length) return { error: "Resposta inválida." };

  const q = questions[idx];
  const correct = choice === q.correctIdx;
  const score = play.score + (correct ? 1 : 0);
  const done = answers.length + 1 === questions.length;

  const { error: upErr } = await c.admin
    .from("game_plays")
    .update({ answers: [...answers, choice], score })
    .eq("id", play.id)
    .eq("finished", false);
  if (upErr) return { error: "Não consegui salvar sua resposta. Tente de novo." };

  const result: AnswerResult = { correct, correctIdx: q.correctIdx, ref: q.ref, score, done, xp: 0 };
  if (!done) return result;

  const xp = game === "quiz" ? xpForQuiz(score) : game === "verse" ? xpForVerse(score) : 0;
  const { data: paid } = await c.admin.rpc("game_finish", { p_play: play.id, p_xp: xp, p_type: `game_${game}` });
  result.xp = typeof paid === "number" && paid > 0 ? paid : 0;

  if (game === "quiz" && score === questions.length) {
    result.card = await randomNewCard(c, "quiz_perfeito");
  }

  if (game === "duel" && duel) {
    const { data: rows } = await c.admin.rpc("game_duel_submit", { p_duel: duel.id, p_user: c.userId, p_score: score });
    const row = (rows as { duel_status: string; challenger_score: number | null; opponent_score: number | null; winner_id: string | null }[] | null)?.[0];
    if (row) {
      const iAmChallenger = duel.challenger_id === c.userId;
      const theirId = iAmChallenger ? duel.opponent_id : duel.challenger_id;
      const theirs = iAmChallenger ? row.opponent_score : row.challenger_score;
      if (row.duel_status === "finished") {
        result.duel = {
          status: "finished",
          mine: score,
          theirs,
          won: row.winner_id === null ? null : row.winner_id === c.userId,
        };
        const iWon = row.winner_id === c.userId;
        const tie = row.winner_id === null;
        await notify(
          c,
          theirId,
          tie ? "🤝 Duelo empatado!" : iWon ? "😅 Você perdeu o duelo" : "🏆 Você venceu o duelo!",
          `${c.name} fez ${score} e você fez ${theirs ?? 0}.`,
          `/app/jogos/duelo/${duel.id}`,
        );
      } else {
        result.duel = { status: "open", mine: score, theirs: null, won: null };
        await notify(
          c,
          theirId,
          "⚔️ É a sua vez no duelo!",
          `${c.name} já jogou. Responda as 5 perguntas e vença!`,
          `/app/jogos/duelo/${duel.id}`,
        );
      }
    }
  }

  refresh();
  return result;
}

// ------------------------------------------------------------ Quem Sou Eu?

export type WhoResult = {
  error?: string;
  correct?: boolean;
  finished?: boolean;
  nextHint?: string;
  reveal?: string;
  score?: number;
  xp?: number;
  card?: GameCard | null;
};

export async function guessWho(choice: number): Promise<WhoResult> {
  const c = await context();
  if (!Number.isInteger(choice)) return { error: "Palpite inválido." };

  const round = dailyWho();
  if (choice < 0 || choice >= round.options.length) return { error: "Palpite inválido." };

  const play = await getOrCreatePlay(c, "who");
  if (play.finished) return { error: "Você já jogou hoje.", finished: true };

  const guesses = (play.answers ?? []) as number[];
  if (guesses.includes(choice)) return { error: "Você já tentou essa opção." };

  const attempt = guesses.length + 1;
  const correct = choice === round.correctIdx;
  const score = correct ? 5 - attempt : 0;
  const finished = correct || attempt >= WHO_MAX_GUESSES;

  const { error: upErr } = await c.admin
    .from("game_plays")
    .update({ answers: [...guesses, choice], score })
    .eq("id", play.id)
    .eq("finished", false);
  if (upErr) return { error: "Não consegui salvar seu palpite. Tente de novo." };

  if (!finished) return { correct: false, finished: false, nextHint: round.item.hints[attempt] };

  const xp = correct ? (attempt <= 2 ? 2 : 1) : 0;
  const { data: paid } = await c.admin.rpc("game_finish", { p_play: play.id, p_xp: xp, p_type: "game_who" });
  const card = correct ? await giveCard(c, round.item.key, "quem_sou_eu") : null;
  refresh();
  return {
    correct,
    finished: true,
    reveal: round.item.name,
    score,
    xp: typeof paid === "number" && paid > 0 ? paid : 0,
    card,
  };
}

// ------------------------------------------------------------ Ordene os Fatos

export type OrderResult = {
  error?: string;
  correct?: boolean;
  finished?: boolean;
  rightPositions?: number;
  attemptsLeft?: number;
  solution?: string[];
  score?: number;
  xp?: number;
};

const ORDER_MAX_ATTEMPTS = 2;

export async function submitOrder(order: number[]): Promise<OrderResult> {
  const c = await context();
  const round = dailyOrder();
  const size = round.shuffled.length;
  const valid =
    Array.isArray(order) &&
    order.length === size &&
    order.every((n) => Number.isInteger(n) && n >= 0 && n < size) &&
    new Set(order).size === size;
  if (!valid) return { error: "Ordem inválida." };

  const play = await getOrCreatePlay(c, "order");
  if (play.finished) return { error: "Você já jogou hoje.", finished: true };

  const attempts = (play.answers ?? []) as number[][];
  if (attempts.length >= ORDER_MAX_ATTEMPTS) return { error: "Sem tentativas.", finished: true };

  const rightPositions = order.filter((n, i) => n === round.correctOrder[i]).length;
  const correct = rightPositions === size;
  const attempt = attempts.length + 1;
  const finished = correct || attempt >= ORDER_MAX_ATTEMPTS;
  const score = correct ? (attempt === 1 ? 4 : 2) : 0;

  const { error: upErr } = await c.admin
    .from("game_plays")
    .update({ answers: [...attempts, order], score })
    .eq("id", play.id)
    .eq("finished", false);
  if (upErr) return { error: "Não consegui salvar. Tente de novo." };

  if (!finished) {
    return { correct: false, finished: false, rightPositions, attemptsLeft: ORDER_MAX_ATTEMPTS - attempt };
  }

  const { data: paid } = await c.admin.rpc("game_finish", {
    p_play: play.id,
    p_xp: correct ? 1 : 0,
    p_type: "game_order",
  });
  refresh();
  return {
    correct,
    finished: true,
    rightPositions,
    solution: round.set.events,
    score,
    xp: typeof paid === "number" && paid > 0 ? paid : 0,
  };
}

// ------------------------------------------------------------ baú diário

export type ChestResult = { error?: string; card?: GameCard | null; xp?: number };

export async function openChest(): Promise<ChestResult> {
  const c = await context();
  const play = await getOrCreatePlay(c, "chest");
  if (play.finished) return { error: "Você já abriu o baú de hoje. Volte amanhã!" };

  const card = await randomNewCard(c, "bau");
  // coleção completa: o baú vira +1 XP
  const xp = card ? 0 : 1;
  const { data: paid } = await c.admin.rpc("game_finish", { p_play: play.id, p_xp: xp, p_type: "game_chest" });
  if (paid === -1) return { error: "Você já abriu o baú de hoje." };
  refresh();
  return { card, xp: typeof paid === "number" && paid > 0 ? paid : 0 };
}

// ------------------------------------------------------------ duelo

export async function createDuel(opponentId: string): Promise<{ error?: string; id?: string }> {
  const c = await context();
  if (!c.eloId) return { error: "Você precisa estar em um Elo." };
  if (!opponentId || opponentId === c.userId) return { error: "Escolha um colega do Elo." };

  const { data: opp } = await c.admin
    .from("profiles")
    .select("id, full_name, role, elo_id")
    .eq("id", opponentId)
    .maybeSingle<{ id: string; full_name: string; role: string; elo_id: string | null }>();
  if (!opp || opp.elo_id !== c.eloId || (opp.role !== "cria" && opp.role !== "leader")) {
    return { error: "Você só pode desafiar alguém do seu Elo." };
  }

  const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
  const { count: recent } = await c.admin
    .from("game_duels")
    .select("id", { count: "exact", head: true })
    .eq("challenger_id", c.userId)
    .gte("created_at", since);
  if ((recent ?? 0) >= 3) return { error: "Você já fez 3 desafios hoje. Volte amanhã!" };

  const { data: open } = await c.admin
    .from("game_duels")
    .select("id")
    .eq("status", "open")
    .or(
      `and(challenger_id.eq.${c.userId},opponent_id.eq.${opponentId}),and(challenger_id.eq.${opponentId},opponent_id.eq.${c.userId})`,
    )
    .gte("created_at", new Date(Date.now() - 7 * 86_400_000).toISOString())
    .limit(1);
  if (open && open.length > 0) return { error: "Já existe um duelo aberto com essa pessoa." };

  const { data: duel, error } = await c.admin
    .from("game_duels")
    .insert({ challenger_id: c.userId, opponent_id: opponentId, elo_id: c.eloId })
    .select("id")
    .single<{ id: string }>();
  if (error || !duel) return { error: "Não foi possível criar o duelo." };

  await notify(
    c,
    opponentId,
    "⚔️ Você foi desafiado!",
    `${c.name} te chamou pra um duelo bíblico. Topa?`,
    `/app/jogos/duelo/${duel.id}`,
  );
  revalidatePath("/app/jogos");
  return { id: duel.id };
}
