"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { cleanBeauty } from "@/lib/games/dress/beauty";
import { DRESS_ITEM_LIMIT, cleanCode, cleanPose, countItems } from "@/lib/games/dress/live";
import { cleanDraftLook } from "@/lib/games/dress/runway";
import { gameOpenFor } from "@/lib/games/releaseServer";

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

  const look = cleanDraftLook(items);
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
