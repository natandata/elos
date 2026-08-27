import { EmptyState, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FeedComposer } from "@/components/feed/FeedComposer";
import { FeedPostCard, type FeedPost } from "@/components/feed/FeedPostCard";

type PostRow = {
  id: string;
  image_path: string;
  caption: string | null;
  created_at: string;
  author_id: string;
  profiles: { full_name: string; avatar_url: string | null } | null;
};

export default async function FeedPage() {
  const { profile } = await requireRole("admin", "leader", "cria");
  const supabase = await createClient();
  const isAdmin = profile.role === "admin";

  const [postsRes, likesRes, commentsRes] = await Promise.all([
    supabase
      .from("feed_posts")
      .select("id, image_path, caption, created_at, author_id, profiles:author_id(full_name, avatar_url)")
      .order("created_at", { ascending: false }),
    supabase.from("feed_likes").select("post_id, user_id"),
    supabase
      .from("feed_comments")
      .select("id, post_id, author_id, body, created_at, profiles:author_id(full_name)")
      .order("created_at", { ascending: true }),
  ]);

  const posts = (postsRes.data ?? []) as unknown as PostRow[];
  const likes = (likesRes.data ?? []) as { post_id: string; user_id: string }[];
  const comments = (commentsRes.data ?? []) as unknown as {
    id: string;
    post_id: string;
    author_id: string;
    body: string;
    created_at: string;
    profiles: { full_name: string } | null;
  }[];

  // URLs assinadas de curta duração — só geradas pra posts ainda visíveis (RLS já garante isso).
  const signedUrls = await Promise.all(
    posts.map((p) => supabase.storage.from("feed").createSignedUrl(p.image_path, 3600)),
  );
  const urlByPath = new Map(
    posts.map((p, i) => [p.image_path, signedUrls[i].data?.signedUrl ?? null]),
  );

  const feed: FeedPost[] = posts.map((p) => ({
    id: p.id,
    imagePath: p.image_path,
    imageUrl: urlByPath.get(p.image_path) ?? null,
    caption: p.caption,
    createdAt: p.created_at,
    authorId: p.author_id,
    authorName: p.profiles?.full_name || "Alguém",
    authorAvatar: p.profiles?.avatar_url ?? null,
    likeCount: likes.filter((l) => l.post_id === p.id).length,
    likedByMe: likes.some((l) => l.post_id === p.id && l.user_id === profile.id),
    comments: comments
      .filter((c) => c.post_id === p.id)
      .map((c) => ({
        id: c.id,
        authorId: c.author_id,
        authorName: c.profiles?.full_name || "Alguém",
        body: c.body,
        createdAt: c.created_at,
      })),
  }));

  return (
    <>
      <PageHeader title="Feed" subtitle="Fotos do ELOS — cada uma some depois de 24h." />

      {!isAdmin ? <FeedComposer userId={profile.id} /> : null}

      {feed.length === 0 ? (
        <EmptyState>Nenhuma foto no feed nas últimas 24h.</EmptyState>
      ) : (
        <div className="space-y-4">
          {feed.map((post) => (
            <FeedPostCard
              key={post.id}
              post={post}
              currentUserId={profile.id}
              isAdmin={isAdmin}
              canPost={!isAdmin}
            />
          ))}
        </div>
      )}
    </>
  );
}
