import { homeFor, needsWeeklyPushNudge, requireRole } from "@/lib/auth";
import { ElogramTopBar } from "@/components/elogram/ElogramTopBar";
import { createClient } from "@/lib/supabase/server";
import { dailyFeedPrompt, dailyFeedTheme } from "@/lib/feedPrompts";
import { DailyThemeCard, type ThemePair } from "@/components/elogram/DailyThemeCard";
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
  const dailyTheme = dailyFeedTheme();

  const [feed, galleryCountRes, storyEntries, { data: unread }, themeTodayRes] = await Promise.all([
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
    canInteract ? supabase.rpc("elogram_theme_today") : Promise.resolve({ data: null }),
  ]);
  // A cada 2 dias o tema é em dupla: só dá XP quando a pessoa e a parceira do dia postam.
  const themeToday = ((themeTodayRes.data ?? []) as { pair: boolean; partner_id: string | null; partner_name: string | null; partner_avatar: string | null; my_posted: boolean; partner_posted: boolean }[])[0];
  const pair: ThemePair | null =
    themeToday?.pair && themeToday.partner_id
      ? { partnerId: themeToday.partner_id, partnerName: themeToday.partner_name ?? "sua dupla", partnerAvatar: themeToday.partner_avatar, myPosted: themeToday.my_posted, partnerPosted: themeToday.partner_posted }
      : null;

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
              pairPartner={pair?.partnerName ?? null}
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

      {canInteract ? <DailyThemeCard theme={dailyTheme} streak={profile.feed_streak} pair={pair} /> : null}

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
