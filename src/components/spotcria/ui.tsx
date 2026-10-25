"use client";

/* eslint-disable @next/next/no-img-element */
import { createContext, useContext, useEffect, useState, useSyncExternalStore, useTransition, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Avatar } from "@/components/Avatar";
import { addSpotTrack, addToSpotPlaylist, createSpotPlaylist, myPlaylists, removeFromSpotPlaylist, removeSpotTrack, toggleSpotLike } from "@/lib/actions/spotcria";
import { invalidateSpot, patchSpotTrack } from "@/lib/spotcria/store";
import { thumb, type SpotPlaylist, type SpotTrack } from "@/lib/spotcria/types";
import { useSpotPlayer } from "./PlayerProvider";

// Peças do Spot Cria: roxo no lugar do verde do Spotify, fundo escuro, capas quadradas e linhas de faixa.

export const SPOT = {
  bg: "#121212",
  surface: "#282828",
  surface2: "#2a2a2a",
  accent: "#a855f7",
  accentSoft: "#c4a0ff",
  muted: "#a7a7a7",
};

export type SpotMeta = { isAdmin: boolean; name: string; avatarUrl: string | null; homeHref: string };

const MetaContext = createContext<SpotMeta>({ isAdmin: false, name: "", avatarUrl: null, homeHref: "/app" });

const PATHS = {
  home: "M12 3 3 10.2V21h6.2v-6.4h5.6V21H21V10.2z",
  search: "M10.5 3a7.5 7.5 0 0 1 5.9 12.1l4.3 4.3-1.4 1.4-4.3-4.3A7.5 7.5 0 1 1 10.5 3zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z",
  library: "M4 4h3v16H4zm5 0h3v16H9zm5.6.6 3-.8 3.4 15.6-3 .8z",
  plus: "M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7z",
  "plus-circle": "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16zm-1 3v4H7v2h4v4h2v-4h4v-2h-4V7z",
  check: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1.6 14.4-4-4 1.4-1.4 2.6 2.6 5.8-5.8 1.4 1.4z",
  shuffle: "M10.6 9.2 5.4 4 4 5.4l5.2 5.2zM14.5 4l2 2L4 18.6 5.4 20 18 7.5l2 2V4zm.3 9.4-1.4 1.4 3.1 3.1-2 2H20v-5.5l-2 2z",
  repeat: "M7 7h10v3l4-4-4-4v3H5v6h2zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2z",
  prev: "M6 6h2v12H6zm3.5 6 8.5 6V6z",
  next: "M6 18l8.5-6L6 6zM16 6v12h2V6z",
  play: "M8 5v14l11-7z",
  pause: "M6 19h4V5H6zm8-14v14h4V5z",
  share: "M18 16.1c-.8 0-1.4.3-2 .8l-7.1-4.2c.1-.2.1-.5.1-.7s0-.5-.1-.7L16 7.2c.5.5 1.2.8 2 .8 1.7 0 3-1.3 3-3s-1.3-3-3-3-3 1.3-3 3c0 .2 0 .5.1.7L8 9.8C7.5 9.3 6.8 9 6 9c-1.7 0-3 1.3-3 3s1.3 3 3 3c.8 0 1.5-.3 2-.8l7.1 4.2c0 .2-.1.4-.1.6 0 1.6 1.3 2.9 2.9 2.9s2.9-1.3 2.9-2.9-1.2-2.9-2.8-2.9z",
  queue: "M3 13h2v-2H3zm0 4h2v-2H3zm0-8h2V7H3zm4 4h14v-2H7zm0 4h14v-2H7zM7 7v2h14V7z",
  "chevron-down": "M7.4 8.6 12 13.2l4.6-4.6L18 10l-6 6-6-6z",
  "chevron-left": "M15.4 7.4 14 6l-6 6 6 6 1.4-1.4L10.8 12z",
  "home-outline": "M12 5.7l5 4.5V18h-2v-6H9v6H7v-7.8l5-4.5M12 3 2 12h3v8h6v-6h2v6h6v-8h3z",
  heart: "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54z",
  "music-note": "M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3z",
  "playlist-add": "M14 10H2v2h12zm0-4H2v2h12zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2zM2 16h8v-2H2z",
  "minus-circle": "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zM7 11h10v2H7z",
  trash: "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6zM8 9h8v10H8zm7.5-5-1-1h-5l-1 1H5v2h14V4z",
  pencil: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z",
  upload: "M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z",
  clock: "M12 2C6.47 2 2 6.48 2 12s4.47 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z",
  trending: "M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z",
  star: "M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z",
  "open-in-new": "M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3z",
  headphones: "M12 1C7.03 1 3 5.03 3 10v7a3 3 0 0 0 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3a3 3 0 0 0 3-3v-7c0-4.97-4.03-9-9-9z",
  more: "M6 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm12 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z",
} as const;

