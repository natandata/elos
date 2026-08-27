"use client";

import { useActionState, useState } from "react";
import { deleteUser, resetPassword, setLeader, updateUser } from "@/lib/actions/admin";
import { SendEmailForm } from "./SendEmailForm";
import { Feedback, SubmitBtn } from "@/components/forms";
import { Avatar } from "@/components/Avatar";
import {
  AGE_RANGE_LABEL,
  GENDER_LABEL,
  ROLE_LABEL,
  formatXp,
  type AgeRange,
  type Elo,
  type Gender,
  type Role,
} from "@/lib/types";

type Row = {
  id: string;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  role: Role;
  approved: boolean;
  gender: Gender | null;
  age_range: AgeRange | null;
  elo_id: string | null;
  xp: number;
  leader_id: string | null;
  email: string | null;
};

export function UserEditor({
  user,
  elos,
  leaders,
  isSelf,
}: {
  user: Row;
  elos: Elo[];
  leaders: { id: string; full_name: string }[];
  isSelf: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [userState, userAction] = useActionState(updateUser, null);
  const [leaderState, leaderAction] = useActionState(setLeader, null);
  const [deleteState, deleteAction] = useActionState(deleteUser, null);
  const [passwordState, passwordAction] = useActionState(resetPassword, null);

  // O Elo segue o gênero: trocar um sem o outro deixaria a dupla incoerente,
  // e o banco recusaria a gravação.
  const [formGender, setFormGender] = useState<Gender | "">(user.gender ?? "");
  const eloOptions = elos.filter((e) => !formGender || e.gender === formGender);

  const elo = elos.find((e) => e.id === user.elo_id);

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar url={user.avatar_url} name={user.full_name} size={40} />
          <div className="min-w-0">
          <p className="flex items-center gap-2 truncate font-bold">
            {user.full_name || "Sem nome"}
            {user.role === "leader" && !user.approved ? (
              <span className="chip border-amber-200 bg-amber-100 text-amber-800">
                Aguardando aprovação
              </span>
            ) : null}
          </p>
          <p className="truncate text-xs text-[var(--muted)]">
            {user.email ?? "sem e-mail"} · {ROLE_LABEL[user.role]}
            {user.gender ? ` · ${GENDER_LABEL[user.gender]}` : ""}
            {user.age_range ? ` · ${AGE_RANGE_LABEL[user.age_range]}` : ""} ·{" "}
            {elo?.name ?? "Sem Elo"} · {formatXp(user.xp)} XP
          </p>
          </div>
        </div>
        <button type="button" className="btn btn-ghost !py-2 !text-sm" onClick={() => setOpen(!open)}>
          {open ? "Fechar" : "Gerenciar"}
        </button>
      </div>

      {open ? (
        <div className="mt-4 space-y-5 border-t border-[var(--line)] pt-4">
          <form action={userAction} className="grid gap-3 sm:grid-cols-3">
            <input type="hidden" name="id" value={user.id} />

            <div>
              <label className="label">Nome</label>
              <input
                name="first_name"
                className="input"
                defaultValue={user.first_name ?? ""}
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="label">Sobrenome</label>
              <input
                name="last_name"
                className="input"
                defaultValue={user.last_name ?? ""}
                required
              />
            </div>

            <div>
              <label className="label">Perfil</label>
              <select name="role" className="input" defaultValue={user.role}>
                {(["cria", "leader", "admin"] as Role[]).map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Gênero</label>
              <select
                name="gender"
                className="input"
                value={formGender}
                onChange={(e) => setFormGender(e.target.value as Gender | "")}
              >
                <option value="">Não informado</option>
                <option value="male">Masculino</option>
                <option value="female">Feminino</option>
              </select>
            </div>

            <div>
              <label className="label">Faixa etária</label>
              <select name="age_range" className="input" defaultValue={user.age_range ?? ""}>
                <option value="">Não informada</option>
                {(["12-14", "15-16", "17"] as AgeRange[]).map((a) => (
                  <option key={a} value={a}>
                    {AGE_RANGE_LABEL[a]}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="label">Elo</label>
              <select
                key={formGender}
                name="elo_id"
                className="input"
                defaultValue={eloOptions.some((e) => e.id === user.elo_id) ? user.elo_id ?? "" : ""}
              >
                <option value="">Sem Elo</option>
                {eloOptions.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
              {!formGender ? (
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Selecione o gênero para ver os ELOS correspondentes.
                </p>
              ) : null}
            </div>

            <div className="sm:col-span-3">
              <Feedback state={userState} />
              <SubmitBtn className="btn btn-primary mt-2 !py-2 !text-sm">Salvar dados</SubmitBtn>
            </div>
          </form>

          {user.role === "cria" ? (
            <form action={leaderAction} className="border-t border-[var(--line)] pt-4">
              <input type="hidden" name="cria_id" value={user.id} />
              <label className="label">Líder responsável</label>
              <select name="leader_id" className="input" defaultValue={user.leader_id ?? ""}>
                <option value="">Sem líder</option>
                {leaders.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.full_name || "Sem nome"}
                  </option>
                ))}
              </select>
              <Feedback state={leaderState} />
              <SubmitBtn className="btn btn-soft mt-2 !py-2 !text-sm">Salvar líder</SubmitBtn>
            </form>
          ) : null}

          <form action={passwordAction} className="border-t border-[var(--line)] pt-4">
            <input type="hidden" name="id" value={user.id} />
            <label className="label">Redefinir senha</label>
            <input
              name="password"
              type="text"
              minLength={6}
              className="input"
              placeholder="nova senha, mínimo 6 caracteres"
            />
            <Feedback state={passwordState} />
            <SubmitBtn className="btn btn-ghost mt-2 !py-2 !text-sm">Trocar senha</SubmitBtn>
          </form>

          <SendEmailForm userId={user.id} email={user.email} />

          <div className="border-t border-[var(--line)] pt-4">
            {isSelf ? (
              <p className="text-xs text-[var(--muted)]">
                Você não pode excluir a própria conta.
              </p>
            ) : confirming ? (
              <form action={deleteAction} className="rounded-xl bg-red-50 p-3">
                <input type="hidden" name="id" value={user.id} />
                <p className="mb-2 text-sm text-red-700">
                  Excluir <strong>{user.full_name}</strong> apaga a conta e tudo que depende dela:
                  missões, XP, respostas de status e vínculos. Não dá para desfazer.
                </p>
                <Feedback state={deleteState} />
                <div className="mt-2 flex gap-2">
                  <SubmitBtn className="btn btn-primary !py-2 !text-sm" pendingLabel="Excluindo…">
                    Sim, excluir
                  </SubmitBtn>
                  <button
                    type="button"
                    className="btn btn-ghost !py-2 !text-sm"
                    onClick={() => setConfirming(false)}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                className="btn btn-ghost !py-2 !text-sm text-red-600"
                onClick={() => setConfirming(true)}
              >
                Excluir usuário
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
