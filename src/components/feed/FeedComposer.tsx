"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createFeedPost } from "@/lib/actions/feed";
import { addGalleryPost } from "@/lib/actions/gallery";
import { Feedback, SubmitBtn } from "@/components/forms";

const MAX_BYTES = 5 * 1024 * 1024;

type Destination = "explorar" | "feed" | null;

/** Botão discreto "+" que deixa escolher entre postar no Explorar (24h) ou no Feed (galeria fixa do perfil). */
export function FeedComposer({ userId, galleryFull = false }: { userId: string; galleryFull?: boolean }) {
  const router = useRouter();
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [explorarState, explorarAction] = useActionState(createFeedPost, null);
  const [galleryState, galleryAction] = useActionState(addGalleryPost, null);
  const [open, setOpen] = useState(false);
  const [destination, setDestination] = useState<Destination>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imagePath, setImagePath] = useState("");
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const state = destination === "feed" ? galleryState : explorarState;

  function reset() {
    setDestination(null);
    setPreview(null);
    setImagePath("");
    setCaption("");
    setUploadError(null);
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

  async function handleFile(file: File | null) {
    setUploadError(null);
    if (!file || !destination) return;
    if (!file.type.startsWith("image/")) return setUploadError("Escolha um arquivo de imagem.");
    if (file.size > MAX_BYTES) return setUploadError("A imagem precisa ter no máximo 5 MB.");

    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const bucket = destination === "feed" ? "profile_gallery" : "feed";

    const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type });

    setUploading(false);
    if (error) return setUploadError("Não foi possível enviar a imagem. Tente de novo.");

    setImagePath(path);
    setPreview(URL.createObjectURL(file));
  }

  useEffect(() => {
    if (explorarState?.ok || galleryState?.ok) {
      closeModal();
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [explorarState, galleryState]);

  return (
    <>
      <button
        type="button"
        data-tour="feed-composer"
        onClick={openModal}
        aria-label="Postar"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--card)] text-xl leading-none text-[var(--accent-strong)] hover:border-[var(--accent)]"
      >
        +
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card w-full max-w-sm p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-bold">
                {destination === "feed" ? "Adicionar ao Feed" : destination === "explorar" ? "Postar no Explorar" : "Postar"}
              </p>
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
                <p className="mb-3 text-xs text-[var(--muted)]">
                  {destination === "feed"
                    ? "Fica fixa no seu perfil até você remover."
                    : "A foto some pra todo mundo depois de 24h."}
                </p>

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                />

                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="" className="mb-3 max-h-64 w-full rounded-xl object-cover" />
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="mb-3 flex h-32 w-full items-center justify-center rounded-xl border-2 border-dashed border-[var(--line)] text-sm text-[var(--muted)] hover:border-[var(--accent)]"
                  >
                    {uploading ? "Enviando…" : "Toque para escolher uma foto"}
                  </button>
                )}

                {uploadError ? <p className="mb-2 text-xs text-red-700">{uploadError}</p> : null}

                {imagePath ? (
                  <form
                    action={destination === "feed" ? galleryAction : explorarAction}
                    className="space-y-2"
                  >
                    <input type="hidden" name="image_path" value={imagePath} />
                    <textarea
                      name="caption"
                      rows={2}
                      maxLength={280}
                      placeholder="Legenda (opcional)"
                      className="input"
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                    />
                    <Feedback state={state} />
                    <div className="flex gap-2">
                      <SubmitBtn className="btn btn-primary !py-2 !text-sm" pendingLabel="Publicando…">
                        Publicar
                      </SubmitBtn>
                      <button
                        type="button"
                        onClick={() => {
                          setPreview(null);
                          setImagePath("");
                        }}
                        className="btn btn-ghost !py-2 !text-sm"
                      >
                        Trocar foto
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
