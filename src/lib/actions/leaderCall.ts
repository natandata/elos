"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { brLocalToIso, safeLink, type LeaderId } from "@/lib/babel/leaders";
import { createClient } from "@/lib/supabase/server";

// Último nível do Babel: o aluno pede a chamada de 10 min; o admin marca data/link e confirma que aconteceu. O banco confere tudo.

type Res = { ok?: boolean; error?: string };
const clean = (m: string | undefined, fallback: string) => (m && m.length < 140 && !/(violates|constraint|policy|function)/i.test(m) ? m : fallback);

export async function requestLeaderCall(leader: LeaderId, note: string): Promise<Res> {
  await requireRole("cria", "leader", "admin");
  if (leader !== "natan" && leader !== "rebeca") return { error: "Escolha um líder." };
  const { error } = await (await createClient()).rpc("babel_call_request", { p_leader: leader, p_note: note.slice(0, 300) });
  if (error) return { error: clean(error.message, "Não foi possível pedir agora.") };
  revalidatePath("/app/jogos/ingles", "layout");
  return { ok: true };
}

export async function cancelLeaderCall(id: string): Promise<Res> {
  await requireRole("cria", "leader", "admin");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { error: "Pedido inválido." };
  const { error } = await (await createClient()).rpc("babel_call_cancel", { p_id: id });
  if (error) return { error: "Não foi possível cancelar." };
  revalidatePath("/app/jogos/ingles", "layout");
  return { ok: true };
}

export async function scheduleLeaderCall(id: string, localDateTime: string, link: string): Promise<Res> {
  await requireRole("admin");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { error: "Pedido inválido." };
  const at = brLocalToIso(localDateTime);
  if (!at) return { error: "Escolha dia e hora." };
  if (link.trim() && !safeLink(link)) return { error: "O link precisa começar com https://" };
  const { error } = await (await createClient()).rpc("admin_babel_call_schedule", { p_id: id, p_at: at, p_link: safeLink(link) ?? "" });
  if (error) return { error: clean(error.message, "Não foi possível marcar.") };
  revalidatePath("/app/admin/babel-conversas");
  return { ok: true };
}

export async function finishLeaderCall(id: string, done: boolean): Promise<Res> {
  await requireRole("admin");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { error: "Pedido inválido." };
  const { error } = await (await createClient()).rpc("admin_babel_call_finish", { p_id: id, p_done: done });
  if (error) return { error: clean(error.message, "Não foi possível concluir.") };
  revalidatePath("/app/admin/babel-conversas");
  return { ok: true };
}
