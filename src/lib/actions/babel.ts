"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { gameOpenFor } from "@/lib/games/releaseServer";
import { getEnglishState } from "@/lib/english/data.server";
import { CHEST_GEMS, CHEST_IDX, dailyQuests, questProgress, SHOP, type ShopItem } from "@/lib/babel/economy";

// Ações da economia do Babel (gemas, corações, loja, meta, missões). Tudo passa pelo servidor: o banco confere e paga.

async function ctx() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  if (!(await gameOpenFor("english", user.id))) return null;
  const admin = createAdminClient();
  if (!admin) return null;
  return { supabase, user, admin };
}

/** Um erro numa lição custa 1 coração. */
export async function loseHeart(): Promise<{ hearts?: number; nextAt?: string | null; error?: string }> {
  const c = await ctx();
  if (!c) return { error: "Indisponível." };
  const { data, error } = await c.admin.rpc("babel_lose_heart", { p_user: c.user.id });
  if (error || !data) return { error: "Não foi possível atualizar os corações." };
  const r = data as { hearts: number; next_at: string | null };
  return { hearts: r.hearts, nextAt: r.next_at };
}

export async function buyBabelItem(item: string): Promise<{ ok?: boolean; error?: string }> {
  const c = await ctx();
  if (!c) return { error: "Entre de novo." };
  if (!(item in SHOP)) return { error: "Item inválido." };
  const { data, error } = await c.admin.rpc("babel_buy", { p_user: c.user.id, p_item: item as ShopItem });
  if (error || !data) return { error: "Não foi possível comprar agora." };
  const r = data as { ok?: boolean; error?: string };
  revalidatePath("/app/jogos/ingles", "layout");
  return r.error ? { error: r.error } : { ok: true };
}

export async function setBabelGoal(goal: number): Promise<{ ok?: boolean; error?: string }> {
  const c = await ctx();
  if (!c) return { error: "Entre de novo." };
  const { error } = await c.admin.rpc("babel_set_goal", { p_user: c.user.id, p_goal: goal });
  if (error) return { error: "Meta inválida." };
  revalidatePath("/app/jogos/ingles", "layout");
  return { ok: true };
}

/** Resgata uma missão do dia (índice 0..2) ou o baú diário (índice 9, só depois das 3 missões). */
export async function claimQuest(idx: number): Promise<{ ok?: boolean; gems?: number; error?: string }> {
  const c = await ctx();
  if (!c) return { error: "Entre de novo." };
  const st = await getEnglishState(c.supabase, c.user.id);
  const quests = dailyQuests(c.user.id, st.babel.dayStr);
  const claimed = st.babel.today.claimed;
  let gems = 0;
  if (idx === CHEST_IDX) {
    if (![0, 1, 2].every((i) => claimed.includes(i))) return { error: "Resgate as 3 missões antes." };
    gems = CHEST_GEMS;
  } else {
    const q = quests[idx];
    if (!q) return { error: "Missão inválida." };
    if (questProgress(q, st.babel.today) < q.target) return { error: "Missão ainda não concluída." };
    gems = q.gems;
  }
  const { data, error } = await c.admin.rpc("babel_claim", { p_user: c.user.id, p_idx: idx, p_gems: gems });
  if (error || !data) return { error: "Não foi possível resgatar." };
  const r = data as { ok?: boolean; error?: string };
  revalidatePath("/app/jogos/ingles", "layout");
  return r.error ? { error: r.error } : { ok: true, gems };
}
