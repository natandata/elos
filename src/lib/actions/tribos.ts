"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { logGameActivity } from "@/lib/games/activity";
import { gameOpenFor } from "@/lib/games/releaseServer";
import { BUILDINGS, gemsForResource, isBuild, isObstacle, isTribe } from "@/lib/tribos/data";
import { createVillage, loadState, type Admin } from "@/lib/tribos/server";
import { canPlace, capacity, inProgress, produced, quoteBuild, quoteRemove, quoteUpgrade, speedUpGems, type Quote, type TState } from "@/lib/tribos/state";

export type TribosResult = { error?: string; state?: TState; note?: string };

async function ctx(): Promise<{ admin: Admin; userId: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Entre de novo para continuar." };
  if (!(await gameOpenFor("tribos", user.id))) return { error: "Jogo indisponível." };
  const admin = createAdminClient();
  if (!admin) return { error: "Jogo indisponível no momento." };
  return { admin, userId: user.id };
}

const fail = (error: string): TribosResult => ({ error });

/** Debita o preço (e as gemas que cobrem o que falta, se o jogador aceitou). Devolve a mensagem de erro, se houver. */
async function charge(admin: Admin, userId: string, s: TState, q: Quote, useGems: boolean): Promise<string | null> {
  let gold = 0;
  let mana = 0;
  let gems = 0;
  if (q.pay === "gems") gems = q.cost;
  else {
    const have = q.pay === "gold" ? s.player.gold : s.player.mana;
    const pay = Math.min(have, q.cost);
    if (q.missing > 0) {
      if (!useGems) return "Faltam recursos. Use gemas para completar.";
      gems = q.gemsForMissing;
    }
    if (q.pay === "gold") gold = pay;
    else mana = pay;
  }
  const { data: ok, error } = await admin.rpc("tribos_spend", { p_user: userId, p_gold: gold, p_mana: mana, p_gems: gems });
  if (error) return "Não consegui cobrar agora. Tente de novo.";
  return ok ? null : q.pay === "gems" ? "Gemas insuficientes." : "Saldo insuficiente.";
}

export async function chooseTribe(tribe: string): Promise<TribosResult> {
  const c = await ctx();
  if ("error" in c) return fail(c.error);
  if (!isTribe(tribe)) return fail("Tribo inválida.");
  if (await loadState(c.admin, c.userId)) return fail("Você já escolheu sua tribo.");
  if (!(await createVillage(c.admin, c.userId, tribe))) return fail("Não consegui criar a vila agora.");
  await logGameActivity(c.userId, "tribos", "play", `Clash of Tribos: entrou na tribo ${tribe}`, 0);
  const state = await loadState(c.admin, c.userId);
  return state ? { state } : fail("Vila não encontrada.");
}

export async function getTribos(): Promise<TribosResult> {
  const c = await ctx();
  if ("error" in c) return fail(c.error);
  const state = await loadState(c.admin, c.userId);
  return state ? { state } : { error: "no-village" };
}

export async function buildNew(kind: string, x: number, y: number, useGems = false): Promise<TribosResult> {
  const c = await ctx();
  if ("error" in c) return fail(c.error);
  const s = await loadState(c.admin, c.userId);
  if (!s) return fail("Escolha sua tribo primeiro.");
  const now = Date.now();
  const q = quoteBuild(s, String(kind), now);
  if (!q.ok || !isBuild(kind)) return fail(q.error ?? "Construção inválida.");
  x = Math.floor(Number(x));
  y = Math.floor(Number(y));
  if (!Number.isFinite(x) || !Number.isFinite(y) || !canPlace(s.buildings, kind, x, y)) return fail("Não cabe neste lugar.");
  const err = await charge(c.admin, c.userId, s, q, useGems);
  if (err) return fail(err);
  const instant = q.secs <= 0;
  const { error } = await c.admin.from("tribos_building").insert({
    user_id: c.userId, kind, x, y,
    level: instant ? 1 : 0,
    up_to: instant ? null : 1,
    up_started: instant ? null : new Date(now).toISOString(),
    up_ends: instant ? null : new Date(now + q.secs * 1000).toISOString(),
    collected_at: new Date(now + q.secs * 1000).toISOString(),
  });
  if (error) {
    // devolve o que cobrou
    await c.admin.rpc("tribos_add", { p_user: c.userId, p_gold: q.pay === "gold" ? q.cost : 0, p_mana: q.pay === "mana" ? q.cost : 0, p_gems: q.pay === "gems" ? q.cost : q.missing > 0 ? q.gemsForMissing : 0, p_xp: 0 });
    return fail("Não consegui construir agora.");
  }
  await logGameActivity(c.userId, "tribos", "play", `Clash of Tribos: construiu ${BUILDINGS[kind].name}`, 10);
  const state = await loadState(c.admin, c.userId);
  return state ? { state } : fail("Vila não encontrada.");
}

