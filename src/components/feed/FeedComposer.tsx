"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createFeedPost } from "@/lib/actions/feed";
import { createStoryPost } from "@/lib/actions/stories";
import { addGalleryPost } from "@/lib/actions/gallery";
import { cancelStoryVideoUpload, createStoryVideoPost, requestStoryVideoUpload } from "@/lib/actions/storyVideo";
import { VIDEO_MAX_BYTES, VIDEO_MAX_SECONDS, VIDEO_TYPES, putWithProgress, readVideo } from "@/lib/videoPrep";
import { Feedback, SubmitBtn } from "@/components/forms";
import { compressImage } from "@/lib/imageCompress";
import { PlusSquareIcon } from "./icons";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_CAROUSEL = 10;

type Destination = "explorar" | "story" | "feed" | null;

const BUCKET_BY_DESTINATION: Record<Exclude<Destination, null>, string> = {
  explorar: "feed",
  story: "stories",
  feed: "profile_gallery",
};

const TITLE_BY_DESTINATION: Record<Exclude<Destination, null>, string> = {
  explorar: "Postar no Explorar",
  story: "Postar Story",
  feed: "Adicionar ao Feed",
};

const HINT_BY_DESTINATION: Record<Exclude<Destination, null>, string> = {
  explorar: "A foto some pra todo mundo depois de 24h.",
  story: "Foto ou vídeo de até 15 s — visto por todos nas bolinhas do Explorar, some em 24h.",
  feed: "Fica fixa no seu perfil até você remover.",
};

