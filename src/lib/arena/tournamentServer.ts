// Lado servidor dos torneios: persistência do chaveamento, criação das salas,
// avanço dos vencedores e entrega dos prêmios. Usa o client com chave de serviço.
import type { SupabaseClient } from "@supabase/supabase-js";
import { randomInt, randomUUID } from "node:crypto";
import { sendPushToUsers } from "@/lib/push-server";
import { ARENA_CARD_BY_KEY, STARTER_DECK, isValidDeck } from "./cards";
import { ARENAS, deckAllowed } from "./arenas";
import { loadOwned } from "./owned";
import { pickBattleCard, unlockedCards } from "./economy";
import { FINAL_ARENA_KEY, advance, buildBracket, isFinished, normalizePrizes, placings, prizeIsEmpty, realLevelsApply, type TFormat, type TMatch, type TMatchStatus, type TPrize, type TPrizes, type TStatus } from "./tournament";

export type TournamentRow = {
  id: string;
  name: string;
  description: string;
  rules: string;
  format: TFormat;
  arena: number;
  status: TStatus;
  max_entries: number | null;
  prizes: unknown;
  results: TResult[];
  starts_at: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
};

export type EntryRow = {
  id: string;
  tournament_id: string;
  user_id: string;
  partner_id: string | null;
  confirmed: boolean;
  created_at: string;
  /** posição no ranking da Arena quando o torneio começou (duplas: média) */
  seed_pos: number | null;
};

type MatchRow = {
  id: string;
  tournament_id: string;
  bracket: "main" | "bronze";
  round: number;
  slot: number;
  entry_a: string | null;
  entry_b: string | null;
  winner: string | null;
  status: TMatchStatus;
  room_id: string | null;
};

/** O que cada lugar do pódio recebeu (guardado no torneio). */
export type TResult = { place: number; entryId: string; userIds: string[]; prize: TPrize; cards: Record<string, { card: string; n: number } | null> };

export type Person = { id: string; name: string; avatar: string | null; elo: string | null };

export const toMatch = (r: MatchRow): TMatch => ({ id: r.id, bracket: r.bracket, round: r.round, slot: r.slot, entryA: r.entry_a, entryB: r.entry_b, winner: r.winner, status: r.status, roomId: r.room_id });

export async function loadMatches(admin: SupabaseClient, tournamentId: string): Promise<TMatch[]> {
  const { data } = await admin.from("arena_tournament_matches").select("*").eq("tournament_id", tournamentId);
  return ((data ?? []) as MatchRow[]).map(toMatch);
}

export async function loadPeople(admin: SupabaseClient, ids: string[]): Promise<Map<string, Person>> {
  const uniq = [...new Set(ids.filter(Boolean))];
  const out = new Map<string, Person>();
  if (uniq.length === 0) return out;
  const { data } = await admin.from("profiles").select("id, full_name, avatar_url, elo_id").in("id", uniq);
  const rows = (data ?? []) as { id: string; full_name: string; avatar_url: string | null; elo_id: string | null }[];
  const eloIds = [...new Set(rows.map((r) => r.elo_id).filter((x): x is string => !!x))];
  const elos = new Map<string, string>();
  if (eloIds.length > 0) {
    const { data: e } = await admin.from("elos").select("id, name").in("id", eloIds);
    for (const r of (e ?? []) as { id: string; name: string }[]) elos.set(r.id, r.name);
  }
  for (const r of rows) out.set(r.id, { id: r.id, name: r.full_name || "Sem nome", avatar: r.avatar_url, elo: r.elo_id ? (elos.get(r.elo_id) ?? null) : null });
  return out;
}

export const entryUsers = (e: Pick<EntryRow, "user_id" | "partner_id">) => [e.user_id, ...(e.partner_id ? [e.partner_id] : [])];

async function notify(admin: SupabaseClient, userIds: string[], title: string, body: string, link: string) {
  try {
    const ids = [...new Set(userIds)];
    if (ids.length === 0) return;
    await admin.from("notifications").insert(ids.map((user_id) => ({ user_id, title, body, link, category: "jogos" })));
    await sendPushToUsers(ids, { title, body, url: link });
  } catch {
    // aviso é secundário
  }
}