export async function upgradeBuilding(id: string, useGems = false): Promise<TribosResult> {
  const c = await ctx();
  if ("error" in c) return fail(c.error);
  const s = await loadState(c.admin, c.userId);
  if (!s) return fail("Escolha sua tribo primeiro.");
  const now = Date.now();
  const b = s.buildings.find((x) => x.id === id);
  if (!b) return fail("Construção não encontrada.");
  const q = quoteUpgrade(s, b, now);
  if (!q.ok) return fail(q.error ?? "Não dá para melhorar agora.");
  const err = await charge(c.admin, c.userId, s, q, useGems);
  if (err) return fail(err);
  // coletores guardam o que já produziram e param durante a obra
  const stored = produced(b, now);
  await c.admin
    .from("tribos_building")
    .update({ up_to: q.to, up_started: new Date(now).toISOString(), up_ends: new Date(now + q.secs * 1000).toISOString(), stored, collected_at: new Date(now).toISOString() })
    .eq("id", b.id)
    .eq("user_id", c.userId);
  if (isBuild(b.kind)) await logGameActivity(c.userId, "tribos", "play", `Clash of Tribos: melhorou ${BUILDINGS[b.kind].name} para o nível ${q.to}`, 10);
  const state = await loadState(c.admin, c.userId);
  return state ? { state } : fail("Vila não encontrada.");
}

export async function removeObstacle(id: string, useGems = false): Promise<TribosResult> {
  const c = await ctx();
  if ("error" in c) return fail(c.error);
  const s = await loadState(c.admin, c.userId);
  if (!s) return fail("Escolha sua tribo primeiro.");
  const now = Date.now();
  const b = s.buildings.find((x) => x.id === id);
  if (!b || !isObstacle(b.kind)) return fail("Obstáculo não encontrado.");
  const q = quoteRemove(s, b, now);
  if (!q.ok) return fail(q.error ?? "Não dá para remover agora.");
  const err = await charge(c.admin, c.userId, s, q, useGems);
  if (err) return fail(err);
  await c.admin
    .from("tribos_building")
    .update({ up_to: 0, up_started: new Date(now).toISOString(), up_ends: new Date(now + q.secs * 1000).toISOString() })
    .eq("id", b.id)
    .eq("user_id", c.userId);
  const state = await loadState(c.admin, c.userId);
  return state ? { state } : fail("Vila não encontrada.");
}

/** Termina agora uma obra gastando gemas. */
export async function speedUp(id: string): Promise<TribosResult> {
  const c = await ctx();
  if ("error" in c) return fail(c.error);
  const s = await loadState(c.admin, c.userId);
  if (!s) return fail("Escolha sua tribo primeiro.");
  const now = Date.now();
  const b = s.buildings.find((x) => x.id === id);
  if (!b || !inProgress(b, now)) return fail("Não há obra para acelerar.");
  const gems = speedUpGems(b, now);
  const { data: ok } = await c.admin.rpc("tribos_spend", { p_user: c.userId, p_gold: 0, p_mana: 0, p_gems: gems });
  if (!ok) return fail("Gemas insuficientes.");
  // fecha a obra agora, mas mantém a duração original (o XP da obra depende dela)
  const newEnds = now - 1000;
  const newStarted = (b.upStarted ?? now) - ((b.upEnds ?? now) - newEnds);
  await c.admin.from("tribos_building").update({ up_ends: new Date(newEnds).toISOString(), up_started: new Date(newStarted).toISOString() }).eq("id", b.id).eq("user_id", c.userId);
  const state = await loadState(c.admin, c.userId);
  return state ? { state } : fail("Vila não encontrada.");
}

