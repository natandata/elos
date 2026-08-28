"use client";

import { useActionState, useEffect, useState } from "react";
import {
  addFeedComment,
  deleteFeedComment,
  deleteFeedPost,
  toggleFeedLike,
  updateFeedCaption,
} from "@/lib/actions/feed";
import { Avatar } from "@/components/Avatar";
import { Feedback, SubmitBtn } from "@/components/forms";
import { formatDateTime } from "@/lib/types";

export type FeedComment = {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
};

export type FeedPost = {
  id: string;
  imagePath: string;
  imageUrl: string | null;
  caption: string | null;
  createdAt: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  /** "Líder · Elo Masculino 17" ou null (ex.: admin, que não posta). */
  authorTag: string | null;
  likeCount: number;
  likedByMe: boolean;
  comments: FeedComment[];
};

function FeedCommentRow({ comment, canDelete }: { comment: FeedComment; canDelete: boolean }) {
  const [state, action] = useActionState(deleteFeedComment, null);

  return (
    <div className="flex items-start justify-between gap-2 text-sm">
      <p className="min-w-0">
        <strong>{comment.authorName}</strong> {comment.body}
      </p>
      {canDelete ? (
        <form action={action} className="shrink-0">
          <input type="hidden" name="id" value={comment.id} />
          <button type="submit" className="text-xs text-[var(--muted)] hover:text-red-600">
            excluir
          </button>
        </form>
      ) : null}
      <Feedback state={state} />
    </div>
  );
}

export function FeedPostCard({
  post,
  currentUserId,
  isAdmin,
  canPost,
}: {
  post: FeedPost;
  currentUserId: string;
  isAdmin: boolean;
  canPost: boolean;
}) {
  const [likeState, likeAction] = useActionState(toggleFeedLike, null);
  const [commentState, commentAction] = useActionState(addFeedComment, null);
  const [deleteState, deleteAction] = useActionState(deleteFeedPost, null);
  const [captionState, captionAction] = useActionState(updateFeedCaption, null);
  const [showComments, setShowComments] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [captionDraft, setCaptionDraft] = useState(post.caption ?? "");

  const canDeletePost = isAdmin || post.authorId === currentUserId;
  const canEditCaption = post.authorId === currentUserId;

  useEffect(() => {
    if (captionState?.ok) setEditing(false);
  }, [captionState]);

  return (
    <div className="card overflow-hidden p-0">
      <div className="relative flex items-center gap-3 p-3">
        <Avatar url={post.authorAvatar} name={post.authorName} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{post.authorName}</p>
          <p className="truncate text-xs text-[var(--muted)]">
            {post.authorTag ? `${post.authorTag} · ` : ""}
            {formatDateTime(post.createdAt)}
          </p>
        </div>

        {canDeletePost || canEditCaption ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Mais opções"
              className="rounded-lg px-2 py-1 text-lg leading-none text-[var(--muted)] hover:bg-[var(--bg)]"
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
                <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--card)] shadow-lg">
                  {canEditCaption ? (
                    <button
                      type="button"
                      onClick={() => {
                        setCaptionDraft(post.caption ?? "");
                        setEditing(true);
                        setMenuOpen(false);
                      }}
                      className="block w-full px-3 py-2.5 text-left text-sm hover:bg-[var(--bg)]"
                    >
                      Editar legenda
                    </button>
                  ) : null}
                  {canDeletePost ? (
                    <form
                      action={deleteAction}
                      onSubmit={() => setMenuOpen(false)}
                    >
                      <input type="hidden" name="id" value={post.id} />
                      <input type="hidden" name="image_path" value={post.imagePath} />
                      <button
                        type="submit"
                        className="block w-full px-3 py-2.5 text-left text-sm text-red-600 hover:bg-[var(--bg)]"
                      >
                        Excluir
                      </button>
                    </form>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      {post.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.imageUrl} alt="" className="max-h-[480px] w-full object-cover" />
      ) : (
        <div className="flex h-40 items-center justify-center bg-[var(--bg)] text-xs text-[var(--muted)]">
          Foto indisponível
        </div>
      )}

      <div className="p-3">
        {editing ? (
          <form action={captionAction} className="mb-2 space-y-2">
            <input type="hidden" name="id" value={post.id} />
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
        ) : post.caption ? (
          <p className="mb-2.5 text-[15px] leading-relaxed">{post.caption}</p>
        ) : null}
        <Feedback state={deleteState} />

        {canPost ? (
          <form action={likeAction} className="inline-block">
            <input type="hidden" name="post_id" value={post.id} />
            <button
              type="submit"
              className={`-ml-1 rounded-full px-2 py-1 text-base font-bold transition active:scale-95 ${post.likedByMe ? "text-red-600" : "text-[var(--muted)]"}`}
            >
              {post.likedByMe ? "❤️" : "🤍"} {post.likeCount > 0 ? post.likeCount : ""}
            </button>
          </form>
        ) : post.likeCount > 0 ? (
          <span className="text-sm text-[var(--muted)]">❤️ {post.likeCount}</span>
        ) : null}
        <Feedback state={likeState} />

        <button
          type="button"
          onClick={() => setShowComments((v) => !v)}
          className="ml-1 rounded-full px-2 py-1 text-base font-bold text-[var(--muted)] transition active:scale-95"
        >
          💬{" "}
          <span className="text-sm">
            {post.comments.length > 0 ? post.comments.length : "Comentar"}
          </span>
        </button>

        {showComments ? (
          <div className="mt-3 space-y-2 border-t border-[var(--line)] pt-3">
            {post.comments.map((c) => (
              <FeedCommentRow
                key={c.id}
                comment={c}
                canDelete={isAdmin || c.authorId === currentUserId}
              />
            ))}

            {canPost ? (
              <form action={commentAction} className="flex gap-2">
                <input type="hidden" name="post_id" value={post.id} />
                <input
                  name="body"
                  maxLength={500}
                  placeholder="Escreva um comentário…"
                  autoComplete="off"
                  required
                  className="flex-1 rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 py-1.5 text-sm outline-none focus:border-[var(--accent)]"
                />
                <SubmitBtn className="btn !py-1.5 !text-xs" pendingLabel="Enviando…">
                  Enviar
                </SubmitBtn>
              </form>
            ) : null}
            <Feedback state={commentState} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