export const tournamentLink = (id: string) => `/app/jogos/arena/torneios/${id}`;

async function saveMatches(admin: SupabaseClient, before: TMatch[], after: TMatch[]) {
  const old = new Map(before.map((m) => [m.id, m]));
  for (const m of after) {
    const o = old.get(m.id);
    if (o && o.entryA === m.entryA && o.entryB === m.entryB && o.winner === m.winner && o.status === m.status && o.roomId === m.roomId) continue;
    await admin
      .from("arena_tournament_matches")
      .update({ entry_a: m.entryA, entry_b: m.entryB, winner: m.winner, status: m.status, room_id: m.roomId })
      .eq("id", m.id);
  }
}

/** Avisa quem tem partida que acabou de ficar pronta. */
async function notifyReady(admin: SupabaseClient, t: TournamentRow, before: TMatch[], after: TMatch[], entries: EntryRow[]) {
  const was = new Set(before.filter((m) => m.status === "ready").map((m) => m.id));
  const byId = new Map(entries.map((e) => [e.id, e]));
  for (const m of after) {
    if (m.status !== "ready" || was.has(m.id)) continue;
    const users = [m.entryA, m.entryB].flatMap((id) => (id && byId.get(id) ? entryUsers(byId.get(id)!) : []));
    await notify(admin, users, `🏆 Sua partida no torneio ${t.name}`, "Seu adversário já está definido. Entre e jogue!", tournamentLink(t.id));
  }
}

// ------------------------------------------------------------ prêmios

async function award(admin: SupabaseClient, userId: string, prize: TPrize): Promise<{ card: string; n: number } | null> {
  if (prize.trophies > 0) await admin.rpc("arena_apply_result", { p_user: userId, p_delta: prize.trophies, p_result: "draw", p_copies: 0, p_card: null });
  if (prize.xp > 0) await admin.rpc("game_grant_xp", { p_user: userId, p_amount: prize.xp, p_type: "game_tournament" });
  if (prize.copies > 0 && prize.card) {
    let card: string | null = prize.card;
    if (card === "random") {
      const { data } = await admin.from("arena_stats").select("best").eq("user_id", userId).maybeSingle<{ best: number }>();
      card = pickBattleCard(unlockedCards(data?.best ?? 0, await loadOwned(admin, userId)), []);
    }
    if (card && ARENA_CARD_BY_KEY.has(card)) {
      await admin.rpc("arena_grant_copies", { p_user: userId, p_grants: [{ card, n: prize.copies }] });
      return { card, n: prize.copies };
    }
  }
  return null;
}

async function finalize(admin: SupabaseClient, t: TournamentRow, matches: TMatch[], entries: EntryRow[]) {
  const prizes: TPrizes = normalizePrizes(t.prizes);
  const [p1, p2, p3] = placings(matches);
  const order: [number, string | null, TPrize][] = [
    [1, p1, prizes.p1],
    [2, prizes.places >= 2 ? p2 : null, prizes.p2],
    [3, prizes.places >= 3 ? p3 : null, prizes.p3],
  ];
  const byId = new Map(entries.map((e) => [e.id, e]));
  const results: TResult[] = [];
  for (const [place, entryId, prize] of order) {
    const entry = entryId ? byId.get(entryId) : undefined;
    if (!entryId || !entry) continue;
    const userIds = entryUsers(entry);
    const cards: TResult["cards"] = {};
    if (!prizeIsEmpty(prize)) for (const u of userIds) cards[u] = await award(admin, u, prize);
    results.push({ place, entryId, userIds, prize, cards });
    const medal = ["🥇", "🥈", "🥉"][place - 1];
    await notify(admin, userIds, `${medal} ${place}º lugar no torneio!`, `Você ficou em ${place}º no ${t.name}.${prizeIsEmpty(prize) ? "" : " O prêmio já foi entregue."}`, tournamentLink(t.id));
  }
  await admin.from("arena_tournaments").update({ status: "finished", results, finished_at: new Date().toISOString() }).eq("id", t.id).eq("status", "running");
}

