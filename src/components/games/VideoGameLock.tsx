/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { VideoLink } from "@/components/home/VideoLink";
import { VIDEO_SOURCE_LABEL, type VideoSource } from "@/lib/home/videos";

export type LockVideo = { source: VideoSource; video_id: string; title: string; pct: number };

/** Sala de Jogos travada em dia de vídeo (ou por ter ido ao YouTube): assistir um conteúdo relevante inteiro, no player do app, libera. */
export function VideoGameLock({ videos, penalty }: { videos: LockVideo[]; penalty: boolean }) {
  return (
    <>
      <header className="mb-5 pt-1 text-center">
        <h1 className="gr-title">Sala de Jogos</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm font-semibold text-white/85">{penalty ? "Esse conteúdo precisa ser assistido por inteiro." : "Hoje a Sala de Jogos abre com um conteúdo relevante."}</p>
      </header>
      <div className="card mx-auto max-w-md p-5 text-center">
        <p className="text-5xl" aria-hidden>
          {penalty ? "⚠️" : "🔒"}
        </p>
        <h2 className="mt-2 text-xl font-black text-[var(--ink)]">Sala de Jogos travada</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {penalty
            ? "Você foi para o YouTube sem terminar o conteúdo. Para liberar os jogos, assista a este vídeo por inteiro aqui no player do ELOS."
            : "Hoje, em vez da leitura da Bíblia, assista a um conteúdo relevante por inteiro aqui no player do ELOS (sem pular). Assistir no YouTube não conta. Se parar no meio, o ponto onde você parou fica salvo."}
        </p>
        <ul className="mt-4 grid gap-3 text-left">
          {videos.map((v) => (
            <li key={v.video_id}>
              <VideoLink videoId={v.video_id} title={v.title} label={VIDEO_SOURCE_LABEL[v.source]}>
                <span className="relative block aspect-video overflow-hidden bg-black">
                  <img src={`https://i.ytimg.com/vi/${v.video_id}/hqdefault.jpg`} alt="" loading="lazy" className="h-full w-full object-cover" />
                  <span className="absolute inset-0 grid place-items-center bg-black/10" aria-hidden>
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-black/65 pl-0.5 text-lg text-white">▶</span>
                  </span>
                  {v.pct > 0 ? (
                    <span className="absolute inset-x-0 bottom-0 h-1.5 bg-black/40">
                      <span className="block h-full bg-emerald-400" style={{ width: `${Math.min(100, v.pct)}%` }} />
                    </span>
                  ) : null}
                </span>
                <span className="block p-3">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-[var(--accent-strong)]">{VIDEO_SOURCE_LABEL[v.source]}</span>
                  <span className="mt-1 line-clamp-3 block text-sm font-bold leading-snug text-[var(--ink)]">{v.title}</span>
                  {v.pct > 0 ? <span className="mt-1 block text-xs font-bold text-emerald-700">{v.pct}% assistido · toque para continuar</span> : null}
                </span>
              </VideoLink>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[11px] text-[var(--muted)]">{penalty ? "A trava só sai quando o vídeo for assistido por inteiro no ELOS." : "A trava recomeça todo dia à meia-noite. Amanhã a liberação volta a ser a leitura da Bíblia."}</p>
        <Link href="/app" className="mt-2 inline-block text-xs font-bold underline text-[var(--muted)]">
          Voltar ao início
        </Link>
      </div>
    </>
  );
}
