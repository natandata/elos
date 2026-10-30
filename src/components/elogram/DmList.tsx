"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/Avatar";
import { ROLE_LABEL, type Role } from "@/lib/types";
import { SearchIcon } from "@/components/feed/icons";
import { relativeTimeShort } from "@/lib/relativeTime";
import { TribeTag } from "@/components/event/TribeTag";

export type DmListItem = {
  thread_id: string;
  other_id: string;
  other_name: string;
  other_username: string | null;
  other_avatar: string | null;
  last_body: string;
  last_at: string;
  last_sender: string;
  unread: boolean;
};

type Person = { id: string; full_name: string; username: string | null; avatar_url: string | null; role: Role };

/** Lista de conversas: busca, filtros "Principal / Não lidas" e linha com bolinha azul quando há mensagem nova. */
export function DmList({ items, myId, monitorLink }: { items: DmListItem[]; myId: string; monitorLink: boolean }) {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [q, setQ] = useState("");
  // pessoas com quem ainda não há conversa: a busca também as encontra pra começar uma
  const [people, setPeople] = useState<Person[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const supabase = createClient();
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase.rpc("search_profiles", { p_query: term });
      if (!cancelled) {
        setPeople((data ?? []) as Person[]);
        setSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q]);

  const needle = q.trim().toLowerCase();
  const shown = items.filter(
    (i) =>
      (filter === "all" || i.unread) &&
      (!needle || `${i.other_name} ${i.other_username ?? ""}`.toLowerCase().includes(needle)),
  );

  const existingIds = new Set(items.map((i) => i.other_id));
  const newPeople = needle.length >= 2 ? people.filter((p) => p.id !== myId && !existingIds.has(p.id)) : [];

  const chip = (active: boolean) =>
    `shrink-0 rounded-full px-4 py-2 text-[15px] font-semibold ${active ? "bg-[var(--line)]" : "ring-1 ring-[var(--line)] text-[var(--muted)]"}`;

  return (
    <div>
      <label className="mx-3 mb-3 flex items-center gap-2.5 rounded-full bg-[var(--card)] px-4 py-3 text-[var(--muted)] ring-1 ring-[var(--line)]">
        <SearchIcon />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Pesquisar pessoas ou conversas"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-[16px] text-[var(--ink)] outline-none placeholder:text-[var(--muted)]"
        />
      </label>

      <div className="mb-2 flex gap-2 overflow-x-auto px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button type="button" onClick={() => setFilter("all")} className={chip(filter === "all")}>
          Principal
        </button>
        <button type="button" onClick={() => setFilter("unread")} className={chip(filter === "unread")}>
          Não lidas
        </button>
        {monitorLink ? (
          <Link href="/app/elogram/mensagens/todas" className={chip(false)}>
            Liderança
          </Link>
        ) : null}
      </div>

      {needle.length >= 2 && (newPeople.length > 0 || searching) ? (
        <div className="px-3 pb-2">
          <p className="pb-1 pt-2 text-sm font-semibold text-[var(--muted)]">
            {shown.length > 0 ? "Outras pessoas" : "Pessoas"}
          </p>
          {newPeople.length === 0 ? <p className="py-2 text-sm text-[var(--muted)]">Buscando…</p> : null}
          {newPeople.map((p) => (
            <Link key={p.id} href={`/app/elogram/mensagens/com/${p.id}`} className="flex items-center gap-3.5 py-2.5">
              <Avatar url={p.avatar_url} name={p.full_name} size={50} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[16px] font-semibold">{p.username || p.full_name}</p>
                <p className="truncate text-[14px] text-[var(--muted)]">
                  {p.username ? `${p.full_name} · ` : ""}
                  {ROLE_LABEL[p.role]}
                </p>
              </div>
              <span className="rounded-lg bg-[var(--line)] px-3 py-1.5 text-sm font-semibold">Conversar</span>
            </Link>
          ))}
        </div>
      ) : null}

      {shown.length === 0 && newPeople.length > 0 ? null : shown.length === 0 ? (
        <p className="px-6 py-14 text-center text-sm text-[var(--muted)]">
          {items.length === 0 ? "Nenhuma conversa ainda. Busque o nome de alguém acima, ou toque em ✎, pra começar uma." : "Nada por aqui."}
        </p>
      ) : (
        <ul>
          {shown.map((i) => (
            <li key={i.thread_id}>
              <Link href={`/app/elogram/mensagens/${i.thread_id}`} className="flex items-center gap-3.5 px-3 py-2.5">
                <Avatar url={i.other_avatar} name={i.other_name} size={58} />
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-[16px] ${i.unread ? "font-bold" : "font-semibold"}`}>
                    {i.other_username || i.other_name} <TribeTag userId={i.other_id} size="xs" />
                  </p>
                  <p className={`truncate text-[15px] ${i.unread ? "font-semibold text-[var(--ink)]" : "text-[var(--muted)]"}`}>
                    {i.last_sender === myId ? "Você: " : ""}
                    {i.last_body} ·{" "}
                    <span suppressHydrationWarning>{relativeTimeShort(i.last_at)}</span>
                  </p>
                </div>
                {i.unread ? <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#4f5bd5]" /> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
