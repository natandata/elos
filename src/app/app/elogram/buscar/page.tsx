import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { stableSignedUrls } from "@/lib/signedUrls";
import { ElogramSearch } from "@/components/elogram/ElogramSearch";

export default async function ElogramSearchPage() {
  await requireProfile();
  const supabase = await createClient();

  const { data } = await supabase
    .from("feed_posts")
    .select("id, image_path, author_id, extra_image_paths")
    .order("created_at", { ascending: false })
    .limit(60);
  const rows = (data ?? []) as { id: string; image_path: string; author_id: string; extra_image_paths: string[] | null }[];
  const urls = await stableSignedUrls(supabase, "feed", rows.map((r) => r.image_path));

  return (
    <ElogramSearch
      backHref="/app/elogram"
      hrefBase="/app/elogram/perfil/"
      grid={rows.map((r) => ({ id: r.id, imageUrl: urls.get(r.image_path) ?? null, authorId: r.author_id, multi: (r.extra_image_paths?.length ?? 0) > 0 }))}
    />
  );
}
