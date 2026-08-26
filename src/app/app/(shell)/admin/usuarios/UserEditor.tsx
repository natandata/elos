"use client";

import { useActionState, useState } from "react";
import { setLeader, updateUser } from "@/lib/actions/admin";
import { Feedback, SubmitBtn } from "@/components/forms";
import {
  AGE_RANGE_LABEL,
  GENDER_LABEL,
  ROLE_LABEL,
  formatXp,
  type AgeRange,
  type Elo,
  type Role,
} from "@/lib/types";

type Row = {
  id: string;
  full_name: string;
  role: Role;
  gender: "male" | "female" | null;
  age_range: AgeRange | null;
  elo_id: string | null;
  xp: number;
  leader_id: string | null;
};

export function UserEditor({
  user,
  elos,
  leaders,
}: {
  user: Row;
  elos: Elo[];
  leaders: { id: string; full_name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [userState, userAction] = useActionState(updateUser, null);
  const [leaderState, leaderAction] = useActionState(setLeader, null);

  const elo = elos.find((e) => e.id === user.elo_id);

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-bold">{user.full_name || "Sem nome"}</p>
          <p className="text-xs text-[var(--muted)]">
            {ROLE_LABEL[user.role]}
            {user.gender ? ` · ${GENDER_LABEL[user.gender]}` : ""}
            {user.age_range ? ` · ${AGE_RANGE_LABEL[user.age_range]}` : ""} ·{" "}
            {elo?.name ?? "Sem Elo"} · {formatXp(user.xp)} XP
          </p>
        </div>
        <button type="button" className="btn btn-ghost !py-2 !text-sm" onClick={() => setOpen(!open)}>
          {open ? "Fechar" : "Gerenciar"}
        </button>
      </div>

      {open ? (
        <div className="mt-4 space-y-4 border-t border-[var(--line)] pt-4">
          <form action={userAction} className="grid gap-3 sm:grid-cols-3">
            <input type="hidden" name="id" value={user.id} />

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
              <label className="label">Elo</label>
              <select name="elo_id" className="input" defaultValue={user.elo_id ?? ""}>
                <option value="">Sem Elo</option>
                {elos.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
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
              <Feedback state={userState} />
              <SubmitBtn className="btn btn-primary mt-2 !py-2 !text-sm">Salvar perfil</SubmitBtn>
            </div>
          </form>

          {user.role === "cria" ? (
            <form action={leaderAction} className="grid gap-3 sm:grid-cols-3">
              <input type="hidden" name="cria_id" value={user.id} />
              <div className="sm:col-span-2">
                <label className="label">Líder responsável</label>
                <select name="leader_id" className="input" defaultValue={user.leader_id ?? ""}>
                  <option value="">Sem líder</option>
                  {leaders.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.full_name || "Sem nome"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-3">
                <Feedback state={leaderState} />
                <SubmitBtn className="btn btn-soft mt-2 !py-2 !text-sm">Salvar líder</SubmitBtn>
              </div>
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
