import { GradientCard, SoftTile } from "@/components/home/GradientCard";
import { VIDEO_SOURCE_LABEL, type VideoSource } from "@/lib/home/videos";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/types";

type Stats = {
  audience: number;
  today: { viewers: number; clickers: number; plays: number };
  week: { viewers: number; clickers: number; plays: number };
  recent: { name: string | null; title: string; source: VideoSource | null; at: string }[];
};

/** Painel do admin: quantos viram o card "Conteúdo relevante" e quantos/quem abriu os vídeos (só crias e líderes reais). */
export async function AdminVideoStats() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_home_video_stats");
  const s = data as Stats | null;
  if (!s) return null;
  const pct = (n: number) => (s.audience > 0 ? Math.round((n / s.audience) * 100) : 0);

  return (
    <GradientCard tone="indigo" title="Conteúdo relevante · engajamento">
      <div className="grid grid-cols-2 gap-2.5">
        <SoftTile tone="blue" icon="👀" label="Viram hoje">
          <p className="text-3xl font-black tabular-nums leading-none">{s.today.viewers}</p>
          <p className="mt-1 text-xs font-bold text-[#4a3f66]">de {s.audience} ({pct(s.today.viewers)}%)</p>
        </SoftTile>
        <SoftTile tone="green" icon="▶️" label="Assistiram hoje">
          <p className="text-3xl font-black tabular-nums leading-none">{s.today.clickers}</p>
          <p className="mt-1 text-xs font-bold text-[#4a3f66]">{s.today.plays} abertura(s)</p>
        </SoftTile>
        <SoftTile tone="yellow" icon="📅" label="Viram em 7 dias">
          <p className="text-3xl font-black tabular-nums leading-none">{s.week.viewers}</p>
          <p className="mt-1 text-xs font-bold text-[#4a3f66]">de {s.audience} ({pct(s.week.viewers)}%)</p>
        </SoftTile>
        <SoftTile tone="pink" icon="🎬" label="Assistiram em 7 dias">
          <p className="text-3xl font-black tabular-nums leading-none">{s.week.clickers}</p>
          <p className="mt-1 text-xs font-bold text-[#4a3f66]">{s.week.plays} abertura(s)</p>
        </SoftTile>
      </div>

      <p className="mb-1.5 mt-4 text-[11px] font-black uppercase tracking-wider text-[var(--muted)]">Quem abriu (mais recentes)</p>
      {s.recent.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">Ninguém abriu um vídeo ainda.</p>
      ) : (
        <ul className="max-h-72 divide-y divide-[var(--line)] overflow-y-auto">
          {s.recent.map((r, i) => (
            <li key={i} className="flex items-start gap-3 py-2">
              <span className="text-lg leading-none" aria-hidden>
                ▶️
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <strong>{r.name || "Alguém"}</strong> <span className="text-[var(--muted)]">· {r.source ? VIDEO_SOURCE_LABEL[r.source] : "Vídeo"}</span>
                </p>
                <p className="truncate text-xs text-[var(--muted)]">{r.title}</p>
              </div>
              <span className="shrink-0 text-xs text-[var(--muted)]">{formatDateTime(r.at)}</span>
            </li>
          ))}
        </ul>
      )}
    </GradientCard>
  );
}
