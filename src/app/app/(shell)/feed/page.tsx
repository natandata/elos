import { EmptyState, PageHeader } from "@/components/ui";
import { needsWeeklyPushNudge, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FeedComposer } from "@/components/feed/FeedComposer";
import { FeedStoriesTray, type FeedStoryAuthor } from "@/components/feed/FeedStoriesTray";
import { ProfileSearch } from "@/components/feed/ProfileSearch";
import { WeeklyPushNudge } from "@/components/push/WeeklyPushNudge";
import { FeedPostCard, type FeedPost } from "@/components/feed/FeedPostCard";
import { ROLE_LABEL, type Role } from "@/lib/types";
import { stableSignedUrls } from "@/lib/signedUrls";

const REACTION_KINDS = ["like", "pray", "fire", "clap"];

type PostRow = {
  id: string;
  image_path: string;
  caption: string | null;
  created_at: string;
  author_id: string;
  pinned_at: string | null;
};

type AuthorRow = {
  id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  role: Role;
  elo_id: string | null;
};

export default async function FeedPage() {
  const { profile, viewingAs } = await requireRole("admin", "leader", "cria", "guardian");
  const supabase = await createClient();
  const isAdmin = profile.role === "admin";
  const canInteract = profile.role === "leader" || profile.role === "cria";
  // Explorar é a Home do responsável (guardian) — pros outros papéis, o
  // lembrete semanal já aparece na própria tela de início deles.
  const showPushNudge =
    profile.role === "guardian" && !viewingAs && (await needsWeeklyPushNudge(supabase, profile));

  const [postsRes, likesRes, commentsRes, elosRes, galleryCountRes] = await Promise.all([
    supabase
      .from("feed_posts")
      .select("id, image_path, caption, created_at, author_id, pinned_at")
      .order("pinned_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase.from("feed_likes").select("post_id, user_id, kind"),
    supabase
      .from("feed_comments")
      .select("id, post_id, author_id, body, created_at")
      .order("created_at", { ascending: true }),
    // elos é público pra qualquer autenticado (não é por Elo), então dá pra
    // resolver o nome do Elo de qualquer autor, mesmo de fora do meu Elo.
    supabase.from("elos").select("id, name"),
    canInteract
      ? supabase
          .from("profile_gallery_posts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", profile.id)
      : Promise.resolve({ count: 0 }),
  ]);

  const posts = (postsRes.data ?? []) as PostRow[];
  const likes = (likesRes.data ?? []) as { post_id: string; user_id: string; kind: string }[];
  const comments = (commentsRes.data ?? []) as {
    id: string;
    post_id: string;
    author_id: string;
    body: string;
    created_at: string;
  }[];
  const eloNameById = new Map(
    ((elosRes.data ?? []) as { id: string; name: string }[]).map((e) => [e.id, e.name]),
  );

  // Nome/avatar/papel/Elo via RPC dedicada — o Feed é global (todo mundo vê
  // fotos de qualquer Elo), mas a leitura direta de profiles ainda é
  // restrita por Elo. Sem isso, o join cairia em null pra quem não é do
  // mesmo Elo do autor ("Alguém" pra uns, nome certo pra outros).
  const authorIds = Array.from(
    new Set([...posts.map((p) => p.author_id), ...comments.map((c) => c.author_id)]),
  );
  const { data: authorsData } = authorIds.length
    ? await supabase.rpc("feed_author_names", { p_ids: authorIds })
    : { data: [] as AuthorRow[] };
  const authorById = new Map(((authorsData ?? []) as AuthorRow[]).map((a) => [a.id, a]));

  function authorTag(id: string): string | null {
    const a = authorById.get(id);
    if (!a || a.role === "admin") return null;
    const eloName = a.elo_id ? eloNameById.get(a.elo_id) : null;
    return `${ROLE_LABEL[a.role]}${eloName ? ` · ${eloName}` : ""}`;
  }

  // URLs estáveis por 6h: a mesma URL entre visitas deixa o navegador
  // reaproveitar a imagem do cache em vez de rebaixar tudo toda vez.
  const urlByPath = await stableSignedUrls(supabase, "feed", posts.map((p) => p.image_path));

  const feed: FeedPost[] = posts.map((p) => {
    const author = authorById.get(p.author_id);
    return {
      id: p.id,
      imagePath: p.image_path,
      imageUrl: urlByPath.get(p.image_path) ?? null,
      caption: p.caption,
      createdAt: p.created_at,
      authorId: p.author_id,
      authorName: author?.full_name || "Sem nome",
      authorUsername: author?.username ?? null,
      authorAvatar: author?.avatar_url ?? null,
      authorTag: authorTag(p.author_id),
      reactionCounts: REACTION_KINDS.map((kind) => ({
        kind,
        count: likes.filter((l) => l.post_id === p.id && l.kind === kind).length,
      })).filter((r) => r.count > 0),
      myReaction: likes.find((l) => l.post_id === p.id && l.user_id === profile.id)?.kind ?? null,
      pinned: p.pinned_at !== null,
      canPin:
        isAdmin ||
        (profile.role === "leader" && author?.elo_id != null && author.elo_id === profile.elo_id),
      comments: comments
        .filter((c) => c.post_id === p.id)
        .map((c) => ({
          id: c.id,
          authorId: c.author_id,
          authorName: authorById.get(c.author_id)?.full_name || "Sem nome",
          body: c.body,
          createdAt: c.created_at,
        })),
    };
  });

  // Bolinhas de story no topo, uma por autor: as fotos de cada um em ordem
  // cronológica (mais antiga primeiro, igual Instagram), mas a ORDEM DAS
  // BOLINHAS é por quem postou mais recentemente primeiro.
  const postsByAuthorAsc = [...posts].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const storyMap = new Map<string, FeedStoryAuthor>();
  for (const p of postsByAuthorAsc) {
    const author = authorById.get(p.author_id);
    const item = {
      id: p.id,
      imageUrl: urlByPath.get(p.image_path) ?? null,
      caption: p.caption,
      createdAt: p.created_at,
    };
    const existing = storyMap.get(p.author_id);
    if (existing) existing.posts.push(item);
    else
      storyMap.set(p.author_id, {
        authorId: p.author_id,
        name: author?.full_name || "Sem nome",
        avatarUrl: author?.avatar_url ?? null,
        posts: [item],
      });
  }
  const storyAuthors = Array.from(storyMap.values()).sort((a, b) =>
    b.posts[b.posts.length - 1].createdAt.localeCompare(a.posts[a.posts.length - 1].createdAt),
  );

  return (
    <>
      <PageHeader
        title="Explorar"
        subtitle="Fotos do ELOS — cada uma some depois de 24h."
        action={
          canInteract ? (
            <FeedComposer userId={profile.id} galleryFull={(galleryCountRes.count ?? 0) >= 3} />
          ) : undefined
        }
      />

      <WeeklyPushNudge eligible={showPushNudge} />

      <FeedStoriesTray authors={storyAuthors} myUserId={profile.id} />

      <ProfileSearch />

      {feed.length === 0 ? (
        <EmptyState>Nenhuma foto no Explorar nas últimas 24h.</EmptyState>
      ) : (
        <div className="space-y-4">
          {feed.map((post) => (
            <FeedPostCard
              key={post.id}
              post={post}
              currentUserId={profile.id}
              isAdmin={isAdmin}
              canPost={canInteract}
            />
          ))}
        </div>
      )}
    </>
  );
}