export function Icon({ name, className = "h-6 w-6" }: { name: keyof typeof PATHS; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d={PATHS[name]} />
    </svg>
  );
}

export const SpotMetaProvider = MetaContext.Provider;

/** Foto de quem está usando (canto superior esquerdo das telas, como no Spotify). */
export function MyAvatar({ size = 36 }: { size?: number }) {
  const { name, avatarUrl } = useContext(MetaContext);
  return <Avatar url={avatarUrl} name={name || "Você"} size={size} />;
}
export const useSpotMeta = () => useContext(MetaContext);

export const playsLabel = (n: number) => `${n} ${n === 1 ? "reprodução" : "reproduções"}`;

const ART: Record<string, { gradient: string; icon: keyof typeof PATHS }> = {
  liked: { gradient: "from-[#6d28d9] to-[#c084fc]", icon: "heart" },
  mine: { gradient: "from-[#7e22ce] to-[#f0abfc]", icon: "upload" },
  recent: { gradient: "from-[#be185d] to-[#f472b6]", icon: "star" },
  played: { gradient: "from-[#15803d] to-[#86efac]", icon: "trending" },
  liked_top: { gradient: "from-[#3730a3] to-[#a5b4fc]", icon: "heart" },
  my_recent: { gradient: "from-[#be123c] to-[#fda4af]", icon: "clock" },
};

/** Capa quadrada com degradê e ícone branco (Músicas curtidas, Adicionadas por mim, listas automáticas). */
export function CoverArt({ kind, className = "" }: { kind: keyof typeof ART | string; className?: string }) {
  const a = ART[kind] ?? ART.liked;
  return (
    <span className={`grid aspect-square shrink-0 place-items-center rounded-md bg-gradient-to-br ${a.gradient} ${className}`} aria-hidden>
      <Icon name={a.icon} className="h-[46%] w-[46%] text-white" />
    </span>
  );
}

/** Curtir/descurtir na hora (em todas as telas em cache e na fila) e confirmar no servidor por trás. */
export async function likeOptimistic(track: SpotTrack, patchQueue: (id: string, patch: Partial<SpotTrack>) => void): Promise<void> {
  const liked = !track.liked;
  const like_count = Math.max(0, track.like_count + (liked ? 1 : -1));
  patchSpotTrack(track.id, { liked, like_count });
  patchQueue(track.id, { liked, like_count });
  try {
    await toggleSpotLike(track.id);
  } catch {
    patchSpotTrack(track.id, { liked: track.liked, like_count: track.like_count });
    patchQueue(track.id, { liked: track.liked, like_count: track.like_count });
  }
  void invalidateSpot();
}

/** Capa quadrada: recorta o centro da miniatura 16:9 do YouTube. */
export function Cover({ videoId, className = "", rounded = "rounded-md" }: { videoId: string; className?: string; rounded?: string }) {
  return (
    <span className={`relative block aspect-square shrink-0 overflow-hidden bg-[#2a2a2a] ${rounded} ${className}`}>
      <img src={thumb(videoId, "hq")} alt="" loading="lazy" draggable={false} className="absolute left-1/2 top-1/2 h-full w-[178%] max-w-none -translate-x-1/2 -translate-y-1/2 object-cover" />
    </span>
  );
}

