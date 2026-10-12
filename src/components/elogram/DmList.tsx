"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { SearchIcon } from "@/components/feed/icons";
import { relativeTimeShort } from "@/lib/relativeTime";

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

/** Lista de conversas: busca, filtros "Principal / Não lidas" e linha com bolinha azul quando há mensagem nova. */
export function DmList({ items, myId, monitorLink }: { items: DmListItem[]; myId: string; monitorLink: boolean }) {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [q, setQ] = useState("");

  const needle = q.trim().toLowerCase();
  const shown = items.filter(
    (i) =>
      (filter === "all" || i.unread) &&
      (!needle || `${i.other_name} ${i.other_username ?? ""}`.toLowerCase().includes(needle)),
  );

  const chip = (active: boolean) =>
    `shrink-0 rounded-full px-4 py-2 text-[15px] font-semibold ${active ? "bg-[var(--line)]" : "ring-1 ring-[var(--line)] text-[var(--muted)]"}`;

  return (
    <div>
      <label className="mx-3 mb-3 flex items-center gap-2.5 rounded-full bg-[var(--card)] px-4 py-3 text-[var(--muted)] ring-1 ring-[var(--line)]">
        <SearchIcon />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Pesquisar"
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

      {shown.length === 0 ? (
        <p className="px-6 py-14 text-center text-sm text-[var(--muted)]">
          {items.length === 0 ? "Nenhuma conversa ainda. Toque em ✎ pra começar uma." : "Nada por aqui."}
        </p>
      ) : (
        <ul>
          {shown.map((i) => (
            <li key={i.thread_id}>
              <Link href={`/app/elogram/mensagens/${i.thread_id}`} className="flex items-center gap-3.5 px-3 py-2.5">
                <Avatar url={i.other_avatar} name={i.other_name} size={58} />
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-[16px] ${i.unread ? "font-bold" : "font-semibold"}`}>
                    {i.other_username || i.other_name}
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
