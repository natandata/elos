import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Role } from "@/lib/types";

export async function requireProfile(): Promise<{ profile: Profile; userId: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (!profile) redirect("/");

  return { profile, userId: user.id };
}

export async function requireRole(...roles: Role[]): Promise<{ profile: Profile }> {
  const { profile } = await requireProfile();
  if (!roles.includes(profile.role)) redirect(homeFor(profile.role));
  return { profile };
}

export function homeFor(role: Role): string {
  if (role === "admin") return "/app/admin";
  if (role === "leader") return "/app/lider";
  if (role === "guardian") return "/app/feed";
  return "/app/cria";
}

// Brasília é UTC-3 o ano inteiro desde 2019 (sem horário de verão) — dá pra
// fixar o deslocamento sem precisar de biblioteca de fuso horário.
const BRASILIA_UTC_OFFSET_HOURS = 3;

/**
 * Início do "dia" da pesquisa de status: 04:00 no horário de Brasília. Antes
 * desse horário, ainda conta como o dia anterior (alguém acordado às 2h da
 * manhã não deveria já cair no dia seguinte).
 */
function statusDayCutoffUTC(): Date {
  const brasiliaNow = new Date(Date.now() - BRASILIA_UTC_OFFSET_HOURS * 3_600_000);
  const y = brasiliaNow.getUTCFullYear();
  const m = brasiliaNow.getUTCMonth();
  const d = brasiliaNow.getUTCDate() - (brasiliaNow.getUTCHours() < 4 ? 1 : 0);
  const cutoffBrasiliaMs = Date.UTC(y, m, d, 4, 0, 0);
  return new Date(cutoffBrasiliaMs + BRASILIA_UTC_OFFSET_HOURS * 3_600_000);
}

/**
 * Pesquisa de status: reaparece no primeiro login de cada dia, sempre a
 * partir das 04:00 (horário de Brasília) — não é mais uma janela rolante de
 * 24h desde a última resposta.
 */
export async function needsStatusCheck(profile: Profile): Promise<boolean> {
  if (profile.role === "admin" || profile.role === "guardian") return false;

  const supabase = await createClient();
  const cutoff = statusDayCutoffUTC();

  const { count } = await supabase
    .from("status_responses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .gte("created_at", cutoff.toISOString());

  return (count ?? 0) === 0;
}

const GUARDIAN_ACK_DAYS = 15;

/** Autorização do responsável: pedida no cadastro, revalidada a cada 15 dias. */
export function needsGuardianAck(profile: Profile): boolean {
  // Só cria tem responsável — líder é maior de idade responsável pelo Elo.
  if (profile.role !== "cria") return false;
  if (!profile.guardian_ack_at) return true;

  const cutoff = Date.now() - GUARDIAN_ACK_DAYS * 24 * 60 * 60 * 1000;
  return new Date(profile.guardian_ack_at).getTime() < cutoff;
}
