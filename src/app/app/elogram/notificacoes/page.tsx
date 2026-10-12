import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { stableSignedUrls } from "@/lib/signedUrls";
import { ChevronLeftIcon } from "@/components/feed/icons";
import { ElogramActivityList, type ActivityGroup } from "@/components/elogram/ElogramActivityList";

type Activity = {
  kind: "like" | "comment" | "story_view";
  actor_id: string;
  actor_name: string;
  actor_username: string | null;
  actor_avatar: string | null;
  post_id: string;
  image_path: string;
  body: string | null;
  reaction: string | null;
  at: string;
};

const REACTION_EMOJI: Record<string, string> = { like: "❤️", laugh: "😂", pray: "🙏", fire: "🔥", clap: "👏" };

export default async function ElogramActivityPage() {
  const { profile } = await requireProfile();
  const supabase = await createClient();

  const { data } = await supabase.rpc("elogram_activity", { p_limit: 200 });
  const rows = (data ?? []) as Activity[];

  const feedPaths = rows.filter((r) => r.kind !== "story_view").map((r) => r.image_path);
  const storyPaths = rows.filter((r) => r.kind === "story_view").map((r) => r.image_path);
  const [feedUrls, storyUrls] = await Promise.all([
    stableSignedUrls(supabase, "feed", feedPaths),
    stableSignedUrls(supabase, "stories", storyPaths),
  ]);

  // Agrupa como o Instagram: reações na mesma foto viram uma linha só, e visualizações do mesmo story também.
  // Comentário fica sozinho (cada um tem o seu texto). `rows` já vem do mais novo pro mais antigo.
  const groups: ActivityGroup[] = [];
  const byKey = new Map<string, ActivityGroup & { ids: Set<string> }>();
  for (const r of rows) {
    const actor = { id: r.actor_id, name: r.actor_username || r.actor_name || "Alguém", avatar: r.actor_avatar };
    const thumb = (r.kind === "story_view" ? storyUrls.get(r.image_path) : feedUrls.get(r.image_path)) ?? null;
    const href = r.kind === "story_view" ? `/app/elogram/perfil/${profile.id}` : `/app/elogram/post/${r.post_id}`;

    if (r.kind === "comment") {
      groups.push({
        key: `c-${r.post_id}-${r.actor_id}-${r.at}`,
        kind: "comment",
        actors: [actor],
        total: 1,
        body: r.body,
        emoji: null,
        at: r.at,
        thumb,
        href,
      });
      continue;
    }

    const key = `${r.kind}-${r.post_id}`;
    const existing = byKey.get(key);
    if (!existing) {
      const g = {
        key,
        kind: r.kind,
        actors: [actor],
        total: 1,
        body: null,
        emoji: r.kind === "like" ? (REACTION_EMOJI[r.reaction ?? "like"] ?? "❤️") : null,
        at: r.at,
        thumb,
        href,
        ids: new Set([r.actor_id]),
      };
      byKey.set(key, g);
      groups.push(g);
    } else if (!existing.ids.has(r.actor_id)) {
      existing.ids.add(r.actor_id);
      existing.total += 1;
      if (existing.actors.length < 2) existing.actors.push(actor);
    }
  }
  // a ordem final é pela atividade mais recente de cada grupo
  groups.sort((a, b) => b.at.localeCompare(a.at));

  // abrir a tela zera a bolinha vermelha do coração
  await supabase.rpc("elogram_mark_seen");

  return (
    <div>
      <header className="flex items-center gap-3 px-3 pb-3 pt-3">
        <Link
          href="/app/elogram"
          aria-label="Voltar"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--card)] ring-1 ring-[var(--line)]"
        >
          <ChevronLeftIcon />
        </Link>
        <h1 className="min-w-0 truncate text-[28px] font-bold leading-none">{profile.username || profile.full_name}</h1>
      </header>

      <ElogramActivityList groups={groups} />
    </div>
  );
}
