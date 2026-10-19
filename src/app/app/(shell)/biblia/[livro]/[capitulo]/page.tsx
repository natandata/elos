import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { findBook } from "@/lib/bible/books";
import { ChapterView } from "@/components/bible/ChapterView";

export default async function CapituloPage({ params }: { params: Promise<{ livro: string; capitulo: string }> }) {
  await requireRole("cria", "leader", "admin");
  const { livro, capitulo } = await params;
  const book = findBook(livro);
  const chapter = Number(capitulo);
  if (!book || !Number.isInteger(chapter) || chapter < 1 || chapter > book.chapters) notFound();
  return <ChapterView book={book} chapter={chapter} />;
}
