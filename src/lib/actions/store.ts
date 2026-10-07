"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type StoreInput = {
  id?: string;
  title: string;
  emoji: string;
  blurb: string;
  cover: string;
  href: string;
  status: "scheduled" | "dev";
  /** "AAAA-MM-DDTHH:mm" no horário de Brasília */
  releaseLocal: string;
  active: boolean;
  sort: number;
};

async function adminOnly() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle<{ role: string }>();
  if (me?.role !== "admin") return null;
  return createAdminClient();
}

const safePath = (v: string): string | null => {
  const t = v.trim();
  if (!t) return null;
  // só caminhos do próprio app ou imagens https
  return t.startsWith("/") || t.startsWith("https://") ? t : null;
};

/** Admin: cria ou atualiza um item da Loja. */
export async function saveStoreItem(input: StoreInput): Promise<{ error?: string }> {
  const db = await adminOnly();
  if (!db) return { error: "Sem permissão." };
  const title = input.title.trim().slice(0, 80);
  if (!title) return { error: "Dê um nome ao jogo." };
  if (input.status !== "scheduled" && input.status !== "dev") return { error: "Situação inválida." };
  let release_at: string | null = null;
  if (input.status === "scheduled") {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input.releaseLocal)) return { error: "Informe a data e a hora de lançamento." };
    const d = new Date(`${input.releaseLocal}:00-03:00`);
    if (Number.isNaN(d.getTime())) return { error: "Data inválida." };
    release_at = d.toISOString();
  }
  const cover = safePath(input.cover);
  const href = safePath(input.href);
  if (input.cover.trim() && !cover) return { error: "A capa precisa começar com / ou https://." };
  if (input.href.trim() && !href) return { error: "O link do jogo precisa começar com /." };
  const row = {
    title,
    emoji: input.emoji.trim().slice(0, 8) || "🎮",
    blurb: input.blurb.trim().slice(0, 200),
    cover,
    href: href && href.startsWith("/") ? href : null,
    status: input.status,
    release_at,
    active: input.active,
    sort: Math.round(Number.isFinite(input.sort) ? input.sort : 0),
    updated_at: new Date().toISOString(),
  };
  const { error } = input.id ? await db.from("store_items").update(row).eq("id", input.id) : await db.from("store_items").insert(row);
  if (error) return { error: "Não foi possível salvar." };
  revalidatePath("/app/jogos");
  revalidatePath("/app/admin/loja");
  return {};
}

/** Admin: remove um item da Loja. */
export async function deleteStoreItem(id: string): Promise<{ error?: string }> {
  const db = await adminOnly();
  if (!db) return { error: "Sem permissão." };
  const { error } = await db.from("store_items").delete().eq("id", id);
  if (error) return { error: "Não foi possível apagar." };
  revalidatePath("/app/jogos");
  revalidatePath("/app/admin/loja");
  return {};
}
