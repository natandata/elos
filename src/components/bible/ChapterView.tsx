import Link from "next/link";
import { BibleText } from "./BibleText";
import { BIBLE_CSS_HREF, fontStylesheetHref, getAttribution, getChapter } from "@/lib/bible/nvi.server";
import { neighbors, type BibleBook } from "@/lib/bible/books";

// Um capítulo da NVI por tela (a licença limita a 2 capítulos ou 25 versículos por vez), com anterior e próximo.

export async function ChapterView({ book, chapter }: { book: BibleBook; chapter: number }) {
  const [data, attribution] = await Promise.all([getChapter(book.id, chapter), getAttribution()]);
  const { prev, next } = neighbors(book.id, chapter);
  const href = (t: [BibleBook, number]) => `/app/biblia/${t[0].id}/${t[1]}`;
  const label = (t: [BibleBook, number]) => (t[0].id === book.id ? `Capítulo ${t[1]}` : `${t[0].name} ${t[1]}`);

  const nav = (
    <div className="flex items-center justify-between gap-2">
      {prev ? (
        <Link href={href(prev)} className="btn btn-ghost !px-3 !py-2 text-sm">
          ← {label(prev)}
        </Link>
      ) : (
        <span />
      )}
      <Link href={`/app/biblia/${book.id}`} className="btn btn-soft !px-3 !py-2 text-sm">
        Capítulos
      </Link>
      {next ? (
        <Link href={href(next)} className="btn btn-primary !px-3 !py-2 text-sm">
          {label(next)} →
        </Link>
      ) : (
        <span />
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-3">
        <Link href="/app/biblia" className="text-xs font-bold text-[var(--muted)]">
          ← Bíblia
        </Link>
        <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
          {book.name} {chapter}
        </h1>
        <p className="text-xs font-semibold text-[var(--muted)]">Nova Versão Internacional (NVI)</p>
      </div>
      <div className="mb-4">{nav}</div>
      <div className="card px-4 py-4 sm:px-6">
        {data ? (
          <BibleText html={data.html} bibleCss={BIBLE_CSS_HREF} fontCss={fontStylesheetHref()} />
        ) : (
          <div className="py-8 text-center">
            <p className="text-sm font-bold">Não foi possível carregar este capítulo agora.</p>
            <p className="mt-1 text-xs text-[var(--muted)]">Tente de novo em alguns instantes.</p>
            <Link href={href([book, chapter])} className="btn btn-soft mt-3 !px-4 !py-2 text-sm">
              Tentar de novo
            </Link>
          </div>
        )}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-[var(--muted)]">{attribution}</p>
      <div className="mt-4">{nav}</div>
    </div>
  );
}