/** Botão discreto "+" que deixa escolher o destino: Explorar, Story ou Feed (galeria fixa do perfil). */
export function FeedComposer({
  userId,
  galleryFull = false,
  dailyPrompt,
}: {
  userId: string;
  galleryFull?: boolean;
  /** Tema do dia (mesmo pra todo mundo) — mostrado só na hora de postar no Explorar. */
  dailyPrompt?: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [explorarState, explorarAction] = useActionState(createFeedPost, null);
  const [storyState, storyAction] = useActionState(createStoryPost, null);
  const [videoState, videoAction] = useActionState(createStoryVideoPost, null);
  const [galleryState, galleryAction] = useActionState(addGalleryPost, null);
  const [open, setOpen] = useState(false);
  const [destination, setDestination] = useState<Destination>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imagePath, setImagePath] = useState("");
  // Explorar: até 10 fotos (carrossel). A primeira é a capa.
  const [photos, setPhotos] = useState<{ path: string; preview: string }[]>([]);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [themeConfirmed, setThemeConfirmed] = useState(false);
  // vídeo de story: reserva da cota, duração e andamento do envio
  const [isVideo, setIsVideo] = useState(false);
  const [videoUploadId, setVideoUploadId] = useState("");
  const [videoSeconds, setVideoSeconds] = useState(0);
  const [progress, setProgress] = useState(0);
  const videoUploadRef = useRef("");

  const actionByDestination = {
    explorar: explorarAction,
    story: storyAction,
    feed: galleryAction,
  } as const;
  const state = destination
    ? { explorar: explorarState, story: isVideo ? videoState : storyState, feed: galleryState }[destination]
    : null;

  function reset() {
    // vídeo enviado mas não publicado: devolve a cota do dia e apaga o arquivo
    if (videoUploadRef.current) {
      cancelStoryVideoUpload(videoUploadRef.current).catch(() => {});
      videoUploadRef.current = "";
    }
    setIsVideo(false);
    setVideoUploadId("");
    setVideoSeconds(0);
    setProgress(0);
    setDestination(null);
    setPreview(null);
    setImagePath("");
    setPhotos([]);
    setCaption("");
    setUploadError(null);
    setThemeConfirmed(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function openModal() {
    reset();
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    reset();
  }

  async function handleVideo(file: File) {
    if (!VIDEO_TYPES.includes(file.type)) return setUploadError("Use um vídeo em MP4.");
    if (file.size > VIDEO_MAX_BYTES) return setUploadError("O vídeo passa de 70 MB.");

    setUploading(true);
    setProgress(0);
    let info: Awaited<ReturnType<typeof readVideo>>;
    try {
      info = await readVideo(file);
    } catch {
      setUploading(false);
      return setUploadError("Não consegui ler esse vídeo. Tente outro.");
    }
    if (info.seconds > VIDEO_MAX_SECONDS + 0.5) {
      setUploading(false);
      return setUploadError(`O vídeo precisa ter no máximo ${VIDEO_MAX_SECONDS} segundos.`);
    }

    const plan = await requestStoryVideoUpload({ bytes: file.size, seconds: info.seconds, contentType: file.type });
    if ("error" in plan) {
      setUploading(false);
      return setUploadError(plan.error);
    }

    const posterPath = `${userId}/${crypto.randomUUID()}.jpg`;
    const posterUp = await supabase.storage.from("stories").upload(posterPath, info.poster, { contentType: "image/jpeg" });
    if (posterUp.error) {
      await cancelStoryVideoUpload(plan.uploadId).catch(() => {});
      setUploading(false);
      return setUploadError("Não foi possível enviar o vídeo. Tente de novo.");
    }

    const sent = await putWithProgress(plan.uploadUrl, file, plan.contentType, setProgress);
    setUploading(false);
    if (!sent) {
      await cancelStoryVideoUpload(plan.uploadId).catch(() => {});
      await supabase.storage.from("stories").remove([posterPath]);
      return setUploadError("O envio falhou. Confira a conexão e tente de novo.");
    }

    videoUploadRef.current = plan.uploadId;
    setVideoUploadId(plan.uploadId);
    setVideoSeconds(info.seconds);
    setIsVideo(true);
    setImagePath(posterPath);
    setPreview(URL.createObjectURL(file));
  }

  async function addExplorarPhotos(files: File[]) {
    const room = MAX_CAROUSEL - photos.length;
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) return setUploadError("Escolha arquivos de imagem.");
    if (room <= 0) return setUploadError(`Um carrossel tem até ${MAX_CAROUSEL} fotos.`);
    const picked = images.slice(0, room);

    setUploading(true);
    let skipped = images.length - picked.length;
    for (const file of picked) {
      if (file.size > MAX_BYTES) {
        skipped++;
        continue;
      }
      const upload = await compressImage(file);
      const ext = upload.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("feed").upload(path, upload, { contentType: upload.type });
      if (error) {
        skipped++;
        continue;
      }
      const preview = URL.createObjectURL(file);
      setPhotos((cur) => [...cur, { path, preview }]);
    }
    setUploading(false);
    if (skipped > 0) setUploadError(`${skipped} foto(s) não entraram (limite de ${MAX_CAROUSEL} fotos ou 5 MB cada).`);
  }

  function removePhoto(index: number) {
    setPhotos((cur) => {
      const gone = cur[index];
      if (gone) supabase.storage.from("feed").remove([gone.path]).catch(() => {});
      return cur.filter((_, i) => i !== index);
    });
  }

  function handleFiles(list: FileList | null) {
    const files = Array.from(list ?? []);
    setUploadError(null);
    if (fileRef.current) fileRef.current.value = ""; // deixa escolher a mesma foto de novo
    if (destination === "explorar") return addExplorarPhotos(files);
    return handleFile(files[0] ?? null);
  }

  async function handleFile(file: File | null) {
    setUploadError(null);
    if (!file || !destination) return;
    if (destination === "story" && file.type.startsWith("video/")) return handleVideo(file);
    if (!file.type.startsWith("image/")) return setUploadError("Escolha um arquivo de imagem.");
    if (file.size > MAX_BYTES) return setUploadError("A imagem precisa ter no máximo 5 MB.");

    setUploading(true);
    // reduz antes de subir: a foto da câmera tem ~2–5 MB e aparece em
    // ~400px na tela — subir o original torra a cota de tráfego
    const upload = await compressImage(file);
    const ext = upload.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const bucket = BUCKET_BY_DESTINATION[destination];

    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, upload, { contentType: upload.type });

    setUploading(false);
    if (error) return setUploadError("Não foi possível enviar a imagem. Tente de novo.");

    setImagePath(path);
    setPreview(URL.createObjectURL(file));
  }

  // a bolinha "Seu story" do topo abre direto o envio de story
  useEffect(() => {
    function openStory() {
      reset();
      setDestination("story");
      setOpen(true);
    }
    window.addEventListener("elogram:compose-story", openStory);
    return () => window.removeEventListener("elogram:compose-story", openStory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (explorarState?.ok || storyState?.ok || videoState?.ok || galleryState?.ok) {
      videoUploadRef.current = ""; // publicado: não devolver a cota
      closeModal();
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [explorarState, storyState, videoState, galleryState]);

  return (
    <>
      <button
        type="button"
        data-tour="feed-composer"
        onClick={openModal}
        aria-label="Postar"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--ink)] hover:bg-[var(--card)]"
      >
        <PlusSquareIcon size={28} />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card w-full max-w-sm p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-bold">{destination ? TITLE_BY_DESTINATION[destination] : "Postar"}</p>
              <button type="button" onClick={closeModal} className="text-[var(--muted)]">
                ✕
              </button>
            </div>

            {!destination ? (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setDestination("explorar")}
                  className="w-full rounded-xl border border-[var(--line)] p-3 text-left hover:border-[var(--accent)]"
                >
                  <p className="font-bold">Explorar</p>
                  <p className="text-xs text-[var(--muted)]">Visto por todo mundo — some em 24h.</p>
                </button>
                <button
                  type="button"
                  onClick={() => setDestination("story")}
                  className="w-full rounded-xl border border-[var(--line)] p-3 text-left hover:border-[var(--accent)]"
                >
                  <p className="font-bold">Story</p>
                  <p className="text-xs text-[var(--muted)]">Foto ou vídeo (até 15 s) nas bolinhas do Explorar — visto por todos, some em 24h.</p>
                </button>
                {galleryFull ? (
                  <div className="w-full rounded-xl border border-[var(--line)] p-3 text-left opacity-60">
                    <p className="font-bold">Feed</p>
                    <p className="text-xs text-[var(--muted)]">
                      Sua galeria está cheia.{" "}
                      <Link href="/app/perfil" className="underline" onClick={closeModal}>
                        Gerenciar
                      </Link>
                    </p>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDestination("feed")}
                    className="w-full rounded-xl border border-[var(--line)] p-3 text-left hover:border-[var(--accent)]"
                  >
                    <p className="font-bold">Feed</p>
                    <p className="text-xs text-[var(--muted)]">Fica fixo no seu perfil (até 3 fotos).</p>
                  </button>
                )}
              </div>
            ) : (
              <>
                <p className="mb-1 text-xs text-[var(--muted)]">{HINT_BY_DESTINATION[destination]}</p>
                {destination === "explorar" && dailyPrompt ? (
                  <p className="mb-3 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-[var(--accent-strong)]">
                    💡 Tema de hoje: {dailyPrompt}
                    <span className="chip border-[var(--accent)] bg-[var(--accent-soft)] !px-1.5 !py-0">
                      +1 XP
                    </span>
                  </p>
                ) : (
                  <div className="mb-3" />
                )}

                <input
                  ref={fileRef}
                  type="file"
                  accept={destination === "story" ? "image/*,video/*" : "image/*"}
                  multiple={destination === "explorar"}
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />

                {destination === "explorar" && photos.length > 0 ? (
                  <div className="mb-3">
                    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {photos.map((ph, i) => (
                        <div key={ph.path} className="relative h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-[var(--card)]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={ph.preview} alt="" className="h-full w-full object-cover" />
                          {i === 0 ? (
                            <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[10px] font-semibold text-white">capa</span>
                          ) : null}
                          <button
                            type="button"
                            aria-label="Remover foto"
                            onClick={() => removePhoto(i)}
                            className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/65 text-xs leading-none text-white"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      {photos.length < MAX_CAROUSEL ? (
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click()}
                          disabled={uploading}
                          className="flex h-24 w-20 shrink-0 flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--line)] text-2xl text-[var(--muted)] hover:border-[var(--accent)]"
                        >
                          {uploading ? <span className="text-xs">…</span> : "+"}
                        </button>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {photos.length}/{MAX_CAROUSEL} fotos{photos.length > 1 ? " — vira um carrossel" : ""}
                    </p>
                  </div>
                ) : preview && isVideo ? (
                  <video src={preview} controls playsInline muted className="mb-3 max-h-72 w-full rounded-xl bg-black object-contain" />
                ) : preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="" className="mb-3 max-h-64 w-full rounded-xl object-cover" />
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="mb-3 flex h-32 w-full items-center justify-center rounded-xl border-2 border-dashed border-[var(--line)] text-sm text-[var(--muted)] hover:border-[var(--accent)]"
                  >
                    {uploading
                      ? progress > 0
                        ? `Enviando vídeo… ${Math.round(progress * 100)}%`
                        : "Enviando…"
                      : destination === "story"
                        ? "Toque para escolher uma foto ou vídeo (até 15 s)"
                        : destination === "explorar"
                          ? "Toque para escolher até 10 fotos"
                          : "Toque para escolher uma foto"}
                  </button>
                )}

                {uploadError ? <p className="mb-2 text-xs text-red-700">{uploadError}</p> : null}

                {(destination === "explorar" ? photos.length > 0 : imagePath) ? (
                  <form action={isVideo ? videoAction : actionByDestination[destination]} className="space-y-2">
                    <input type="hidden" name="image_path" value={destination === "explorar" ? photos[0]?.path ?? "" : imagePath} />
                    {destination === "explorar" ? (
                      <input type="hidden" name="extra_paths" value={JSON.stringify(photos.slice(1).map((p) => p.path))} />
                    ) : null}
                    {isVideo ? (
                      <>
                        <input type="hidden" name="upload_id" value={videoUploadId} />
                        <input type="hidden" name="seconds" value={videoSeconds} />
                      </>
                    ) : null}
                    <textarea
                      name="caption"
                      rows={2}
                      maxLength={280}
                      placeholder="Legenda (opcional)"
                      className="input"
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                    />
                    {destination === "explorar" ? (
                      <>
                        <input type="hidden" name="theme_confirmed" value={themeConfirmed ? "true" : "false"} />
                        <label className="flex items-start gap-2 rounded-xl border border-[var(--line)] p-2.5 text-xs">
                          <input
                            type="checkbox"
                            checked={themeConfirmed}
                            onChange={(e) => setThemeConfirmed(e.target.checked)}
                            className="mt-0.5"
                          />
                          <span>
                            Esse post é pra cumprir o tema do dia?{" "}
                            <span className="font-semibold text-[var(--accent-strong)]">+1 XP</span>
                          </span>
                        </label>
                      </>
                    ) : null}
                    <Feedback state={state} />
                    <div className="flex gap-2">
                      <SubmitBtn className="btn btn-primary !py-2 !text-sm" pendingLabel="Publicando…">
                        Publicar
                      </SubmitBtn>
                      <button
                        type="button"
                        onClick={() => {
                          if (videoUploadRef.current) {
                            cancelStoryVideoUpload(videoUploadRef.current).catch(() => {});
                            videoUploadRef.current = "";
                          }
                          setIsVideo(false);
                          setVideoUploadId("");
                          setPreview(null);
                          setImagePath("");
                          if (photos.length > 0) {
                            supabase.storage.from("feed").remove(photos.map((p) => p.path)).catch(() => {});
                            setPhotos([]);
                          }
                        }}
                        className="btn btn-ghost !py-2 !text-sm"
                      >
                        {isVideo ? "Trocar vídeo" : destination === "explorar" ? "Limpar fotos" : "Trocar foto"}
                      </button>
                    </div>
                  </form>
                ) : null}
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
