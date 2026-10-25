"use client";

/* eslint-disable @next/next/no-img-element */
import { createContext, useContext, useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { addSpotTrack, addToSpotPlaylist, createSpotPlaylist, myPlaylists, removeFromSpotPlaylist, removeSpotTrack, toggleSpotLike } from "@/lib/actions/spotcria";
import { thumb, type SpotPlaylist, type SpotTrack } from "@/lib/spotcria/types";
import { useSpotPlayer } from "./PlayerProvider";

// Peças do Spot Cria: roxo no lugar do verde do Spotify, fundo escuro, capas quadradas e linhas de faixa.

export const SPOT = {
  bg: "#0f0a1a",
  surface: "#1b1230",
  surface2: "#2a1b47",
  accent: "#a855f7",
  accentSoft: "#c4a0ff",
  muted: "#b8a9d6",
};

const MetaContext = createContext<{ isAdmin: boolean }>({ isAdmin: false });
export const SpotMetaProvider = MetaContext.Provider;
export const useSpotMeta = () => useContext(MetaContext);

/** Capa quadrada: recorta o centro da miniatura 16:9 do YouTube. */
export function Cover({ videoId, className = "", rounded = "rounded-md" }: { videoId: string; className?: string; rounded?: string }) {
  return (
    <span className={`relative block aspect-square shrink-0 overflow-hidden bg-[#2a1b47] ${rounded} ${className}`}>
      <img src={thumb(videoId, "hq")} alt="" loading="lazy" draggable={false} className="absolute left-1/2 top-1/2 h-full w-[178%] max-w-none -translate-x-1/2 -translate-y-1/2 object-cover" />
    </span>
  );
}

export function PlaylistCover({ covers, className = "" }: { covers: string[]; className?: string }) {
  if (covers.length < 4) {
    return covers.length > 0 ? (
      <Cover videoId={covers[0]} className={className} />
    ) : (
      <span className={`grid aspect-square shrink-0 place-items-center rounded-md bg-gradient-to-br from-[#6d28d9] to-[#a855f7] text-3xl ${className}`} aria-hidden>
        🎵
      </span>
    );
  }
  return (
    <span className={`grid aspect-square shrink-0 grid-cols-2 gap-px overflow-hidden rounded-md bg-black ${className}`}>
      {covers.slice(0, 4).map((c, i) => (
        <Cover key={i} videoId={c} rounded="rounded-none" className="!h-full !w-full" />
      ))}
    </span>
  );
}

function Bars() {
  return (
    <span className="inline-flex h-3.5 items-end gap-[2px]" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span key={i} className="w-[3px] animate-pulse rounded-sm bg-[#a855f7]" style={{ height: `${50 + i * 25}%`, animationDelay: `${i * 140}ms` }} />
      ))}
    </span>
  );
}

function Sheet({ title, onClose, children }: { title?: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70" onClick={onClose} role="dialog" aria-modal="true">
      <div className="w-full max-w-2xl rounded-t-3xl bg-[#1b1230] p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] text-white" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/25" />
        {title ? <p className="mb-3 line-clamp-2 text-sm font-black">{title}</p> : null}
        {children}
      </div>
    </div>
  );
}

function SheetButton({ onClick, children, danger }: { onClick: () => void; children: ReactNode; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={`flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left text-sm font-bold active:bg-white/10 ${danger ? "text-rose-400" : ""}`}>
      {children}
    </button>
  );
}

