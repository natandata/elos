"use client";

import { useActionState, useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  addFeedComment,
  deleteFeedComment,
  deleteFeedPost,
  revokeFeedThemeXp,
  toggleFeedLike,
  updateFeedCaption,
} from "@/lib/actions/feed";
import { toggleFeedPin } from "@/lib/actions/engagement";
import { Avatar } from "@/components/Avatar";
import { Feedback, SubmitBtn } from "@/components/forms";
import { relativeTimeLabel, relativeTimeShort } from "@/lib/relativeTime";
import { CommentIcon, EyeIcon, HeartIcon, MoreIcon, SmileIcon } from "./icons";

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
  themeConfirmed: boolean;
  themeXpAwarded: boolean;
  themeXpRevoked: boolean;
  comments: FeedComment[];
  /** Nomes de quem já viu — só vem preenchido quando é a própria foto do autor. */
  viewerNames?: string[];
};

const REACTION_EMOJI: Record<string, string> = { like: "❤️", laugh: "😂", pray: "🙏", fire: "🔥", clap: "👏" };
const REACTION_ORDER = ["like", "laugh", "pray", "fire", "clap"];

function FeedCommentRow({ comment, canDelete }: { comment: FeedComment; canDelete: boolean }) {
  const [state, action] = useActionState(deleteFeedComment, null);

  return (
    <div className="flex items-start justify-between gap-2 text-sm">
      <p className="min-w-0 break-words">
        <strong className="font-semibold">{comment.authorName}</strong> {comment.body}
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
  // a reação aparece na hora (otimista) e volta atrás sozinha se o servidor recusar
  const [reaction, setReactionOptimistic] = useOptimistic({ my: post.myReaction, counts: post.reactionCounts }, (cur, kind: string) => {
    const bump = (counts: { kind: string; count: number }[], k: string, d: number) => {
      const has = counts.some((c) => c.kind === k);
      const next = has ? counts.map((c) => (c.kind === k ? { ...c, count: Math.max(0, c.count + d) } : c)) : [...counts, { kind: k, count: Math.max(0, d) }];
      return next;
    };
    if (cur.my === kind) return { my: null, counts: bump(cur.counts, kind, -1) };
    const base = cur.my ? bump(cur.counts, cur.my, -1) : cur.counts;
    return { my: kind, counts: bump(base, kind, 1) };
  });
  const [likePending, startLike] = useTransition();
  const [likeError, setLikeError] = useState<string | null>(null);
  function react(kind: string) {
    if (likePending) return;
    setLikeError(null);
    startLike(async () => {
      setReactionOptimistic(kind);
      const fd = new FormData();
      fd.set("post_id", post.id);
      fd.set("kind", kind);
      const r = await toggleFeedLike(null, fd).catch(() => ({ error: "Sem conexão. Tente de novo." }) as { error?: string });
      if (r.error) setLikeError(r.error);
    });
  }
  const [commentState, commentAction] = useActionState(addFeedComment, null);
  const [deleteState, deleteAction] = useActionState(deleteFeedPost, null);
  const [captionState, captionAction] = useActionState(updateFeedCaption, null);
  const [pinState, pinAction] = useActionState(toggleFeedPin, null);
  const [revokeState, revokeAction] = useActionState(revokeFeedThemeXp, null);
  const [showComments, setShowComments] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [captionOpen, setCaptionOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [captionDraft, setCaptionDraft] = useState(post.caption ?? "");
  const [burst, setBurst] = useState(0);

  const canDeletePost = isAdmin || post.authorId === currentUserId;
  const canEditCaption = post.authorId === currentUserId;
  const handle = post.authorUsername ? post.authorUsername : post.authorName;

  useEffect(() => {
    if (captionState?.ok) setEditing(false);
  }, [captionState]);

  // toque duplo na foto curte (só adiciona, nunca remove — igual ao Instagram)
  const lastTap = useRef(0);
  function onImageTap() {
    const now = Date.now();
    if (now - lastTap.current < 320) {
      lastTap.current = 0;
      setBurst((n) => n + 1);
      if (canPost && reaction.my === null) react("like");
    } else {
      lastTap.current = now;
    }
  }

  // segurar o coração abre as outras reações
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);
  function heartDown() {
    held.current = false;
    holdTimer.current = setTimeout(() => {
      held.current = true;
      setPickerOpen(true);
    }, 450);
  }
  function heartUp() {
    if (holdTimer.current) clearTimeout(holdTimer.current);
  }
  function heartClick() {
    if (held.current) {
      held.current = false;
      return;
    }
    react(reaction.my ?? "like");
  }

  const total = reaction.counts.reduce((sum, r) => sum + r.count, 0);
  const kindsPresent = REACTION_ORDER.filter((k) => reaction.counts.some((r) => r.kind === k && r.count > 0));
  const onlyLikes = kindsPresent.length === 1 && kindsPresent[0] === "like";
  const myIsHeart = reaction.my === "like";
  const lastComments = post.comments.slice(-2);
  const captionLong = (post.caption?.length ?? 0) > 110;

  return (
    <article className="border-b border-[var(--line)] pb-3">
      {post.pinned ? (
        <div className="px-3 pb-1.5 text-xs font-bold text-[var(--accent-strong)] sm:px-0">📌 Destaque da semana</div>
      ) : null}

      <div className="relative flex items-center gap-3 px-3 py-2.5 sm:px-0">
        <Link href={`/app/perfil/${post.authorId}`} className="flex min-w-0 flex-1 items-center gap-2.5">
          <Avatar url={post.authorAvatar} name={post.authorName} size={32} />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-semibold">
              {handle}
              <span className="font-normal text-[var(--muted)]"> · <span suppressHydrationWarning>{relativeTimeShort(post.createdAt)}</span></span>
            </p>
            {post.authorTag ? <p className="truncate text-xs text-[var(--muted)]">{post.authorTag}</p> : null}
          </div>
        </Link>

        {canDeletePost || canEditCaption || post.canPin ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Mais opções"
              className="rounded-lg p-1.5 text-[var(--ink)] hover:bg-[var(--card)]"
            >
              <MoreIcon />
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
                <div className="absolute right-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--card)] shadow-lg">
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
                      <button type="submit" className="block w-full px-3 py-2.5 text-left text-sm hover:bg-[var(--bg)]">
                        {post.pinned ? "Remover destaque" : "Destacar da semana"}
                      </button>
                    </form>
                  ) : null}
                  {isAdmin && post.themeXpAwarded && !post.themeXpRevoked ? (
                    <form action={revokeAction} onSubmit={() => setMenuOpen(false)}>
                      <input type="hidden" name="post_id" value={post.id} />
                      <button type="submit" className="block w-full px-3 py-2.5 text-left text-sm text-amber-700 hover:bg-[var(--bg)]">
                        Revogar XP do tema
                      </button>
                    </form>
                  ) : null}
                  {canDeletePost ? (
                    <form action={deleteAction} onSubmit={() => setMenuOpen(false)}>
                      <input type="hidden" name="id" value={post.id} />
                      <input type="hidden" name="image_path" value={post.imagePath} />
                      <button type="submit" className="block w-full px-3 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-[var(--bg)]">
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

      <div className="relative select-none overflow-hidden bg-[var(--card)] sm:rounded-sm" onClick={onImageTap}>
        {post.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.imageUrl}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            className="aspect-[4/5] w-full object-cover"
          />
        ) : (
          <div className="flex aspect-[4/5] items-center justify-center text-xs text-[var(--muted)]">Foto indisponível</div>
        )}
        {burst > 0 ? (
          <span key={burst} className="ig-heart-burst" aria-hidden>
            <HeartIcon size={96} filled />
          </span>
        ) : null}
      </div>

      <div className="px-3 sm:px-0">
        <div className="relative flex items-center gap-3.5 pb-1 pt-2.5">
          {canPost ? (
            <button
              type="button"
              onClick={heartClick}
              onPointerDown={heartDown}
              onPointerUp={heartUp}
              onPointerLeave={heartUp}
              onContextMenu={(e) => e.preventDefault()}
              aria-label={reaction.my ? "Remover reação" : "Curtir"}
              className="select-none transition active:scale-90"
            >
              {reaction.my && !myIsHeart ? (
                <span className="inline-flex h-[26px] w-[26px] items-center justify-center text-[22px] leading-none">
                  {REACTION_EMOJI[reaction.my]}
                </span>
              ) : (
                <HeartIcon filled={myIsHeart} className={myIsHeart ? "text-rose-500" : ""} />
              )}
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => setShowComments((v) => !v)}
            aria-label="Comentários"
            className="transition active:scale-90"
          >
            <CommentIcon />
          </button>

          {canPost ? (
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              aria-label="Mais reações"
              className="transition active:scale-90"
            >
              <SmileIcon />
            </button>
          ) : null}

          {post.viewerNames ? (
            <button
              type="button"
              onClick={() => setShowViewers((v) => !v)}
              aria-label="Quem viu"
              className="ml-auto flex items-center gap-1 text-[var(--muted)] transition active:scale-90"
            >
              <EyeIcon size={22} />
              <span className="text-xs font-semibold tabular-nums">{post.viewerNames.length}</span>
            </button>
          ) : null}

          {pickerOpen ? (
            <>
              <button
                type="button"
                aria-hidden
                tabIndex={-1}
                onClick={() => setPickerOpen(false)}
                className="fixed inset-0 z-10 cursor-default"
              />
              <div className="absolute bottom-full left-0 z-20 mb-1 flex gap-1 rounded-full border border-[var(--line)] bg-[var(--card)] px-2 py-1.5 shadow-lg">
                {REACTION_ORDER.map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => {
                      setPickerOpen(false);
                      react(kind);
                    }}
                    className={`rounded-full px-1.5 py-0.5 text-2xl leading-none transition active:scale-90 ${
                      reaction.my === kind ? "bg-[var(--accent-soft)]" : "hover:scale-110"
                    }`}
                  >
                    {REACTION_EMOJI[kind]}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>
        {likeError ? <p className="pb-1 text-xs font-semibold text-rose-600">{likeError}</p> : null}

        {total > 0 ? (
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            {!onlyLikes ? <span className="text-base leading-none">{kindsPresent.map((k) => REACTION_EMOJI[k]).join("")}</span> : null}
            {total} {onlyLikes ? (total === 1 ? "curtida" : "curtidas") : total === 1 ? "reação" : "reações"}
          </p>
        ) : null}

        {editing ? (
          <form action={captionAction} className="mt-1.5 space-y-2">
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
              <button type="button" onClick={() => setEditing(false)} className="btn btn-ghost !py-1.5 !text-xs">
                Cancelar
              </button>
            </div>
          </form>
        ) : post.caption ? (
          <p className={`mt-0.5 break-words text-sm leading-snug ${captionOpen ? "" : "line-clamp-2"}`}>
            <strong className="font-semibold">{handle}</strong> {post.caption}
            {captionLong && !captionOpen ? (
              <button type="button" onClick={() => setCaptionOpen(true)} className="ml-1 text-[var(--muted)]">
                mais
              </button>
            ) : null}
          </p>
        ) : null}

        {post.themeXpAwarded && !post.themeXpRevoked ? (
          <p className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs font-bold text-[var(--accent-strong)]">
            ✨ Tema do dia — +1 XP
          </p>
        ) : post.themeXpRevoked ? (
          <p className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-[var(--line)] px-2.5 py-0.5 text-xs font-bold text-[var(--muted)]">
            XP do tema revogado
          </p>
        ) : null}

        <Feedback state={deleteState} />
        <Feedback state={pinState} />
        <Feedback state={revokeState} />

        {showViewers ? (
          <p className="mt-2 text-sm text-[var(--muted)]">
            {post.viewerNames && post.viewerNames.length > 0 ? (
              <>
                <strong className="font-semibold text-[var(--ink)]">Visualizado por:</strong> {post.viewerNames.join(", ")}
              </>
            ) : (
              "Ninguém viu essa foto ainda."
            )}
          </p>
        ) : null}

        {post.comments.length > 0 && !showComments ? (
          <button type="button" onClick={() => setShowComments(true)} className="mt-1 block text-sm text-[var(--muted)]">
            Ver {post.comments.length === 1 ? "o comentário" : `todos os ${post.comments.length} comentários`}
          </button>
        ) : null}

        {!showComments && lastComments.length > 0 ? (
          <div className="mt-0.5 space-y-0.5">
            {lastComments.map((c) => (
              <p key={c.id} className="line-clamp-1 break-words text-sm">
                <strong className="font-semibold">{c.authorName}</strong> {c.body}
              </p>
            ))}
          </div>
        ) : null}

        {showComments ? (
          <div className="mt-2 space-y-2">
            {post.comments.map((c) => (
              <FeedCommentRow key={c.id} comment={c} canDelete={isAdmin || c.authorId === currentUserId} />
            ))}
          </div>
        ) : null}

        <p className="mt-1.5 text-[11px] uppercase tracking-wide text-[var(--muted)]">
          <time dateTime={post.createdAt} suppressHydrationWarning>
            {relativeTimeLabel(post.createdAt)}
          </time>
        </p>

        {canPost ? (
          <form action={commentAction} className="mt-2 flex items-center gap-2 border-t border-[var(--line)] pt-2">
            <input type="hidden" name="post_id" value={post.id} />
            <input
              name="body"
              maxLength={500}
              placeholder="Adicione um comentário…"
              autoComplete="off"
              required
              className="min-w-0 flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-[var(--muted)]"
            />
            <SubmitBtn className="text-sm font-bold text-[var(--accent-strong)] disabled:opacity-50" pendingLabel="Enviando…">
              Publicar
            </SubmitBtn>
          </form>
        ) : null}
        <Feedback state={commentState} />
      </div>
    </article>
  );
}
