"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { addGalleryPost, deleteGalleryPost } from "@/lib/actions/gallery";
import { Feedback } from "@/components/forms";
import { ImageLightbox } from "@/components/ImageLightbox";
import { compressImage } from "@/lib/imageCompress";

const MAX_BYTES = 5 * 1024 * 1024;

export type GalleryItem = { id: string; imageUrl: string | null; caption: string | null };

function DeleteButton({ id, imagePath }: { id: string; imagePath: string }) {
  const [state, action] = useActionState(deleteGalleryPost, null);
  return (
    <form action={action} className="absolute right-1.5 top-1.5">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="image_path" value={imagePath} />
      <button
        type="submit"
        aria-label="Remover foto"
        className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white"
      >
        ✕
      </button>
      <Feedback state={state} />
    </form>
  );
}

export function GalleryManager({
  userId,
  items,
}: {
  userId: string;
  items: (GalleryItem & { imagePath: string })[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(addGalleryPost, null);
  const [uploading, setUploading] = useState(false);
  const [imagePath, setImagePath] = useState("");
  const [error, setError] = useState<string | null>(null);

  const full = items.length >= 3;

  async function handleFile(file: File | null) {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Escolha um arquivo de imagem.");
    if (file.size > MAX_BYTES) return setError("A imagem precisa ter no máximo 5 MB.");

    setUploading(true);
    const upload = await compressImage(file);
    const ext = upload.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("profile_gallery")
      .upload(path, upload, { contentType: upload.type });

    setUploading(false);
    if (uploadError) return setError("Não foi possível enviar a imagem. Tente de novo.");

    setImagePath(path);
  }

  // Só envia o form escondido DEPOIS que o input hidden já reflete o novo
  // image_path (senão o submit ia com o valor antigo, ou vazio).
  useEffect(() => {
    if (imagePath) formRef.current?.requestSubmit();
  }, [imagePath]);

  // Roda uma única vez por resultado — sem isso, "state" continua "ok"
  // pra sempre e o efeito reenviaria o mesmo formulário a cada nova
  // renderização (foi o que causava a foto duplicada).
  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      setImagePath("");
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <div>
      <p className="mb-1 text-sm font-bold">Meu Feed</p>
      <p className="mb-3 text-xs text-[var(--muted)]">
        Até 3 fotos fixas no seu perfil — diferente do Explorar, elas não somem sozinhas.
      </p>

      <div className="grid grid-cols-3 gap-2">
        {items.map((item) => (
          <div key={item.id} className="relative aspect-square overflow-hidden rounded-xl bg-[var(--bg)]">
            <ImageLightbox url={item.imageUrl}>
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
              ) : null}
            </ImageLightbox>
            <DeleteButton id={item.id} imagePath={item.imagePath} />
          </div>
        ))}

        {!full ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-[var(--line)] text-2xl text-[var(--muted)] hover:border-[var(--accent)]"
          >
            {uploading ? "…" : "+"}
          </button>
        ) : null}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />
      <form ref={formRef} action={action} className="hidden">
        <input type="hidden" name="image_path" value={imagePath} />
      </form>

      {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}
      <Feedback state={state} />
      {full ? (
        <p className="mt-2 text-xs text-[var(--muted)]">
          Sua galeria está cheia — remova uma foto pra adicionar outra.
        </p>
      ) : null}
    </div>
  );
}
