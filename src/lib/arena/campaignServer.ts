import type { SupabaseClient } from "@supabase/supabase-js";
import { gameOpenFor } from "@/lib/games/releaseServer";
import { CAMPAIGN_DECK, CAMPAIGN_MIN_SECONDS, CAMPAIGN_STAGES, CAMPAIGN_TIERS, CAMPAIGN_XP, CAMPAIGN_XP_FEMALE_BONUS, stageBoost, stageUnlocked } from "./campaign";
import { MATCH_TICKS, type Input } from "./core";
import { MAX_INPUTS, simulate } from "./sim";

/** `tiers[i]` = quantas batalhas (0–3) já foram vencidas na arena i; `cleared` = arenas com as 3 vencidas. */
export type CampaignState = { open: boolean; admin: boolean; cleared: number[]; tiers: number[] };

/** Quem pode batalhar na campanha: admin sempre; os outros só com a campanha liberada (acesso antecipado ou habilitada para todos). */
export async function campaignState(admin: SupabaseClient, userId: string): Promise<CampaignState> {
  const { data: prof } = await admin.from("profiles").select("role").eq("id", userId).maybeSingle<{ role: string }>();
  const isAdmin = prof?.role === "admin";
  const open = isAdmin || (await gameOpenFor("arenacampanha", userId));
  const { data } = await admin.from("arena_campaign_progress").select("stage, tiers").eq("user_id", userId);
  const tiers = CAMPAIGN_STAGES.map(() => 0);
  for (const r of (data ?? []) as { stage: number; tiers: number }[]) if (r.stage >= 0 && r.stage < tiers.length) tiers[r.stage] = Math.max(0, Math.min(CAMPAIGN_TIERS, r.tiers));
  return { open, admin: isAdmin, cleared: tiers.flatMap((t, i) => (t >= CAMPAIGN_TIERS ? [i] : [])), tiers };
}

export async function startCampaignMatch(admin: SupabaseClient, userId: string, stage: number, seed: number): Promise<{ error?: string; matchId?: string; tier?: number }> {
  if (!Number.isInteger(stage) || stage < 0 || stage >= CAMPAIGN_STAGES.length) return { error: "Arena inválida." };
  const st = await campaignState(admin, userId);
  if (!st.open) return { error: "A campanha ainda está bloqueada. Você pode ver as cartas e as arenas, mas só consegue batalhar quando for liberada." };
  if (!st.admin && !stageUnlocked(stage, st.cleared)) return { error: "Vença a arena anterior para liberar esta." };
  await admin.from("arena_campaign_matches").update({ status: "abandoned", finished_at: new Date().toISOString() }).eq("user_id", userId).eq("status", "open");
  // a batalha da vez (1ª normal, 2ª +15%, 3ª +25%); arena já vencida pode ser rejogada no nível mais difícil, sem mudar o progresso
  const tier = Math.min(CAMPAIGN_TIERS - 1, st.tiers[stage] ?? 0);
  const { data, error } = await admin.from("arena_campaign_matches").insert({ user_id: userId, stage, seed, tier }).select("id").single<{ id: string }>();
  if (error || !data) return { error: "Não foi possível começar a partida. Tente de novo." };
  return { matchId: data.id, tier };
}

function cleanInputs(raw: unknown): Input[] {
  if (!Array.isArray(raw)) return [];
  const out: Input[] = [];
  for (const r of raw.slice(0, MAX_INPUTS)) {
    const o = r as Partial<Input>;
    if (!o || !Number.isInteger(o.tick) || !Number.isInteger(o.slot)) continue;
    if (typeof o.x !== "number" || typeof o.y !== "number") continue;
    if ((o.tick as number) < 0 || (o.tick as number) > MATCH_TICKS) continue;
    out.push({ tick: o.tick as number, side: 0, slot: o.slot as number, x: o.x, y: o.y });
  }
  return out;
}

export type CampaignFinish = { error?: string; result?: "win" | "loss" | "draw"; crownsMe?: number; crownsBot?: number; xp?: number; stage?: number; tier?: number; /** arena acabou de ser vencida pela 3ª vez */ firstClear?: boolean; /** a vitória contou como mais uma das 3 */ advanced?: boolean; cleared?: number[]; tiers?: number[] };

