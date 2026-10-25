"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { createSpotPlaylist, deleteSpotPlaylist, renameSpotPlaylist, searchSpot } from "@/lib/actions/spotcria";
import type { SpotTrack } from "@/lib/spotcria/types";
import { TrackRow } from "./ui";

/** Tela Buscar: filtra a biblioteca do ELOS por título ou canal. */
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
  const tracks = !term ? initial : (found?.tracks ?? []);

  return (
    <div className="px-3 pb-4 pt-4">
      <h1 className="px-1 text-2xl font-black">Buscar</h1>
      <div className="relative mt-3">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#3b1f6b]" aria-hidden>
          🔎
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Qual música você quer ouvir?"
          className="w-full rounded-full bg-white py-3 pl-10 pr-4 text-sm font-semibold text-[#1b1230] placeholder:text-[#6b5b8f]"
          aria-label="Buscar músicas"
        />
      </div>
      <p className="mt-4 px-1 text-sm font-black">{term ? (loading ? "Buscando…" : `${tracks.length} resultado(s)`) : "Toda a biblioteca do ELOS"}</p>
      {tracks.length === 0 && !loading ? <p className="px-1 py-6 text-center text-sm text-[#b8a9d6]">Nada encontrado. Que tal adicionar essa música no “+”?</p> : null}
      <ul className="mt-1">
        {tracks.map((t) => (
          <TrackRow key={t.id} track={t} queue={tracks} />
        ))}
      </ul>
    </div>
  );
}

/** Botão "Criar" da biblioteca: pede o nome e cria a playlist. */
export function NewPlaylistButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const create = () =>
    start(async () => {
      const r = await createSpotPlaylist(name);
      if (r.error) return setErr(r.error);
      setOpen(false);
      setName("");
      router.push(`/app/spotcria/playlist/${r.id}`);
    });

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="rounded-full bg-[#a855f7] px-4 py-2 text-sm font-black text-white">
        + Criar
      </button>
      {open ? (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70" onClick={() => setOpen(false)}>
          <div className="w-full max-w-2xl rounded-t-3xl bg-[#1b1230] p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] text-white" onClick={(e) => e.stopPropagation()}>
            <p className="mb-3 text-sm font-black">Nova playlist</p>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da playlist" maxLength={60} className="w-full rounded-xl bg-[#2a1b47] px-3 py-3 text-sm text-white placeholder:text-[#b8a9d6]" aria-label="Nome da playlist" />
            {err ? <p className="mt-2 text-xs font-bold text-rose-400">{err}</p> : null}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={create} disabled={pending || !name.trim()} className="rounded-full bg-[#a855f7] py-2.5 text-sm font-black disabled:opacity-50">
                {pending ? "Criando…" : "Criar"}
              </button>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full bg-white/10 py-2.5 text-sm font-black">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
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
            router.refresh();
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
