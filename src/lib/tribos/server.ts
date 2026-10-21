import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { OBSTACLES, OBSTACLE_GEM_CHANCE, START, isObstacle, xpForSecs, type TribeKey } from "./data";
import { START_LAYOUT, startObstacles, type TBuilding, type TPlayer, type TState } from "./state";

export type Admin = NonNullable<ReturnType<typeof createAdminClient>>;

type BRow = { id: string; kind: string; level: number; x: number; y: number; up_to: number | null; up_started: string | null; up_ends: string | null; stored: number; collected_at: string };
type PRow = { tribe: TribeKey; gold: number; mana: number; gems: number; xp: number; trophies: number; rev: number };

const ms = (iso: string | null): number | null => (iso ? new Date(iso).getTime() : null);

export const toBuilding = (r: BRow): TBuilding => ({
  id: r.id, kind: r.kind as TBuilding["kind"], level: r.level, x: r.x, y: r.y, upTo: r.up_to, upEnds: ms(r.up_ends), upStarted: ms(r.up_started), stored: r.stored, collectedAt: ms(r.collected_at) ?? Date.now(),
});

/** Fecha as obras que já terminaram (constrói, melhora, remove obstáculo) e paga XP e gemas. Seguro com chamadas simultâneas. */
export async function settle(admin: Admin, userId: string): Promise<void> {
  const nowIso = new Date().toISOString();
  const { data } = await admin.from("tribos_building").select("*").eq("user_id", userId).not("up_ends", "is", null).lte("up_ends", nowIso);
  let xp = 0;
  let gems = 0;
  for (const r of (data ?? []) as BRow[]) {
    if (r.up_to === 0) {
      // obstáculo removido: só conta se este chamado apagou a linha
      const { data: del } = await admin.from("tribos_building").delete().eq("id", r.id).not("up_ends", "is", null).select("id");
      if (!del?.length) continue;
      const o = isObstacle(r.kind) ? OBSTACLES[r.kind] : null;
      xp += o?.xp ?? 1;
      if (Math.random() < OBSTACLE_GEM_CHANCE) gems += 1 + Math.floor(Math.random() * 6);
    } else {
      const { data: upd } = await admin
        .from("tribos_building")
        .update({ level: r.up_to ?? r.level, up_to: null, up_ends: null, up_started: null, collected_at: r.up_ends })
        .eq("id", r.id)
        .not("up_ends", "is", null)
        .select("id");
      if (!upd?.length) continue;
      const started = ms(r.up_started) ?? 0;
      const ends = ms(r.up_ends) ?? 0;
      xp += xpForSecs(Math.max(1, (ends - started) / 1000));
    }
  }
  if (xp || gems) await admin.rpc("tribos_add", { p_user: userId, p_gold: 0, p_mana: 0, p_gems: gems, p_xp: xp });
}

/** Estado completo da vila (já com as obras terminadas fechadas). null se a pessoa ainda não escolheu a tribo. */
export async function loadState(admin: Admin, userId: string): Promise<TState | null> {
  const { data: p } = await admin.from("tribos_player").select("tribe, gold, mana, gems, xp, trophies, rev").eq("user_id", userId).maybeSingle<PRow>();
  if (!p) return null;
  await settle(admin, userId);
  const [{ data: p2 }, { data: bs }] = await Promise.all([
    admin.from("tribos_player").select("tribe, gold, mana, gems, xp, trophies, rev").eq("user_id", userId).single<PRow>(),
    admin.from("tribos_building").select("*").eq("user_id", userId),
  ]);
  const pl = p2 ?? p;
  const player: TPlayer = { tribe: pl.tribe, gold: Number(pl.gold), mana: Number(pl.mana), gems: pl.gems, xp: pl.xp, trophies: pl.trophies, rev: pl.rev };
  return { player, buildings: ((bs ?? []) as BRow[]).map(toBuilding), serverNow: Date.now() };
}

const seedOf = (id: string): number => {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
};

/** Cria o jogador, a vila inicial e os obstáculos. Falha se já existir. */
export async function createVillage(admin: Admin, userId: string, tribe: TribeKey): Promise<boolean> {
  const { error } = await admin.from("tribos_player").insert({ user_id: userId, tribe, gold: START.gold, mana: START.mana, gems: START.gems });
  if (error) return false;
  const now = new Date().toISOString();
  const rows = [
    ...START_LAYOUT.map((l) => ({ user_id: userId, kind: l.kind, level: 1, x: l.x, y: l.y, collected_at: now })),
    ...startObstacles(seedOf(userId)).map((o) => ({ user_id: userId, kind: o.kind, level: 1, x: o.x, y: o.y, collected_at: now })),
  ];
  await admin.from("tribos_building").insert(rows);
  return true;
}