/** Fecha a partida: refaz tudo no servidor; vitória libera a próxima arena e paga o XP uma vez por arena. */
export async function settleCampaign(admin: SupabaseClient, userId: string, input: { matchId: string; inputs: unknown; surrender?: boolean }): Promise<CampaignFinish> {
  const { data: match } = await admin
    .from("arena_campaign_matches")
    .select("id, user_id, stage, seed, status, started_at, tier")
    .eq("id", input.matchId)
    .maybeSingle<{ id: string; user_id: string; stage: number; seed: number; status: string; started_at: string; tier: number }>();
  if (!match || match.user_id !== userId) return { error: "Partida não encontrada." };
  if (match.status !== "open") return { error: "Essa partida já foi encerrada." };
  const stage = CAMPAIGN_STAGES[match.stage];
  if (!stage) return { error: "Arena inválida." };

  let result: "win" | "loss" | "draw" = "loss";
  let crownsMe = 0;
  let crownsBot = 0;
  if (!input.surrender) {
    const sim = simulate(match.seed, CAMPAIGN_DECK, cleanInputs(input.inputs), { botBoost: stageBoost(match.stage, match.tier ?? 0) }, CAMPAIGN_DECK);
    crownsMe = sim.crowns[0];
    crownsBot = sim.crowns[1];
    result = sim.winner === 0 ? "win" : sim.winner === 1 ? "loss" : "draw";
  }
  const elapsed = (Date.now() - new Date(match.started_at).getTime()) / 1000;
  if (result === "win" && elapsed < CAMPAIGN_MIN_SECONDS) result = "draw";

  const { data: closed } = await admin.from("arena_campaign_matches").update({ status: "finished", result, finished_at: new Date().toISOString() }).eq("id", match.id).eq("status", "open").select("id");
  if (!closed || closed.length === 0) return { error: "Essa partida já foi encerrada." };

  let xp = 0;
  let firstClear = false;
  let advanced = false;
  if (result === "win") {
    const { data: row } = await admin.from("arena_campaign_progress").select("wins, tiers, xp_awarded").eq("user_id", userId).eq("stage", match.stage).maybeSingle<{ wins: number; tiers: number; xp_awarded: number }>();
    const tier = match.tier ?? 0;
    if (!row) {
      // 1ª batalha da arena (só conta se foi jogada no nível normal)
      if (tier === 0) {
        const { error } = await admin.from("arena_campaign_progress").insert({ user_id: userId, stage: match.stage, wins: 1, tiers: 1, xp_awarded: 0 });
        advanced = !error;
      }
    } else {
      // só avança quem venceu exatamente a batalha da vez; duas chamadas juntas: só a que atualizar conta
      const cur = row.tiers;
      const paid = row.xp_awarded;
      if (cur < CAMPAIGN_TIERS && tier === cur) {
        const { data: upd } = await admin.from("arena_campaign_progress").update({ tiers: cur + 1, wins: row.wins + 1 }).eq("user_id", userId).eq("stage", match.stage).eq("tiers", cur).select("stage");
        advanced = !!upd && upd.length > 0;
        if (advanced && cur + 1 >= CAMPAIGN_TIERS && paid === 0) {
          // elos femininos ganham XP extra a cada arena conquistada
          const { data: me } = await admin.from("profiles").select("elo_id").eq("id", userId).maybeSingle<{ elo_id: string | null }>();
          const { data: elo } = me?.elo_id ? await admin.from("elos").select("gender").eq("id", me.elo_id).maybeSingle<{ gender: string }>() : { data: null };
          xp = CAMPAIGN_XP + (elo?.gender === "female" ? CAMPAIGN_XP_FEMALE_BONUS : 0);
          await admin.from("arena_campaign_progress").update({ xp_awarded: xp }).eq("user_id", userId).eq("stage", match.stage);
          firstClear = true;
          await admin.rpc("game_grant_xp", { p_user: userId, p_amount: xp, p_type: "game_arena" });
        }
      } else {
        await admin.from("arena_campaign_progress").update({ wins: row.wins + 1 }).eq("user_id", userId).eq("stage", match.stage);
      }
    }
  }
  const st = await campaignState(admin, userId);
  return { result, crownsMe, crownsBot, xp, stage: match.stage, tier: match.tier ?? 0, firstClear, advanced, cleared: st.cleared, tiers: st.tiers };
}
