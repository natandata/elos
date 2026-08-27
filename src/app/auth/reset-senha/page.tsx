"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PasswordField } from "@/components/auth/PasswordField";

/**
 * Aberta depois de /auth/callback trocar o código de recuperação por uma
 * sessão de verdade. Se a sessão não existir (link expirado/já usado), mostra
 * erro em vez de deixar updateUser falhar silenciosamente.
 */
export default function ResetSenhaPage() {
  const router = useRouter();
  const supabase = createClient();

  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
      setChecking(false);
    });
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) return setError("A senha precisa ter ao menos 6 caracteres.");
    if (password !== confirm) return setError("As senhas não conferem.");

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError("Não foi possível trocar a senha. Tente pedir um novo link.");
      return;
    }
    setDone(true);
    setTimeout(() => {
      router.push("/app");
      router.refresh();
    }, 1500);
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-white px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent)] text-2xl font-black text-[var(--accent-ink)]">
            E
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--ink)]">Nova senha</h1>
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
          {checking ? (
            <p className="text-center text-sm text-[var(--muted)]">Carregando…</p>
          ) : !hasSession ? (
            <div className="space-y-3 text-center">
              <p className="text-sm text-[var(--muted)]">
                Esse link de redefinição não é mais válido — pode já ter sido usado ou expirado.
              </p>
              <a href="/" className="btn btn-primary inline-block w-full !py-2 !text-sm">
                Voltar para o login
              </a>
            </div>
          ) : done ? (
            <p className="text-center text-sm text-emerald-700">
              Senha atualizada! Entrando…
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="label" htmlFor="password">
                  Nova senha
                </label>
                <PasswordField
                  id="password"
                  value={password}
                  onChange={setPassword}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="label" htmlFor="confirm">
                  Confirmar nova senha
                </label>
                <PasswordField
                  id="confirm"
                  value={confirm}
                  onChange={setConfirm}
                  autoComplete="new-password"
                />
              </div>
              {error ? (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
              ) : null}
              <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                {loading ? "Salvando…" : "Salvar nova senha"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
