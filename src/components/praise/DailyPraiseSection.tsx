import { DailyPraise, type PraiseItem } from "./DailyPraise";
import { createClient } from "@/lib/supabase/server";

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

/** Carrega os louvores das últimas 24 horas e mostra o bloco "Louvor do dia". */
export async function DailyPraiseSection({ meId, isAdmin = false }: { meId: string; isAdmin?: boolean }) {
  const supabase = await createClient();
  const since = hoursAgo(24);
  const { data } = await supabase.from("daily_praise").select("user_id, video_id, url, title, channel, created_at, profiles:profiles(full_name, avatar_url)").gte("created_at", since).order("created_at", { ascending: false }).limit(60);
  const items: PraiseItem[] = ((data ?? []) as unknown as { user_id: string; video_id: string; url: string; title: string; channel: string; created_at: string; profiles: { full_name: string | null; avatar_url: string | null } | { full_name: string | null; avatar_url: string | null }[] | null }[]).map((r) => {
    const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    return { userId: r.user_id, name: p?.full_name || "Alguém", avatar: p?.avatar_url ?? null, videoId: r.video_id, url: r.url, title: r.title, channel: r.channel, at: r.created_at };
  });
  return <DailyPraise items={items} meId={meId} isAdmin={isAdmin} />;
}
