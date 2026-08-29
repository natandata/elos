"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteStoryPost, updateStoryCaption } from "@/lib/actions/stories";
import { Feedback, SubmitBtn } from "@/components/forms";
import { formatDateTime } from "@/lib/types";

export type StoryItem = {
  id: string;
  imageUrl: string | null;
  caption: string | null;
  createdAt: string;
  imagePath?: string;
};

/** Visualizador em tela cheia, estilo Instagram Stories — passa sozinho por cada foto. */
export function StoryViewer({
  stories,
  authorName,
  canManage = false,
  onClose,
}: {
  stories: StoryItem[];
  authorName: string;
  /** true quando quem está vendo é o próprio autor — libera editar/excluir. */
  canManage?: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [captionDraft, setCaptionDraft] = useState("");
  const [captionState, captionAction] = useActionState(updateStoryCaption, null);
  const [deleteState, deleteAction] = useActionState(deleteStoryPost, null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (captionState?.ok) setEditing(false);
  }, [captionState]);

  useEffect(() => {
    if (deleteState?.ok) {
      router.refresh();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deleteState]);

  const current = stories[index];
  if (!current) return null;

  function next() {
    if (menuOpen || editing) return;
    if (index < stories.length - 1) setIndex((i) => i + 1);
    else onClose();
  }

  function prev() {
    if (menuOpen || editing) return;
    if (index > 0) setIndex((i) => i - 1);
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black">
      <div className="relative flex h-full w-full max-w-md flex-col">
        <div className="flex gap-1 p-2 pt-3">
          {stories.map((s, i) => (
            <div key={s.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
              <div className={`h-full bg-white ${i <= index ? "w-full" : "w-0"}`} />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between px-3 pb-2 text-white">
          <p className="text-sm font-bold">{authorName}</p>
          <div className="flex items-center gap-1">
            {canManage ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-label="Mais opções"
                  className="rounded-lg px-2 py-1 text-lg leading-none"
                >
                  ⋯
                </button>
                {menuOpen ? (
                  <>
                    <button
                      type="button"
                      aria-hidden
                      tabIndex={-1}
                      onClick={() => setMenuOpen(false)}
                      className="fixed inset-0 z-10 cursor-default"
                    />
                    <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] shadow-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setCaptionDraft(current.caption ?? "");
                          setEditing(true);
                          setMenuOpen(false);
                        }}
                        className="block w-full px-3 py-2.5 text-left text-sm hover:bg-[var(--bg)]"
                      >
                        Editar legenda
                      </button>
                      <form action={deleteAction} onSubmit={() => setMenuOpen(false)}>
                        <input type="hidden" name="id" value={current.id} />
                        <input type="hidden" name="image_path" value={current.imagePath ?? ""} />
                        <button
                          type="submit"
                          className="block w-full px-3 py-2.5 text-left text-sm text-red-600 hover:bg-[var(--bg)]"
                        >
                          Excluir
                        </button>
                      </form>
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}
            <button type="button" onClick={onClose} aria-label="Fechar" className="px-1 text-xl">
              ✕
            </button>
          </div>
        </div>

        <div className="relative flex-1 overflow-hidden bg-black">
          {current.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current.imageUrl} alt="" className="h-full w-full object-contain" />
          ) : null}

          {!editing ? (
            <>
              <button
                type="button"
                aria-label="Anterior"
                onClick={prev}
                className="absolute inset-y-0 left-0 w-1/3"
              />
              <button
                type="button"
                aria-label="Próximo"
                onClick={next}
                className="absolute inset-y-0 right-0 w-1/3"
              />
            </>
          ) : null}
        </div>

        {editing ? (
          <form action={captionAction} className="space-y-2 bg-black/90 p-3">
            <input type="hidden" name="id" value={current.id} />
            <textarea
              name="caption"
              rows={2}
              maxLength={280}
              className="input"
              value={captionDraft}
              onChange={(e) => setCaptionDraft(e.target.value)}
              autoFocus
            />
            <Feedback state={captionState} />
            <div className="flex gap-2">
              <SubmitBtn className="btn btn-primary !py-1.5 !text-xs" pendingLabel="Salvando…">
                Salvar
              </SubmitBtn>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="btn btn-ghost !py-1.5 !text-xs"
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : current.caption || current.createdAt ? (
          <div className="bg-black/80 p-3 text-white">
            {current.caption ? <p className="text-sm">{current.caption}</p> : null}
            <p className="mt-1 text-xs text-white/60">{formatDateTime(current.createdAt)}</p>
          </div>
        ) : null}
        <Feedback state={deleteState} />
      </div>
    </div>
  );
}
