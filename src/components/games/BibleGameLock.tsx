import Link from "next/link";
import { BIBLE_GATE_SECONDS } from "@/lib/games/bibleGate";

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** Sala de Jogos travada: o cria precisa ler a Bíblia 5 minutos hoje para entrar. */
export function BibleGameLock({ seconds }: { seconds: number }) {
  const pct = Math.round((seconds / BIBLE_GATE_SECONDS) * 100);
  const left = Math.max(0, BIBLE_GATE_SECONDS - seconds);
  return (
    <>
      <header className="mb-5 pt-1 text-center">
        <h1 className="gr-title">Sala de Jogos</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm font-semibold text-white/85">A Sala de Jogos abre depois da leitura do dia.</p>
      </header>
      <div className="card mx-auto max-w-md p-6 text-center">
        <p className="text-5xl" aria-hidden>
          🔒
        </p>
        <h2 className="mt-2 text-xl font-black text-[var(--ink)]">Sala de Jogos travada</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">Leia a Bíblia por pelo menos 5 minutos hoje para liberar todos os jogos. Quando a leitura terminar, a sala abre na hora.</p>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-[var(--accent-soft)]">
          <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1 text-xs font-bold text-[var(--muted)]">{seconds > 0 ? `Faltam ${mmss(left)} de leitura hoje` : "Você ainda não leu hoje"}</p>
        <Link href="/app/biblia" className="btn btn-primary mt-5 w-full !py-3 text-base">
          📖 Ler a Bíblia
        </Link>
        <p className="mt-3 text-[11px] text-[var(--muted)]">A trava recomeça todo dia à meia-noite. Amanhã a liberação será assistir um conteúdo relevante por inteiro.</p>
      </div>
    </>
  );
}