/** Escolher (ou criar) uma playlist para guardar a faixa. */
export function PlaylistPicker({ track, onClose, onDone }: { track: SpotTrack; onClose: () => void; onDone?: () => void }) {
  const router = useRouter();
  const [lists, setLists] = useState<SpotPlaylist[] | null>(null);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    void myPlaylists().then(setLists);
  }, []);

  const add = (id: string, label: string) =>
    start(async () => {
      const r = await addToSpotPlaylist(id, track.id);
      if (r.error) return setMsg(r.error);
      setMsg(r.already ? `Já está em “${label}”.` : `Adicionada a “${label}”.`);
      router.refresh();
      onDone?.();
      window.setTimeout(onClose, 900);
    });
  const create = () =>
    start(async () => {
      const r = await createSpotPlaylist(name, track.id);
      if (r.error) return setMsg(r.error);
      setMsg(`Playlist “${name.trim()}” criada.`);
      router.refresh();
      onDone?.();
      window.setTimeout(onClose, 900);
    });

  return (
    <Sheet title="Adicionar à playlist" onClose={onClose}>
      <div className="flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nova playlist…" maxLength={60} className="min-w-0 flex-1 rounded-xl bg-[#2a1b47] px-3 py-2.5 text-sm text-white placeholder:text-[#b8a9d6]" aria-label="Nome da nova playlist" />
        <button type="button" onClick={create} disabled={pending || !name.trim()} className="rounded-xl bg-[#a855f7] px-4 text-sm font-black text-white disabled:opacity-50">
          Criar
        </button>
      </div>
      {msg ? <p className="mt-2 text-xs font-bold text-[#c4a0ff]">{msg}</p> : null}
      <ul className="mt-2 max-h-64 overflow-y-auto">
        {lists === null ? <li className="p-3 text-sm text-[#b8a9d6]">Carregando…</li> : null}
        {lists?.length === 0 ? <li className="p-3 text-sm text-[#b8a9d6]">Você ainda não tem playlists.</li> : null}
        {lists?.map((l) => (
          <li key={l.id}>
            <button type="button" onClick={() => add(l.id, l.name)} disabled={pending} className="flex w-full items-center gap-3 rounded-xl px-1 py-2 text-left active:bg-white/10">
              <PlaylistCover covers={l.covers} className="h-11 w-11" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold">{l.name}</span>
                <span className="block text-xs text-[#b8a9d6]">{l.track_count} música(s)</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

/** Colar um link do YouTube e guardar na biblioteca do ELOS. */
export function AddTrackSheet({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [link, setLink] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      const r = await addSpotTrack(link);
      if (r.error) return setMsg({ ok: false, text: r.error });
      setMsg({ ok: true, text: r.existed ? `“${r.track?.title}” já estava na biblioteca.` : `“${r.track?.title}” entrou na biblioteca!` });
      setLink("");
      router.refresh();
    });

  return (
    <Sheet title="Adicionar música" onClose={onClose}>
      <p className="mb-2 text-xs text-[#b8a9d6]">Cole o link de um louvor ou música do YouTube. Ela fica salva para todo o ELOS ouvir.</p>
      <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" inputMode="url" className="w-full rounded-xl bg-[#2a1b47] px-3 py-3 text-sm text-white placeholder:text-[#b8a9d6]" aria-label="Link da música no YouTube" />
      {msg ? <p className={`mt-2 text-xs font-bold ${msg.ok ? "text-emerald-300" : "text-rose-400"}`}>{msg.text}</p> : null}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={save} disabled={pending || link.trim().length < 5} className="rounded-full bg-[#a855f7] py-2.5 text-sm font-black text-white disabled:opacity-50">
          {pending ? "Salvando…" : "Adicionar"}
        </button>
        <button type="button" onClick={onClose} className="rounded-full bg-white/10 py-2.5 text-sm font-black">
          Fechar
        </button>
      </div>
    </Sheet>
  );
}

/** Menu "⋯" de uma faixa. */
function TrackMenu({ track, playlistId, onClose }: { track: SpotTrack; playlistId?: string; onClose: () => void }) {
  const router = useRouter();
  const { isAdmin } = useSpotMeta();
  const { patchTrack } = useSpotPlayer();
  const [picker, setPicker] = useState(false);
  const [, start] = useTransition();

  if (picker) return <PlaylistPicker track={track} onClose={onClose} />;
  return (
    <Sheet title={track.title} onClose={onClose}>
      <SheetButton
        onClick={() =>
          start(async () => {
            const liked = await toggleSpotLike(track.id);
            patchTrack(track.id, { liked, like_count: Math.max(0, track.like_count + (liked ? 1 : -1)) });
            router.refresh();
            onClose();
          })
        }
      >
        <span aria-hidden>{track.liked ? "💜" : "🤍"}</span> {track.liked ? "Remover das curtidas" : "Curtir"}
      </SheetButton>
      <SheetButton onClick={() => setPicker(true)}>
        <span aria-hidden>➕</span> Adicionar à playlist
      </SheetButton>
      {playlistId ? (
        <SheetButton
          onClick={() =>
            start(async () => {
              await removeFromSpotPlaylist(playlistId, track.id);
              router.refresh();
              onClose();
            })
          }
        >
          <span aria-hidden>➖</span> Tirar desta playlist
        </SheetButton>
      ) : null}
      <SheetButton
        onClick={() => {
          window.open(`https://www.youtube.com/watch?v=${track.video_id}`, "_blank", "noopener,noreferrer");
          onClose();
        }}
      >
        <span aria-hidden>↗️</span> Abrir no YouTube
      </SheetButton>
      {track.mine || isAdmin ? (
        <SheetButton
          danger
          onClick={() =>
            start(async () => {
              if (!window.confirm("Remover esta música da biblioteca de todos?")) return;
              await removeSpotTrack(track.id);
              router.refresh();
              onClose();
            })
          }
        >
          <span aria-hidden>🗑️</span> Remover da biblioteca
        </SheetButton>
      ) : null}
    </Sheet>
  );
}

export function TrackRow({ track, queue, playlistId, index }: { track: SpotTrack; queue: SpotTrack[]; playlistId?: string; index?: number }) {
  const { current, playing, play } = useSpotPlayer();
  const [menu, setMenu] = useState(false);
  const active = current?.id === track.id;
  return (
    <li className="flex items-center gap-1 rounded-xl px-1 active:bg-white/5">
      <button type="button" onClick={() => play(track, queue)} className="flex min-w-0 flex-1 items-center gap-3 py-1.5 text-left">
        {index !== undefined ? <span className="w-5 shrink-0 text-center text-xs tabular-nums text-[#b8a9d6]">{active && playing ? <Bars /> : index + 1}</span> : null}
        <Cover videoId={track.video_id} className="h-12 w-12" />
        <span className="min-w-0 flex-1">
          <span className={`flex items-center gap-1.5 text-sm font-bold ${active ? "text-[#c4a0ff]" : "text-white"}`}>
            <span className="truncate">{track.title}</span>
            {index === undefined && active && playing ? <Bars /> : null}
          </span>
          <span className="block truncate text-xs text-[#b8a9d6]">
            {track.liked ? <span aria-hidden>💜 </span> : null}
            {track.channel}
            {track.added_by_name ? ` · por ${track.added_by_name}` : ""}
          </span>
        </span>
      </button>
      <button type="button" onClick={() => setMenu(true)} aria-label="Mais opções" className="grid h-10 w-10 shrink-0 place-items-center text-xl text-[#b8a9d6]">
        ⋯
      </button>
      {menu ? <TrackMenu track={track} playlistId={playlistId} onClose={() => setMenu(false)} /> : null}
    </li>
  );
}

/** Cartão quadrado das prateleiras horizontais. */
export function TrackCard({ track, queue }: { track: SpotTrack; queue: SpotTrack[] }) {
  const { current, playing, play } = useSpotPlayer();
  const active = current?.id === track.id;
  return (
    <li className="w-36 shrink-0">
      <button type="button" onClick={() => play(track, queue)} className="block w-full text-left">
        <span className="relative block">
          <Cover videoId={track.video_id} className="w-full" rounded="rounded-lg" />
          {active && playing ? (
            <span className="absolute bottom-1.5 right-1.5 grid h-7 w-7 place-items-center rounded-full bg-[#a855f7]">
              <Bars />
            </span>
          ) : null}
        </span>
        <span className={`mt-1.5 line-clamp-2 block text-sm font-bold leading-snug ${active ? "text-[#c4a0ff]" : "text-white"}`}>{track.title}</span>
        <span className="mt-0.5 line-clamp-1 block text-xs text-[#b8a9d6]">{track.channel}</span>
      </button>
    </li>
  );
}

export function Shelf({ title, tracks, hint }: { title: string; tracks: SpotTrack[]; hint?: string }) {
  if (tracks.length === 0) return null;
  return (
    <section className="mt-6">
      <h2 className="px-4 text-lg font-black">{title}</h2>
      {hint ? <p className="px-4 text-xs text-[#b8a9d6]">{hint}</p> : null}
      <ul className="-mx-0 mt-2 flex gap-3 overflow-x-auto px-4 pb-1">
        {tracks.map((t) => (
          <TrackCard key={t.id} track={t} queue={tracks} />
        ))}
      </ul>
    </section>
  );
}

/** Cabeçalho + lista de faixas (curtidas, minhas adições, playlist). */
export function TrackListView({
  title,
  subtitle,
  cover,
  tracks,
  playlistId,
  empty,
  actions,
}: {
  title: string;
  subtitle: string;
  cover: ReactNode;
  tracks: SpotTrack[];
  playlistId?: string;
  empty: string;
  actions?: ReactNode;
}) {
  const { play } = useSpotPlayer();
  const shuffle = () => {
    const q = [...tracks].sort(() => Math.random() - 0.5);
    if (q[0]) play(q[0], q);
  };
  return (
    <div>
      <div className="bg-gradient-to-b from-[#4c1d95] to-transparent px-4 pb-4 pt-6">
        <div className="mx-auto w-40">{cover}</div>
        <h1 className="mt-4 text-2xl font-black leading-tight">{title}</h1>
        <p className="mt-1 text-xs text-[#d6c8f5]">{subtitle}</p>
        <div className="mt-4 flex items-center gap-3">
          <button type="button" onClick={shuffle} disabled={tracks.length === 0} aria-label="Tocar em ordem aleatória" className="rounded-full bg-white/10 px-4 py-2.5 text-sm font-black disabled:opacity-40">
            🔀 Aleatório
          </button>
          <button type="button" onClick={() => tracks[0] && play(tracks[0], tracks)} disabled={tracks.length === 0} aria-label="Tocar tudo" className="ml-auto grid h-14 w-14 place-items-center rounded-full bg-[#a855f7] text-2xl text-white shadow-lg disabled:opacity-40">
            ▶
          </button>
          {actions}
        </div>
      </div>
      {tracks.length === 0 ? (
        <p className="px-6 py-8 text-center text-sm text-[#b8a9d6]">{empty}</p>
      ) : (
        <ul className="px-2">
          {tracks.map((t, i) => (
            <TrackRow key={t.id} track={t} queue={tracks} playlistId={playlistId} index={i} />
          ))}
        </ul>
      )}
    </div>
  );
}
