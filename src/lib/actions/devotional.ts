"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { PrayerScope } from "@/lib/types";

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
}

// ---------------------------------------------------------------- oração

export async function createPrayerRequest(_prev: Result | null, formData: FormData): Promise<Result> {
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
}

export async function togglePrayerAnswered(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase, userId } = await currentUser();
  const id = String(formData.get("id") ?? "");
  const answered = formData.get("answered") === "true";
  if (!id) return { error: "Pedido inválido." };

  const { error } = await supabase
    .from("prayer_requests")
    .update({ is_answered: answered, answered_at: answered ? new Date().toISOString() : null })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return { error: "Não foi possível atualizar o pedido." };

  revalidateDevotional();
  return { ok: true };
}

export async function togglePrayerReminder(_prev: Result | null, formData: FormData): Promise<Result> {
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
}

export async function deletePrayerRequest(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase, userId } = await currentUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Pedido inválido." };

  const { error } = await supabase.from("prayer_requests").delete().eq("id", id).eq("user_id", userId);
  if (error) return { error: "Não foi possível remover o pedido." };

  revalidateDevotional();
  return { ok: true };
}

// ---------------------------------------------------------------- favoritos

export async function addFavoriteVerse(_prev: Result | null, formData: FormData): Promise<Result> {
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
}

export async function deleteFavoriteVerse(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase, userId } = await currentUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Favorito inválido." };

  const { error } = await supabase.from("devotional_favorites").delete().eq("id", id).eq("user_id", userId);
  if (error) return { error: "Não foi possível remover." };

  revalidateDevotional();
  return { ok: true };
}
