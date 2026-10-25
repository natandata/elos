"use client";

import { useEffect, useSyncExternalStore } from "react";

// Cache em memória do Spot Cria (estilo "mostra o que já tem e atualiza por trás"): voltar para uma aba
// aparece na hora e os dados novos entram em seguida, sem tela vazia. Mudanças (curtir, adicionar…) invalidam o cache.

type Entry = { data: unknown; at: number; stale: boolean; error: boolean };
const cache = new Map<string, Entry>();
const active = new Map<string, { fetcher: () => Promise<unknown>; count: number }>();
const inflight = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();
const FRESH_MS = 15_000;

const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

function revalidate(key: string, fetcher: () => Promise<unknown>): Promise<void> {
  const running = inflight.get(key);
  if (running) return running;
  const p = fetcher()
    .then((data) => {
      cache.set(key, { data, at: Date.now(), stale: false, error: false });
    })
    .catch(() => {
      const prev = cache.get(key);
      cache.set(key, { data: prev?.data, at: prev?.at ?? 0, stale: true, error: true });
    })
    .finally(() => {
      inflight.delete(key);
      emit();
    });
  inflight.set(key, p);
  return p;
}

/** Coloca dados vindos do servidor no cache (primeira tela sem esqueleto). Só vale se ainda não houver nada. */
export function seedSpot(key: string, data: unknown) {
  if (!cache.has(key)) cache.set(key, { data, at: Date.now(), stale: false, error: false });
}

/** Marca tudo como velho e recarrega, por trás, o que está na tela. */
export function invalidateSpot(): Promise<void> {
  cache.forEach((e, k) => cache.set(k, { ...e, stale: true }));
  const jobs: Promise<void>[] = [];
  active.forEach((a, k) => jobs.push(revalidate(k, a.fetcher)));
  emit();
  return Promise.all(jobs).then(() => undefined);
}

type AnyRec = Record<string, unknown>;
const isTrack = (o: unknown): o is AnyRec => !!o && typeof o === "object" && "video_id" in (o as AnyRec) && "liked" in (o as AnyRec);

function mapTracks(node: unknown, id: string, patch: AnyRec): unknown {
  if (Array.isArray(node)) return node.map((n) => mapTracks(n, id, patch));
  if (isTrack(node)) return node.id === id ? { ...node, ...patch } : node;
  if (node && typeof node === "object") {
    const out: AnyRec = {};
    for (const [k, v] of Object.entries(node as AnyRec)) out[k] = mapTracks(v, id, patch);
    return out;
  }
  return node;
}

/** Atualiza uma faixa em todas as telas em cache (curtir aparece na hora em todo lugar). */
export function patchSpotTrack(id: string, patch: Partial<{ liked: boolean; like_count: number; play_count: number }>) {
  cache.forEach((e, k) => cache.set(k, { ...e, data: mapTracks(e.data, id, patch) }));
  emit();
}

/** `fetcher` precisa ser estável (função de módulo ou useCallback). */
export function useSpotQuery<T>(key: string, fetcher: () => Promise<T>): { data: T | undefined; loading: boolean; refreshing: boolean } {
  const entry = useSyncExternalStore(
    subscribe,
    () => cache.get(key),
    () => undefined,
  );
  useEffect(() => {
    const cur = active.get(key);
    active.set(key, { fetcher: fetcher, count: (cur?.count ?? 0) + 1 });
    const e = cache.get(key);
    if (!e || e.stale || Date.now() - e.at > FRESH_MS) void revalidate(key, fetcher);
    return () => {
      const a = active.get(key);
      if (!a) return;
      if (a.count <= 1) active.delete(key);
      else active.set(key, { ...a, count: a.count - 1 });
    };
  }, [key, fetcher]);

  return { data: entry?.data as T | undefined, loading: entry?.data === undefined, refreshing: inflight.has(key) };
}
