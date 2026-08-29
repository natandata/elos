"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { addLoginBgImage, deleteLoginBgImage } from "@/lib/actions/login-bg";
import { Feedback } from "@/components/forms";
import { compressImage } from "@/lib/imageCompress";
import { ImageEditorModal } from "@/components/ImageEditorModal";

/** Mesma proporção das miniaturas exibidas aqui e no corredor animado. */
const ASPECT = 18 / 25;

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_IMAGES = 12;

export type LoginBgItem = { id: string; imagePath: string; imageUrl: string };

function DeleteButton({ id, imagePath }: { id: string; imagePath: string }) {
  const [state, action] = useActionState(deleteLoginBgImage, null);
  return (
    <form action={action} className="absolute right-1.5 top-1.5">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="image_path" value={imagePath} />
      <button
        type="submit"
        aria-label="Remover imagem"
        className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white"
      >
        ✕
      </button>
      <Feedback state={state} />
    </form>
  );
}

/** Escolhe as fotos do corredor animado atrás da tela de login. */
export function LoginBackgroundManager({ items }: { items: LoginBgItem[] }) {
  const router = useRouter();
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(addLoginBgImage, null);
  const [uploading, setUploading] = useState(false);
  const [imagePath, setImagePath] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingFile, setEditingFile] = useState<File | null>(null);

  const full = items.length >= MAX_IMAGES;

  function handlePick(file: File | null) {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Escolha um arquivo de imagem.");
    if (file.size > MAX_BYTES) return setError("A imagem precisa ter no máximo 5 MB.");
    if (file.type === "image/gif") return handleFile(file); // GIF não passa pelo editor (perderia a animação)
    setEditingFile(file);
  }

  async function handleFile(file: File | null) {
    setError(null);
    if (!file) return;

    setUploading(true);
    const upload = await compressImage(file);
    const ext = upload.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("login_bg")
      .upload(path, upload, { contentType: upload.type });

    setUploading(false);
    if (uploadError) return setError("Não foi possível enviar a imagem. Tente de novo.");

    setImagePath(path);
  }

  useEffect(() => {
    if (imagePath) formRef.current?.requestSubmit();
  }, [imagePath]);

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
    <div className="mt-3 border-t border-[var(--line)] pt-3">
      <p className="text-sm font-bold">Fundo da tela de login</p>
      <p className="mb-2 text-xs text-[var(--muted)]">
        Fotos que aparecem no corredor animado atrás do login — até {MAX_IMAGES}, visíveis pra
        qualquer pessoa (mesmo sem conta).
      </p>

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {items.map((item) => (
          <div key={item.id} className="relative aspect-[18/25] overflow-hidden rounded-lg bg-[var(--bg)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
            <DeleteButton id={item.id} imagePath={item.imagePath} />
          </div>
        ))}

        {!full ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex aspect-[18/25] items-center justify-center rounded-lg border-2 border-dashed border-[var(--line)] text-xl text-[var(--muted)] hover:border-[var(--accent)]"
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
        onChange={(e) => {
          handlePick(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />
      <form ref={formRef} action={action} className="hidden">
        <input type="hidden" name="image_path" value={imagePath} />
      </form>

      {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}
      <Feedback state={state} />
      {full ? (
        <p className="mt-2 text-xs text-[var(--muted)]">
          Limite atingido — remova uma foto pra adicionar outra.
        </p>
      ) : null}

      {editingFile ? (
        <ImageEditorModal
          file={editingFile}
          aspect={ASPECT}
          onCancel={() => setEditingFile(null)}
          onApply={(blob) => {
            const name = editingFile.name.replace(/\.[^.]+$/, "") + ".jpg";
            setEditingFile(null);
            handleFile(new File([blob], name, { type: "image/jpeg" }));
          }}
        />
      ) : null}
    </div>
  );
}
