"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ARENA_CARD_BY_KEY } from "@/lib/arena/cards";
import { normalizePrizes, type TFormat } from "@/lib/arena/tournament";
import { applyWinner, ensureRoom, startTournament as startT, tournamentLink, type EntryRow, type TournamentRow } from "@/lib/arena/tournamentServer";
import { sendPushToUsers } from "@/lib/push-server";

type Result = { error?: string; ok?: boolean };

const refresh = (id?: string) => {
  revalidatePath("/app/admin/torneios");
  revalidatePath("/app/jogos/arena/torneios");
  if (id) revalidatePath(tournamentLink(id));
};

async function who() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, elo_id")
    .eq("id", user.id)
    .maybeSingle<{ id: string; full_name: string; role: string; elo_id: string | null }>();
  if (!profile) redirect("/");
  const admin = createAdminClient();
  if (!admin) throw new Error("Torneios indisponíveis no momento.");
  return { supabase, admin, profile };
}

async function adminCtx() {
  const c = await who();
  if (c.profile.role !== "admin") redirect("/app");
  return c;
}

async function playerCtx() {
  const c = await who();
  if (c.profile.role !== "cria" && c.profile.role !== "leader" && c.profile.role !== "admin") throw new Error("Torneios são só para crias e líderes.");
  return c;
}

// ------------------------------------------------------------ admin

const BRT_OFFSET = "-03:00";

/** Cria (sem id) ou edita (com id) um torneio. Só dá pra editar enquanto as inscrições estão abertas. */
export async function saveTournament(_prev: Result | null, formData: FormData): Promise<Result> {
  const { admin, profile } = await adminCtx();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const rules = String(formData.get("rules") ?? "").trim();
  const format = String(formData.get("format") ?? "solo") as TFormat;
  const arena = Number(formData.get("arena"));
  const maxRaw = String(formData.get("max_entries") ?? "").trim();
  const startsRaw = String(formData.get("starts_at") ?? "").trim();

  if (name.length < 3 || name.length > 80) return { error: "O nome precisa ter de 3 a 80 caracteres." };
  if (description.length > 1000) return { error: "Descrição muito longa (máx. 1000 caracteres)." };
  if (rules.length > 4000) return { error: "Regras muito longas (máx. 4000 caracteres)." };
  if (format !== "solo" && format !== "duo") return { error: "Escolha o formato do torneio." };
  if (!Number.isInteger(arena) || arena < 0 || arena > 7) return { error: "Escolha a arena do torneio." };
  const max = maxRaw === "" ? null : Math.floor(Number(maxRaw));
  if (max !== null && (!Number.isFinite(max) || max < 2 || max > 512)) return { error: "O máximo de inscritos precisa ser de 2 a 512 (ou fique em branco)." };
  const startsAt = startsRaw ? new Date(`${startsRaw}${startsRaw.length === 16 ? ":00" : ""}${BRT_OFFSET}`) : null;
  if (startsAt && Number.isNaN(startsAt.getTime())) return { error: "Data de início inválida." };

  const places = Number(formData.get("places"));
  const prizeOf = (k: string) => ({
    xp: formData.get(`${k}_xp`),
    trophies: formData.get(`${k}_trophies`),
    card: String(formData.get(`${k}_card`) ?? "") || null,
    copies: formData.get(`${k}_copies`),
  });
  const prizes = normalizePrizes({ places, p1: prizeOf("p1"), p2: prizeOf("p2"), p3: prizeOf("p3") });
  for (const p of [prizes.p1, prizes.p2, prizes.p3]) {
    if (p.card && p.card !== "random" && !ARENA_CARD_BY_KEY.has(p.card)) return { error: "Carta de prêmio inválida." };
  }

  const fields = { name, description, rules, format, arena, max_entries: max, prizes, starts_at: startsAt ? startsAt.toISOString() : null };
  if (!id) {
    const { error } = await admin.from("arena_tournaments").insert({ ...fields, created_by: profile.id });
    if (error) return { error: "Não foi possível criar o torneio." };
  } else {
    const { data: cur } = await admin.from("arena_tournaments").select("status, format").eq("id", id).maybeSingle<{ status: string; format: string }>();
    if (!cur) return { error: "Torneio não encontrado." };
    if (cur.status !== "open") return { error: "Só dá pra editar enquanto as inscrições estão abertas." };
    if (cur.format !== format) {
      const { count } = await admin.from("arena_tournament_entries").select("id", { count: "exact", head: true }).eq("tournament_id", id);
      if ((count ?? 0) > 0) return { error: "Já há inscritos: não dá pra trocar entre 1x1 e duplas." };
    }
    const { error } = await admin.from("arena_tournaments").update(fields).eq("id", id);
    if (error) return { error: "Não foi possível salvar." };
  }
  refresh(id || undefined);
  return { ok: true };
}

