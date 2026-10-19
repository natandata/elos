"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BIBLE_BOOKS } from "@/lib/bible/books";

// Lista dos 66 livros (Antigo e Novo Testamento) com busca por nome ou abreviação.

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function BookList() {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const n = norm(q.trim());
    return n ? BIBLE_BOOKS.filter((b) => norm(b.name).includes(n) || norm(b.abbr).startsWith(n)) : BIBLE_BOOKS;
  }, [q]);
  const ot = list.filter((b) => b.ot);
  const nt = list.filter((b) => !b.ot);

  const group = (title: string, books: typeof list) =>
    books.length ? (
      <section className="mt-5">
        <h2 className="mb-2 text-xs font-black uppercase tracking-wider text-[var(--muted)]">{title}</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {books.map((b) => (
            <Link key={b.id} href={`/app/biblia/${b.id}`} className="card flex items-center justify-between gap-2 px-3 py-3 transition active:scale-[0.98]">
              <span className="min-w-0 truncate text-sm font-bold">{b.name}</span>
              <span className="shrink-0 text-xs text-[var(--muted)]">{b.chapters}</span>
            </Link>
          ))}
        </div>
      </section>
    ) : null;

  return (
    <div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar livro (ex.: João, Sl, Romanos)"
        className="w-full rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]"
        aria-label="Buscar livro"
      />
      {group("Antigo Testamento", ot)}
      {group("Novo Testamento", nt)}
      {!list.length ? <p className="mt-6 text-center text-sm text-[var(--muted)]">Nenhum livro encontrado.</p> : null}
    </div>
  );
}
