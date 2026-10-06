// Mundos salvos no próprio aparelho (IndexedDB), com reserva em memória se o navegador bloquear.
import type { Stack } from "../items/inventory";

export interface WorldSave {
  id: string;
  name: string;
  seed: number;
  createdAt: number;
  updatedAt: number;
  playedSeconds: number;
  /** Tempo do dia (0–1). */
  time: number;
  player: { x: number; y: number; z: number; yaw: number; pitch: number; health: number; hunger: number };
  spawn: { x: number; y: number; z: number };
  inventory: { slots: Stack[]; armor: Stack[]; selected: number };
  /** Blocos alterados: chave do chunk → pares [índice, id]. */
  mods: Record<string, number[]>;
  discoveries: string[];
  heroesMet: string[];
  kills: number;
}

const DB = "minearena";
const STORE = "worlds";
const memory = new Map<string, WorldSave>();

function open(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function run<T>(db: IDBDatabase, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  return new Promise((resolve) => {
    try {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function listWorlds(): Promise<WorldSave[]> {
  const db = await open();
  if (!db) return [...memory.values()].sort((a, b) => b.updatedAt - a.updatedAt);
  const all = (await run(db, "readonly", (s) => s.getAll() as IDBRequest<WorldSave[]>)) ?? [];
  db.close();
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function putWorld(w: WorldSave): Promise<void> {
  const db = await open();
  if (!db) {
    memory.set(w.id, w);
    return;
  }
  await run(db, "readwrite", (s) => s.put(w));
  db.close();
}

export async function deleteWorld(id: string): Promise<void> {
  memory.delete(id);
  const db = await open();
  if (!db) return;
  await run(db, "readwrite", (s) => s.delete(id));
  db.close();
}
