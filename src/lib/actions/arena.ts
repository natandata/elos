"use server";

import { randomInt } from "node:crypto";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { STARTER_DECK } from "@/lib/arena/cards";
import { settleArena, type ArenaFinish } from "@/lib/arena/settle";

const MAX_MATCHES_PER_DAY = 15;

const todayBR = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

async function currentPlayer() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle<{ id: string; role: string }>();
  if (!profile) redirect("/");
  if (profile.role !== "cria" && profile.role !== "leader") throw new Error("A Arena é só para crias e líderes.");
  return { supabase, userId: profile.id };
}

/** Abre uma partida: o servidor sorteia a semente (o computador e o baralho dependem dela). */
export async function startArena(): Promise<{ error?: string; matchId?: string; seed?: number }> {
  const { supabase, userId } = await currentPlayer();
  const date = todayBR();

  const { count } = await supabase
    .from("arena_matches")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("play_date", date);
  if ((count ?? 0) >= MAX_MATCHES_PER_DAY) {
    return { error: `Você já jogou ${MAX_MATCHES_PER_DAY} partidas hoje. Volte amanhã!` };
  }

  const seed = randomInt(1, 2 ** 31 - 1);
  const { data, error } = await supabase
    .from("arena_matches")
    .insert({ user_id: userId, seed, deck: STARTER_DECK, play_date: date })
    .select("id")
    .single<{ id: string }>();
  if (error || !data) return { error: "Não foi possível começar a partida. Tente de novo." };
  return { matchId: data.id, seed };
}

export type { ArenaFinish };

/** Fecha a partida: refaz tudo no servidor com as jogadas enviadas e só então paga XP. */
export async function finishArena(input: {
  matchId: string;
  inputs: unknown;
  surrender?: boolean;
}): Promise<ArenaFinish> {
  const { userId } = await currentPlayer();
  const admin = createAdminClient();
  if (!admin) return { error: "Não foi possível confirmar o resultado agora." };
  return settleArena(admin, userId, input);
}