export async function moveBuilding(id: string, x: number, y: number): Promise<TribosResult> {
  const c = await ctx();
  if ("error" in c) return fail(c.error);
  const s = await loadState(c.admin, c.userId);
  if (!s) return fail("Escolha sua tribo primeiro.");
  const b = s.buildings.find((v) => v.id === id);
  if (!b || isObstacle(b.kind)) return fail("Construção não encontrada.");
  x = Math.floor(Number(x));
  y = Math.floor(Number(y));
  if (!Number.isFinite(x) || !Number.isFinite(y) || !canPlace(s.buildings, b.kind, x, y, b.id)) return fail("Não cabe neste lugar.");
  await c.admin.from("tribos_building").update({ x, y }).eq("id", b.id).eq("user_id", c.userId);
  const state = await loadState(c.admin, c.userId);
  return state ? { state } : fail("Vila não encontrada.");
}

/** Coleta um coletor (ou todos, com id = "all"). O que não couber nos cofres fica guardado no coletor. */
export async function collect(id: string): Promise<TribosResult> {
  const c = await ctx();
  if ("error" in c) return fail(c.error);
  const s = await loadState(c.admin, c.userId);
  if (!s) return fail("Escolha sua tribo primeiro.");
  const now = Date.now();
  const list = s.buildings.filter((b) => isBuild(b.kind) && BUILDINGS[b.kind].makes && (id === "all" || b.id === id));
  if (!list.length) return fail("Nada para coletar.");
  const caps = { gold: capacity(s.buildings, "gold"), mana: capacity(s.buildings, "mana") };
  let got = 0;
  let full = false;
  for (const b of list) {
    if (!isBuild(b.kind)) continue;
    const res = BUILDINGS[b.kind].makes;
    if (!res) continue;
    const amount = Math.floor(produced(b, now));
    if (amount < 1) continue;
    const { data: took } = await c.admin.rpc("tribos_collect", { p_user: c.userId, p_res: res, p_amount: amount, p_cap: caps[res] });
    const added = Number(took ?? 0);
    got += added;
    if (added < amount) full = true;
    if (added > 0) {
      const left = produced(b, now) - added;
      await c.admin.from("tribos_building").update({ stored: Math.max(0, left), collected_at: new Date(now).toISOString() }).eq("id", b.id).eq("user_id", c.userId);
    }
  }
  const state = await loadState(c.admin, c.userId);
  if (!state) return fail("Vila não encontrada.");
  return { state, note: full ? "Os cofres encheram. Melhore os cofres ou gaste recursos." : got ? undefined : "Nada para coletar." };
}

/** Compra uma bolsa de ouro ou maná com gemas: enche uma parte do cofre (25%, 50% ou o que couber). */
export async function buyBag(res: string, pct: number): Promise<TribosResult> {
  const c = await ctx();
  if ("error" in c) return fail(c.error);
  if (res !== "gold" && res !== "mana") return fail("Esta bolsa chega em breve.");
  if (![25, 50, 100].includes(pct)) return fail("Tamanho inválido.");
  const s = await loadState(c.admin, c.userId);
  if (!s) return fail("Escolha sua tribo primeiro.");
  const cap = capacity(s.buildings, res);
  const have = res === "gold" ? s.player.gold : s.player.mana;
  const amount = Math.min(Math.floor((cap * pct) / 100), Math.max(0, cap - have));
  if (amount <= 0) return fail("O cofre já está cheio.");
  const gems = gemsForResource(amount);
  const { data: ok } = await c.admin.rpc("tribos_spend", { p_user: c.userId, p_gold: 0, p_mana: 0, p_gems: gems });
  if (!ok) return fail("Gemas insuficientes.");
  const { data: took } = await c.admin.rpc("tribos_collect", { p_user: c.userId, p_res: res, p_amount: amount, p_cap: cap });
  const added = Number(took ?? 0);
  if (added < amount) {
    // alguém encheu o cofre no meio do caminho: devolve as gemas do que não coube
    await c.admin.rpc("tribos_add", { p_user: c.userId, p_gold: 0, p_mana: 0, p_gems: gems - gemsForResource(added), p_xp: 0 });
  }
  await logGameActivity(c.userId, "tribos", "play", `Clash of Tribos: comprou bolsa de ${res === "gold" ? "ouro" : "maná"} (+${added})`, 10);
  const state = await loadState(c.admin, c.userId);
  return state ? { state, note: `+${added.toLocaleString("pt-BR")} ${res === "gold" ? "de ouro" : "de maná"}` } : fail("Vila não encontrada.");
}
