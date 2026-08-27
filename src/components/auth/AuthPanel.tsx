"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AGE_RANGE_LABEL, type AgeRange, type Gender } from "@/lib/types";
import { PasswordField } from "./PasswordField";

type SignupRole = "cria" | "leader";

const AGE_OPTIONS: AgeRange[] = ["12-14", "15-16", "17"];
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export function AuthPanel({ next }: { next?: string }) {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotNotice, setForgotNotice] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [ageRange, setAgeRange] = useState<AgeRange | "">("");
  const [gender, setGender] = useState<Gender | "">("");
  const [signupRole, setSignupRole] = useState<SignupRole>("cria");
  const [guardianAck, setGuardianAck] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Prévia visual: enquanto a pessoa escolhe o gênero no cadastro, o tema
  // acompanha a escolha; fora do cadastro fica neutro. De propósito, SEM
  // função de cleanup — um cleanup rodaria exatamente quando este componente
  // desmonta, ou seja, no instante do redirecionamento para /app depois do
  // login, e apagaria por cima a cor certa que o servidor acabou de definir
  // para a conta que entrou.
  useEffect(() => {
    if (mode !== "signup" || !gender) {
      document.documentElement.dataset.theme = "neutral";
      return;
    }
    document.documentElement.dataset.theme = signupRole === "leader" && gender === "male" ? "leader" : gender;
  }, [gender, mode, signupRole]);

  const destination = next && next.startsWith("/") ? next : "/app";

  function pickAvatar(file: File | null) {
    setError(null);
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);

    if (!file) {
      setAvatar(null);
      setAvatarPreview(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      return setError("Escolha um arquivo de imagem.");
    }
    if (file.size > MAX_AVATAR_BYTES) {
      return setError("A imagem precisa ter no máximo 2 MB.");
    }
    setAvatar(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  /** Envia a foto e grava o endereço no perfil. Falhar aqui não impede o cadastro. */
  async function uploadAvatar(userId: string) {
    if (!avatar) return;
    const ext = avatar.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, avatar, { upsert: true, contentType: avatar.type });

    if (uploadError) return;

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);

    await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", userId);
  }

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

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setForgotLoading(true);
    setForgotNotice(null);
    await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-senha`,
    });
    setForgotLoading(false);
    // Mensagem genérica de propósito: não revela se o e-mail existe na base.
    setForgotNotice(
      "Se existir uma conta com esse e-mail, você vai receber um link para redefinir a senha.",
    );
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!firstName.trim()) return setError("Informe seu nome.");
    if (!lastName.trim()) return setError("Informe seu sobrenome.");
    if (!ageRange) return setError("Selecione sua faixa etária.");
    if (!gender) return setError("Selecione seu gênero.");
    // Líder é maior de idade responsável pelo Elo — a autorização é só para cria.
    if (signupRole === "cria" && !guardianAck)
      return setError("Confirme a autorização do responsável para continuar.");
    if (password.length < 6) return setError("A senha precisa ter ao menos 6 caracteres.");
    if (password !== confirm) return setError("As senhas não conferem.");

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: `${firstName.trim()} ${lastName.trim()}`,
          age_range: ageRange,
          gender,
          role: signupRole,
          guardian_ack: signupRole === "cria" ? "true" : "false",
        },
      },
    });

    if (error) {
      setLoading(false);
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
      setLoading(false);
      setNotice(
        "Conta criada. Confirme o e-mail que enviamos para entrar (olhe também a caixa de spam).",
      );
      return;
    }

    if (data.user) await uploadAvatar(data.user.id);

    setLoading(false);
    router.push("/app");
    router.refresh();
  }

  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();

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
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-[var(--line)] bg-[var(--bg)] text-[var(--muted)] transition hover:border-[var(--accent)]"
                aria-label="Escolher foto de perfil"
              >
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarPreview} alt="" className="h-full w-full object-cover" />
                ) : initials ? (
                  <span className="text-xl font-bold">{initials}</span>
                ) : (
                  <span className="text-2xl">📷</span>
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => pickAvatar(e.target.files?.[0] ?? null)}
              />
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="font-semibold text-[var(--accent-strong)] underline underline-offset-2"
                >
                  {avatar ? "Trocar foto" : "Adicionar foto"}
                </button>
                {avatar ? (
                  <button
                    type="button"
                    onClick={() => {
                      pickAvatar(null);
                      if (fileRef.current) fileRef.current.value = "";
                    }}
                    className="text-[var(--muted)] underline underline-offset-2"
                  >
                    remover
                  </button>
                ) : (
                  <span className="text-[var(--muted)]">opcional</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label" htmlFor="firstName">
                  Nome
                </label>
                <input
                  id="firstName"
                  className="input"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                />
              </div>
              <div>
                <label className="label" htmlFor="lastName">
                  Sobrenome
                </label>
                <input
                  id="lastName"
                  className="input"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                />
              </div>
            </div>

            <div>
              <span className="label">Você entra como</span>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["cria", "Cria"],
                    ["leader", "Líder"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSignupRole(value)}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                      signupRole === value
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                        : "border-[var(--line)] text-[var(--muted)]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {signupRole === "leader" ? (
                <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Contas de líder passam por aprovação da administração. Você entra normalmente,
                  mas a conta fica bloqueada até a liberação.
                </p>
              ) : null}
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
            </div>

            <div>
              <label className="label" htmlFor="ageRange">
                {signupRole === "leader" ? "Elo que você vai liderar" : "Idade"}
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
                    {signupRole === "leader" && gender
                      ? `Elo ${gender === "male" ? "Masculino" : "Feminino"} ${AGE_RANGE_LABEL[a].replace(" anos", "")}`
                      : AGE_RANGE_LABEL[a]}
                  </option>
                ))}
              </select>
              {gender && ageRange ? (
                <p className="mt-2 text-xs text-[var(--muted)]">
                  {signupRole === "leader"
                    ? `Você vai liderar o Elo ${gender === "male" ? "Masculino" : "Feminino"} ${AGE_RANGE_LABEL[ageRange].replace(" anos", "")} — os crias desse Elo passam a ser sua responsabilidade automaticamente.`
                    : `Você entrará no Elo ${gender === "male" ? "Masculino" : "Feminino"} ${AGE_RANGE_LABEL[ageRange].replace(" anos", "")}.`}
                </p>
              ) : !gender ? (
                <p className="mt-2 text-xs text-[var(--muted)]">
                  Selecione o gênero para ver as opções de Elo.
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
          <PasswordField
            id="password"
            value={password}
            onChange={setPassword}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </div>

        {mode === "login" ? (
          <div className="text-right">
            <button
              type="button"
              onClick={() => {
                setShowForgot((v) => !v);
                setForgotNotice(null);
                setForgotEmail(email);
              }}
              className="text-xs font-semibold text-[var(--accent-strong)] underline underline-offset-2"
            >
              Esqueci minha senha
            </button>
          </div>
        ) : null}

        {mode === "login" && showForgot ? (
          <div className="space-y-2 rounded-xl border border-[var(--line)] p-3">
            <label className="label" htmlFor="forgotEmail">
              E-mail da conta
            </label>
            <input
              id="forgotEmail"
              type="email"
              className="input"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              autoComplete="email"
            />
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={forgotLoading || !forgotEmail}
              className="btn btn-ghost w-full !py-2 !text-sm"
            >
              {forgotLoading ? "Enviando…" : "Enviar link de redefinição"}
            </button>
            {forgotNotice ? (
              <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                {forgotNotice}
              </p>
            ) : null}
          </div>
        ) : null}

        {mode === "signup" && (
          <div>
            <label className="label" htmlFor="confirm">
              Confirmar senha
            </label>
            <PasswordField
              id="confirm"
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
            />
          </div>
        )}

        {mode === "signup" && signupRole === "cria" && (
          <label className="flex items-start gap-3 rounded-xl border border-[var(--line)] p-3 text-sm">
            <input
              type="checkbox"
              checked={guardianAck}
              onChange={(e) => setGuardianAck(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0"
              required
            />
            <span>Meu responsável autorizou o meu acesso a esta plataforma.</span>
          </label>
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

      {mode === "login" ? (
        <p className="mt-4 text-center text-xs text-[var(--muted)]">
          Ainda não tem conta? Toque em <strong>Criar conta</strong> acima.
        </p>
      ) : null}
    </div>
  );
}
