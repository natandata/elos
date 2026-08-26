"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AGE_RANGE_LABEL, type AgeRange, type Gender } from "@/lib/types";

const AGE_OPTIONS: AgeRange[] = ["12-14", "15-16", "17"];

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24Z"
      />
      <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7H1.4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.7l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z"
      />
    </svg>
  );
}

export function AuthPanel({ next }: { next?: string }) {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [ageRange, setAgeRange] = useState<AgeRange | "">("");
  const [gender, setGender] = useState<Gender | "">("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  // Identidade visual dinâmica: o tema acompanha o gênero escolhido no cadastro.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = mode === "signup" && gender ? gender : "neutral";
    return () => {
      root.dataset.theme = "neutral";
    };
  }, [gender, mode]);

  const destination = next && next.startsWith("/") ? next : "/app";

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("E-mail ou senha inválidos.");
      return;
    }
    router.push(destination);
    router.refresh();
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!fullName.trim()) return setError("Informe seu nome completo.");
    if (!ageRange) return setError("Selecione sua faixa etária.");
    if (!gender) return setError("Selecione seu gênero.");
    if (password.length < 6) return setError("A senha precisa ter ao menos 6 caracteres.");
    if (password !== confirm) return setError("As senhas não conferem.");

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName.trim(), age_range: ageRange, gender } },
    });
    setLoading(false);

    if (error) {
      const code = error.code ?? "";
      if (code === "user_already_exists" || error.message.includes("already registered")) {
        setError("Já existe uma conta com esse e-mail.");
      } else if (code === "email_address_invalid") {
        setError("Esse e-mail não é aceito. Use um e-mail válido de verdade.");
      } else if (code === "over_email_send_rate_limit") {
        setError("Muitos cadastros seguidos. Aguarde alguns minutos e tente de novo.");
      } else if (code === "weak_password") {
        setError("Senha muito fraca. Use ao menos 6 caracteres com letras e números.");
      } else {
        setError("Não foi possível criar a conta. Tente novamente.");
      }
      return;
    }
    if (!data.session) {
      setNotice("Conta criada. Confirme o e-mail que enviamos para entrar.");
      return;
    }
    router.push("/app");
    router.refresh();
  }

  async function handleGoogle() {
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}`,
      },
    });
    if (error) {
      setLoading(false);
      setError("Não foi possível conectar com o Google.");
    }
  }

  return (
    <div className="rise-in">
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-[var(--bg)] p-1">
        {(["login", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setError(null);
              setNotice(null);
            }}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
              mode === m
                ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                : "text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
          >
            {m === "login" ? "Entrar" : "Criar conta"}
          </button>
        ))}
      </div>

      <form onSubmit={mode === "login" ? handleLogin : handleSignup} className="space-y-3">
        {mode === "signup" && (
          <>
            <div>
              <label className="label" htmlFor="fullName">
                Nome completo
              </label>
              <input
                id="fullName"
                className="input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
              />
            </div>

            <div>
              <label className="label" htmlFor="ageRange">
                Idade
              </label>
              <select
                id="ageRange"
                className="input"
                value={ageRange}
                onChange={(e) => setAgeRange(e.target.value as AgeRange)}
              >
                <option value="">Selecione</option>
                {AGE_OPTIONS.map((a) => (
                  <option key={a} value={a}>
                    {AGE_RANGE_LABEL[a]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="label">Gênero</span>
              <div className="grid grid-cols-2 gap-2">
                {(["male", "female"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                      gender === g
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                        : "border-[var(--line)] text-[var(--muted)]"
                    }`}
                  >
                    {g === "male" ? "Masculino" : "Feminino"}
                  </button>
                ))}
              </div>
              {gender ? (
                <p className="mt-2 text-xs text-[var(--muted)]">
                  {ageRange
                    ? `Você entrará no Elo ${gender === "male" ? "Masculino" : "Feminino"} ${AGE_RANGE_LABEL[ageRange].replace(" anos", "")}.`
                    : "Selecione a idade para ver seu Elo."}
                </p>
              ) : null}
            </div>
          </>
        )}

        <div>
          <label className="label" htmlFor="email">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            required
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>

        <div>
          <label className="label" htmlFor="password">
            Senha
          </label>
          <input
            id="password"
            type="password"
            required
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </div>

        {mode === "signup" && (
          <div>
            <label className="label" htmlFor="confirm">
              Confirmar senha
            </label>
            <input
              id="confirm"
              type="password"
              required
              className="input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>
        )}

        {error ? (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}
        {notice ? (
          <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>
        ) : null}

        <button type="submit" className="btn btn-primary w-full" disabled={loading}>
          {loading ? "Carregando…" : mode === "login" ? "Entrar" : "Criar conta"}
        </button>
      </form>

      <div className="my-4 flex items-center gap-3 text-xs text-[var(--muted)]">
        <span className="h-px flex-1 bg-[var(--line)]" />
        ou
        <span className="h-px flex-1 bg-[var(--line)]" />
      </div>

      <button type="button" onClick={handleGoogle} className="btn btn-ghost w-full" disabled={loading}>
        <GoogleIcon />
        {mode === "login" ? "Entrar com Google" : "Criar conta com Google"}
      </button>
    </div>
  );
}
