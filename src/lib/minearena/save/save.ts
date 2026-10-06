// Mundos salvos no próprio aparelho (IndexedDB), com reserva em memória se o navegador bloquear.
import type { Stack } from "../items/inventory";
import type { SavedDrop } from "../entities/drops";
import type { LandmarkSite } from "../structures/landmarks";

export interface WorldSave {
  id: string;
  name: string;
  seed: number;
  createdAt: number;
  updatedAt: number;
  playedSeconds: number;
  /** Monumentos bíblicos já revelados neste mundo. */
  landmarks?: LandmarkSite[];
  /** Modo de jogo. */
  mode?: "survival" | "creative";
  /** Textos das placas ("x,y,z" → texto). */
  signs?: Record<string, string>;
  /** Experiência total do jogador. */
  xp?: number;
  /** Itens soltos no chão. */
  drops?: SavedDrop[];
  /** Onde o jogador morreu e largou seus pertences. */
  deathSpot?: { x: number; y: number; z: number };
  /** Tempo do dia (0–1). */
  time: number;
  player: { x: number; y: number; z: number; yaw: number; pitch: number; health: number; hunger: number };
  spawn: { x: number; y: number; z: number };
  inventory: { slots: Stack[]; armor: Stack[]; offhand?: Stack; selected: number };
  /** Blocos alterados: chave do chunk → pares [índice, id]. */
  mods: Record<string, number[]>;
  discoveries: string[];
  heroesMet: string[];
  kills: number;
  /** Baús e fornalhas: "x,y,z" → conteúdo. */
  containers?: Record<string, SavedContainer>;
  /** Estruturas cujos moradores já nasceram. */
  spawned?: string[];
  /** Plantações em crescimento: "x,y,z" → segundos acumulados. */
  crops?: Record<string, number>;
  /** Dimensão onde o jogador está (padrão: mundo normal). */
  dimension?: "overworld" | "geena";
  /** Blocos alterados em Geena. */
  modsGeena?: Record<string, number[]>;
  satanDefeated?: boolean;
  /** Onde o jogador entrou no portal (pra voltar). */
  portalReturn?: { x: number; y: number; z: number };
}

export interface SavedContainer {
  kind: "chest" | "furnace";
  slots: Stack[];
  burn: number;
  burnMax: number;
  cook: number;
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
  if (!db) return [...memory.values()].filter((w) => w.id !== "visitante").sort((a, b) => b.updatedAt - a.updatedAt);
  const all = (await run(db, "readonly", (s) => s.getAll() as IDBRequest<WorldSave[]>)) ?? [];
  db.close();
  return all.filter((w) => w.id !== "visitante").sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getWorld(id: string): Promise<WorldSave | null> {
  const db = await open();
  if (!db) return memory.get(id) ?? null;
  const w = (await run(db, "readonly", (s) => s.get(id) as IDBRequest<WorldSave | undefined>)) ?? null;
  db.close();
  return w ?? null;
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
