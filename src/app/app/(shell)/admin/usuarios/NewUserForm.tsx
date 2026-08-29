"use client";

import { useActionState, useState } from "react";
import { createUser } from "@/lib/actions/admin";
import { Feedback, SubmitBtn } from "@/components/forms";
import { AGE_RANGE_LABEL, ROLE_LABEL, type AgeRange, type Role } from "@/lib/types";

const AGES: AgeRange[] = ["12-14", "15-16", "17"];

export function NewUserForm() {
  const [state, action] = useActionState(createUser, null);
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Role>("cria");
  const isGuardian = role === "guardian";

  return (
    <div className="card mb-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-bold">Adicionar usuário</p>
          <p className="text-xs text-[var(--muted)]">
            A conta já nasce ativa — a pessoa entra direto com o e-mail e a senha que você definir.
          </p>
        </div>
        <button type="button" className="btn btn-primary !py-2 !text-sm" onClick={() => setOpen(!open)}>
          {open ? "Cancelar" : "Novo usuário"}
        </button>
      </div>

      {open ? (
        <form
          action={action}
          key={state?.ok ? "reset" : "form"}
          className="mt-4 grid gap-3 border-t border-[var(--line)] pt-4 sm:grid-cols-2"
        >
          <div>
            <label className="label" htmlFor="new_first">
              Nome
            </label>
            <input id="new_first" name="first_name" className="input" required />
          </div>

          <div>
            <label className="label" htmlFor="new_last">
              Sobrenome
            </label>
            <input id="new_last" name="last_name" className="input" required />
          </div>

          <div>
            <label className="label" htmlFor="new_email">
              E-mail
            </label>
            <input id="new_email" name="email" type="email" className="input" required />
          </div>

          <div>
            <label className="label" htmlFor="new_password">
              Senha inicial
            </label>
            <input
              id="new_password"
              name="password"
              type="text"
              minLength={6}
              className="input"
              placeholder="mínimo 6 caracteres"
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="new_role">
              Perfil
            </label>
            <select
              id="new_role"
              name="role"
              className="input"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              {(["cria", "leader", "admin", "guardian"] as Role[]).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </div>

          {!isGuardian ? (
            <>
              <div>
                <label className="label" htmlFor="new_gender">
                  Gênero
                </label>
                <select id="new_gender" name="gender" className="input" defaultValue="" required>
                  <option value="">Selecione</option>
                  <option value="male">Masculino</option>
                  <option value="female">Feminino</option>
                </select>
              </div>

              <div>
                <label className="label" htmlFor="new_age">
                  Faixa etária
                </label>
                <select id="new_age" name="age_range" className="input" defaultValue="" required>
                  <option value="">Selecione</option>
                  {AGES.map((a) => (
                    <option key={a} value={a}>
                      {AGE_RANGE_LABEL[a]}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : null}

          <p className="text-xs text-[var(--muted)] sm:col-span-2">
            {isGuardian
              ? "Responsável tem acesso só-leitura: Explorar, Ranking Geral de Crias e Agenda."
              : "O Elo é definido automaticamente pelo gênero e pela faixa etária."}{" "}
            Anote a senha inicial: ela não fica visível depois.
          </p>

          <div className="sm:col-span-2">
            <Feedback state={state} />
            <SubmitBtn className="btn btn-primary mt-2 w-full" pendingLabel="Criando…">
              Criar conta
            </SubmitBtn>
          </div>
        </form>
      ) : null}
    </div>
  );
}
