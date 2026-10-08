import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { suggestionFor } from "@/lib/devotionalSuggestions";
import { todayBrasilia } from "@/lib/birthday";

/** "Devocional de 15 minutos": oração, um louvor do dia e uma passagem da NVI para a vida de adolescente. */
export async function DevotionalSuggestionCard() {
  const today = todayBrasilia();
  const s = suggestionFor(today);
  const supabase = await createClient();
  const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
  const { data } = await supabase.from("daily_praise").select("video_id, url, title, channel").gte("created_at", since).order("created_at", { ascending: false }).limit(30);
  const praises = (data ?? []) as { video_id: string; url: string; title: string; channel: string }[];
  const day = Math.floor(new Date(`${today}T00:00:00Z`).getTime() / 86_400_000);
  const praise = praises.length ? praises[day % praises.length] : null;

  const step = "flex gap-3 rounded-xl bg-[var(--bg)] p-2.5";
  const badge = "flex h-9 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-strong)]";
  return (
    <section className="card mb-5 p-4" aria-label="Devocional de 15 minutos">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-black">📖 Devocional de 15 minutos</p>
        <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-[11px] font-black text-[var(--accent-strong)]">Tema: {s.theme}</span>
      </div>
      <ol className="mt-3 space-y-2 text-sm">
        <li className={step}>
          <span className={badge}>
            <b className="text-sm leading-none">2</b>
            <span className="text-[9px] font-bold leading-none">min</span>
          </span>
          <span>
            <b>🙏 Oração inicial</b>
            <span className="block text-xs text-[var(--muted)]">Fale com Deus com suas palavras. Hoje: {s.pray.charAt(0).toLowerCase() + s.pray.slice(1)}.</span>
          </span>
        </li>
        <li className={step}>
          <span className={badge}>
            <b className="text-sm leading-none">4</b>
            <span className="text-[9px] font-bold leading-none">min</span>
          </span>
          <span className="min-w-0">
            <b>🎵 Louvor sugerido</b>
            {praise ? (
              <a href={praise.url} target="_blank" rel="noopener noreferrer" className="block truncate text-xs font-bold text-[var(--accent-strong)] underline">
                {praise.title}
                {praise.channel ? ` · ${praise.channel}` : ""}
              </a>
            ) : (
              <span className="block text-xs text-[var(--muted)]">Ninguém colocou um louvor do dia ainda. Seja o primeiro e escolha um para cantar com a gente!</span>
            )}
          </span>
        </li>
        <li className={step}>
          <span className={badge}>
            <b className="text-sm leading-none">7</b>
            <span className="text-[9px] font-bold leading-none">min</span>
          </span>
          <span>
            <b>📜 Leitura: {s.ref}</b>
            <span className="block text-xs text-[var(--muted)]">Leia na sua Bíblia (NVI), duas vezes. {s.ask}</span>
          </span>
        </li>
        <li className={step}>
          <span className={badge}>
            <b className="text-sm leading-none">2</b>
            <span className="text-[9px] font-bold leading-none">min</span>
          </span>
          <span>
            <b>✍️ Oração final</b>
            <span className="block text-xs text-[var(--muted)]">Agradeça, entregue o que veio ao seu coração e escolha uma atitude para viver hoje.</span>
          </span>
        </li>
      </ol>
      <Link href="/app/devocional" className="btn btn-primary mt-3 w-full !py-2 !text-sm">
        Registrar meu devocional
      </Link>
    </section>
  );
}
