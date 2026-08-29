"use client";

import { useEffect, useState } from "react";
import { FeedPostCard, type FeedPost } from "./FeedPostCard";

/**
 * Grade estilo "Explorar" do Instagram: miniaturas quadradas em 3 colunas.
 * Tocar numa abre o post inteiro (com reações e comentários) numa camada
 * por cima, sem sair da página.
 */
export function FeedGrid({
  posts,
  currentUserId,
  isAdmin,
  canPost,
}: {
  posts: FeedPost[];
  currentUserId: string;
  isAdmin: boolean;
  canPost: boolean;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = posts.find((p) => p.id === openId) ?? null;

  // trava a rolagem do fundo enquanto o post está aberto
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // se o post aberto sumir (excluído, ou empurrado pra fora das 9), fecha
  useEffect(() => {
    if (openId && !posts.some((p) => p.id === openId)) setOpenId(null);
  }, [posts, openId]);

  return (
    <>
      <div className="grid grid-cols-3 gap-0.5">
        {posts.map((post) => (
          <button
            key={post.id}
            type="button"
            onClick={() => setOpenId(post.id)}
            className="relative aspect-square overflow-hidden bg-[var(--bg)]"
          >
            {post.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : null}

            {post.pinned ? (
              <span className="absolute left-1 top-1 rounded-md bg-black/60 px-1 text-[10px] text-white">
                Destaque
              </span>
            ) : null}

            {post.comments.length > 0 || post.reactionCounts.length > 0 ? (
              <span className="absolute bottom-1 right-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {post.reactionCounts.reduce((sum, r) => sum + r.count, 0) + post.comments.length}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {open ? (
        <div className="fixed inset-0 z-[75] overflow-y-auto bg-black/70 p-4">
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => setOpenId(null)}
            className="fixed right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-lg text-white"
          >
            ✕
          </button>
          <div className="mx-auto mt-14 max-w-md pb-10">
            <FeedPostCard
              post={open}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              canPost={canPost}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
