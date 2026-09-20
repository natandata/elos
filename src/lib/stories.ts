import type { SupabaseClient } from "@supabase/supabase-js";
import type { StoryItem } from "@/components/profile/StoryViewer";
import { stableSignedUrls } from "@/lib/signedUrls";

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
  myUserId?: string,
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

  const urlByPath = await stableSignedUrls(supabase, "stories", rows.map((r) => r.image_path));

  // Só busca "quem viu" dos PRÓPRIOS stories (é o único caso em que a tela
  // realmente mostra essa lista) — evita uma consulta à toa pros stories de
  // todo mundo.
  const myStoryIds = myUserId ? rows.filter((r) => r.author_id === myUserId).map((r) => r.id) : [];
  const { data: viewRows } = myStoryIds.length
    ? await supabase.from("story_views").select("story_id, viewer_id").in("story_id", myStoryIds)
    : { data: [] };
  const viewerIds = Array.from(
    new Set(((viewRows ?? []) as { story_id: string; viewer_id: string }[]).map((v) => v.viewer_id)),
  );
  const { data: viewerProfiles } = viewerIds.length
    ? await supabase.rpc("feed_author_names", { p_ids: viewerIds })
    : { data: [] as { id: string; full_name: string }[] };
  const viewerNameById = new Map(
    ((viewerProfiles ?? []) as { id: string; full_name: string }[]).map((v) => [v.id, v.full_name]),
  );
  const viewerNamesByStory = new Map<string, string[]>();
  for (const v of (viewRows ?? []) as { story_id: string; viewer_id: string }[]) {
    const list = viewerNamesByStory.get(v.story_id) ?? [];
    list.push(viewerNameById.get(v.viewer_id) || "Alguém");
    viewerNamesByStory.set(v.story_id, list);
  }

  const byAuthor = new Map<string, StoryItem[]>();
  rows.forEach((r) => {
    const list = byAuthor.get(r.author_id) ?? [];
    list.push({
      id: r.id,
      imageUrl: urlByPath.get(r.image_path) ?? null,
      caption: r.caption,
      createdAt: r.created_at,
      imagePath: r.image_path,
      viewerNames: r.author_id === myUserId ? viewerNamesByStory.get(r.id) ?? [] : undefined,
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
