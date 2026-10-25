"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { createSpotPlaylist, deleteSpotPlaylist, renameSpotPlaylist, searchSpot } from "@/lib/actions/spotcria";
import { invalidateSpot } from "@/lib/spotcria/store";
import type { SpotTrack } from "@/lib/spotcria/types";
import { Icon, MyAvatar, TrackRow } from "./ui";

const TILES = [
  { href: "/app/spotcria/lista/recent", label: "Novas no ELOS", color: "#dc148c", emoji: "🆕" },
  { href: "/app/spotcria/lista/played", label: "Mais ouvidas", color: "#1e7a5a", emoji: "🔥" },
  { href: "/app/spotcria/lista/liked_top", label: "Mais curtidas", color: "#2d46b9", emoji: "💜" },
  { href: "/app/spotcria/minhas", label: "Adicionadas por mim", color: "#8d67ab", emoji: "📤" },
  { href: "/app/spotcria/curtidas", label: "Músicas curtidas", color: "#b02897", emoji: "🤍" },
  { href: "/app/spotcria/lista/my_recent", label: "Ouvidas por mim", color: "#e8115b", emoji: "🕘" },
];

/** Tela Buscar: filtra a biblioteca do ELOS por título ou canal; sem busca, mostra os atalhos coloridos e os canais. */
export function SearchView({ initial }: { initial: SpotTrack[] }) {
  const [q, setQ] = useState("");
  const [found, setFound] = useState<{ q: string; tracks: SpotTrack[] } | null>(null);
  const term = q.trim();

  useEffect(() => {
    if (!term) return;
    const id = window.setTimeout(() => {
      void searchSpot("recent", term, 60).then((r) => setFound({ q: term, tracks: r }));
    }, 250);
    return () => window.clearTimeout(id);
  }, [term]);

  const loading = term !== "" && found?.q !== term;
  const tracks = found?.tracks ?? [];
  const channels = useMemo(() => {
    const m = new Map<string, number>();
    initial.forEach((t) => t.channel && m.set(t.channel, (m.get(t.channel) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [initial]);

  return (
    <div className="px-4 pb-4 pt-2">
      <div className="flex items-center gap-3">
        <MyAvatar size={40} />
        <h1 className="text-3xl font-black tracking-tight">Buscar</h1>
      </div>
      <div className="relative mt-4">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#121212]">
          <Icon name="search" className="h-6 w-6" />
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="O que você quer ouvir?"
          className="w-full rounded-md bg-white py-3.5 pl-11 pr-4 text-base font-bold text-[#121212] placeholder:font-semibold placeholder:text-[#4a4a4a]"
          aria-label="Buscar músicas"
        />
      </div>

      {term ? (
        <>
          <p className="mt-5 text-sm font-black">{loading ? "Buscando…" : `${tracks.length} resultado(s)`}</p>
          {tracks.length === 0 && !loading ? <p className="py-6 text-center text-sm text-[#a7a7a7]">Nada encontrado. Que tal adicionar essa música em “Criar”?</p> : null}
          <ul className="mt-1">
            {tracks.map((t) => (
              <TrackRow key={t.id} track={t} queue={tracks} />
            ))}
          </ul>
        </>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {TILES.map((t) => (
              <Link key={t.href} href={t.href} className="relative h-[88px] overflow-hidden rounded-lg p-3 text-lg font-black leading-tight active:scale-[0.98]" style={{ background: t.color }}>
                <span className="relative z-10 block max-w-[75%]">{t.label}</span>
                <span className="absolute -bottom-2 -right-1 rotate-[25deg] text-5xl opacity-80" aria-hidden>
                  {t.emoji}
                </span>
              </Link>
            ))}
          </div>
          {channels.length > 0 ? (
            <>
              <h2 className="mt-6 text-lg font-black">Explore por canal</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {channels.map(([c, n]) => (
                  <button key={c} type="button" onClick={() => setQ(c)} className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold active:bg-white/20">
                    {c} <span className="text-[#a7a7a7]">· {n}</span>
                  </button>
                ))}
              </div>
            </>
          ) : null}
          <h2 className="mt-6 text-lg font-black">Toda a biblioteca do ELOS</h2>
          <ul className="mt-1">
            {initial.map((t) => (
              <TrackRow key={t.id} track={t} queue={initial} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/** Folha "Nova playlist": pede o nome e cria. */
export function NewPlaylistSheet({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const create = () =>
    start(async () => {
      const r = await createSpotPlaylist(name);
      if (r.error) return setErr(r.error);
      void invalidateSpot();
      onClose();
      router.push(`/app/spotcria/playlist/${r.id}`);
    });

  return (
    <div className="spot-fade fixed inset-0 z-[120] flex items-end justify-center bg-black/70" onClick={onClose}>
      <div className="spot-up w-full max-w-2xl rounded-t-3xl bg-[#282828] p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] text-white" onClick={(e) => e.stopPropagation()}>
        <p className="mb-3 text-sm font-black">Dê um nome à sua playlist</p>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Minha playlist" maxLength={60} className="w-full rounded-md bg-[#3a3a3a] px-3 py-3 text-base font-bold text-white placeholder:text-[#a7a7a7]" aria-label="Nome da playlist" />
        {err ? <p className="mt-2 text-xs font-bold text-rose-400">{err}</p> : null}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} className="rounded-full bg-white/10 py-3 text-sm font-black">
            Cancelar
          </button>
          <button type="button" onClick={create} disabled={pending || !name.trim()} className="rounded-full bg-[#a855f7] py-3 text-sm font-black text-white disabled:opacity-50">
            {pending ? "Criando…" : "Criar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Botão "+" da biblioteca. */
export function NewPlaylistButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Nova playlist" className="grid h-10 w-10 place-items-center">
        <Icon name="plus" className="h-8 w-8" />
      </button>
      {open ? <NewPlaylistSheet onClose={() => setOpen(false)} /> : null}
    </>
  );
}

/** Renomear e apagar a playlist (dentro da tela da playlist). */
export function PlaylistActions({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [, start] = useTransition();
  return (
    <div className="flex gap-1">
      <button
        type="button"
        aria-label="Renomear playlist"
        onClick={() => {
          const n = window.prompt("Novo nome da playlist", name);
          if (!n) return;
          start(async () => {
            await renameSpotPlaylist(id, n);
            void invalidateSpot();
          });
        }}
        className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-base"
      >
        ✏️
      </button>
      <button
        type="button"
        aria-label="Apagar playlist"
        onClick={() => {
          if (!window.confirm(`Apagar a playlist “${name}”? As músicas continuam na biblioteca.`)) return;
          start(async () => {
            await deleteSpotPlaylist(id);
            router.replace("/app/spotcria/biblioteca");
          });
        }}
        className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-base"
      >
        🗑️
      </button>
    </div>
  );
}
