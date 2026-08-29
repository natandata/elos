import { notFound, redirect } from "next/navigation";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AvatarLightbox } from "@/components/AvatarLightbox";
import { ROLE_LABEL, formatXp, levelForXp, type Role } from "@/lib/types";
import { ProfileStoryRing } from "@/components/profile/ProfileStoryRing";

type ProfileCard = {
  id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  role: Role;
  elo_id: string | null;
  xp: number;
  status_streak: number;
};

export default async function VisitProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const { profile } = await requireProfile();

  if (userId === profile.id) redirect("/app/perfil");

  const supabase = await createClient();

  const [cardRes, galleryRes, storiesRes] = await Promise.all([
    supabase.rpc("public_profile_card", { p_user: userId }),
    supabase
      .from("profile_gallery_posts")
      .select("id, image_path, caption")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("feed_posts")
      .select("id, image_path, caption, created_at")
      .eq("author_id", userId)
      .order("created_at", { ascending: true }),
  ]);

  const card = ((cardRes.data as ProfileCard[] | null) ?? [])[0];
  if (!card) return notFound();

  const eloRes = card.elo_id
    ? await supabase.from("elos").select("name").eq("id", card.elo_id).maybeSingle()
    : null;
  const eloName = (eloRes?.data as { name: string } | null)?.name ?? null;

  const galleryRows = (galleryRes.data ?? []) as { id: string; image_path: string; caption: string | null }[];
  const gallerySignedUrls = await Promise.all(
    galleryRows.map((g) => supabase.storage.from("profile_gallery").createSignedUrl(g.image_path, 3600)),
  );
  const galleryItems = galleryRows.map((g, i) => ({
    id: g.id,
    imageUrl: gallerySignedUrls[i].data?.signedUrl ?? null,
    caption: g.caption,
  }));

  const storyRows = (storiesRes.data ?? []) as {
    id: string;
    image_path: string;
    caption: string | null;
    created_at: string;
  }[];
  const storySignedUrls = await Promise.all(
    storyRows.map((s) => supabase.storage.from("feed").createSignedUrl(s.image_path, 3600)),
  );
  const stories = storyRows.map((s, i) => ({
    id: s.id,
    imageUrl: storySignedUrls[i].data?.signedUrl ?? null,
    caption: s.caption,
    createdAt: s.created_at,
  }));

  const level = levelForXp(card.xp);
  const tag = card.role === "admin" ? null : `${ROLE_LABEL[card.role]}${eloName ? ` · ${eloName}` : ""}`;

  return (
    <>
      <PageHeader title={card.full_name || "Perfil"} subtitle={tag ?? undefined} />

      <Card>
        <div className="flex items-center gap-4">
          <ProfileStoryRing hasStory={stories.length > 0} stories={stories} authorName={card.full_name}>
            <AvatarLightbox url={card.avatar_url} name={card.full_name} size={72} />
          </ProfileStoryRing>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold">
              {card.username ? `@${card.username}` : card.full_name}
            </p>
            {card.role !== "admin" ? (
              <p className="text-sm text-[var(--muted)]">{level.title}</p>
            ) : null}
          </div>
        </div>

        {card.role !== "admin" ? (
          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-[var(--line)] pt-4 text-center">
            <div>
              <p className="text-lg font-black tabular-nums">{formatXp(card.xp)}</p>
              <p className="text-xs text-[var(--muted)]">XP</p>
            </div>
            <div>
              <p className="text-lg font-black tabular-nums">{level.title}</p>
              <p className="text-xs text-[var(--muted)]">Nível</p>
            </div>
            <div>
              <p className="text-lg font-black tabular-nums">
                {card.status_streak > 0 ? `🔥 ${card.status_streak}` : "—"}
              </p>
              <p className="text-xs text-[var(--muted)]">Streak</p>
            </div>
          </div>
        ) : null}
      </Card>

      <Card className="mt-3">
        <h2 className="mb-3 text-sm font-bold">Feed</h2>
        {galleryItems.length === 0 ? (
          <EmptyState>Sem fotos na galeria ainda.</EmptyState>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {galleryItems.map((g) => (
              <div key={g.id} className="aspect-square overflow-hidden rounded-xl bg-[var(--bg)]">
                {g.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
