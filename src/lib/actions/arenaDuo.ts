"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { STARTER_DECK, isValidDeck } from "@/lib/arena/cards";
import { arenaIndexFor, deckAllowed } from "@/lib/arena/arenas";
import type { DuoReport } from "@/lib/arena/pvp";
import { settleArenaDuo, viewOfDuo, type DuoRow, type DuoView } from "@/lib/arena/settleDuo";
import { sendPushToUsers } from "@/lib/push-server";
import { gateMessage } from "@/lib/arena/gate";
import { loadGate } from "@/lib/arena/gateServer";

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

async function myLoadout(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: stats } = await supabase.from("arena_stats").select("trophies, best").eq("user_id", userId).maybeSingle<{ trophies: number; best: number }>();
  const { data: saved } = await supabase.from("arena_decks").select("deck").eq("user_id", userId).maybeSingle<{ deck: string[] }>();
  const deck = isValidDeck(saved?.deck) && deckAllowed(saved.deck, stats?.best ?? 0) ? saved.deck : STARTER_DECK;
  return { deck, arena: arenaIndexFor(stats?.trophies ?? 0) };
}

async function notify(userIds: string[], title: string, body: string, link: string) {
  try {
    const admin = createAdminClient();
    if (!admin) return;
    for (const userId of userIds) await admin.from("notifications").insert({ user_id: userId, title, body, link, category: "jogos" });
    await sendPushToUsers(userIds, { title, body, url: link });
  } catch {
    // aviso é secundário
  }
}

const ERRORS: Record<string, string> = {
  not_same_elo: "Os quatro jogadores precisam ser do mesmo Elo.",
  not_allowed: "Escolha um parceiro e dois adversários diferentes.",
  limit: "Você já fez muitos desafios hoje. Volte amanhã!",
  already_open: "Algum desses jogadores já está num desafio de duplas aberto.",
  not_found: "Esse desafio não está mais disponível.",
};
const friendly = (msg: string | undefined) => {
  for (const k of Object.keys(ERRORS)) if (msg?.includes(k)) return ERRORS[k];
  return "Não foi possível concluir. Tente de novo.";
};

/** Convida 1 parceiro e 2 adversários (todos do seu Elo). */
export async function challengeArenaDuo(partnerId: string, opp1Id: string, opp2Id: string): Promise<{ error?: string; id?: string }> {
  const { supabase, userId, name } = await player();
  const gate = await loadGate(supabase, userId);
  if (gate.locked) return { error: gateMessage(gate) };
  const { deck, arena } = await myLoadout(supabase, userId);
  const { data, error } = await supabase.rpc("arena_duo_create", { p_partner: partnerId, p_opp1: opp1Id, p_opp2: opp2Id, p_deck: deck, p_arena: arena });
  if (error || typeof data !== "string") return { error: friendly(error?.message) };
  await notify([partnerId], "👥 Convite de dupla!", `${name} quer você de parceiro numa partida 2x2 na Arena dos Heróis.`, `/app/jogos/arena/duplas/${data}`);
  await notify([opp1Id, opp2Id], "⚔️ Desafio de duplas!", `${name} desafiou você pra uma partida 2x2 na Arena dos Heróis.`, `/app/jogos/arena/duplas/${data}`);
  return { id: data };
}

export async function respondArenaDuo(id: string, accept: boolean): Promise<{ error?: string; deck?: string[]; allReady?: boolean }> {
  const { supabase, userId, name } = await player();
  if (!accept) {
    const { error } = await supabase.rpc("arena_duo_decline", { p_id: id });
    return error ? { error: friendly(error.message) } : {};
  }
  const gate = await loadGate(supabase, userId);
  if (gate.locked) return { error: gateMessage(gate) };
  const { deck } = await myLoadout(supabase, userId);
  const { error } = await supabase.rpc("arena_duo_accept", { p_id: id, p_deck: deck });
  if (error) return { error: friendly(error.message) };
  const { data: row } = await supabase.from("arena_duo").select("players, status").eq("id", id).maybeSingle<{ players: string[]; status: string }>();
  if (row) {
    const others = row.players.filter((p) => p !== userId);
    if (row.status === "accepted") {
      await notify(others, "✅ Todo mundo aceitou!", "A partida de duplas está pronta. Entre na sala!", `/app/jogos/arena/duplas/${id}`);
    } else {
      await notify([row.players[0]], "✅ Convite aceito", `${name} aceitou o desafio de duplas.`, `/app/jogos/arena/duplas/${id}`);
    }
  }
  return { deck, allReady: row?.status === "accepted" };
}

/** Estado atual da sala (e tenta fechar a partida se já der). */
export async function checkArenaDuo(id: string): Promise<{ view?: DuoView; status?: string; decks?: (string[] | null)[]; accepted?: boolean[]; error?: string }> {
  const { supabase, userId } = await player();
  const { data: row } = await supabase.from("arena_duo").select("*").eq("id", id).maybeSingle<DuoRow>();
  if (!row) return { error: "Partida não encontrada." };
  let cur: DuoRow | null = row;
  if (row.status === "accepted" && row.first_report_at) {
    const admin = createAdminClient();
    if (admin) cur = (await settleArenaDuo(admin, id)) ?? row;
  }
  const view = viewOfDuo(cur, userId);
  if (view.state === "finished") {
    const { data: st } = await supabase.from("arena_stats").select("trophies").eq("user_id", userId).maybeSingle<{ trophies: number }>();
    view.trophies = st?.trophies ?? 0;
  }
  return { view, status: cur.status, decks: cur.decks, accepted: cur.decks.map((d) => Array.isArray(d)) };
}

/** Entrega o relatório do jogador e tenta fechar a partida. */
export async function reportArenaDuo(id: string, report: DuoReport): Promise<{ view?: DuoView; error?: string }> {
  const { supabase } = await player();
  const { error } = await supabase.rpc("arena_duo_report", { p_id: id, p_report: report });
  if (error && !error.message.includes("not_found")) return { error: friendly(error.message) };
  const r = await checkArenaDuo(id);
  return r.error ? { error: r.error } : { view: r.view };
}