export async function startTournament(id: string): Promise<Result> {
  const { admin } = await adminCtx();
  const r = await startT(admin, id);
  refresh(id);
  return r.error ? { error: r.error } : { ok: true };
}

export async function cancelTournament(id: string): Promise<Result> {
  const { admin } = await adminCtx();
  const { data: t } = await admin.from("arena_tournaments").select("name, status").eq("id", id).maybeSingle<{ name: string; status: string }>();
  if (!t) return { error: "Torneio não encontrado." };
  if (t.status === "finished" || t.status === "cancelled") return { error: "Esse torneio já terminou." };
  await admin.from("arena_tournaments").update({ status: "cancelled", finished_at: new Date().toISOString() }).eq("id", id);
  const { data: es } = await admin.from("arena_tournament_entries").select("user_id, partner_id").eq("tournament_id", id);
  const users = [...new Set(((es ?? []) as { user_id: string; partner_id: string | null }[]).flatMap((e) => [e.user_id, ...(e.partner_id ? [e.partner_id] : [])]))];
  if (users.length > 0) {
    await admin.from("notifications").insert(users.map((user_id) => ({ user_id, title: `Torneio cancelado: ${t.name}`, body: "O administrador cancelou o torneio.", link: tournamentLink(id), category: "jogos" })));
    await sendPushToUsers(users, { title: `Torneio cancelado: ${t.name}`, body: "O administrador cancelou o torneio.", url: tournamentLink(id) }).catch(() => null);
  }
  refresh(id);
  return { ok: true };
}

/** Só torneio que ainda não começou ou que foi cancelado pode ser apagado. */
export async function deleteTournament(id: string): Promise<Result> {
  const { admin } = await adminCtx();
  const { data: t } = await admin.from("arena_tournaments").select("status").eq("id", id).maybeSingle<{ status: string }>();
  if (!t) return { error: "Torneio não encontrado." };
  if (t.status === "running" || t.status === "finished") return { error: "Torneio em andamento ou terminado não pode ser apagado. Cancele antes, se for o caso." };
  await admin.from("arena_tournaments").delete().eq("id", id);
  refresh();
  return { ok: true };
}

/** O admin decide uma partida na mão (quem não apareceu, problema técnico). */
export async function setMatchWinner(matchId: string, entryId: string): Promise<Result> {
  const { admin } = await adminCtx();
  const { data: m } = await admin.from("arena_tournament_matches").select("tournament_id").eq("id", matchId).maybeSingle<{ tournament_id: string }>();
  const r = await applyWinner(admin, matchId, entryId);
  refresh(m?.tournament_id);
  return r.error ? { error: r.error } : { ok: true };
}

// ------------------------------------------------------------ jogadores

async function loadOpen(admin: Awaited<ReturnType<typeof who>>["admin"], id: string) {
  const { data: t } = await admin.from("arena_tournaments").select("*").eq("id", id).maybeSingle<TournamentRow>();
  return t;
}

async function takenIds(admin: Awaited<ReturnType<typeof who>>["admin"], tournamentId: string) {
  const { data } = await admin.from("arena_tournament_entries").select("user_id, partner_id").eq("tournament_id", tournamentId);
  const set = new Set<string>();
  for (const e of (data ?? []) as { user_id: string; partner_id: string | null }[]) {
    set.add(e.user_id);
    if (e.partner_id) set.add(e.partner_id);
  }
  return set;
}

