"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { cleanBeauty } from "@/lib/games/dress/beauty";
import { DRESS_ITEM_LIMIT, cleanCode, cleanPose, countItems } from "@/lib/games/dress/live";
import { cleanDraftLook } from "@/lib/games/dress/runway";
import { gameOpenFor } from "@/lib/games/releaseServer";
import { sendPushToUsers } from "@/lib/push-server";

/**
 * Salva o look da jogadora na sala ao vivo. As peças são conferidas aqui contra o catálogo (o banco não o conhece);
 * o prazo é conferido no banco: depois que o camarim fecha, _dress_room_set_look recusa.
 */
export async function saveRoomLook(code: string, items: unknown, beauty: unknown, pose: unknown, ready: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Entre de novo para jogar." };
  if (!(await gameOpenFor("dress", user.id))) return { error: "Jogo indisponível." };
  const admin = createAdminClient();
  if (!admin) return { error: "Salas indisponíveis no momento." };

  // peças raras só valem se a jogadora comprou (a conferência é aqui; a tela só mostra o cadeado)
  const { data: inv } = await admin.from("dress_inventory").select("family").eq("user_id", user.id);
  const owned = new Set(((inv ?? []) as { family: string }[]).map((r) => r.family));
  const wanted = cleanDraftLook(items);
  const look = cleanDraftLook(items, owned);
  if (Object.keys(look).length < Object.keys(wanted).length) return { error: "Tem peça rara no seu look que você ainda não comprou. Compre na loja ou troque a peça." };
  if (countItems(look) > DRESS_ITEM_LIMIT) return { error: `Limite de ${DRESS_ITEM_LIMIT} itens.` };
  const { data, error } = await admin.rpc("_dress_room_set_look", {
    p_user: user.id,
    p_code: cleanCode(String(code ?? "")),
    p_look: look,
    p_beauty: cleanBeauty(beauty),
    p_pose: cleanPose(pose),
    p_ready: !!ready,
    p_now: new Date().toISOString(),
  });
  if (error) return { error: "Não foi possível salvar o look." };
  const r = (data ?? {}) as { ok?: boolean; error?: string };
  return r.error ? { error: r.error } : {};
}

/**
 * Avisa quem já jogou com ela (nos últimos 30 dias) que a sala abriu. Só salas abertas, uma vez por sala,
 * e no máximo uma vez a cada 10 minutos por criadora.
 */
export async function notifyRoomOpened(code: string): Promise<{ sent: number }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { sent: 0 };
    const admin = createAdminClient();
    if (!admin) return { sent: 0 };
    const clean = cleanCode(String(code ?? ""));
    const { data: room } = await admin.from("dress_rooms").select("id, host_id, is_public, settings, created_at").eq("code", clean).maybeSingle<{ id: string; host_id: string; is_public: boolean; settings: Record<string, unknown> | null; created_at: string }>();
    if (!room || room.host_id !== user.id || !room.is_public || room.settings?.notified) return { sent: 0 };
    if (Date.now() - new Date(room.created_at).getTime() > 3 * 60_000) return { sent: 0 };
    const since = new Date(Date.now() - 10 * 60_000).toISOString();
    const { count: recent } = await admin.from("dress_rooms").select("id", { count: "exact", head: true }).eq("host_id", user.id).gte("created_at", since).filter("settings->>notified", "eq", "true");
    if ((recent ?? 0) > 0) return { sent: 0 };
    await admin.from("dress_rooms").update({ settings: { ...(room.settings ?? {}), notified: true } }).eq("id", room.id);

    const month = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const { data: mine } = await admin.from("dress_room_results").select("room_id").eq("user_id", user.id).gte("created_at", month).limit(60);
    const roomIds = [...new Set(((mine ?? []) as { room_id: string }[]).map((r) => r.room_id))];
    if (roomIds.length === 0) return { sent: 0 };
    const { data: mates } = await admin.from("dress_room_results").select("user_id").in("room_id", roomIds).neq("user_id", user.id).limit(300);
    const ids = [...new Set(((mates ?? []) as { user_id: string }[]).map((r) => r.user_id))].slice(0, 40);
    if (ids.length === 0) return { sent: 0 };
    const { data: ok } = await admin.from("profiles").select("id").in("id", ids).eq("is_test_account", false);
    const to = ((ok ?? []) as { id: string }[]).map((p) => p.id);
    if (to.length === 0) return { sent: 0 };
    const { data: me } = await admin.from("profiles").select("full_name, is_test_account").eq("id", user.id).maybeSingle<{ full_name: string | null; is_test_account: boolean }>();
    if (me?.is_test_account) return { sent: 0 };
    const first = (me?.full_name ?? "").trim().split(/\s+/)[0] || "Uma amiga";
    const title = `👗 ${first} abriu uma sala no Vista o Herói`;
    const body = "Entre agora e desfile com ela!";
    const url = `/app/jogos/vestir/sala/${clean}`;
    await admin.from("notifications").insert(to.map((user_id) => ({ user_id, title, body, link: url, category: "jogos" })));
    await sendPushToUsers(to, { title, body, url }, admin);
    return { sent: to.length };
  } catch {
    return { sent: 0 };
  }
}
