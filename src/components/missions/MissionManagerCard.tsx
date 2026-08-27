"use client";

import { useActionState, useState } from "react";
import { deleteMission, duplicateMission, updateMission } from "@/lib/actions/missions";
import { Feedback, SubmitBtn } from "@/components/forms";
import { MISSION_TYPE_LABEL, formatDate, formatDateTime, type MissionType } from "@/lib/types";

export type ManagedMission = {
  id: string;
  title: string;
  description: string | null;
  type: MissionType;
  xp: number;
  start_date: string | null;
  due_date: string | null;
  publish_at: string | null;
  created_at: string;
  eloName: string | null;
  audience: "crias" | "leaders" | "general";
  /** Nome de quem criou, mostrado quando não é a própria missão do viewer. */
  authorName?: string;
  counts: { total: number; awaiting: number; approved: number; rejected: number };
  canEdit: boolean;
};

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function MissionManagerCard({ mission }: { mission: ManagedMission }) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [updateState, updateAction] = useActionState(updateMission, null);
  const [deleteState, deleteAction] = useActionState(deleteMission, null);
  const [duplicateState, duplicateAction] = useActionState(duplicateMission, null);

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-bold">
            {mission.title}
            {mission.audience === "leaders" ? (
              <span className="chip border-red-200 bg-red-100 text-red-700">Liderança</span>
            ) : null}
            {mission.audience === "general" ? (
              <span className="chip border-indigo-200 bg-indigo-100 text-indigo-700">Geral</span>
            ) : null}
          </p>
          <p className="text-xs text-[var(--muted)]">
            {mission.authorName ? `${mission.authorName} · ` : ""}
            {MISSION_TYPE_LABEL[mission.type]} · {mission.eloName ?? "Todos os ELOS"} · prazo{" "}
            {formatDate(mission.due_date)}
          </p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Criada em {formatDateTime(mission.created_at)}
          </p>
        </div>
        <span className="chip bg-[var(--accent-soft)] text-[var(--accent-strong)]">
          {mission.xp} XP
        </span>
      </div>

      {mission.description ? (
        <p className="mt-2 text-sm text-[var(--muted)]">{mission.description}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
        {mission.publish_at && new Date(mission.publish_at) > new Date() ? (
          <span className="chip border-violet-200 bg-violet-100 text-violet-700">
            🕓 Agendada para {formatDateTime(mission.publish_at)}
          </span>
        ) : null}
        <span className="chip border-[var(--line)] text-[var(--muted)]">
          {mission.counts.total} participante(s)
        </span>
        {mission.counts.awaiting > 0 ? (
          <span className="chip border-amber-200 bg-amber-100 text-amber-800">
            {mission.counts.awaiting} aguardando
          </span>
        ) : null}
        {mission.counts.approved > 0 ? (
          <span className="chip border-emerald-200 bg-emerald-100 text-emerald-700">
            {mission.counts.approved} aprovada(s)
          </span>
        ) : null}
        {mission.counts.rejected > 0 ? (
          <span className="chip border-red-200 bg-red-100 text-red-700">
            {mission.counts.rejected} recusada(s)
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {mission.canEdit ? (
          <>
            <button
              type="button"
              className="btn btn-ghost !py-2 !text-sm"
              onClick={() => setEditing(!editing)}
            >
              {editing ? "Fechar" : "Editar"}
            </button>
            <button
              type="button"
              className="btn btn-ghost !py-2 !text-sm text-red-600"
              onClick={() => setConfirming(!confirming)}
            >
              Excluir
            </button>
          </>
        ) : null}
        <form action={duplicateAction}>
          <input type="hidden" name="id" value={mission.id} />
          <SubmitBtn className="btn btn-ghost !py-2 !text-sm" pendingLabel="Duplicando…">
            Usar como modelo
          </SubmitBtn>
        </form>
      </div>
      <Feedback state={duplicateState} />

      {confirming ? (
        <form action={deleteAction} className="mt-3 rounded-xl bg-red-50 p-3">
          <input type="hidden" name="id" value={mission.id} />
          <p className="mb-2 text-sm text-red-700">
            Excluir esta missão remove as atribuições dos crias. Confirma?
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
      ) : null}

      {editing ? (
        <form action={updateAction} className="mt-3 grid gap-3 border-t border-[var(--line)] pt-3 sm:grid-cols-2">
          <input type="hidden" name="id" value={mission.id} />
          <div className="sm:col-span-2">
            <label className="label">Título</label>
            <input name="title" className="input" defaultValue={mission.title} required />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Descrição</label>
            <textarea name="description" rows={2} className="input" defaultValue={mission.description ?? ""} />
          </div>
          <div>
            <label className="label">XP</label>
            <input name="xp" type="number" min={0} max={25} className="input" defaultValue={mission.xp} />
          </div>
          <div>
            <label className="label">Prazo</label>
            <input
              name="due_date"
              type="date"
              className="input"
              defaultValue={mission.due_date ?? ""}
            />
          </div>
          <input type="hidden" name="start_date" value={mission.start_date ?? ""} />
          <div className="sm:col-span-2">
            <label className="label">Agendar (opcional)</label>
            <input
              name="publish_at"
              type="datetime-local"
              className="input"
              defaultValue={toDatetimeLocal(mission.publish_at)}
            />
            <p className="mt-1 text-xs text-[var(--muted)]">
              Deixe em branco para os crias verem na hora.
            </p>
          </div>
          <div className="sm:col-span-2">
            <Feedback state={updateState} />
            <SubmitBtn className="btn btn-primary mt-2 !py-2 !text-sm">Salvar</SubmitBtn>
          </div>
        </form>
      ) : null}
    </div>
  );
}
