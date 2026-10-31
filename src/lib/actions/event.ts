"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { drawTribes, type DrawPerson } from "@/lib/event/draw";
import { isTribeKey, type TribeKey } from "@/lib/event/tribes";
import { createClient } from "@/lib/supabase/server";

// Evento das tribos (Acampadentro): ações do admin. As regras de quem vê o quê estão no banco (RLS); aqui o admin sorteia,
// move pessoas, cria as missões especiais e lança pontos para as tribos.

type Res = { ok?: boolean; error?: string; message?: string };
const done = (message?: string): Res => {
  revalidatePath("/app", "layout");
  return { ok: true, message };
};

/** Sorteia quem ainda não tem tribo (cria e líder aprovados, sem contas de teste), equilibrando por Elo. Quem já tem tribo não muda. */
export async function runTribeDraw(): Promise<Res> {
  const { profile } = await requireRole("admin");
  const supabase = await createClient();
  const [{ data: people }, { data: members }, { data: neutralRows }] = await Promise.all([
    supabase.from("profiles").select("id, role, approved, elo_id, is_test_account").in("role", ["cria", "leader"]),
    supabase.from("event_members").select("user_id, tribe"),
    supabase.from("event_neutral").select("user_id"),
  ]);
  const neutral = new Set(((neutralRows ?? []) as { user_id: string }[]).map((n) => n.user_id));
  const existing = new Map<string, TribeKey>(((members ?? []) as { user_id: string; tribe: string }[]).filter((m) => isTribeKey(m.tribe)).map((m) => [m.user_id, m.tribe as TribeKey]));
  const eligible: DrawPerson[] = ((people ?? []) as { id: string; role: "cria" | "leader"; approved: boolean; elo_id: string | null; is_test_account: boolean | null }[])
    .filter((p) => !p.is_test_account && !neutral.has(p.id) && (p.role === "cria" || p.approved))
    .map((p) => ({ id: p.id, role: p.role, eloId: p.elo_id }));
  const result = drawTribes(eligible, Date.now() % 2147483647, existing);
  if (result.size === 0 && existing.size > 0) return { error: "Todo mundo já tem tribo." };
  const rows = [...result].map(([user_id, tribe]) => ({ user_id, tribe, source: "draw", assigned_by: profile.id }));
  if (rows.length) {
    const { error } = await supabase.from("event_members").insert(rows);
    if (error) return { error: "Não foi possível gravar o sorteio." };
  }
  await supabase.from("event_settings").update({ drawn_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", true);
  return done(`Sorteio feito: ${rows.length} pessoa(s) distribuídas.`);
}

/** Liga ou desliga o evento (interruptor geral), e define o nome e o fim. */
export async function setEventActive(active: boolean): Promise<Res> {
  await requireRole("admin");
  const supabase = await createClient();
  const patch: { active: boolean; updated_at: string; reveal_at?: string } = { active, updated_at: new Date().toISOString() };
  if (active) patch.reveal_at = new Date().toISOString();
  const { error } = await supabase.from("event_settings").update(patch).eq("id", true);
  if (error) return { error: "Não foi possível atualizar o evento." };
  return done(active ? "Evento ligado: os usuários veem a tribo no próximo login." : "Evento desligado: o app voltou ao normal.");
}

/** Move alguém para uma tribo, ou tira da tribo (`tribe` = "none": fica neutro e não é sorteado de novo). */
export async function moveTribeMember(userId: string, tribe: string): Promise<Res> {
  const { profile } = await requireRole("admin");
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return { error: "Dados inválidos." };
  const supabase = await createClient();
  if (tribe === "none") {
    const { error: neutralError } = await supabase.from("event_neutral").upsert({ user_id: userId });
    if (neutralError) return { error: "Não foi possível tirar da tribo." };
    const { error } = await supabase.from("event_members").delete().eq("user_id", userId);
    if (error) return { error: "Não foi possível tirar da tribo." };
    return done();
  }
  if (!isTribeKey(tribe)) return { error: "Dados inválidos." };
  const { error } = await supabase.from("event_members").upsert({ user_id: userId, tribe, source: "admin", assigned_by: profile.id, assigned_at: new Date().toISOString() });
  if (error) return { error: "Não foi possível mover." };
  await supabase.from("event_neutral").delete().eq("user_id", userId);
  return done();
}

export async function saveEventMission(title: string, description: string, points: number): Promise<Res> {
  const { profile } = await requireRole("admin");
  const t = title.trim();
  const p = Math.round(points);
  if (!t || t.length > 120) return { error: "Escreva o título (até 120 letras)." };
  if (!Number.isFinite(p) || p < 1 || p > 1000) return { error: "Pontos de 1 a 1000." };
  const { error } = await (await createClient()).from("event_missions").insert({ title: t, description: description.trim().slice(0, 400) || null, points: p, created_by: profile.id });
  if (error) return { error: "Não foi possível criar a missão." };
  return done("Missão criada.");
}

export async function setEventMissionActive(id: string, active: boolean): Promise<Res> {
  await requireRole("admin");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { error: "Missão inválida." };
  const { error } = await (await createClient()).from("event_missions").update({ active }).eq("id", id);
  if (error) return { error: "Não foi possível atualizar." };
  return done();
}

/** Lança pontos para uma tribo (de uma missão especial ou avulso; negativo desconta). */
export async function awardTribePoints(tribe: string, points: number, reason: string, missionId?: string | null): Promise<Res> {
  const { profile } = await requireRole("admin");
  const p = Math.round(points);
  const r = reason.trim();
  if (!isTribeKey(tribe)) return { error: "Escolha a tribo." };
  if (!Number.isFinite(p) || p === 0 || Math.abs(p) > 1000) return { error: "Pontos entre -1000 e 1000 (sem zero)." };
  if (!r || r.length > 160) return { error: "Escreva o motivo (até 160 letras)." };
  const { error } = await (await createClient()).from("event_points").insert({ tribe, points: p, reason: r, mission_id: missionId || null, created_by: profile.id });
  if (error) return { error: "Não foi possível lançar os pontos." };
  return done(`${p > 0 ? "+" : ""}${p} pontos para a tribo.`);
}

export async function undoTribePoints(id: string): Promise<Res> {
  await requireRole("admin");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { error: "Lançamento inválido." };
  const { error } = await (await createClient()).from("event_points").delete().eq("id", id);
  if (error) return { error: "Não foi possível desfazer." };
  return done("Lançamento desfeito.");
}
