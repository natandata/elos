import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FeedPost } from "@/components/feed/FeedPostCard";
import { ROLE_LABEL, type Profile, type Role } from "@/lib/types";
import { stableSignedUrls } from "@/lib/signedUrls";

const REACTION_KINDS = ["like", "laugh", "pray", "fire", "clap"];

type PostRow = {
  id: string;
  image_path: string;
  extra_image_paths: string[] | null;
  caption: string | null;
  created_at: string;
  author_id: string;
  pinned_at: string | null;
  theme_confirmed: boolean;
  theme_xp_awarded: boolean;
  theme_xp_revoked: boolean;
};

type AuthorRow = {
  id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  role: Role;
  elo_id: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<any>;

/**
 * Monta os posts do Elogram (com reações, comentários, autor e fotos do carrossel).
 * Sem `postId`: o feed inteiro das últimas 24h. Com `postId`: só aquele post.
 * `viewingAs` ligado = o admin está só olhando a conta de outra pessoa (não conta como visualização).
 */
export async function loadFeedPosts(
  supabase: Client,
  profile: Profile,
  opts: { viewingAs?: boolean; postId?: string } = {},
): Promise<FeedPost[]> {
  const { postId, viewingAs = false } = opts;
  const isAdmin = profile.role === "admin";

  let postsQ = supabase
    .from("feed_posts")
    .select(
      "id, image_path, extra_image_paths, caption, created_at, author_id, pinned_at, theme_confirmed, theme_xp_awarded, theme_xp_revoked",
    )
    .order("pinned_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (postId) postsQ = postsQ.eq("id", postId);

  let likesQ = supabase.from("feed_likes").select("post_id, user_id, kind");
  let commentsQ = supabase
    .from("feed_comments")
    .select("id, post_id, author_id, body, created_at")
    .order("created_at", { ascending: true });
  if (postId) {
    likesQ = likesQ.eq("post_id", postId);
    commentsQ = commentsQ.eq("post_id", postId);
  }

  const [postsRes, likesRes, commentsRes, elosRes] = await Promise.all([
    postsQ,
    likesQ,
    commentsQ,
    // elos é público pra qualquer autenticado (não é por Elo), então dá pra
    // resolver o nome do Elo de qualquer autor, mesmo de fora do meu Elo.
    supabase.from("elos").select("id, name"),
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
  const eloNameById = new Map(((elosRes.data ?? []) as { id: string; name: string }[]).map((e) => [e.id, e.name]));

  // Nome/avatar/papel/Elo via RPC dedicada — o feed é global (todo mundo vê
  // fotos de qualquer Elo), mas a leitura direta de profiles ainda é
  // restrita por Elo. Sem isso, o join cairia em null pra quem não é do
  // mesmo Elo do autor ("Alguém" pra uns, nome certo pra outros).
  const authorIds = Array.from(new Set([...posts.map((p) => p.author_id), ...comments.map((c) => c.author_id)]));
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
  const allPaths = posts.flatMap((p) => [p.image_path, ...(p.extra_image_paths ?? [])]);
  const urlByPath = await stableSignedUrls(supabase, "feed", allPaths);

  const feed: FeedPost[] = posts.map((p) => {
    const author = authorById.get(p.author_id);
    const paths = [p.image_path, ...(p.extra_image_paths ?? [])];
    return {
      id: p.id,
      imagePath: p.image_path,
      imagePaths: paths,
      imageUrl: urlByPath.get(p.image_path) ?? null,
      imageUrls: paths.map((path) => urlByPath.get(path) ?? null),
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
      themeConfirmed: p.theme_confirmed,
      themeXpAwarded: p.theme_xp_awarded,
      themeXpRevoked: p.theme_xp_revoked,
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

  // Marca como visto quem não é o próprio autor — abrir o Elogram já conta
  // como "ver a foto". Não conta durante "visualizar como" (o admin não é
  // quem está de fato vendo).
  const postIdsToMark = viewingAs ? [] : feed.filter((p) => p.authorId !== profile.id).map((p) => p.id);
  if (postIdsToMark.length > 0) {
    await supabase
      .from("feed_post_views")
      .upsert(
        postIdsToMark.map((post_id) => ({ post_id, viewer_id: profile.id })),
        { onConflict: "post_id,viewer_id", ignoreDuplicates: true },
      );
  }

  // Pra quem é dono da foto: quem já viu.
  const myPostIds = feed.filter((p) => p.authorId === profile.id).map((p) => p.id);
  const { data: viewRows } = myPostIds.length
    ? await supabase.from("feed_post_views").select("post_id, viewer_id").in("post_id", myPostIds)
    : { data: [] };
  const viewerIds = Array.from(
    new Set(((viewRows ?? []) as { post_id: string; viewer_id: string }[]).map((v) => v.viewer_id)),
  );
  const { data: viewerProfiles } = viewerIds.length
    ? await supabase.rpc("feed_author_names", { p_ids: viewerIds })
    : { data: [] as AuthorRow[] };
  const viewerNameById = new Map(((viewerProfiles ?? []) as AuthorRow[]).map((v) => [v.id, v.full_name]));
  const viewerNamesByPost = new Map<string, string[]>();
  for (const v of (viewRows ?? []) as { post_id: string; viewer_id: string }[]) {
    const list = viewerNamesByPost.get(v.post_id) ?? [];
    list.push(viewerNameById.get(v.viewer_id) || "Alguém");
    viewerNamesByPost.set(v.post_id, list);
  }
  for (const p of feed) {
    if (p.authorId === profile.id) p.viewerNames = viewerNamesByPost.get(p.id) ?? [];
  }

  return feed;
}
