import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { stableSignedUrls } from "@/lib/signedUrls";
import { signedVideoUrls } from "@/lib/r2";
import { AvatarLightbox } from "@/components/AvatarLightbox";
import { ImageLightbox } from "@/components/ImageLightbox";
import { ProfileStoryRing } from "@/components/profile/ProfileStoryRing";
import { ChevronLeftIcon } from "@/components/feed/icons";
import { DevotionalStreakCard } from "@/components/elogram/DevotionalStreakCard";
import { ROLE_LABEL, levelForXp, type Role } from "@/lib/types";

type ProfileCard = {
  id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  role: Role;
  elo_id: string | null;
  xp: number;
  status_streak: number;
  bio: string | null;
};

/** Perfil no estilo do Instagram: foto grande (com anel quando há story), números, bio e grade de fotos fixas. */
export default async function ElogramProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const { profile } = await requireProfile();
  const supabase = await createClient();
  const isMe = userId === profile.id;

  const [cardRes, galleryRes, storiesRes, devoRes] = await Promise.all([
    supabase.rpc("public_profile_card", { p_user: userId }),
    supabase
      .from("profile_gallery_posts")
      .select("id, image_path, caption")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("story_posts")
      .select("id, image_path, caption, created_at, video_key")
      .eq("author_id", userId)
      .order("created_at", { ascending: true }),
    supabase.rpc("elogram_devotional_streak", { p_user: userId }),
  ]);
  const devoStreak = Number(devoRes.data ?? 0);

  const card = ((cardRes.data as ProfileCard[] | null) ?? [])[0];
  if (!card) notFound();

  const eloRes = card.elo_id ? await supabase.from("elos").select("name").eq("id", card.elo_id).maybeSingle() : null;
  const eloName = (eloRes?.data as { name: string } | null)?.name ?? null;

  const galleryRows = (galleryRes.data ?? []) as { id: string; image_path: string; caption: string | null }[];
  const galleryUrls = await stableSignedUrls(supabase, "profile_gallery", galleryRows.map((g) => g.image_path));

  const storyRows = (storiesRes.data ?? []) as {
    id: string;
    image_path: string;
    caption: string | null;
    created_at: string;
    video_key: string | null;
  }[];
  const storyUrls = await stableSignedUrls(supabase, "stories", storyRows.map((s) => s.image_path));
  const storyVideoUrls = await signedVideoUrls(storyRows.flatMap((s) => (s.video_key ? [s.video_key] : [])));
  const stories = storyRows.map((s) => ({
    id: s.id,
    imageUrl: storyUrls.get(s.image_path) ?? null,
    caption: s.caption,
    createdAt: s.created_at,
    videoUrl: s.video_key ? storyVideoUrls.get(s.video_key) ?? null : null,
  }));

  const level = levelForXp(card.xp);
  const handle = card.username || card.full_name;
  const tag = card.role === "admin" ? null : `${ROLE_LABEL[card.role]}${eloName ? ` · ${eloName}` : ""}`;
  const canDm = (profile.role === "leader" || profile.role === "cria") && (card.role === "leader" || card.role === "cria");

  return (
    <div>
      <header className="flex items-center gap-2 px-3 pb-2 pt-3">
        <Link href="/app/elogram" aria-label="Voltar" className="-ml-1 rounded-lg p-1 text-[var(--muted)]">
          <ChevronLeftIcon />
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-xl font-bold">{handle}</h1>
      </header>

      <div className="px-4">
        <div className="flex items-center gap-4">
          <ProfileStoryRing hasStory={stories.length > 0} stories={stories} authorName={card.full_name}>
            <AvatarLightbox url={card.avatar_url} name={card.full_name} size={86} />
          </ProfileStoryRing>
          <div className="min-w-0 flex-1">
            <p className="text-[17px] font-semibold leading-tight">{card.full_name}</p>
            {tag ? <p className="text-sm text-[var(--muted)]">{tag}</p> : null}
            {card.role !== "admin" ? <p className="text-sm text-[var(--muted)]">{level.title}</p> : null}
          </div>
        </div>

        {card.bio ? <p className="mt-1 whitespace-pre-line text-[15px] leading-snug">{card.bio}</p> : null}

        {card.role !== "admin" ? (
          <div className="mt-3">
            <DevotionalStreakCard days={devoStreak} isMe={isMe} />
          </div>
        ) : null}

        <div className="mt-3 flex gap-2">
          {isMe ? (
            <Link
              href="/app/perfil"
              className="flex-1 rounded-lg bg-[var(--line)] py-2 text-center text-[15px] font-semibold"
            >
              Editar perfil
            </Link>
          ) : canDm ? (
            <Link
              href={`/app/elogram/mensagens/com/${card.id}`}
              className="flex-1 rounded-lg bg-[var(--line)] py-2 text-center text-[15px] font-semibold"
            >
              Mensagem
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mt-4 border-t border-[var(--line)]">
        {galleryRows.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm text-[var(--muted)]">
            {isMe ? "Suas fotos fixas aparecem aqui. Adicione pelo botão + (opção Feed)." : "Sem fotos na galeria ainda."}
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-0.5 pt-0.5">
            {galleryRows.map((g) => (
              <div key={g.id} className="aspect-square overflow-hidden bg-[var(--card)]">
                <ImageLightbox url={galleryUrls.get(g.image_path) ?? null}>
                  {galleryUrls.get(g.image_path) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={galleryUrls.get(g.image_path) ?? undefined}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </ImageLightbox>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
