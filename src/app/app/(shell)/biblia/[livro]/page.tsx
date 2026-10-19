import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { findBook } from "@/lib/bible/books";

export default async function LivroPage({ params }: { params: Promise<{ livro: string }> }) {
  await requireRole("cria", "leader", "admin");
  const { livro } = await params;
  const book = findBook(livro);
  if (!book) notFound();

  return (
    <>
      <Link href="/app/biblia" className="text-xs font-bold text-[var(--muted)]">
        ← Bíblia
      </Link>
      <div className="mt-1">
        <PageHeader title={book.name} subtitle={`${book.chapters} capítulo${book.chapters === 1 ? "" : "s"} · Nova Versão Internacional (NVI)`} />
      </div>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-10">
        {Array.from({ length: book.chapters }, (_, i) => i + 1).map((c) => (
          <Link key={c} href={`/app/biblia/${book.id}/${c}`} className="card flex h-12 items-center justify-center text-sm font-bold transition active:scale-95">
            {c}
          </Link>
        ))}
      </div>
    </>
  );
}