// ------------------------------------------------------------ andamento

async function loadAll(admin: SupabaseClient, tournamentId: string) {
  const [{ data: t }, { data: es }, matches] = await Promise.all([
    admin.from("arena_tournaments").select("*").eq("id", tournamentId).maybeSingle<TournamentRow>(),
    admin.from("arena_tournament_entries").select("*").eq("tournament_id", tournamentId),
    loadMatches(admin, tournamentId),
  ]);
  return { t, entries: ((es ?? []) as EntryRow[]).filter((e) => e.confirmed), matches };
}

/** Registra o vencedor de uma partida do torneio, avança a chave e, se acabou, entrega os prêmios. */
export async function applyWinner(admin: SupabaseClient, tournamentMatchId: string, winnerEntryId: string): Promise<{ error?: string }> {
  const { data: row } = await admin.from("arena_tournament_matches").select("tournament_id").eq("id", tournamentMatchId).maybeSingle<{ tournament_id: string }>();
  if (!row) return { error: "Partida não encontrada." };
  const { t, entries, matches } = await loadAll(admin, row.tournament_id);
  if (!t || t.status !== "running") return { error: "Esse torneio não está em andamento." };
  const r = advance(matches, tournamentMatchId, winnerEntryId);
  if (r.error) return { error: r.error };
  await saveMatches(admin, matches, r.matches);
  await notifyReady(admin, t, matches, r.matches, entries);
  if (isFinished(r.matches)) await finalize(admin, t, r.matches, entries);
  return {};
}

/**
 * Chamado quando uma sala de torneio termina. `winners` = jogadores que venceram
 * (vazio = empate: a partida é jogada de novo).
 */
export async function onRoomFinished(admin: SupabaseClient, tournamentMatchId: string, roomId: string, winners: string[]): Promise<void> {
  const { data: m } = await admin.from("arena_tournament_matches").select("*").eq("id", tournamentMatchId).maybeSingle<MatchRow>();
  if (!m || m.status === "done" || m.room_id !== roomId) return;
  const { entries } = await loadAll(admin, m.tournament_id);
  const win = new Set(winners);
  const winner = entries.find((e) => (e.id === m.entry_a || e.id === m.entry_b) && entryUsers(e).some((u) => win.has(u)));
  if (!winner) {
    // empate: libera a partida pra ser jogada de novo
    await admin.from("arena_tournament_matches").update({ room_id: null, status: "ready" }).eq("id", m.id);
    return;
  }
  await applyWinner(admin, m.id, winner.id);
}

const rankOf = (admin: SupabaseClient) => async (userId: string): Promise<number | null> => {
  const { data } = await admin.rpc("arena_rank_of", { p_user: userId });
  return typeof data === "number" ? data : null;
};

/** Nível real das cartas do baralho do jogador (as que ele tem evoluídas). */
async function deckLevels(admin: SupabaseClient, userId: string, deck: string[]): Promise<Record<string, number>> {
  const { data } = await admin.from("arena_card_levels").select("card, level").eq("user_id", userId).in("card", deck);
  const out: Record<string, number> = {};
  for (const r of (data ?? []) as { card: string; level: number }[]) if (r.level > 1) out[r.card] = r.level;
  return out;
}

const FINAL_ARENA = Math.max(0, ARENAS.findIndex((a) => a.key === FINAL_ARENA_KEY));

