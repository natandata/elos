"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomInt } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUsers } from "@/lib/push-server";
import { DUEL_PAIRS, SOLO_SIZES, buildBoard, minPlausibleMs, verifyTurns } from "@/lib/games/memory";

async function player() {
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
  if (!profile || (profile.role !== "cria" && profile.role !== "leader" && profile.role !== "admin")) redirect("/");
  const admin = createAdminClient();
  if (!admin) throw new Error("Jogos indisponíveis no momento.");
  return { admin, userId: profile.id, name: profile.full_name, eloId: profile.elo_id };
}

async function notify(userId: string, title: string, body: string, link: string) {
  try {
    const admin = createAdminClient();
    if (!admin) return;
    await admin.from("notifications").insert({ user_id: userId, title, body, link, category: "jogos" });
    await sendPushToUsers([userId], { title, body, url: link });
  } catch {
    // aviso é só conforto
  }
}

type Duel = {
  id: string;
  challenger_id: string;
  opponent_id: string;
  seed: number;
  pairs: number;
  status: string;
  c_started_at: string | null;
  o_started_at: string | null;
  c_ms: number | null;
  o_ms: number | null;
  created_at: string;
};
const COLS = "id, challenger_id, opponent_id, seed, pairs, status, c_started_at, o_started_at, c_ms, o_ms, created_at";
const EXPIRE_MS = 24 * 3_600_000;

export async function createMemoryDuel(opponentId: string, pairs: number = DUEL_PAIRS): Promise<{ error?: string; id?: string }> {
  if (!SOLO_SIZES.some((s) => s.pairs === pairs)) return { error: "Nível inválido." };
  const c = await player();
  if (!c.eloId) return { error: "Você precisa estar em um Elo." };
  if (!opponentId || opponentId === c.userId) return { error: "Escolha um colega do Elo." };

  const { data: opp } = await c.admin.from("profiles").select("id, role, elo_id").eq("id", opponentId).maybeSingle<{ id: string; role: string; elo_id: string | null }>();
  if (!opp || opp.elo_id !== c.eloId || (opp.role !== "cria" && opp.role !== "leader")) return { error: "Você só pode desafiar alguém do seu Elo." };

  const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
  const { count } = await c.admin.from("memory_duels").select("id", { count: "exact", head: true }).eq("challenger_id", c.userId).gte("created_at", since);
  if ((count ?? 0) >= 6) return { error: "Você já fez 6 desafios de memória hoje. Volte amanhã!" };

  const { data: open } = await c.admin
    .from("memory_duels")
    .select("id")
    .eq("status", "open")
    .gte("created_at", since)
    .or(`and(challenger_id.eq.${c.userId},opponent_id.eq.${opponentId}),and(challenger_id.eq.${opponentId},opponent_id.eq.${c.userId})`)
    .limit(1);
  if (open && open.length > 0) return { error: "Já existe um desafio de memória aberto com essa pessoa." };

  const { data: duel, error } = await c.admin
    .from("memory_duels")
    .insert({ challenger_id: c.userId, opponent_id: opponentId, elo_id: c.eloId, seed: randomInt(1, 2 ** 31 - 1), pairs })
    .select("id")
    .single<{ id: string }>();
  if (error || !duel) return { error: "Não foi possível criar o desafio." };

  await notify(opponentId, "🃏 Desafio de memória!", `${c.name} te desafiou (${pairs} pares): quem termina o jogo da memória primeiro?`, `/app/jogos/memoria/${duel.id}`);
  revalidatePath("/app/jogos/memoria");
  return { id: duel.id };
}

/** Começa a sua corrida: o relógio é do servidor (começa agora e só uma vez). */
export async function startMemoryDuel(id: string): Promise<{ error?: string; startedAt?: string }> {
  const c = await player();
  const { data: d } = await c.admin.from("memory_duels").select(COLS).eq("id", id).maybeSingle<Duel>();
  if (!d || (d.challenger_id !== c.userId && d.opponent_id !== c.userId)) return { error: "Desafio não encontrado." };
  if (d.status !== "open" || Date.now() - new Date(d.created_at).getTime() > EXPIRE_MS) return { error: "Este desafio já acabou." };
  const mine = d.challenger_id === c.userId;
  if ((mine ? d.c_ms : d.o_ms) !== null) return { error: "Você já jogou este desafio." };
  const existing = mine ? d.c_started_at : d.o_started_at;
  if (existing) return { startedAt: existing };
  const now = new Date().toISOString();
  const col = mine ? "c_started_at" : "o_started_at";
  await c.admin.from("memory_duels").update({ [col]: now }).eq("id", id).is(col, null);
  const { data: again } = await c.admin.from("memory_duels").select(COLS).eq("id", id).maybeSingle<Duel>();
  return { startedAt: (mine ? again?.c_started_at : again?.o_started_at) ?? now };
}

