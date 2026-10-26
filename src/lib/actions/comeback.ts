"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { sendPushToUsers } from "@/lib/push-server";
import { pickStrategy, type Bucket, type Signals } from "@/lib/retention/strategy";
import { createClient } from "@/lib/supabase/server";

// Estratégia de retorno por pessoa: o admin ativa, a pessoa recebe o aviso (sino + push) e, no próximo acesso, um cartão com presente de XP.

const todayBR = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
const brHour = () => Number(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo", hour: "2-digit", hour12: false })) % 24;

export type ActivateResult = { ok?: boolean; error?: string; message?: string };

export async function activateStrategy(userId: string): Promise<ActivateResult> {
  await requireRole("admin");
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return { error: "Pessoa inválida." };
  const supabase = await createClient();

  // recalcula tudo no servidor (não confia no que veio da tela)
  const { data: sig, error: sigErr } = await supabase.rpc("admin_user_signals", { p_ids: [userId] });
  const s = (sig as Record<string, Signals> | null)?.[userId];
  if (sigErr || !s) return { error: "Não foi possível ler os dados dessa pessoa." };
  const today = todayBR();
  const away = s.last_day ? Math.round((Date.parse(today + "T12:00:00Z") - Date.parse(s.last_day + "T12:00:00Z")) / 86_400_000) : 99;
  const bucket: Bucket = away >= 14 ? "perdido" : away >= 7 ? "dormente" : "em_risco";
  const st = pickStrategy(s, bucket, today);

  // aviso no celular só entre 8h e 20h59 (Brasília); fora disso fica para as 20h do próximo ciclo
  const inWindow = brHour() >= 8 && brHour() <= 20;
  const pushStatus = !s.has_push ? "none" : inWindow ? "sent" : "pending";

  const { error } = await supabase.rpc("admin_comeback_create", {
    p_user: userId,
    p_strategy: st.id,
    p_title: st.giftTitle,
    p_body: st.giftBody,
    p_cta_label: st.ctaLabel,
    p_cta_href: st.ctaHref,
    p_xp: st.xp,
    p_push_status: pushStatus,
    p_push_title: st.pushTitle,
    p_push_body: st.pushBody,
  });
  if (error) return { error: error.message.includes("7 dias") ? "Já existe uma estratégia ativada para essa pessoa nos últimos 7 dias." : "Não foi possível ativar agora." };

  if (pushStatus === "sent") await sendPushToUsers([userId], { title: st.pushTitle, body: st.pushBody, url: st.ctaHref }, supabase).catch(() => null);
  revalidatePath("/app/admin/retencao");
  return {
    ok: true,
    message: pushStatus === "sent" ? "Ativada: aviso enviado agora e presente esperando no próximo acesso." : pushStatus === "pending" ? "Ativada: o aviso sai às 20h (agora é fora do horário) e o presente espera no próximo acesso." : "Ativada: aviso no sino e presente esperando no próximo acesso (sem push: a pessoa não ativou as notificações).",
  };
}

/** A pessoa viu o cartão de boas-vindas. */
export async function seenComeback(id: string): Promise<void> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  await (await createClient()).rpc("comeback_seen", { p_id: id });
}

/** A pessoa resgata o presente. */
export async function claimComeback(id: string): Promise<{ xp: number }> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { xp: 0 };
  const { data } = await (await createClient()).rpc("comeback_claim", { p_id: id });
  revalidatePath("/app");
  return { xp: Number((data as { xp?: number } | null)?.xp ?? 0) };
}
