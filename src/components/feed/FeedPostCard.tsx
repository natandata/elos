"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import {
  addFeedComment,
  deleteFeedComment,
  deleteFeedPost,
  toggleFeedLike,
  updateFeedCaption,
} from "@/lib/actions/feed";
import { toggleFeedPin } from "@/lib/actions/engagement";
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
  /** @handle definido no perfil — null se o autor ainda não criou um. */
  authorUsername: string | null;
  authorAvatar: string | null;
  /** "Líder · Elo Masculino 17" ou null (ex.: admin, que não posta). */
  authorTag: string | null;
  reactionCounts: { kind: string; count: number }[];
  myReaction: string | null;
  pinned: boolean;
  canPin: boolean;
  comments: FeedComment[];
};

const REACTION_EMOJI: Record<string, string> = { like: "👍", pray: "🙏", fire: "🔥", clap: "👏" };
const REACTION_ORDER = ["like", "pray", "fire", "clap"];

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
  const [pinState, pinAction] = useActionState(toggleFeedPin, null);
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
    <div className={`card overflow-hidden p-0 ${post.pinned ? "ring-2 ring-[var(--accent)]" : ""}`}>
      {post.pinned ? (
        <div className="bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-bold text-[var(--accent-strong)]">
          📌 Destaque da semana
        </div>
      ) : null}
      <div className="relative flex items-center gap-3 p-3">
        <Link href={`/app/perfil/${post.authorId}`} className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar url={post.authorAvatar} name={post.authorName} size={40} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">
              {post.authorUsername ? `@${post.authorUsername}` : post.authorName}
            </p>
            {post.authorTag ? (
              <p className="truncate text-xs text-[var(--muted)]">{post.authorTag}</p>
            ) : null}
          </div>
        </Link>

        {canDeletePost || canEditCaption || post.canPin ? (
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
                  {post.canPin ? (
                    <form action={pinAction} onSubmit={() => setMenuOpen(false)}>
                      <input type="hidden" name="post_id" value={post.id} />
                      <button
                        type="submit"
                        className="block w-full px-3 py-2.5 text-left text-sm hover:bg-[var(--bg)]"
                      >
                        {post.pinned ? "Remover destaque" : "Destacar da semana"}
                      </button>
                    </form>
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
        <img
          src={post.imageUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="max-h-[480px] w-full object-cover"
        />
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
        <Feedback state={pinState} />

        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {canPost ? (
              REACTION_ORDER.map((kind) => {
                const count = post.reactionCounts.find((r) => r.kind === kind)?.count ?? 0;
                const active = post.myReaction === kind;
                return (
                  <form key={kind} action={likeAction} className="inline-block">
                    <input type="hidden" name="post_id" value={post.id} />
                    <input type="hidden" name="kind" value={kind} />
                    <button
                      type="submit"
                      className={`flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-base leading-none shadow-sm transition active:scale-90 ${
                        active
                          ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                          : "border-[var(--line)] bg-[var(--bg)] hover:border-[var(--accent)]"
                      }`}
                      title={REACTION_EMOJI[kind]}
                    >
                      <span>{REACTION_EMOJI[kind]}</span>
                      {count > 0 ? (
                        <span
                          className={`text-xs font-bold tabular-nums ${active ? "text-[var(--accent-strong)]" : "text-[var(--muted)]"}`}
                        >
                          {count}
                        </span>
                      ) : null}
                    </button>
                  </form>
                );
              })
            ) : post.reactionCounts.length > 0 ? (
              <span className="flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--bg)] px-2.5 py-1.5 text-sm text-[var(--muted)]">
                {post.reactionCounts.map((r) => `${REACTION_EMOJI[r.kind]} ${r.count}`).join("  ")}
              </span>
            ) : null}
            <Feedback state={likeState} />

            <button
              type="button"
              onClick={() => setShowComments((v) => !v)}
              className="flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--bg)] px-2.5 py-1.5 text-base leading-none shadow-sm transition active:scale-90 hover:border-[var(--accent)]"
            >
              💬{" "}
              <span className="text-xs font-bold text-[var(--muted)]">
                {post.comments.length > 0 ? post.comments.length : "Comentar"}
              </span>
            </button>
          </div>

          <span className="shrink-0 text-xs text-[var(--muted)]">
            {formatDateTime(post.createdAt)}
          </span>
        </div>

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
                  className="w-full min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 py-1.5 outline-none focus:border-[var(--accent)]"
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
