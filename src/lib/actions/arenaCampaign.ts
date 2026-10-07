"use server";

import { randomInt } from "node:crypto";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { campaignState, settleCampaign, startCampaignMatch, type CampaignFinish, type CampaignState } from "@/lib/arena/campaignServer";

async function ctx() {
  const { profile } = await requireRole("cria", "leader", "admin");
  return { profile, admin: createAdminClient() };
}

export async function getCampaign(): Promise<CampaignState | { error: string }> {
  const { profile, admin } = await ctx();
  if (!admin) return { error: "A campanha está indisponível agora." };
  return campaignState(admin, profile.id);
}

export async function startCampaign(stage: number): Promise<{ error?: string; matchId?: string; seed?: number; tier?: number }> {
  const { profile, admin } = await ctx();
  if (!admin) return { error: "A campanha está indisponível agora." };
  const seed = randomInt(1, 2 ** 31 - 1);
  const r = await startCampaignMatch(admin, profile.id, stage, seed);
  return r.error ? { error: r.error } : { matchId: r.matchId, seed, tier: r.tier };
}

export async function finishCampaign(input: { matchId: string; inputs: unknown; surrender?: boolean }): Promise<CampaignFinish> {
  const { profile, admin } = await ctx();
  if (!admin) return { error: "A campanha está indisponível agora." };
  return settleCampaign(admin, profile.id, input);
}
