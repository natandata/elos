"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendPushToUsers } from "@/lib/push-server";
import type { PrayerScope } from "@/lib/types";
import { isFrameworkFlowError, NETWORK_ERROR_MESSAGE } from "./errorHandling";

type Result = { error?: string; ok?: boolean };

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  return { supabase, userId: user.id };
}

function revalidateDevotional() {
  revalidatePath("/app/devocional");
}

// ---------------------------------------------------------------- diário

/** Salva (cria ou atualiza) a anotação do dia — uma por dia, upsert por data. */
export async function saveDiaryEntry(_prev: Result | null, formData: FormData): Promise<Result> {
  try {
    const { supabase, userId } = await currentUser();
    const content = String(formData.get("content") ?? "").trim();
    const entryDate = String(formData.get("entry_date") ?? "");

    if (!content) return { error: "Escreva algo antes de salvar." };
    if (content.length > 4000) return { error: "Anotação muito longa (máx. 4000 caracteres)." };
    if (!entryDate) return { error: "Data inválida." };

    const { error } = await supabase
      .from("devotional_entries")
      .upsert(
        { user_id: userId, entry_date: entryDate, content, updated_at: new Date().toISOString() },
        { onConflict: "user_id,entry_date" },
      );

    if (error) return { error: "Não foi possível salvar sua anotação." };

    // conta como "dia de devocional preenchido" pra ofensiva
    await supabase.rpc("record_devotional_streak");

    revalidateDevotional();
    return { ok: true };
  } catch (err) {
    if (isFrameworkFlowError(err)) throw err;
    console.error("saveDiaryEntry falhou:", err);
    return { error: NETWORK_ERROR_MESSAGE };
  }
}

// ---------------------------------------------------------------- oração

export async function createPrayerRequest(_prev: Result | null, formData: FormData): Promise<Result> {
  try {
    const { supabase, userId } = await currentUser();
    const title = String(formData.get("title") ?? "").trim();
    const scope = String(formData.get("scope") ?? "personal") as PrayerScope;
    const reminderEnabled = formData.get("reminder_enabled") === "true";

    if (!title) return { error: "Escreva o pedido de oração." };
    if (title.length > 500) return { error: "Pedido muito longo (máx. 500 caracteres)." };
    if (scope !== "personal" && scope !== "elo") return { error: "Tipo de pedido inválido." };

    let eloId: string | null = null;
    if (scope === "elo") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("elo_id")
        .eq("id", userId)
        .maybeSingle<{ elo_id: string | null }>();
      if (!profile?.elo_id) return { error: "Você precisa estar em um Elo pra compartilhar com o Elo." };
      eloId = profile.elo_id;
    }

    const { error } = await supabase.from("prayer_requests").insert({
      user_id: userId,
      title,
      scope,
      elo_id: eloId,
      reminder_enabled: reminderEnabled,
    });

    if (error) return { error: "Não foi possível salvar o pedido." };

    revalidateDevotional();
    return { ok: true };
  } catch (err) {
    if (isFrameworkFlowError(err)) throw err;
    console.error("createPrayerRequest falhou:", err);
    return { error: NETWORK_ERROR_MESSAGE };
  }
}

export async function togglePrayerAnswered(_prev: Result | null, formData: FormData): Promise<Result> {
  try {
    const { supabase, userId } = await currentUser();
    const id = String(formData.get("id") ?? "");
    const answered = formData.get("answered") === "true";
    if (!id) return { error: "Pedido inválido." };

    const { data: updated, error } = await supabase
      .from("prayer_requests")
      .update({ is_answered: answered, answered_at: answered ? new Date().toISOString() : null })
      .eq("id", id)
      .eq("user_id", userId)
      .select("title, scope, elo_id")
      .maybeSingle<{ title: string; scope: PrayerScope; elo_id: string | null }>();

    if (error) return { error: "Não foi possível atualizar o pedido." };

    // Fecha o ciclo: só quem viu o pedido (o Elo, no caso de scope "elo") fica
    // sabendo que a oração foi respondida — pedido pessoal continua privado.
    if (answered && updated?.scope === "elo" && updated.elo_id) {
      const title = "Oração respondida! 🙏";
      const body = updated.title;
      await supabase.rpc("notify_elo_members", {
        p_elo_id: updated.elo_id,
        p_title: title,
        p_body: body,
        p_link: "/app/devocional",
        p_category: "prayer",
        p_exclude: userId,
      });

      const { data: members } = await supabase
        .from("profiles")
        .select("id")
        .eq("elo_id", updated.elo_id)
        .in("role", ["cria", "leader"])
        .neq("id", userId);
      const memberIds = (members ?? []).map((m) => m.id as string);
      if (memberIds.length > 0) {
        await sendPushToUsers(memberIds, { title, body, url: "/app/devocional" });
      }
    }

    revalidateDevotional();
    return { ok: true };
  } catch (err) {
    if (isFrameworkFlowError(err)) throw err;
    console.error("togglePrayerAnswered falhou:", err);
    return { error: NETWORK_ERROR_MESSAGE };
  }
}

