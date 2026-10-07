"use server";

import { revalidatePath } from "next/cache";
import { isGameKey } from "@/lib/games/catalog";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type StoreInput = {
  id?: string;
  title: string;
  emoji: string;
  blurb: string;
  cover: string;
  href: string;
  /** jogo do catálogo liberado pela compra ("" = nenhum) */
  gameKey: string;
  status: "scheduled" | "dev";
  /** "AAAA-MM-DDTHH:mm" no horário de Brasília */
  releaseLocal: string;
  /** preço em denários ("" = sem preço) */
  price: string;
  active: boolean;
  sort: number;
};

async function adminOnly() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle<{ role: string }>();
  if (me?.role !== "admin") return null;
  return createAdminClient();
}

const safePath = (v: string): string | null => {
  const t = v.trim();
  if (!t) return null;
  // só caminhos do próprio app ou imagens https
  return t.startsWith("/") || t.startsWith("https://") ? t : null;
};

/** Admin: cria ou atualiza um item da Loja. */
export async function saveStoreItem(input: StoreInput): Promise<{ error?: string }> {
  const db = await adminOnly();
  if (!db) return { error: "Sem permissão." };
  const title = input.title.trim().slice(0, 80);
  if (!title) return { error: "Dê um nome ao jogo." };
  if (input.status !== "scheduled" && input.status !== "dev") return { error: "Situação inválida." };
  let release_at: string | null = null;
  if (input.status === "scheduled") {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input.releaseLocal)) return { error: "Informe a data e a hora de lançamento." };
    const d = new Date(`${input.releaseLocal}:00-03:00`);
    if (Number.isNaN(d.getTime())) return { error: "Data inválida." };
    release_at = d.toISOString();
  }
  const cover = safePath(input.cover);
  const href = safePath(input.href);
  if (input.cover.trim() && !cover) return { error: "A capa precisa começar com / ou https://." };
  if (input.href.trim() && !href) return { error: "O link do jogo precisa começar com /." };
  const priceTxt = String(input.price ?? "").trim();
  let price_coins: number | null = null;
  if (priceTxt) {
    const n = Number(priceTxt);
    if (!Number.isInteger(n) || n < 0 || n > 1_000_000) return { error: "O preço precisa ser um número inteiro de denários." };
    price_coins = n;
  }
  const row = {
    title,
    emoji: input.emoji.trim().slice(0, 8) || "🎮",
    blurb: input.blurb.trim().slice(0, 200),
    cover,
    href: href && href.startsWith("/") ? href : null,
    game_key: isGameKey(input.gameKey) ? input.gameKey : null,
    status: input.status,
    release_at,
    price_coins,
    active: input.active,
    sort: Math.round(Number.isFinite(input.sort) ? input.sort : 0),
    updated_at: new Date().toISOString(),
  };
  const { error } = input.id ? await db.from("store_items").update(row).eq("id", input.id) : await db.from("store_items").insert(row);
  if (error) return { error: "Não foi possível salvar." };
  revalidatePath("/app/jogos");
  revalidatePath("/app/admin/loja");
  return {};
}

/** Admin: remove um item da Loja. */
export async function deleteStoreItem(id: string): Promise<{ error?: string }> {
  const db = await adminOnly();
  if (!db) return { error: "Sem permissão." };
  const { error } = await db.from("store_items").delete().eq("id", id);
  if (error) return { error: "Não foi possível apagar." };
  revalidatePath("/app/jogos");
  revalidatePath("/app/admin/loja");
  return {};
}

/** Admin: dá (ou tira, com valor negativo) denários de um jogador. */
export async function grantCoins(userId: string, amount: number, reason: string): Promise<{ error?: string; balance?: number }> {
  const db = await adminOnly();
  if (!db) return { error: "Sem permissão." };
  if (!Number.isInteger(amount) || amount === 0 || Math.abs(amount) > 1_000_000) return { error: "Informe uma quantidade inteira de denários." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await db.rpc("coin_adjust", { p_user: userId, p_delta: amount, p_reason: reason.trim().slice(0, 120) || "Ajuste do admin", p_by: user?.id ?? null });
  if (error) return { error: amount < 0 ? "O jogador não tem denários suficientes." : "Não foi possível dar os denários." };
  revalidatePath("/app/jogos");
  return { balance: Number(data) };
}

/** Jogador: compra um jogo da Loja com denários (a função do banco confere saldo e já ter comprado). */
export async function buyStoreItem(itemId: string): Promise<{ error?: string; balance?: number }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("store_buy", { p_item: itemId });
  if (error || !data) return { error: "Não foi possível comprar agora." };
  const r = data as { error?: string; balance?: number };
  if (r.error) return { error: r.error };
  revalidatePath("/app/jogos", "layout");
  return { balance: r.balance };
}

/** Jogador: troca XP por denários (a função do banco confere a data de abertura, o XP disponível e o limite). */
export async function exchangeXp(coins: number): Promise<{ error?: string; balance?: number }> {
  if (!Number.isInteger(coins) || coins < 1) return { error: "Escolha quantos denários quer." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("xp_exchange", { p_coins: coins });
  if (error || !data) return { error: "Não foi possível trocar agora." };
  const r = data as { error?: string; balance?: number };
  if (r.error) return { error: r.error };
  revalidatePath("/app/jogos", "layout");
  return { balance: r.balance };
}

/** Admin: define quantos XP valem 1 denário. */
export async function setXpRate(rate: number): Promise<{ error?: string }> {
  const db = await adminOnly();
  if (!db) return { error: "Sem permissão." };
  if (!Number.isInteger(rate) || rate < 1 || rate > 100000) return { error: "Informe um número inteiro de XP (1 ou mais)." };
  const { error } = await db.from("coin_settings").upsert({ id: 1, xp_per_coin: rate, updated_at: new Date().toISOString() }, { onConflict: "id" });
  if (error) return { error: "Não foi possível salvar." };
  revalidatePath("/app/jogos", "layout");
  revalidatePath("/app/admin/loja");
  return {};
}
