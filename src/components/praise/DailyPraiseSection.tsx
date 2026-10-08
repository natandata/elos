import { DailyPraise, type PraiseItem } from "./DailyPraise";
import { createClient } from "@/lib/supabase/server";

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

/** Carrega os louvores das últimas 24 horas e mostra o bloco "Louvor do dia". */
export async function DailyPraiseSection({ meId, isAdmin = false }: { meId: string; isAdmin?: boolean }) {
  const supabase = await createClient();
  const since = hoursAgo(24);
  const { data } = await supabase.from("daily_praise").select("user_id, video_id, url, title, channel, created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(60);
  const rows = (data ?? []) as { user_id: string; video_id: string; url: string; title: string; channel: string; created_at: string }[];
  // Nome/foto via RPC dedicada: a leitura direta de profiles é restrita por Elo,
  // e o join devolvia null (virava "Alguém" sem foto) para quem é de outro Elo.
  const ids = Array.from(new Set(rows.map((r) => r.user_id)));
  const { data: names } = ids.length ? await supabase.rpc("feed_author_names", { p_ids: ids }) : { data: [] };
  const byId = new Map(((names ?? []) as { id: string; full_name: string | null; avatar_url: string | null }[]).map((a) => [a.id, a]));
  const items: PraiseItem[] = rows.map((r) => {
    const p = byId.get(r.user_id);
    return { userId: r.user_id, name: p?.full_name || "Alguém", avatar: p?.avatar_url ?? null, videoId: r.video_id, url: r.url, title: r.title, channel: r.channel, at: r.created_at };
  });
  return <DailyPraise items={items} meId={meId} isAdmin={isAdmin} />;
}
