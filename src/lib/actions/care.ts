"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CareMeetingModality } from "@/lib/types";

type Result = { error?: string; ok?: boolean };

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  return { supabase, userId: user.id };
}

function revalidateCare() {
  revalidatePath("/app/status");
  revalidatePath("/app/cria");
  revalidatePath("/app/lider");
  revalidatePath("/app/lider/status-crias");
}

/** O cria propõe um dia (online/presencial) pra conversar com o líder. */
export async function requestCareMeeting(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase } = await currentUser();

  const modality = String(formData.get("modality") ?? "") as CareMeetingModality;
  const date = String(formData.get("proposed_date") ?? "");
  const time = String(formData.get("proposed_time") ?? "") || null;
  const note = String(formData.get("note") ?? "").trim() || null;
  const statusResponseId = String(formData.get("status_response_id") ?? "") || null;

  if (!["online", "presencial"].includes(modality)) return { error: "Escolha a modalidade." };
  if (!date) return { error: "Escolha uma data." };

  const { error } = await supabase.rpc("request_care_meeting", {
    p_modality: modality,
    p_date: date,
    p_time: time,
    p_note: note,
    p_status_response: statusResponseId,
  });

  if (error) return { error: error.message };

  revalidateCare();
  return { ok: true };
}

/** Líder aprova a conversa ou propõe outro dia/horário/modalidade. */
export async function respondCareMeeting(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase } = await currentUser();

  const id = String(formData.get("id") ?? "");
  const approve = String(formData.get("approve") ?? "") === "true";
  const date = String(formData.get("proposed_date") ?? "") || null;
  const time = String(formData.get("proposed_time") ?? "") || null;
  const modality = String(formData.get("modality") ?? "") || null;

  if (!id) return { error: "Conversa inválida." };

  const { error } = await supabase.rpc("respond_care_meeting", {
    p_id: id,
    p_approve: approve,
    p_date: date,
    p_time: time,
    p_modality: modality,
  });

  if (error) return { error: error.message };

  revalidateCare();
  return { ok: true };
}

/** Cria aceita a nova data proposta pelo líder. */
export async function acceptCareMeeting(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase } = await currentUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Conversa inválida." };

  const { error } = await supabase.rpc("accept_care_meeting", { p_id: id });
  if (error) return { error: error.message };

  revalidateCare();
  return { ok: true };
}

export async function cancelCareMeeting(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase } = await currentUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Conversa inválida." };

  const { error } = await supabase.rpc("cancel_care_meeting", { p_id: id });
  if (error) return { error: error.message };

  revalidateCare();
  return { ok: true };
}

/** Líder registra o que foi feito depois de um alerta de status "Mal". */
export async function resolveStatusAlert(_prev: Result | null, formData: FormData): Promise<Result> {
  const { supabase } = await currentUser();
  const statusResponseId = String(formData.get("status_response_id") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!statusResponseId) return { error: "Resposta inválida." };
  if (!note) return { error: "Escreva o que foi feito." };

  const { error } = await supabase.rpc("resolve_status_alert", {
    p_status_response: statusResponseId,
    p_note: note,
  });

  if (error) return { error: error.message };

  revalidateCare();
  return { ok: true };
}
