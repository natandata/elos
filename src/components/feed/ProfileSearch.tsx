"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/Avatar";
import { ROLE_LABEL, type Role } from "@/lib/types";

type Result = {
  id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  role: Role;
  elo_id: string | null;
};

/** Busca de líderes e crias por nome ou @ — dentro do Explorar. */
export function ProfileSearch() {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [eloNames, setEloNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (eloNames.size > 0) return;
    supabase
      .from("elos")
      .select("id, name")
      .then(({ data }) => {
        setEloNames(new Map((data ?? []).map((e: { id: string; name: string }) => [e.id, e.name])));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase.rpc("search_profiles", { p_query: query.trim() });
      setResults((data ?? []) as Result[]);
      setLoading(false);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function close() {
    setOpen(false);
    setQuery("");
    setResults([]);
  }

  return (
    <div className="mb-4">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--muted)]"
        >
          🔎 Buscar líder ou cria…
        </button>
      ) : (
        <div className="card p-3">
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nome ou @usuário"
              className="input flex-1"
            />
            <button type="button" onClick={close} className="text-sm text-[var(--muted)]">
              Cancelar
            </button>
          </div>

          {query.trim().length >= 2 ? (
            <div className="mt-3 max-h-80 space-y-1 overflow-y-auto">
              {loading ? (
                <p className="px-1 py-2 text-sm text-[var(--muted)]">Buscando…</p>
              ) : results.length === 0 ? (
                <p className="px-1 py-2 text-sm text-[var(--muted)]">Ninguém encontrado.</p>
              ) : (
                results.map((r) => (
                  <Link
                    key={r.id}
                    href={`/app/perfil/${r.id}`}
                    onClick={close}
                    className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-[var(--bg)]"
                  >
                    <Avatar url={r.avatar_url} name={r.full_name} size={36} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">
                        {r.username ? `@${r.username}` : r.full_name}
                      </p>
                      <p className="truncate text-xs text-[var(--muted)]">
                        {ROLE_LABEL[r.role]}
                        {r.elo_id && eloNames.get(r.elo_id) ? ` · ${eloNames.get(r.elo_id)}` : ""}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
