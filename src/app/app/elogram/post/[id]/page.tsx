import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadFeedPosts } from "@/lib/elogramFeed";
import { FeedPostCard } from "@/components/feed/FeedPostCard";
import { ElogramBackButton } from "@/components/elogram/ElogramBackButton";

/** Um post do Elogram aberto sozinho (ao tocar numa foto da busca ou numa notificação). */
export default async function ElogramPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile, viewingAs } = await requireRole("admin", "leader", "cria", "guardian");
  const supabase = await createClient();

  const [post] = await loadFeedPosts(supabase, profile, { viewingAs: !!viewingAs, postId: id });
  if (!post) notFound();

  return (
    <div>
      <header className="flex items-center gap-2 px-3 pb-1 pt-3">
        <ElogramBackButton fallback="/app/elogram/buscar" />
        <h1 className="text-xl font-bold">Publicação</h1>
      </header>
      <FeedPostCard
        post={post}
        currentUserId={profile.id}
        isAdmin={profile.role === "admin"}
        canPost={profile.role === "leader" || profile.role === "cria"}
      />
    </div>
  );
}