export function PlaylistCover({ covers, className = "" }: { covers: string[]; className?: string }) {
  if (covers.length < 4) {
    return covers.length > 0 ? (
      <Cover videoId={covers[0]} className={className} />
    ) : (
      <span className={`grid aspect-square shrink-0 place-items-center rounded-md bg-[#2a2a2a] text-[#a7a7a7] ${className}`} aria-hidden>
        <Icon name="music-note" className="h-[45%] w-[45%]" />
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

/** Joga o conteúdo para o <body>: assim as folhas ficam acima do player (que mora na raiz do app). */
export function Portal({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  return mounted ? createPortal(children, document.body) : null;
}

function Sheet({ title, onClose, children }: { title?: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <Portal>
    <div className="spot-fade fixed inset-0 z-[120] flex items-end justify-center bg-black/70" onClick={onClose} role="dialog" aria-modal="true">
      <div className="spot-up w-full max-w-2xl rounded-t-3xl bg-[#282828] p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] text-white" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/25" />
        {title ? <p className="mb-3 line-clamp-2 text-sm font-black">{title}</p> : null}
        {children}
      </div>
    </div>
    </Portal>
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
      void invalidateSpot();
      onDone?.();
      window.setTimeout(onClose, 900);
    });
  const create = () =>
    start(async () => {
      const r = await createSpotPlaylist(name, track.id);
      if (r.error) return setMsg(r.error);
      setMsg(`Playlist “${name.trim()}” criada.`);
      void invalidateSpot();
      onDone?.();
      window.setTimeout(onClose, 900);
    });

  return (
    <Sheet title="Adicionar à playlist" onClose={onClose}>
      <div className="flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nova playlist…" maxLength={60} className="min-w-0 flex-1 rounded-xl bg-[#2a2a2a] px-3 py-2.5 text-sm text-white placeholder:text-[#a7a7a7]" aria-label="Nome da nova playlist" />
        <button type="button" onClick={create} disabled={pending || !name.trim()} className="rounded-xl bg-[#a855f7] px-4 text-sm font-black text-white disabled:opacity-50">
          Criar
        </button>
      </div>
      {msg ? <p className="mt-2 text-xs font-bold text-[#c4a0ff]">{msg}</p> : null}
      <ul className="mt-2 max-h-64 overflow-y-auto">
        {lists === null ? <li className="p-3 text-sm text-[#a7a7a7]">Carregando…</li> : null}
        {lists?.length === 0 ? <li className="p-3 text-sm text-[#a7a7a7]">Você ainda não tem playlists.</li> : null}
        {lists?.map((l) => (
          <li key={l.id}>
            <button type="button" onClick={() => add(l.id, l.name)} disabled={pending} className="flex w-full items-center gap-3 rounded-xl px-1 py-2 text-left active:bg-white/10">
              <PlaylistCover covers={l.covers} className="h-11 w-11" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold">{l.name}</span>
                <span className="block text-xs text-[#a7a7a7]">{l.track_count} música(s)</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

/** Colar um link do YouTube e guardar na biblioteca do ELOS. */
export function AddTrackSheet({ onClose, playlistId, playlistName }: { onClose: () => void; playlistId?: string; playlistName?: string }) {
  const [link, setLink] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      const r = await addSpotTrack(link);
      if (r.error || !r.track) return setMsg({ ok: false, text: r.error ?? "Não foi possível adicionar." });
      if (playlistId) {
        const a = await addToSpotPlaylist(playlistId, r.track.id);
        if (a.error) return setMsg({ ok: false, text: a.error });
        setMsg({ ok: true, text: a.already ? `“${r.track.title}” já estava em “${playlistName}”.` : `“${r.track.title}” foi adicionada a “${playlistName}”!` });
      } else {
        setMsg({ ok: true, text: r.existed ? `“${r.track.title}” já estava na biblioteca.` : `“${r.track.title}” entrou na biblioteca!` });
      }
      setLink("");
      void invalidateSpot();
    });

  return (
    <Sheet title={playlistId ? `Adicionar à playlist “${playlistName}”` : "Adicionar música"} onClose={onClose}>
      <p className="mb-2 text-xs text-[#a7a7a7]">{playlistId ? "Cole o link de um vídeo do YouTube: ele entra na playlist e fica salvo na biblioteca do ELOS. Pode colar um por vez." : "Cole o link de um louvor ou música do YouTube. Ela fica salva para todo o ELOS ouvir."}</p>
      <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" inputMode="url" className="w-full rounded-xl bg-[#2a2a2a] px-3 py-3 text-sm text-white placeholder:text-[#a7a7a7]" aria-label="Link da música no YouTube" />
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
  const { isAdmin } = useSpotMeta();
  const { patchTrack } = useSpotPlayer();
  const [picker, setPicker] = useState(false);
  const [, start] = useTransition();

  if (picker) return <PlaylistPicker track={track} onClose={onClose} />;
  return (
    <Sheet title={track.title} onClose={onClose}>
      <SheetButton
        onClick={() => {
          void likeOptimistic(track, patchTrack);
          onClose();
        }}
      >
        <Icon name={track.liked ? "check" : "plus-circle"} className={`h-6 w-6 ${track.liked ? "text-[#c58bff]" : ""}`} /> {track.liked ? "Remover das curtidas" : "Curtir"}
      </SheetButton>
      <SheetButton onClick={() => setPicker(true)}>
        <Icon name="playlist-add" className="h-6 w-6" /> Adicionar à playlist
      </SheetButton>
      {playlistId ? (
        <SheetButton
          onClick={() =>
            start(async () => {
              await removeFromSpotPlaylist(playlistId, track.id);
              void invalidateSpot();
              onClose();
            })
          }
        >
          <Icon name="minus-circle" className="h-6 w-6" /> Tirar desta playlist
        </SheetButton>
      ) : null}
      <SheetButton
        onClick={() => {
          window.open(`https://www.youtube.com/watch?v=${track.video_id}`, "_blank", "noopener,noreferrer");
          onClose();
        }}
      >
        <Icon name="open-in-new" className="h-6 w-6" /> Abrir no YouTube
      </SheetButton>
      {track.mine || isAdmin ? (
        <SheetButton
          danger
          onClick={() =>
            start(async () => {
              if (!window.confirm("Remover esta música da biblioteca de todos?")) return;
              await removeSpotTrack(track.id);
              void invalidateSpot();
              onClose();
            })
          }
        >
          <Icon name="trash" className="h-6 w-6" /> Remover da biblioteca
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
        {index !== undefined ? <span className="w-5 shrink-0 text-center text-xs tabular-nums text-[#a7a7a7]">{active && playing ? <Bars /> : index + 1}</span> : null}
        <Cover videoId={track.video_id} className="h-12 w-12" />
        <span className="min-w-0 flex-1">
          <span className={`flex items-center gap-1.5 text-sm font-bold ${active ? "text-[#c4a0ff]" : "text-white"}`}>
            <span className="truncate">{track.title}</span>
            {index === undefined && active && playing ? <Bars /> : null}
          </span>
          <span className="block truncate text-xs text-[#a7a7a7]">
            {track.liked ? <Icon name="check" className="mr-1 inline h-3.5 w-3.5 align-[-2px] text-[#c58bff]" /> : null}
            {track.channel}
            {` · ${playsLabel(track.play_count)}`}
            {track.added_by_name ? ` · por ${track.added_by_name}` : ""}
          </span>
        </span>
      </button>
      <button type="button" onClick={() => setMenu(true)} aria-label="Mais opções" className="grid h-10 w-10 shrink-0 place-items-center text-[#a7a7a7]">
        <Icon name="more" className="h-6 w-6" />
      </button>
      {menu ? <TrackMenu track={track} playlistId={playlistId} onClose={() => setMenu(false)} /> : null}
    </li>
  );
}

/** Atalho compacto da Home (capa + título), que toca a faixa. */
export function TrackTile({ track, queue }: { track: SpotTrack; queue: SpotTrack[] }) {
  const { current, playing, play } = useSpotPlayer();
  const active = current?.id === track.id;
  return (
    <button type="button" onClick={() => play(track, queue)} className="flex h-14 items-center gap-3 overflow-hidden rounded-md bg-[#2a2a2a] text-left active:bg-[#333]">
      <Cover videoId={track.video_id} className="!h-14 !w-14" rounded="rounded-none" />
      <span className={`line-clamp-2 flex-1 pr-2 text-sm font-bold leading-tight ${active ? "text-[#c4a0ff]" : ""}`}>{track.title}</span>
      {active && playing ? (
        <span className="pr-2">
          <Bars />
        </span>
      ) : null}
    </button>
  );
}

/** Cartão quadrado das prateleiras horizontais. */
export function TrackCard({ track, queue }: { track: SpotTrack; queue: SpotTrack[] }) {
  const { current, playing, play } = useSpotPlayer();
  const active = current?.id === track.id;
  return (
    <li className="w-44 shrink-0">
      <button type="button" onClick={() => play(track, queue)} className="block w-full text-left">
        <span className="relative block">
          <Cover videoId={track.video_id} className="w-full" rounded="rounded-lg" />
          {active && playing ? (
            <span className="absolute bottom-1.5 right-1.5 grid h-7 w-7 place-items-center rounded-full bg-[#a855f7]">
              <Bars />
            </span>
          ) : null}
        </span>
        <span className="mt-2 block text-xs text-[#a7a7a7]">Música</span>
        <span className={`line-clamp-2 block text-sm font-bold leading-snug ${active ? "text-[#c4a0ff]" : "text-white"}`}>{track.title}</span>
        <span className="line-clamp-1 block text-xs text-[#a7a7a7]">{track.channel}</span>
        <span className="flex items-center gap-1 text-xs text-[#a7a7a7]"><Icon name="play" className="h-3 w-3" />{playsLabel(track.play_count)}</span>
      </button>
    </li>
  );
}

export function Shelf({ title, tracks, hint }: { title: string; tracks: SpotTrack[]; hint?: string }) {
  if (tracks.length === 0) return null;
  return (
    <section className="mt-6">
      <h2 className="px-4 text-2xl font-black tracking-tight">{title}</h2>
      {hint ? <p className="px-4 text-xs text-[#a7a7a7]">{hint}</p> : null}
      <ul className="spot-hscroll -mx-0 mt-2 flex gap-3 overflow-x-auto px-4 pb-1">
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
        <p className="mt-1 text-xs text-[#d0d0d0]">{subtitle}</p>
        {actions ? <div className="mt-3 flex flex-wrap items-center gap-2">{actions}</div> : null}
        <div className="mt-4 flex items-center gap-3">
          <button type="button" onClick={shuffle} disabled={tracks.length === 0} aria-label="Tocar em ordem aleatória" className="grid h-10 w-10 place-items-center text-[#c58bff] disabled:opacity-40">
            <Icon name="shuffle" className="h-8 w-8" />
          </button>
          <button type="button" onClick={() => tracks[0] && play(tracks[0], tracks)} disabled={tracks.length === 0} aria-label="Tocar tudo" className="ml-auto grid h-14 w-14 place-items-center rounded-full bg-[#a855f7] text-white shadow-lg disabled:opacity-40">
            <Icon name="play" className="h-8 w-8" />
          </button>
        </div>
      </div>
      {tracks.length === 0 ? (
        <p className="px-6 py-8 text-center text-sm text-[#a7a7a7]">{empty}</p>
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
