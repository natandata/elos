"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/Avatar";
import { ChevronLeftIcon, SearchIcon } from "@/components/feed/icons";
import { ROLE_LABEL, type Role } from "@/lib/types";

type Result = {
  id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  role: Role;
  elo_id: string | null;
};

export type SearchGridItem = { id: string; imageUrl: string | null; authorId: string; multi?: boolean };

/** Busca de perfis do Elogram. Sem texto, mostra a grade de fotos recentes (como a aba de busca do Instagram).
 *  `hrefBase` + id do usuário define pra onde cada resultado leva (perfil, ou nova conversa). */
export function ElogramSearch({
  backHref,
  grid = [],
  hrefBase,
  placeholder = "Pesquisar",
  title,
}: {
  backHref: string;
  grid?: SearchGridItem[];
  hrefBase: string;
  placeholder?: string;
  title?: string;
}) {
  const supabase = createClient();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [eloNames, setEloNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
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
    if (query.trim().length < 2) return;
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const { data } = await supabase.rpc("search_profiles", { p_query: query.trim() });
      setResults((data ?? []) as Result[]);
      setLoading(false);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const searching = query.trim().length >= 2;

  return (
    <div>
      <div className="flex items-center gap-2 px-3 pb-2 pt-3">
        <Link href={backHref} aria-label="Voltar" className="-ml-1 rounded-lg p-1 text-[var(--muted)]">
          <ChevronLeftIcon />
        </Link>
        {title ? <p className="shrink-0 text-lg font-bold">{title}</p> : null}
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-[var(--card)] px-3 py-2.5 text-[var(--muted)] ring-1 ring-[var(--line)]">
          <SearchIcon />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-[var(--ink)] outline-none placeholder:text-[var(--muted)]"
          />
        </label>
      </div>

      {searching ? (
        <div className="px-3 pt-1">
          {loading && results.length === 0 ? (
            <p className="py-3 text-sm text-[var(--muted)]">Buscando…</p>
          ) : results.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--muted)]">Ninguém encontrado.</p>
          ) : (
            results.map((r) => (
              <Link key={r.id} href={`${hrefBase}${r.id}`} className="flex items-center gap-3 py-2.5">
                <Avatar url={r.avatar_url} name={r.full_name} size={48} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{r.username ? r.username : r.full_name}</p>
                  <p className="truncate text-sm text-[var(--muted)]">
                    {r.username ? `${r.full_name} · ` : ""}
                    {ROLE_LABEL[r.role]}
                    {r.elo_id && eloNames.get(r.elo_id) ? ` · ${eloNames.get(r.elo_id)}` : ""}
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>
      ) : grid.length > 0 ? (
        <div className="grid grid-cols-3 gap-0.5 pt-1">
          {grid.map((g) => (
            <Link key={g.id} href={`/app/elogram/post/${g.id}`} className="relative aspect-square bg-[var(--card)]">
              {g.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={g.imageUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
              ) : null}
              {g.multi ? (
                <svg viewBox="0 0 24 24" width="20" height="20" className="absolute right-1.5 top-1.5 text-white drop-shadow" fill="currentColor" aria-label="Carrossel">
                  <path d="M7 3h11a3 3 0 0 1 3 3v11h-2V6a1 1 0 0 0-1-1H7V3zM3 8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8z" />
                </svg>
              ) : null}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
