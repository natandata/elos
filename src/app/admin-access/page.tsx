import Link from "next/link";
import { AdminAccessForm } from "./AdminAccessForm";

export default function AdminAccessPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-white px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-black tracking-tight text-[var(--ink)]">
            Acesso Administrativo
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Área restrita à administração dos ELOS.
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
          <AdminAccessForm />
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-xs font-medium text-[var(--muted)] underline underline-offset-4 hover:text-[var(--ink)]"
          >
            Voltar ao login
          </Link>
        </div>
      </div>
    </main>
  );
}
