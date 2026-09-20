import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Role } from "@/lib/types";

/** Cookie que guarda o id do usuário que o admin está "visualizando como".
 *  Só tem efeito quando quem está logado de fato é admin (ver requireProfile) —
 *  um cria/líder não vira admin só por ter esse cookie setado. */
export const VIEW_AS_COOKIE = "elos_view_as";

export type ViewingAs = { adminId: string; adminName: string; targetName: string };

export async function requireProfile(): Promise<{
  profile: Profile;
  userId: string;
  viewingAs: ViewingAs | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: realProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (!realProfile) redirect("/");

  // Modo "visualizar como": só admin ativa (via startViewAs), e só se ainda
  // for admin de fato — o cookie sozinho nunca dá privilégio a ninguém. A
  // troca de perfil abaixo é intencional: o resto do app (páginas, RLS via
  // is_admin(), redirecionamentos de requireRole) passa a enxergar como se
  // fosse o usuário-alvo, sem precisar de nenhuma mudança por página.
  if (realProfile.role === "admin") {
    const jar = await cookies();
    const targetId = jar.get(VIEW_AS_COOKIE)?.value;
    if (targetId && targetId !== realProfile.id) {
      const { data: targetProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", targetId)
        .maybeSingle<Profile>();
      if (targetProfile) {
        return {
          profile: targetProfile,
          userId: targetId,
          viewingAs: {
            adminId: realProfile.id,
            adminName: realProfile.full_name || "Admin",
            targetName: targetProfile.full_name || "Usuário",
          },
        };
      }
    }
  }

  return { profile: realProfile, userId: user.id, viewingAs: null };
}

export async function requireRole(
  ...roles: Role[]
): Promise<{ profile: Profile; viewingAs: ViewingAs | null }> {
  const { profile, viewingAs } = await requireProfile();
  if (!roles.includes(profile.role)) redirect(homeFor(profile.role));
  return { profile, viewingAs };
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
export function statusDayCutoffUTC(): Date {
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
