import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { stableSignedUrls } from "@/lib/signedUrls";
import { Avatar } from "@/components/Avatar";
import { ChevronLeftIcon } from "@/components/feed/icons";
import { relativeTimeShort } from "@/lib/relativeTime";

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
  await requireProfile();
  const supabase = await createClient();

  const { data } = await supabase.rpc("elogram_activity", { p_limit: 80 });
  const rows = (data ?? []) as Activity[];

  const feedPaths = rows.filter((r) => r.kind !== "story_view").map((r) => r.image_path);
  const storyPaths = rows.filter((r) => r.kind === "story_view").map((r) => r.image_path);
  const [feedUrls, storyUrls] = await Promise.all([
    stableSignedUrls(supabase, "feed", feedPaths),
    stableSignedUrls(supabase, "stories", storyPaths),
  ]);

  // abrir a tela zera a bolinha vermelha do coração
  await supabase.rpc("elogram_mark_seen");

  return (
    <div>
      <header className="flex items-center gap-2 px-3 pb-3 pt-3">
        <Link href="/app/elogram" aria-label="Voltar" className="-ml-1 rounded-lg p-1 text-[var(--muted)]">
          <ChevronLeftIcon />
        </Link>
        <h1 className="text-xl font-bold">Notificações</h1>
      </header>

      {rows.length === 0 ? (
        <p className="px-6 py-16 text-center text-sm text-[var(--muted)]">
          Quando alguém reagir, comentar ou ver seu story, aparece aqui.
        </p>
      ) : (
        <ul>
          {rows.map((r, i) => {
            const name = r.actor_username || r.actor_name || "Alguém";
            const thumb = r.kind === "story_view" ? storyUrls.get(r.image_path) : feedUrls.get(r.image_path);
            return (
              <li key={`${r.kind}-${r.post_id}-${r.actor_id}-${r.at}-${i}`} className="flex items-center gap-3 px-3 py-2.5">
                <Link href={`/app/elogram/perfil/${r.actor_id}`} className="shrink-0">
                  <Avatar url={r.actor_avatar} name={r.actor_name} size={44} />
                </Link>
                <p className="min-w-0 flex-1 text-sm leading-snug">
                  <Link href={`/app/elogram/perfil/${r.actor_id}`} className="font-semibold">
                    {name}
                  </Link>{" "}
                  {r.kind === "like"
                    ? `reagiu ${REACTION_EMOJI[r.reaction ?? "like"] ?? "❤️"} à sua foto.`
                    : r.kind === "comment"
                      ? `comentou: ${r.body ?? ""}`
                      : "viu o seu story."}{" "}
                  <span className="text-[var(--muted)]" suppressHydrationWarning>
                    {relativeTimeShort(r.at)}
                  </span>
                </p>
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt="" className="h-11 w-11 shrink-0 rounded-md object-cover" />
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