/** Fecha as inscrições, sorteia o chaveamento e começa o torneio. */
export async function startTournament(admin: SupabaseClient, tournamentId: string): Promise<{ error?: string }> {
  const { t, entries } = await loadAll(admin, tournamentId);
  if (!t) return { error: "Torneio não encontrado." };
  if (t.status !== "open") return { error: "Esse torneio já começou ou foi encerrado." };
  if (entries.length < 2) return { error: "Precisa de pelo menos 2 inscritos confirmados." };
  const ids = entries.map((e) => e.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  // posição de cada inscrito no ranking da Arena neste momento (vale pro torneio todo)
  for (const e of entries) {
    const pos = await Promise.all(entryUsers(e).map(rankOf(admin)));
    const known = pos.filter((p): p is number => p !== null);
    const seedPos = known.length === pos.length && known.length > 0 ? Math.round(known.reduce((a, b) => a + b, 0) / known.length) : null;
    await admin.from("arena_tournament_entries").update({ seed_pos: seedPos }).eq("id", e.id);
  }
  const prizes = normalizePrizes(t.prizes);
  const places = (Math.min(prizes.places, ids.length === 2 ? 2 : 3) as 1 | 2 | 3);
  const matches = buildBracket(ids, places, randomUUID);
  const { error: e1 } = await admin.from("arena_tournaments").update({ status: "running", started_at: new Date().toISOString() }).eq("id", t.id).eq("status", "open");
  if (e1) return { error: "Não foi possível iniciar." };
  const { error: e2 } = await admin.from("arena_tournament_matches").insert(
    matches.map((m) => ({ id: m.id, tournament_id: t.id, bracket: m.bracket, round: m.round, slot: m.slot, entry_a: m.entryA, entry_b: m.entryB, winner: m.winner, status: m.status, room_id: null })),
  );
  if (e2) {
    await admin.from("arena_tournaments").update({ status: "open", started_at: null }).eq("id", t.id);
    return { error: "Não foi possível montar o chaveamento." };
  }
  await notifyReady(admin, t, [], matches, entries);
  await notify(admin, entries.flatMap(entryUsers), `🏆 ${t.name} começou!`, "O chaveamento está pronto. Veja quem você enfrenta.", tournamentLink(t.id));
  return {};
}

// ------------------------------------------------------------ salas

async function loadout(admin: SupabaseClient, userId: string): Promise<string[]> {
  const [{ data: stats }, { data: saved }] = await Promise.all([
    admin.from("arena_stats").select("best").eq("user_id", userId).maybeSingle<{ best: number }>(),
    admin.from("arena_decks").select("deck").eq("user_id", userId).maybeSingle<{ deck: string[] }>(),
  ]);
  return isValidDeck(saved?.deck) && deckAllowed(saved.deck, stats?.best ?? 0, await loadOwned(admin, userId)) ? saved.deck : STARTER_DECK;
}

/**
 * Sala da partida do torneio (cria se ainda não houver). Devolve o endereço da
 * sala. Uma sala parada em "disputada" ou "recusada" é trocada por uma nova.
 */
export async function ensureRoom(admin: SupabaseClient, t: TournamentRow, matchId: string): Promise<{ href?: string; error?: string }> {
  const { data: m } = await admin.from("arena_tournament_matches").select("*").eq("id", matchId).maybeSingle<MatchRow>();
  if (!m || m.tournament_id !== t.id) return { error: "Partida não encontrada." };
  if (m.status === "done") return { error: "Essa partida já terminou." };
  if (!m.entry_a || !m.entry_b || (m.status !== "ready" && m.status !== "playing")) return { error: "Essa partida ainda não está pronta." };
  const base = t.format === "duo" ? "/app/jogos/arena/duplas" : "/app/jogos/arena/pvp";
  const table = t.format === "duo" ? "arena_duo" : "arena_pvp";

  if (m.room_id) {
    const { data: room } = await admin.from(table).select("status").eq("id", m.room_id).maybeSingle<{ status: string }>();
    if (room && (room.status === "accepted" || room.status === "finished")) return { href: `${base}/${m.room_id}` };
  }

  const { data: es } = await admin.from("arena_tournament_entries").select("*").in("id", [m.entry_a, m.entry_b]);
  const list = (es ?? []) as EntryRow[];
  const a = list.find((e) => e.id === m.entry_a);
  const b = list.find((e) => e.id === m.entry_b);
  if (!a || !b) return { error: "Inscrição não encontrada." };
  const seed = randomInt(1, 2 ** 31 - 1);
  // a final é sempre na Nova Jerusalém; as outras fases, na arena do torneio
  const { data: all } = await admin.from("arena_tournament_matches").select("round").eq("tournament_id", t.id).eq("bracket", "main");
  const lastRound = Math.max(0, ...((all ?? []) as { round: number }[]).map((x) => x.round));
  const arena = m.bracket === "main" && m.round === lastRound ? FINAL_ARENA : t.arena;
  // vizinhos no ranking jogam com o nível real das cartas; os distantes, tudo no nível 1
  const real = realLevelsApply(a.seed_pos, b.seed_pos);

  let roomId: string | undefined;
  if (t.format === "solo") {
    const [da, db] = await Promise.all([loadout(admin, a.user_id), loadout(admin, b.user_id)]);
    const { data } = await admin
      .from("arena_pvp")
      .insert({ challenger_id: a.user_id, opponent_id: b.user_id, seed, arena, challenger_deck: da, opponent_deck: db, levels: real ? [await deckLevels(admin, a.user_id, da), await deckLevels(admin, b.user_id, db)] : null, status: "accepted", accepted_at: new Date().toISOString(), tournament_match_id: m.id })
      .select("id")
      .single<{ id: string }>();
    roomId = data?.id;
  } else {
    if (!a.partner_id || !b.partner_id) return { error: "Dupla incompleta." };
    const players = [a.user_id, a.partner_id, b.user_id, b.partner_id];
    const decks = await Promise.all(players.map((u) => loadout(admin, u)));
    const { data } = await admin
      .from("arena_duo")
      .insert({ host_id: a.user_id, players, seed, arena, decks, levels: real ? await Promise.all(players.map((u, i) => deckLevels(admin, u, decks[i]))) : null, status: "accepted", tournament_match_id: m.id })
      .select("id")
      .single<{ id: string }>();
    roomId = data?.id;
  }
  if (!roomId) return { error: "Não foi possível abrir a sala." };

  // quem chegar primeiro "ganha" a sala; o outro usa a mesma
  let claim = admin.from("arena_tournament_matches").update({ room_id: roomId, status: "playing" }).eq("id", m.id).eq("status", m.status);
  claim = m.room_id ? claim.eq("room_id", m.room_id) : claim.is("room_id", null);
  const { data: claimed } = await claim.select("id");
  if (!claimed || claimed.length === 0) {
    await admin.from(table).delete().eq("id", roomId);
    const { data: again } = await admin.from("arena_tournament_matches").select("room_id").eq("id", m.id).maybeSingle<{ room_id: string | null }>();
    return again?.room_id ? { href: `${base}/${again.room_id}` } : { error: "Tente de novo." };
  }
  return { href: `${base}/${roomId}` };
}

// ------------------------------------------------------------ leitura pras telas

export type TournamentData = {
  t: TournamentRow;
  /** todas as inscrições (inclusive as esperando o parceiro) */
  entries: EntryRow[];
  matches: TMatch[];
  people: Map<string, Person>;
  /** nomes de cada inscrição, pra mostrar no chaveamento */
  labels: Record<string, { names: string[]; elo: string | null; pos: number | null }>;
};

export async function loadTournamentData(admin: SupabaseClient, id: string): Promise<TournamentData | null> {
  const [{ data: t }, { data: es }, matches] = await Promise.all([
    admin.from("arena_tournaments").select("*").eq("id", id).maybeSingle<TournamentRow>(),
    admin.from("arena_tournament_entries").select("*").eq("tournament_id", id).order("created_at"),
    loadMatches(admin, id),
  ]);
  if (!t) return null;
  const entries = (es ?? []) as EntryRow[];
  const people = await loadPeople(admin, entries.flatMap(entryUsers));
  const labels: TournamentData["labels"] = {};
  for (const e of entries) {
    const ps = entryUsers(e).map((u) => people.get(u));
    labels[e.id] = { names: ps.map((p) => p?.name ?? "?"), elo: ps[0]?.elo ?? null, pos: e.seed_pos ?? null };
  }
  return { t, entries, matches, people, labels };
}
