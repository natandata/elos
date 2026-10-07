"use server";

import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { decideOffer, joinWorld, leaveWorld, submitMatch, worldView, type MatchReport, type WorldView } from "@/lib/arenasoccer/worldServer";

async function ctx() {
  const { profile } = await requireRole("cria", "leader", "admin");
  const admin = createAdminClient();
  return { profile, admin };
}

/** O mundo aberto como esta pessoa vê (fecha antes as rodadas que já passaram). */
export async function getWorld(): Promise<{ view?: WorldView; error?: string; canPlay: boolean }> {
  const { profile, admin } = await ctx();
  if (!admin) return { error: "O mundo aberto está indisponível agora.", canPlay: false };
  return { view: await worldView(admin, profile.id), canPlay: profile.role !== "admin" };
}

export async function worldJoin(name: string, pos: string, league: string): Promise<{ error?: string }> {
  const { profile, admin } = await ctx();
  if (!admin) return { error: "O mundo aberto está indisponível agora." };
  if (profile.role === "admin") return { error: "O admin só acompanha o mundo, não joga nele." };
  return joinWorld(admin, profile.id, name, pos, league);
}

export async function worldSubmit(rep: MatchReport) {
  const { profile, admin } = await ctx();
  if (!admin) return { error: "O mundo aberto está indisponível agora." };
  return submitMatch(admin, profile.id, rep);
}

export async function worldDecide(team: string | null): Promise<{ error?: string }> {
  const { profile, admin } = await ctx();
  if (!admin) return { error: "O mundo aberto está indisponível agora." };
  return decideOffer(admin, profile.id, team);
}

export async function worldLeave(): Promise<void> {
  const { profile, admin } = await ctx();
  if (admin) await leaveWorld(admin, profile.id);
}
