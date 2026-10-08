"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/config";

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/** Um cliente só para uma sala ou lista de salas: com o cliente único, dois canais de mesmo nome se atrapalham ao fechar. */
export function createIsolatedClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, { isSingleton: false });
}
