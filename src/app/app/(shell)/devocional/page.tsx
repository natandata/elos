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
      .select("*")
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
  const prayers = (prayersRes.data ?? []) as PrayerRequest[];
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
