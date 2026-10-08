"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayBR } from "@/lib/games/engine";
import { gameOpenFor } from "@/lib/games/releaseServer";
import { cleanBeauty } from "@/lib/games/dress/beauty";
import { juryStars, practiceTheme, scoreLook } from "@/lib/games/dress/engine";
import { ITEM_BY_ID, SLOTS } from "@/lib/games/dress/items";
import { cleanLook, runwayTheme, votingDates } from "@/lib/games/dress/runway";
import { DRESS_GRACE_SECONDS, DRESS_SECONDS, PUBLISH_TICKETS } from "@/lib/games/dress/rules";

async function player() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data: profile } = await supabase.from("profiles").select("id, role").eq("id", user.id).maybeSingle<{ id: string; role: string }>();
  if (!profile || (profile.role !== "cria" && profile.role !== "leader" && profile.role !== "admin")) redirect("/");
  const admin = createAdminClient();
  if (!admin) throw new Error("Jogos indisponíveis no momento.");
  return { admin, userId: profile.id };
}

const CLOSED = "O Vista o Herói abre no dia 09/10. Volte lá!";

/** O que o júri bíblico achou do look (mostrado depois de publicar ou no treino). */
export type JuryResult = {
  stars: number;
  fidelity: number;
  slots: { slot: string; label: string; picked: string; ideal: string; points: 0 | 1 | 2; note: string }[];
};

function jury(characterId: string, look: Record<string, string | undefined>): JuryResult {
  const { score, slots } = scoreLook(characterId, look);
  return {
    stars: juryStars(score),
    fidelity: score,
    slots: slots.map((r) => ({
      slot: r.slot,
      label: SLOTS.find((s) => s.key === r.slot)?.label ?? r.slot,
      picked: ITEM_BY_ID.get(r.picked)?.name ?? "",
      ideal: ITEM_BY_ID.get(r.ideal)?.name ?? "",
      points: r.points,
      note: r.note,
    })),
  };
}

/** Entra no camarim: o relógio de montar o look começa aqui (um look por dia). */
export async function startCamarim(): Promise<{ error?: string }> {
  const c = await player();
  if (!(await gameOpenFor("dress", c.userId))) return { error: CLOSED };
  const date = todayBR();
  const { data: mine } = await c.admin.from("dress_runway_looks").select("id").eq("user_id", c.userId).eq("theme_date", date).maybeSingle();
  if (mine) return { error: "Você já publicou o seu look de hoje." };

  const { data: row } = await c.admin.from("dress_camarim").select("started_at").eq("user_id", c.userId).eq("play_date", date).maybeSingle<{ started_at: string }>();
  const expired = !row || Date.now() - new Date(row.started_at).getTime() > (DRESS_SECONDS + DRESS_GRACE_SECONDS) * 1000;
  if (expired) {
    const { error } = await c.admin.from("dress_camarim").upsert({ user_id: c.userId, play_date: date, started_at: new Date().toISOString() }, { onConflict: "user_id,play_date" });
    if (error) return { error: "Não foi possível entrar no camarim. Tente de novo." };
  }
  return {};
}

export type PublishResult = { error?: string; jury?: JuryResult; tickets?: number };

/** Publica o look do dia no desfile (um por dia, não dá pra trocar depois). */
export async function submitRunwayLook(items: unknown, beauty: unknown): Promise<PublishResult> {
  const c = await player();
  if (!(await gameOpenFor("dress", c.userId))) return { error: CLOSED };
  const look = cleanLook(items);
  if (!look) return { error: "Escolha uma roupa para o seu look." };

  const date = todayBR();
  const { data: cam } = await c.admin.from("dress_camarim").select("started_at").eq("user_id", c.userId).eq("play_date", date).maybeSingle<{ started_at: string }>();
  if (!cam) return { error: "Entre no camarim para montar o look." };
  const elapsed = Math.round((Date.now() - new Date(cam.started_at).getTime()) / 1000);
  if (elapsed > DRESS_SECONDS + DRESS_GRACE_SECONDS) {
    await c.admin.from("dress_camarim").delete().eq("user_id", c.userId).eq("play_date", date);
    return { error: "O tempo acabou. Entre no camarim de novo." };
  }

  const theme = runwayTheme(date);
  const result = jury(theme.id, look);
  const { error } = await c.admin.from("dress_runway_looks").insert({
    user_id: c.userId,
    theme_date: date,
    theme_character: theme.id,
    items: look,
    beauty: cleanBeauty(beauty),
    elapsed: Math.min(elapsed, DRESS_SECONDS),
    fidelity: result.fidelity,
  });
  if (error) return { error: error.code === "23505" ? "Você já publicou o seu look de hoje." : "Não foi possível publicar. Tente de novo." };

  const tickets = PUBLISH_TICKETS + Math.floor(result.fidelity / 2);
  await c.admin.rpc("dress_apply_result", { p_user: c.userId, p_delta: tickets, p_perfect: false });
  revalidatePath("/app/jogos/vestir", "layout");
  return { jury: result, tickets };
}

/** Treino: monta o look de um tema sorteado e recebe a nota do júri, sem publicar nem ganhar bilhetes. */
export async function judgePractice(items: unknown, n: number): Promise<PublishResult> {
  const c = await player();
  if (!(await gameOpenFor("dress", c.userId))) return { error: CLOSED };
  const look = cleanLook(items);
  if (!look) return { error: "Escolha uma roupa para o seu look." };
  const theme = practiceTheme(todayBR(), Math.max(1, Math.min(99, Math.floor(Number(n)) || 1)));
  return { jury: jury(theme.id, look), tickets: 0 };
}

/** Dá de 1 a 5 estrelas a um look (hoje ou ontem). Uma nota por look, não dá pra trocar nem avaliar o próprio. */
export async function rateRunwayLook(lookId: string, stars: number): Promise<{ error?: string }> {
  const c = await player();
  if (!(await gameOpenFor("dress", c.userId))) return { error: CLOSED };
  const n = Math.floor(Number(stars));
  if (!(n >= 1 && n <= 5)) return { error: "Escolha de 1 a 5 estrelas." };
  const { data: look } = await c.admin.from("dress_runway_looks").select("id, user_id, theme_date, hidden").eq("id", lookId).maybeSingle<{ id: string; user_id: string; theme_date: string; hidden: boolean }>();
  if (!look || look.hidden) return { error: "Look não encontrado." };
  if (look.user_id === c.userId) return { error: "Você não pode avaliar o seu próprio look." };
  if (!votingDates(todayBR()).includes(look.theme_date)) return { error: "A votação deste dia já fechou." };

  const { error } = await c.admin.from("dress_runway_votes").insert({ look_id: look.id, voter_id: c.userId, theme_date: look.theme_date, stars: n });
  if (error) return { error: error.code === "23505" ? "Você já avaliou este look." : "Não foi possível avaliar. Tente de novo." };
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
