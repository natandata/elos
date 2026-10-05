"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayBR } from "@/lib/games/engine";
import { gameOpenFor } from "@/lib/games/releaseServer";
import { MAX_VOTES_PER_DAY, cleanLook, fidelityOf, runwayTheme, votingDates } from "@/lib/games/dress/runway";

async function player() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data: profile } = await supabase.from("profiles").select("id, role").eq("id", user.id).maybeSingle<{ id: string; role: string }>();
  if (!profile || (profile.role !== "cria" && profile.role !== "leader")) redirect("/");
  const admin = createAdminClient();
  if (!admin) throw new Error("Jogos indisponíveis no momento.");
  return { admin, userId: profile.id };
}

const CLOSED = "O Vista o Herói abre no dia 09/10. Volte lá!";

/** Publica o seu look do dia na Passarela (um por dia, não dá pra trocar depois). */
export async function submitRunwayLook(items: unknown): Promise<{ error?: string }> {
  const c = await player();
  if (!(await gameOpenFor("dress", c.userId))) return { error: CLOSED };
  const look = cleanLook(items);
  if (!look) return { error: "Escolha uma peça em cada espaço." };

  const date = todayBR();
  const theme = runwayTheme(date);
  const { error } = await c.admin.from("dress_runway_looks").insert({
    user_id: c.userId,
    theme_date: date,
    theme_character: theme.id,
    items: look,
    fidelity: fidelityOf(theme.id, look),
  });
  if (error) return { error: error.code === "23505" ? "Você já publicou o seu look de hoje." : "Não foi possível publicar. Tente de novo." };
  revalidatePath("/app/jogos/vestir/passarela");
  return {};
}

/** Vota num look (hoje ou ontem). Sem votar em si mesmo, 1 voto por look, até 5 por dia de tema. */
export async function voteRunwayLook(lookId: string): Promise<{ error?: string }> {
  const c = await player();
  if (!(await gameOpenFor("dress", c.userId))) return { error: CLOSED };
  const { data: look } = await c.admin.from("dress_runway_looks").select("id, user_id, theme_date, hidden").eq("id", lookId).maybeSingle<{ id: string; user_id: string; theme_date: string; hidden: boolean }>();
  if (!look || look.hidden) return { error: "Look não encontrado." };
  if (look.user_id === c.userId) return { error: "Você não pode votar no seu próprio look." };
  if (!votingDates(todayBR()).includes(look.theme_date)) return { error: "A votação deste dia já fechou." };

  const { count } = await c.admin.from("dress_runway_votes").select("look_id", { count: "exact", head: true }).eq("voter_id", c.userId).eq("theme_date", look.theme_date);
  if ((count ?? 0) >= MAX_VOTES_PER_DAY) return { error: `Você já usou os ${MAX_VOTES_PER_DAY} votos deste dia.` };

  const { error } = await c.admin.from("dress_runway_votes").insert({ look_id: look.id, voter_id: c.userId, theme_date: look.theme_date });
  if (error) return { error: error.code === "23505" ? "Você já votou neste look." : "Não foi possível votar. Tente de novo." };
  revalidatePath("/app/jogos/vestir/passarela");
  return {};
}

/** Admin: esconde (ou volta a mostrar) um look da Passarela. */
export async function hideRunwayLook(lookId: string, hidden: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle<{ role: string }>();
  if (me?.role !== "admin") return { error: "Só o admin pode fazer isso." };
  const admin = createAdminClient();
  if (!admin) return { error: "Indisponível no momento." };
  const { error } = await admin.from("dress_runway_looks").update({ hidden }).eq("id", lookId);
  if (error) return { error: "Não foi possível atualizar." };
  revalidatePath("/app/admin/passarela");
  return {};
}
