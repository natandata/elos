import type { Metadata } from "next";

export const metadata: Metadata = { title: "ELOS em manutenção", robots: { index: false } };

/** Tela de manutenção: no lugar do login a partir de 27/11. Não depende do banco. */
export default function ManutencaoPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[var(--bg)] px-6 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent)] text-3xl font-black text-[var(--accent-ink)]">E</div>
      <h1 className="text-3xl font-black tracking-tight text-[var(--ink)]">ELOS em manutenção</h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-[var(--muted)]">
        O aplicativo está fechado para manutenção e não há previsão de retorno. Por enquanto não é possível entrar. Obrigado pela compreensão e por fazer parte do ELOS.
      </p>
      <p className="mt-6 text-3xl" aria-hidden>🛠️</p>
    </main>
  );
}