/** "Orei por você" — só pra pedidos compartilhados com o Elo, e não pro
 *  próprio dono (a RPC já barra isso). Avisa quem registrou o pedido. */
export async function prayForRequest(_prev: Result | null, formData: FormData): Promise<Result> {
  try {
    const { supabase } = await currentUser();
    const id = String(formData.get("id") ?? "");
    if (!id) return { error: "Pedido inválido." };

    const { data, error } = await supabase
      .rpc("pray_for_request", { p_prayer_id: id })
      .single<{ owner_id: string; notified: boolean }>();

    if (error) return { error: "Não foi possível registrar." };

    if (data?.notified && data.owner_id) {
      await sendPushToUsers([data.owner_id], {
        title: "Alguém orou pelo seu pedido 🙏",
        body: "Toque para ver seus pedidos de oração.",
        url: "/app/devocional",
      });
    }

    revalidateDevotional();
    return { ok: true };
  } catch (err) {
    if (isFrameworkFlowError(err)) throw err;
    console.error("prayForRequest falhou:", err);
    return { error: NETWORK_ERROR_MESSAGE };
  }
}

export async function togglePrayerReminder(_prev: Result | null, formData: FormData): Promise<Result> {
  try {
    const { supabase, userId } = await currentUser();
    const id = String(formData.get("id") ?? "");
    const enabled = formData.get("enabled") === "true";
    if (!id) return { error: "Pedido inválido." };

    const { error } = await supabase
      .from("prayer_requests")
      .update({ reminder_enabled: enabled })
      .eq("id", id)
      .eq("user_id", userId);

    if (error) return { error: "Não foi possível atualizar o lembrete." };

    revalidateDevotional();
    return { ok: true };
  } catch (err) {
    if (isFrameworkFlowError(err)) throw err;
    console.error("togglePrayerReminder falhou:", err);
    return { error: NETWORK_ERROR_MESSAGE };
  }
}

export async function deletePrayerRequest(_prev: Result | null, formData: FormData): Promise<Result> {
  try {
    const { supabase, userId } = await currentUser();
    const id = String(formData.get("id") ?? "");
    if (!id) return { error: "Pedido inválido." };

    const { error } = await supabase.from("prayer_requests").delete().eq("id", id).eq("user_id", userId);
    if (error) return { error: "Não foi possível remover o pedido." };

    revalidateDevotional();
    return { ok: true };
  } catch (err) {
    if (isFrameworkFlowError(err)) throw err;
    console.error("deletePrayerRequest falhou:", err);
    return { error: NETWORK_ERROR_MESSAGE };
  }
}

// ---------------------------------------------------------------- favoritos

export async function addFavoriteVerse(_prev: Result | null, formData: FormData): Promise<Result> {
  try {
    const { supabase, userId } = await currentUser();
    const reference = String(formData.get("reference") ?? "").trim();
    const verseText = String(formData.get("verse_text") ?? "").trim();

    if (!reference || !verseText) return { error: "Preencha a referência e o texto do versículo." };
    if (reference.length > 100) return { error: "Referência muito longa." };
    if (verseText.length > 1000) return { error: "Versículo muito longo (máx. 1000 caracteres)." };

    const { error } = await supabase
      .from("devotional_favorites")
      .insert({ user_id: userId, reference, verse_text: verseText });

    if (error) return { error: "Não foi possível salvar o versículo." };

    revalidateDevotional();
    return { ok: true };
  } catch (err) {
    if (isFrameworkFlowError(err)) throw err;
    console.error("addFavoriteVerse falhou:", err);
    return { error: NETWORK_ERROR_MESSAGE };
  }
}

export async function deleteFavoriteVerse(_prev: Result | null, formData: FormData): Promise<Result> {
  try {
    const { supabase, userId } = await currentUser();
    const id = String(formData.get("id") ?? "");
    if (!id) return { error: "Favorito inválido." };

    const { error } = await supabase.from("devotional_favorites").delete().eq("id", id).eq("user_id", userId);
    if (error) return { error: "Não foi possível remover." };

    revalidateDevotional();
    return { ok: true };
  } catch (err) {
    if (isFrameworkFlowError(err)) throw err;
    console.error("deleteFavoriteVerse falhou:", err);
    return { error: NETWORK_ERROR_MESSAGE };
  }
}
