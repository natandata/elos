import { homeFor, needsWeeklyPushNudge, requireRole } from "@/lib/auth";
import { ElogramTopBar } from "@/components/elogram/ElogramTopBar";
import { createClient } from "@/lib/supabase/server";
import { dailyFeedPrompt } from "@/lib/feedPrompts";
import { FeedComposer } from "@/components/feed/FeedComposer";
import { FeedStoriesTray } from "@/components/feed/FeedStoriesTray";
import { getAllStoriesTray } from "@/lib/stories";
import { loadFeedPosts } from "@/lib/elogramFeed";
import { WeeklyPushNudge } from "@/components/push/WeeklyPushNudge";
import { FeedPostCard } from "@/components/feed/FeedPostCard";

export default async function FeedPage() {
  const { profile, viewingAs } = await requireRole("admin", "leader", "cria", "guardian");
  const supabase = await createClient();
  const isAdmin = profile.role === "admin";
  const canInteract = profile.role === "leader" || profile.role === "cria";
  // O Elogram é a Home do responsável (guardian) — pros outros papéis, o
  // lembrete semanal já aparece na própria tela de início deles.
  const showPushNudge =
    profile.role === "guardian" && !viewingAs && (await needsWeeklyPushNudge(supabase, profile));
  const dailyPrompt = dailyFeedPrompt();

  const [feed, galleryCountRes, storyEntries, { data: unread }] = await Promise.all([
    loadFeedPosts(supabase, profile, { viewingAs: !!viewingAs }),
    canInteract
      ? supabase
          .from("profile_gallery_posts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", profile.id)
      : Promise.resolve({ count: 0 }),
    // Bolinhas do topo: só stories (foto ou vídeo, 24h) de todos os usuários — as fotos do feed ficam abaixo.
    getAllStoriesTray(supabase, profile.id),
    supabase.rpc("elogram_unread_count"),
  ]);

  const backHref = profile.role === "guardian" ? null : homeFor(profile.role);

  return (
    <div>
      <ElogramTopBar
        backHref={backHref}
        unread={Number(unread ?? 0)}
        composer={
          canInteract ? (
            <FeedComposer
              userId={profile.id}
              galleryFull={(galleryCountRes.count ?? 0) >= 3}
              dailyPrompt={dailyPrompt}
            />
          ) : undefined
        }
      />

      <WeeklyPushNudge eligible={showPushNudge} />

      <FeedStoriesTray
        entries={storyEntries}
        myUserId={profile.id}
        canPost={canInteract}
        myName={profile.full_name || "Você"}
        myAvatar={profile.avatar_url}
      />

      {canInteract ? (
        <div className="mx-3 mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--card)] p-3">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--accent-strong)]">
              💡 Tema de hoje
              <span className="chip border-[var(--accent)] bg-[var(--accent-soft)] !px-1.5 !py-0 text-[var(--accent-strong)]">
                +1 XP
              </span>
            </p>
            <p className="mt-0.5 text-sm font-semibold">{dailyPrompt}</p>
          </div>
          {profile.feed_streak > 0 ? (
            <span className="chip border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]">
              🔥 {profile.feed_streak} {profile.feed_streak === 1 ? "dia seguido" : "dias seguidos"}
            </span>
          ) : null}
        </div>
      ) : null}

      {feed.length === 0 ? (
        <p className="px-6 py-16 text-center text-sm text-[var(--muted)]">Nenhuma foto no Elogram nas últimas 24h.</p>
      ) : (
        <div>
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
    </div>
  );
}
