import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isTribeKey, type EventState, type TribeKey } from "./tribes";

// Estado do evento das tribos para o servidor. Quem não pode ver (surpresa antes de `reveal_at`, evento desligado ou encerrado)
// recebe `visible: false`: a regra está no banco, aqui só lemos. Qualquer erro vira "sem evento" para nunca derrubar o app.

export const getEventState = cache(async (): Promise<EventState> => {
  try {
    const { data, error } = await (await createClient()).rpc("event_state");
    if (error || !data) return { visible: false };
    const s = data as EventState;
    return s.visible ? { ...s, me: isTribeKey(s.me) ? s.me : null } : { visible: false };
  } catch {
    return { visible: false };
  }
});

/** Quem está em qual tribo (só chega preenchido quando o evento está visível para quem pergunta). */
export const getTribeMap = cache(async (): Promise<Record<string, TribeKey>> => {
  try {
    const { data } = await (await createClient()).from("event_members").select("user_id, tribe").limit(1000);
    const out: Record<string, TribeKey> = {};
    for (const r of (data ?? []) as { user_id: string; tribe: string }[]) if (isTribeKey(r.tribe)) out[r.user_id] = r.tribe;
    return out;
  } catch {
    return {};
  }
});
