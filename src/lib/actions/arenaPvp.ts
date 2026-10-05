"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { STARTER_DECK, isValidDeck } from "@/lib/arena/cards";
import { arenaIndexFor, deckAllowed } from "@/lib/arena/arenas";
import { loadOwned } from "@/lib/arena/owned";
import type { PvpReport } from "@/lib/arena/pvp";
import { settleArenaPvp, viewOf, viewWithMedals, type PvpRow, type PvpView } from "@/lib/arena/settlePvp";
import { sendPushToUsers } from "@/lib/push-server";

async function player() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", user.id)
    .maybeSingle<{ id: string; full_name: string; role: string }>();
  if (!profile) redirect("/");
  if (profile.role !== "cria" && profile.role !== "leader") throw new Error("A Arena é só para crias e líderes.");
  return { supabase, userId: profile.id, name: profile.full_name || "Um colega" };
}

/** Baralho salvo (ou o inicial) + troféus atuais do jogador. */
async function myLoadout(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: stats } = await supabase.from("arena_stats").select("trophies, best").eq("user_id", userId).maybeSingle<{ trophies: number; best: number }>();
  const { data: saved } = await supabase.from("arena_decks").select("deck").eq("user_id", userId).maybeSingle<{ deck: string[] }>();
  const deck = isValidDeck(saved?.deck) && deckAllowed(saved.deck, stats?.best ?? 0, await loadOwned(supabase, userId)) ? saved.deck : STARTER_DECK;
  return { deck, arena: arenaIndexFor(stats?.trophies ?? 0) };
}

async function notify(userId: string, title: string, body: string, link: string) {
  try {
    const admin = createAdminClient();
    if (!admin) return;
    await admin.from("notifications").insert({ user_id: userId, title, body, link, category: "jogos" });
    await sendPushToUsers([userId], { title, body, url: link });
  } catch {
    // aviso é secundário
  }
}

const ERRORS: Record<string, string> = {
  not_same_elo: "Você só pode desafiar alguém do seu Elo.",
  not_allowed: "Só crias e líderes jogam.",
  limit: "Você já fez muitos desafios hoje. Volte amanhã!",
  already_open: "Já existe um desafio aberto com essa pessoa.",
  not_found: "Esse desafio não está mais disponível.",
};
const friendly = (msg: string | undefined) => {
  for (const k of Object.keys(ERRORS)) if (msg?.includes(k)) return ERRORS[k];
  return "Não foi possível concluir. Tente de novo.";
};

export async function challengeArenaPvp(opponentId: string): Promise<{ error?: string; id?: string }> {
  const { supabase, userId, name } = await player();
  const { deck, arena } = await myLoadout(supabase, userId);
  const { data, error } = await supabase.rpc("arena_pvp_create", { p_opponent: opponentId, p_deck: deck, p_arena: arena });
  if (error || typeof data !== "string") return { error: friendly(error?.message) };
  await notify(opponentId, "⚔️ Desafio na Arena!", `${name} te desafiou pra uma partida 1x1 na Arena dos Heróis.`, `/app/jogos/arena/pvp/${data}`);
  return { id: data };
}

export async function respondArenaPvp(id: string, accept: boolean): Promise<{ error?: string; deck?: string[] }> {
  const { supabase, userId, name } = await player();
  if (!accept) {
    const { error } = await supabase.rpc("arena_pvp_decline", { p_id: id });
    return error ? { error: friendly(error.message) } : {};
  }
  const { deck } = await myLoadout(supabase, userId);
  const { error } = await supabase.rpc("arena_pvp_accept", { p_id: id, p_deck: deck });
  if (error) return { error: friendly(error.message) };
  const { data: row } = await supabase.from("arena_pvp").select("challenger_id").eq("id", id).maybeSingle<{ challenger_id: string }>();
  if (row) await notify(row.challenger_id, "✅ Desafio aceito!", `${name} aceitou. Entre na sala pra jogar!`, `/app/jogos/arena/pvp/${id}`);
  return { deck };
}

/** Estado atual da sala (e tenta fechar a partida se já der). */
export async function checkArenaPvp(id: string): Promise<{ view?: PvpView; status?: string; opponentDeck?: string[] | null; error?: string }> {
  const { supabase, userId } = await player();
  const { data: row } = await supabase.from("arena_pvp").select("*").eq("id", id).maybeSingle<PvpRow>();
  if (!row) return { error: "Partida não encontrada." };
  let cur: PvpRow | null = row;
  if (row.status === "accepted" && row.first_report_at) {
    const admin = createAdminClient();
    if (admin) cur = (await settleArenaPvp(admin, id)) ?? row;
  }
  const adminDb = createAdminClient();
  const view = adminDb ? await viewWithMedals(adminDb, cur, userId) : viewOf(cur, userId);
  if (view.state === "finished") {
    const { data: st } = await supabase.from("arena_stats").select("trophies").eq("user_id", userId).maybeSingle<{ trophies: number }>();
    view.trophies = st?.trophies ?? 0;
  }
  return { view, status: cur.status, opponentDeck: cur.opponent_deck };
}

/** Entrega o relatório do jogador e tenta fechar a partida. */
export async function reportArenaPvp(id: string, report: PvpReport): Promise<{ view?: PvpView; error?: string }> {
  const { supabase } = await player();
  const { error } = await supabase.rpc("arena_pvp_report", { p_id: id, p_report: report });
  if (error && !error.message.includes("not_found")) return { error: friendly(error.message) };
  const r = await checkArenaPvp(id);
  return r.error ? { error: r.error } : { view: r.view };
}
