/* eslint-disable @next/next/no-img-element */
import { createClient } from "@/lib/supabase/server";

export type DailyVideo = { source: "subira" | "jesuscopy" | "luca" | "hub" | "dunamis"; video_id: string; title: string };

const SOURCE_LABEL: Record<DailyVideo["source"], string> = {
  subira: "Israel Subira",
  jesuscopy: "Cortes Jesuscopy Podcast",
  luca: "Luca Martini",
  hub: "Cortes HUB Podcast",
  dunamis: "Dunamis Hangout",
};

/** Card "Conteúdo relevante para a sua vida": 3 vídeos escolhidos a dedo, que trocam todo dia à meia-noite (Brasília). */
export async function HomeVideos() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("home_daily_videos");
  return <VideosView videos={(data ?? null) as DailyVideo[] | null} />;
}

export function VideosView({ videos }: { videos: DailyVideo[] | null }) {
  if (!videos || videos.length === 0) return null;

  return (
    <section className="mb-5 overflow-hidden rounded-3xl p-[2px]" style={{ background: "linear-gradient(45deg, #4f5bd5, #b24592, #f5576c)" }} aria-label="Conteúdo relevante para a sua vida">
      <div className="rounded-[22px] bg-[var(--card)] px-4 py-4">
        <p className="text-xs font-black uppercase tracking-wider text-[var(--muted)]">Conteúdo relevante para a sua vida</p>
        <p className="mt-0.5 text-sm font-semibold text-[var(--ink)]">▶️ 3 vídeos de hoje para você aprender mais de Deus</p>

        <ul className="mt-3 grid gap-2.5 sm:grid-cols-3">
          {videos.map((v) => (
            <li key={v.video_id}>
              <a
                href={`https://www.youtube.com/watch?v=${v.video_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group block overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--bg)] transition active:scale-[0.99]"
              >
                <span className="relative block aspect-video overflow-hidden bg-black">
                  <img src={`https://i.ytimg.com/vi/${v.video_id}/hqdefault.jpg`} alt="" loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
                  <span className="absolute inset-0 grid place-items-center bg-black/10" aria-hidden>
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-black/65 pl-0.5 text-lg text-white">▶</span>
                  </span>
                </span>
                <span className="block p-3">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-[var(--accent-strong)]">{SOURCE_LABEL[v.source]}</span>
                  <span className="mt-1 line-clamp-3 block text-sm font-bold leading-snug text-[var(--ink)]">{v.title}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
