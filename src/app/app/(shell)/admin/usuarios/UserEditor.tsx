"use client";

import { useActionState, useState } from "react";
import { deleteUser, resetPassword, updateUser } from "@/lib/actions/admin";
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
  email: string | null;
};

type Presence = { online: boolean; screen: string } | null;

export function UserEditor({
  user,
  elos,
  isSelf,
  presence,
}: {
  user: Row;
  elos: Elo[];
  isSelf: boolean;
  presence?: Presence;
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [userState, userAction] = useActionState(updateUser, null);
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
            {presence?.online ? (
              <span
                className="chip inline-flex items-center gap-1 border-emerald-200 bg-emerald-100 text-emerald-800"
                title={`Online em: ${presence.screen}`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                Online · {presence.screen}
              </span>
            ) : (
              <span className="chip inline-flex items-center gap-1 border-slate-200 bg-slate-100 text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" aria-hidden />
                Offline
              </span>
            )}
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
              ) : (
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {user.role === "leader"
                    ? "Ao trocar o Elo, a responsabilidade sobre os crias troca junto — automaticamente."
                    : user.role === "cria"
                      ? "O líder responsável é sempre quem lidera este Elo — automático, não dá pra escolher outro."
                      : null}
                </p>
              )}
            </div>

            <div className="sm:col-span-3">
              <Feedback state={userState} />
              <SubmitBtn className="btn btn-primary mt-2 !py-2 !text-sm">Salvar dados</SubmitBtn>
            </div>
          </form>

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
