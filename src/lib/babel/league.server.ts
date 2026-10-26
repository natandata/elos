import type { SupabaseClient } from "@supabase/supabase-js";
import { GROUP_SIZE, rankStandings, reserveBots, settleOutcome, weekMonday, weekSunday, type Standing } from "./league";

// Leitura e fechamento da liga (servidor, com a chave de serviço): quem vê só enxerga nome e XP da semana do próprio grupo.

const todayBR = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

export type LeagueView = {
  tier: number;
  monday: string;
  standings: Standing[];
  myRank: number;
  /** semana anterior já fechada (para mostrar "você subiu/desceu") */
  last: { rank: number; result: string; fromTier: number } | null;
};

type Prof = { id: string; first_name: string | null; full_name: string | null; avatar_url: string | null };
const shortName = (p: Prof | undefined) => (p?.first_name || p?.full_name?.split(" ")[0] || "Cria").slice(0, 14);

async function weekXp(admin: SupabaseClient, ids: string[], monday: string): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!ids.length) return out;
  const { data } = await admin.from("babel_daily").select("user_id, xp").in("user_id", ids).gte("day", monday).lte("day", weekSunday(monday));
  for (const r of (data ?? []) as { user_id: string; xp: number }[]) out.set(r.user_id, (out.get(r.user_id) ?? 0) + r.xp);
  return out;
}

async function groupStandings(admin: SupabaseClient, groupId: string, tier: number, monday: string, meId: string, final: boolean): Promise<Standing[]> {
  const { data: mem } = await admin.from("babel_league_members").select("user_id").eq("group_id", groupId);
  const ids = ((mem ?? []) as { user_id: string }[]).map((m) => m.user_id);
  const [xp, profRes] = await Promise.all([weekXp(admin, ids, monday), ids.length ? admin.from("profiles").select("id, first_name, full_name, avatar_url").in("id", ids) : Promise.resolve({ data: [] })]);
  const profs = new Map(((profRes.data ?? []) as Prof[]).map((p) => [p.id, p]));
  const real: Standing[] = ids.map((id) => ({ id, name: shortName(profs.get(id)), avatar: profs.get(id)?.avatar_url ?? null, xp: xp.get(id) ?? 0, bot: false, me: id === meId }));
  return rankStandings([...real, ...reserveBots(groupId, tier, GROUP_SIZE - real.length, monday, Date.now(), final)]);
}

/** Fecha a semana anterior da pessoa (se ainda aberta), coloca na liga da semana e devolve a classificação. */
export async function loadLeague(admin: SupabaseClient, userId: string): Promise<LeagueView> {
  const today = todayBR();
  const monday = weekMonday(today);

  const { data: rows } = await admin.from("babel_league_members").select("group_id, week, tier, rank, result, settled").eq("user_id", userId).order("week", { ascending: false }).limit(3);
  const mine = (rows ?? []) as { group_id: string; week: string; tier: number; rank: number | null; result: string | null; settled: boolean }[];
  const prev = mine.find((m) => m.week < monday);
  let tier: number;

  if (prev && !prev.settled) {
    const st = await groupStandings(admin, prev.group_id, prev.tier, prev.week, userId, true);
    const rank = st.findIndex((s) => s.me) + 1 || GROUP_SIZE;
    const me = st[rank - 1];
    const o = settleOutcome(rank, me?.xp ?? 0, prev.tier);
    await admin.rpc("babel_league_settle", { p_user: userId, p_week: prev.week, p_rank: rank, p_new_tier: o.newTier, p_result: o.result, p_gems: o.gems });
    prev.settled = true;
    prev.rank = rank;
    prev.result = o.result;
    tier = o.newTier;
  } else if (mine.find((m) => m.week === monday)) {
    tier = mine.find((m) => m.week === monday)!.tier;
  } else {
    const { data: bp } = await admin.from("babel_profile").select("league").eq("user_id", userId).maybeSingle();
    tier = (bp as { league: number } | null)?.league ?? 1;
  }

  const { data: gid } = await admin.rpc("babel_league_join", { p_user: userId, p_week: monday, p_tier: tier });
  const groupId = gid as string;
  const standings = await groupStandings(admin, groupId, tier, monday, userId, false);
  const prior = mine.find((m) => m.week < monday && m.settled && m.result);
  return {
    tier,
    monday,
    standings,
    myRank: standings.findIndex((s) => s.me) + 1,
    last: prior ? { rank: prior.rank ?? 0, result: prior.result ?? "stayed", fromTier: prior.tier } : null,
  };
}
