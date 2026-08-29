import type { SupabaseClient } from "@supabase/supabase-js";
import type { StoryItem } from "@/components/profile/StoryViewer";

export type StoryTrayEntry = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  stories: StoryItem[];
};

/** Membros do Elo com pelo menos um story (post no Explorar) ativo nas últimas 24h. */
export async function getEloStoriesTray(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  eloId: string | null,
): Promise<StoryTrayEntry[]> {
  if (!eloId) return [];

  const { data: members } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .eq("elo_id", eloId);

  const memberList = (members ?? []) as { id: string; full_name: string; avatar_url: string | null }[];
  if (memberList.length === 0) return [];

  const { data: posts } = await supabase
    .from("story_posts")
    .select("id, image_path, caption, created_at, author_id")
    .in(
      "author_id",
      memberList.map((m) => m.id),
    )
    .order("created_at", { ascending: true });

  const rows = (posts ?? []) as {
    id: string;
    image_path: string;
    caption: string | null;
    created_at: string;
    author_id: string;
  }[];
  if (rows.length === 0) return [];

  const signedUrls = await Promise.all(
    rows.map((r) => supabase.storage.from("stories").createSignedUrl(r.image_path, 3600)),
  );

  const byAuthor = new Map<string, StoryItem[]>();
  rows.forEach((r, i) => {
    const list = byAuthor.get(r.author_id) ?? [];
    list.push({
      id: r.id,
      imageUrl: signedUrls[i].data?.signedUrl ?? null,
      caption: r.caption,
      createdAt: r.created_at,
      imagePath: r.image_path,
    });
    byAuthor.set(r.author_id, list);
  });

  return memberList
    .filter((m) => byAuthor.has(m.id))
    .map((m) => ({
      userId: m.id,
      name: m.full_name || "Sem nome",
      avatarUrl: m.avatar_url,
      stories: byAuthor.get(m.id)!,
    }));
}
