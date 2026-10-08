import Link from "next/link";

/** Abas da tela de Usuários: lista completa e aniversários. */
export function AbasUsuarios({ ativa }: { ativa: "lista" | "aniversarios" }) {
  const on = "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]";
  const off = "border-[var(--line)] text-[var(--muted)]";
  return (
    <div className="mb-4 flex gap-2" role="tablist" aria-label="Seções de usuários">
      <Link href="/app/admin/usuarios" role="tab" aria-selected={ativa === "lista"} className={`chip ${ativa === "lista" ? on : off}`}>
        👥 Usuários
      </Link>
      <Link href="/app/admin/usuarios?aba=aniversarios" role="tab" aria-selected={ativa === "aniversarios"} className={`chip ${ativa === "aniversarios" ? on : off}`}>
        🎂 Aniversários
      </Link>
    </div>
  );
}
