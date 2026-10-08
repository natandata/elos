import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { suggestionFor } from "@/lib/devotionalSuggestions";
import { todayBrasilia } from "@/lib/birthday";

/** Devocional de 15 minutos, em versão discreta: uma linha fechada; abre para mostrar a liturgia. */
export async function DevotionalSuggestionCard() {
  const today = todayBrasilia();
  const s = suggestionFor(today);
  const supabase = await createClient();
  const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
  const { data } = await supabase.from("daily_praise").select("url, title, channel").gte("created_at", since).order("created_at", { ascending: false }).limit(30);
  const praises = (data ?? []) as { url: string; title: string; channel: string }[];
  const day = Math.floor(new Date(`${today}T00:00:00Z`).getTime() / 86_400_000);
  const praise = praises.length ? praises[day % praises.length] : null;

  return (
    <details className="card group mb-4 px-3 py-2 text-sm" aria-label="Devocional de 15 minutos">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
        <span className="min-w-0 truncate">
          <b>📖 Devocional de 15 min</b> <span className="text-[var(--muted)]">· {s.theme} · {s.ref}</span>
        </span>
        <span className="shrink-0 text-xs font-bold text-[var(--accent-strong)] group-open:hidden">ver</span>
      </summary>
      <ol className="mt-2 space-y-1.5 text-xs text-[var(--muted)]">
        <li>
          <b className="text-[var(--ink)]">2 min · 🙏 Oração:</b> {s.pray.charAt(0).toLowerCase() + s.pray.slice(1)}.
        </li>
        <li>
          <b className="text-[var(--ink)]">4 min · 🎵 Louvor:</b>{" "}
          {praise ? (
            <a href={praise.url} target="_blank" rel="noopener noreferrer" className="font-bold text-[var(--accent-strong)] underline">
              {praise.title}
            </a>
          ) : (
            "ninguém colocou um louvor do dia ainda."
          )}
        </li>
        <li>
          <b className="text-[var(--ink)]">7 min · 📜 {s.ref} (NVI):</b> {s.ask}
        </li>
        <li>
          <b className="text-[var(--ink)]">2 min · ✍️ Oração final:</b> agradeça e escolha uma atitude para hoje.
        </li>
      </ol>
      <Link href="/app/devocional" className="mt-2 block text-xs font-bold text-[var(--accent-strong)]">
        Registrar meu devocional →
      </Link>
    </details>
  );
}
