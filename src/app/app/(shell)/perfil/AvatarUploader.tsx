"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/Avatar";
import { AvatarCropModal } from "./AvatarCropModal";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export function AvatarUploader({
  userId,
  name,
  currentUrl,
}: {
  userId: string;
  name: string;
  currentUrl: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [url, setUrl] = useState(currentUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  function handleFile(file: File | null) {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Escolha um arquivo de imagem.");
    if (file.size > MAX_AVATAR_BYTES) return setError("A imagem precisa ter no máximo 2 MB.");
    // abre o ajuste de enquadramento antes de subir — evita a foto vir cortada errado
    setPendingFile(file);
  }

  async function uploadCropped(blob: Blob) {
    setPendingFile(null);
    setBusy(true);
    const path = `${userId}/avatar.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, blob, { upsert: true, contentType: "image/jpeg" });

    if (uploadError) {
      setBusy(false);
      return setError("Não foi possível enviar a imagem. Tente de novo.");
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);

    // o parâmetro força o navegador a buscar a versão nova
    const versioned = `${publicUrl}?v=${Date.now()}`;
    const { error: saveError } = await supabase
      .from("profiles")
      .update({ avatar_url: versioned })
      .eq("id", userId);

    setBusy(false);
    if (saveError) return setError("A imagem subiu, mas não foi possível salvar no perfil.");

    setUrl(versioned);
    if (fileRef.current) fileRef.current.value = "";
    router.refresh();
  }

  async function removeAvatar() {
    setBusy(true);
    setError(null);
    await supabase.from("profiles").update({ avatar_url: null }).eq("id", userId);
    setBusy(false);
    setUrl(null);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar url={url} name={name} size={64} />
      <div className="min-w-0">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-ghost !py-1.5 !text-xs"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            {busy ? "Enviando…" : url ? "Trocar foto" : "Adicionar foto"}
          </button>
          {url ? (
            <button
              type="button"
              className="btn btn-ghost !py-1.5 !text-xs"
              disabled={busy}
              onClick={removeAvatar}
            >
              Remover
            </button>
          ) : null}
        </div>
        {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}
      </div>

      {pendingFile ? (
        <AvatarCropModal
          file={pendingFile}
          onCancel={() => {
            setPendingFile(null);
            if (fileRef.current) fileRef.current.value = "";
          }}
          onConfirm={uploadCropped}
        />
      ) : null}
    </div>
  );
}