export type MemoryFinish = { error?: string; ms?: number; moves?: number; status?: string; winnerId?: string | null; oppMs?: number | null };

/** Termina a sua corrida: confere as jogadas no tabuleiro e usa o tempo do servidor. */
export async function finishMemoryDuel(id: string, turns: unknown): Promise<MemoryFinish> {
  const c = await player();
  const { data: d } = await c.admin.from("memory_duels").select(COLS).eq("id", id).maybeSingle<Duel>();
  if (!d || (d.challenger_id !== c.userId && d.opponent_id !== c.userId)) return { error: "Desafio não encontrado." };
  const mine = d.challenger_id === c.userId;
  const started = mine ? d.c_started_at : d.o_started_at;
  if (!started) return { error: "Comece o desafio primeiro." };
  if (d.status !== "open") return { error: "Este desafio já acabou." };
  if ((mine ? d.c_ms : d.o_ms) !== null) return { error: "Você já jogou este desafio." };

  const moves = verifyTurns(buildBoard(d.seed, d.pairs), turns);
  if (moves === null) return { error: "Jogadas inválidas." };
  const ms = Math.max(minPlausibleMs(d.pairs), Date.now() - new Date(started).getTime());

  const { data, error } = await c.admin.rpc("memory_duel_finish", { p_duel: id, p_user: c.userId, p_ms: ms, p_moves: moves });
  if (error) return { error: "Não foi possível salvar o resultado." };
  const row = (Array.isArray(data) ? data[0] : data) as { duel_status: string; c_ms: number | null; o_ms: number | null; winner_id: string | null } | undefined;
  await c.admin.rpc("memory_record_submit", { p_user: c.userId, p_pairs: d.pairs, p_ms: ms, p_moves: moves });
  const oppMs = row ? (mine ? row.o_ms : row.c_ms) : null;
  const other = mine ? d.opponent_id : d.challenger_id;
  if (row?.duel_status === "finished") {
    const body = row.winner_id === other ? `Você venceu o desafio de memória contra ${c.name}!` : row.winner_id === null ? `Empate no desafio de memória com ${c.name}.` : `${c.name} foi mais rápido no desafio de memória.`;
    await notify(other, "🃏 Memória: resultado!", body, `/app/jogos/memoria/${id}`);
  } else {
    await notify(other, "🃏 Sua vez na memória!", `${c.name} terminou em ${(ms / 1000).toFixed(1)}s. Consegue ser mais rápido?`, `/app/jogos/memoria/${id}`);
  }
  revalidatePath("/app/jogos/memoria");
  revalidatePath("/app/jogos");
  return { ms, moves, status: row?.duel_status, winnerId: row?.winner_id ?? null, oppMs };
}

export type SoloStart = { error?: string; runId?: string; seed?: number };

/** Começa uma partida solo valendo recorde: a semente e o relógio são do servidor. */
export async function startMemorySolo(pairs: number): Promise<SoloStart> {
  if (!SOLO_SIZES.some((s) => s.pairs === pairs)) return { error: "Nível inválido." };
  const c = await player();
  const seed = randomInt(1, 2 ** 31 - 1);
  const { data, error } = await c.admin.from("memory_solo_runs").insert({ user_id: c.userId, seed, pairs }).select("id").single<{ id: string }>();
  if (error || !data) return { error: "Não foi possível começar." };
  return { runId: data.id, seed };
}

export type SoloFinish = { error?: string; ms?: number; moves?: number; record?: boolean; best?: number };

/** Termina a partida solo: confere as jogadas, usa o tempo do servidor e guarda o recorde se for o melhor. */
export async function finishMemorySolo(runId: string, turns: unknown): Promise<SoloFinish> {
  const c = await player();
  const { data: run } = await c.admin.from("memory_solo_runs").select("id, user_id, seed, pairs, started_at, finished").eq("id", runId).maybeSingle<{ id: string; user_id: string; seed: number; pairs: number; started_at: string; finished: boolean }>();
  if (!run || run.user_id !== c.userId) return { error: "Partida não encontrada." };
  if (run.finished) return { error: "Esta partida já foi enviada." };
  const moves = verifyTurns(buildBoard(run.seed, run.pairs), turns);
  if (moves === null) return { error: "Jogadas inválidas." };
  const ms = Math.max(minPlausibleMs(run.pairs), Date.now() - new Date(run.started_at).getTime());
  await c.admin.from("memory_solo_runs").update({ finished: true }).eq("id", runId);
  const { data } = await c.admin.rpc("memory_record_submit", { p_user: c.userId, p_pairs: run.pairs, p_ms: ms, p_moves: moves });
  const row = (Array.isArray(data) ? data[0] : data) as { is_record: boolean; best_ms: number } | undefined;
  revalidatePath("/app/jogos/memoria");
  return { ms, moves, record: row?.is_record ?? false, best: row?.best_ms ?? ms };
}
