"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteVideo, headVideo, presignVideoUpload, r2Configured } from "@/lib/r2";

type Result = { error?: string; ok?: boolean };
type UploadPlan = { error: string } | { uploadId: string; uploadUrl: string; contentType: string };

const ALLOWED_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
/** Mensagens que o banco escreve em português — o resto vira um aviso genérico. */
const KNOWN = /^(Faça login|Só líderes|Vídeos estão|O vídeo|Vídeo inválido|Você já postou|O limite de vídeos)/;

/** 1º passo: confere os limites e reserva a cota do dia; devolve o endereço assinado pra enviar o arquivo. */
export async function requestStoryVideoUpload(input: {
  bytes: number;
  seconds: number;
  contentType: string;
}): Promise<UploadPlan> {
  if (!r2Configured()) return { error: "Vídeo ainda não está disponível." };
  const contentType = String(input.contentType ?? "").toLowerCase();
  if (!ALLOWED_TYPES.has(contentType)) return { error: "Formato de vídeo não aceito. Use MP4." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data, error } = await supabase.rpc("reserve_video_upload", {
    p_bytes: Math.round(Number(input.bytes)),
    p_seconds: Number(input.seconds),
  });
  if (error) return { error: KNOWN.test(error.message) ? error.message : "Não foi possível enviar o vídeo agora." };

  const row = (data as { upload_id: string; object_key: string }[] | null)?.[0];
  if (!row) return { error: "Não foi possível enviar o vídeo agora." };

  const uploadUrl = await presignVideoUpload(row.object_key, contentType);
  if (!uploadUrl) {
    await supabase.rpc("release_video_upload", { p_upload: row.upload_id });
    return { error: "Vídeo ainda não está disponível." };
  }
  return { uploadId: row.upload_id, uploadUrl, contentType };
}

/** Quando o envio falha ou a pessoa desiste: devolve a cota reservada e apaga o que subiu. */
export async function cancelStoryVideoUpload(uploadId: string): Promise<void> {
  if (!uploadId) return;
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !admin) return;
  const { data: up } = await admin
    .from("video_uploads")
    .select("object_key, status")
    .eq("id", uploadId)
    .eq("user_id", user.id)
    .maybeSingle<{ object_key: string; status: string }>();
  if (!up || up.status !== "reserved") return;
  await supabase.rpc("release_video_upload", { p_upload: uploadId });
  await deleteVideo(up.object_key);
}

/** 2º passo: o arquivo já está no R2 — o servidor confere o tamanho real e só então publica o story. */
export async function createStoryVideoPost(_prev: Result | null, formData: FormData): Promise<Result> {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  if (!admin) return { error: "Não foi possível publicar." };

  const uploadId = String(formData.get("upload_id") ?? "");
  const posterPath = String(formData.get("image_path") ?? "").trim();
  const caption = String(formData.get("caption") ?? "").trim().slice(0, 280) || null;
  const seconds = Math.min(15.5, Math.max(0, Number(formData.get("seconds") ?? 0)));
  if (!uploadId || !posterPath) return { error: "Envie o vídeo de novo." };
  // a capa tem que ser do próprio usuário (pasta dele no Storage)
  if (!posterPath.startsWith(`${user.id}/`)) return { error: "Capa inválida." };

  const { data: up } = await admin
    .from("video_uploads")
    .select("id, object_key, bytes, status")
    .eq("id", uploadId)
    .eq("user_id", user.id)
    .maybeSingle<{ id: string; object_key: string; bytes: number; status: string }>();
  if (!up || up.status !== "reserved") return { error: "Esse envio expirou. Tente de novo." };

  const head = await headVideo(up.object_key);
  if (!head || head.bytes < 1) {
    await supabase.rpc("release_video_upload", { p_upload: up.id });
    return { error: "O vídeo não chegou. Tente de novo." };
  }
  if (head.bytes > up.bytes || !ALLOWED_TYPES.has(head.contentType.toLowerCase())) {
    await supabase.rpc("release_video_upload", { p_upload: up.id });
    await deleteVideo(up.object_key);
    return { error: "O arquivo enviado não confere. Tente de novo." };
  }

  const { error: finishErr } = await admin.rpc("finish_video_upload", { p_upload: up.id, p_actual_bytes: head.bytes });
  if (finishErr) {
    await deleteVideo(up.object_key);
    return { error: "Não foi possível publicar." };
  }

  const { error } = await admin.from("story_posts").insert({
    author_id: user.id,
    image_path: posterPath,
    caption,
    media_type: "video",
    video_key: up.object_key,
    video_bytes: head.bytes,
    video_seconds: Math.round(seconds * 10) / 10,
  });
  if (error) {
    await supabase.rpc("release_video_upload", { p_upload: up.id });
    await admin.from("video_uploads").update({ status: "released" }).eq("id", up.id);
    await deleteVideo(up.object_key);
    await supabase.storage.from("stories").remove([posterPath]);
    return { error: "Não foi possível publicar." };
  }

  revalidatePath("/app", "layout");
  return { ok: true };
}
