import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { DevotionalEntry, DevotionalFavorite, PrayerRequest } from "@/lib/types";
import { DevotionalWorkspace } from "@/components/devotional/DevotionalWorkspace";

// Data local (não UTC) — mesmo fuso usado em record_devotional_streak().
function todayBR(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

export default async function DevocionalPage() {
  const { profile } = await requireRole("leader", "cria");
  const supabase = await createClient();
  const today = todayBR();

  const [entriesRes, prayersRes, favoritesRes, achievementsRes] = await Promise.all([
    supabase
      .from("devotional_entries")
      .select("*")
      .eq("user_id", profile.id)
      .order("entry_date", { ascending: false })
      .limit(30),
    supabase
      .from("prayer_requests")
      .select("*, profiles:user_id(full_name)")
      .order("created_at", { ascending: false }),
    supabase
      .from("devotional_favorites")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("user_achievements")
      .select("achievement_key")
      .eq("user_id", profile.id)
      .like("achievement_key", "devotional_%"),
  ]);

  const entries = (entriesRes.data ?? []) as DevotionalEntry[];
  const rawPrayers = (
    (prayersRes.data ?? []) as unknown as (PrayerRequest & {
      profiles: { full_name: string } | null;
    })[]
  ).map((p) => ({ ...p, author_name: p.profiles?.full_name ?? null }));

  // "Orei por você": contagem + se quem está vendo já orou, só pros
  // compartilhados com o Elo (é onde o botão aparece).
  const eloPrayerIds = rawPrayers.filter((p) => p.scope === "elo").map((p) => p.id);
  const { data: supportRows } = eloPrayerIds.length
    ? await supabase.from("prayer_supports").select("prayer_id, user_id").in("prayer_id", eloPrayerIds)
    : { data: [] };
  const supports = (supportRows ?? []) as { prayer_id: string; user_id: string }[];
  const supportCountByPrayer = new Map<string, number>();
  const iPrayedSet = new Set<string>();
  supports.forEach((s) => {
    supportCountByPrayer.set(s.prayer_id, (supportCountByPrayer.get(s.prayer_id) ?? 0) + 1);
    if (s.user_id === profile.id) iPrayedSet.add(s.prayer_id);
  });
  const prayers: PrayerRequest[] = rawPrayers.map((p) => ({
    ...p,
    support_count: supportCountByPrayer.get(p.id) ?? 0,
    i_prayed: iPrayedSet.has(p.id),
  }));

  const favorites = (favoritesRes.data ?? []) as DevotionalFavorite[];
  const earnedBadges = new Set(
    ((achievementsRes.data ?? []) as { achievement_key: string }[]).map((a) => a.achievement_key),
  );

  const todayEntry = entries.find((e) => e.entry_date === today) ?? null;

  return (
    <>
      <PageHeader
        title="Meu Devocional"
        subtitle="Seu espaço pessoal de leitura, oração e reflexão."
      />
      <DevotionalWorkspace
        today={today}
        todayEntry={todayEntry}
        entries={entries}
        prayers={prayers}
        favorites={favorites}
        earnedBadges={Array.from(earnedBadges)}
        devotionalStreak={profile.devotional_streak ?? 0}
        currentUserId={profile.id}
      />
    </>
  );
}