/** Inscreve o jogador (1x1) ou a dupla (com o parceiro do mesmo Elo, que precisa confirmar). */
export async function joinTournament(id: string, partnerId?: string): Promise<Result> {
  const { admin, profile } = await playerCtx();
  const t = await loadOpen(admin, id);
  if (!t) return { error: "Torneio não encontrado." };
  if (t.status !== "open") return { error: "As inscrições desse torneio estão fechadas." };

  const taken = await takenIds(admin, id);
  if (taken.has(profile.id)) return { error: "Você já está nesse torneio." };
  if (t.max_entries) {
    const { count } = await admin.from("arena_tournament_entries").select("id", { count: "exact", head: true }).eq("tournament_id", id);
    if ((count ?? 0) >= t.max_entries) return { error: "As vagas desse torneio acabaram." };
  }

  if (t.format === "solo") {
    const { error } = await admin.from("arena_tournament_entries").insert({ tournament_id: id, user_id: profile.id, confirmed: true });
    if (error) return { error: "Não foi possível se inscrever." };
  } else {
    if (!profile.elo_id) return { error: "Você precisa estar em um Elo pra formar dupla." };
    if (!partnerId || partnerId === profile.id) return { error: "Escolha o seu parceiro de dupla." };
    if (taken.has(partnerId)) return { error: "Esse colega já está nesse torneio." };
    const { data: p } = await admin.from("profiles").select("id, role, elo_id, full_name").eq("id", partnerId).maybeSingle<{ id: string; role: string; elo_id: string | null; full_name: string }>();
    if (!p || (p.role !== "cria" && p.role !== "leader") || p.elo_id !== profile.elo_id) return { error: "A dupla precisa ser com alguém do seu Elo." };
    const { error } = await admin.from("arena_tournament_entries").insert({ tournament_id: id, user_id: profile.id, partner_id: partnerId, confirmed: false });
    if (error) return { error: "Não foi possível formar a dupla." };
    await admin.from("notifications").insert({
      user_id: partnerId,
      title: `🏆 Convite de dupla: ${t.name}`,
      body: `${profile.full_name || "Um colega"} te chamou pra jogar o torneio em dupla. Confirme pra valer a inscrição.`,
      link: tournamentLink(id),
      category: "jogos",
    });
    await sendPushToUsers([partnerId], { title: `🏆 Convite de dupla: ${t.name}`, body: "Confirme pra entrar no torneio.", url: tournamentLink(id) }).catch(() => null);
  }
  refresh(id);
  return { ok: true };
}

/** O parceiro aceita (ou recusa) o convite de dupla. */
export async function answerTeamInvite(entryId: string, accept: boolean): Promise<Result> {
  const { admin, profile } = await playerCtx();
  const { data: e } = await admin.from("arena_tournament_entries").select("*").eq("id", entryId).maybeSingle<EntryRow>();
  if (!e || e.partner_id !== profile.id) return { error: "Convite não encontrado." };
  const t = await loadOpen(admin, e.tournament_id);
  if (!t || t.status !== "open") return { error: "As inscrições desse torneio estão fechadas." };
  if (accept) {
    const { error } = await admin.from("arena_tournament_entries").update({ confirmed: true }).eq("id", entryId);
    if (error) return { error: "Não foi possível confirmar." };
    await admin.from("notifications").insert({ user_id: e.user_id, title: `✅ Dupla confirmada: ${t.name}`, body: `${profile.full_name || "Seu parceiro"} confirmou a dupla.`, link: tournamentLink(t.id), category: "jogos" });
  } else {
    await admin.from("arena_tournament_entries").delete().eq("id", entryId);
  }
  refresh(t.id);
  return { ok: true };
}

/** Sai do torneio (ou desfaz a dupla) enquanto as inscrições estão abertas. */
export async function leaveTournament(id: string): Promise<Result> {
  const { admin, profile } = await playerCtx();
  const t = await loadOpen(admin, id);
  if (!t || t.status !== "open") return { error: "As inscrições desse torneio estão fechadas." };
  await admin.from("arena_tournament_entries").delete().eq("tournament_id", id).or(`user_id.eq.${profile.id},partner_id.eq.${profile.id}`);
  refresh(id);
  return { ok: true };
}

/** Abre a sala da sua partida (só quem está nela). */
export async function openTournamentMatch(matchId: string): Promise<{ error?: string; href?: string }> {
  const { admin, profile } = await playerCtx();
  const { data: m } = await admin.from("arena_tournament_matches").select("tournament_id, entry_a, entry_b").eq("id", matchId).maybeSingle<{ tournament_id: string; entry_a: string | null; entry_b: string | null }>();
  if (!m) return { error: "Partida não encontrada." };
  const t = await loadOpen(admin, m.tournament_id);
  if (!t || t.status !== "running") return { error: "Esse torneio não está em andamento." };
  const { data: es } = await admin.from("arena_tournament_entries").select("*").in("id", [m.entry_a, m.entry_b].filter((x): x is string => !!x));
  const mine = ((es ?? []) as EntryRow[]).some((e) => e.user_id === profile.id || e.partner_id === profile.id);
  if (!mine) return { error: "Essa partida não é sua." };
  return ensureRoom(admin, t, matchId);
}
