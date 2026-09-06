"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  deletePlannedEvent,
  syncPlannedEventToAgenda,
  updatePlannedEvent,
} from "@/lib/actions/plannedEvents";
import { Feedback, SubmitBtn } from "@/components/forms";
import { Card } from "@/components/ui";
import { formatDate, type Elo, type PlannedEvent } from "@/lib/types";

export function PlannedEventHeader({
  plan,
  elos,
  isAdmin,
}: {
  plan: PlannedEvent;
  elos: Elo[];
  isAdmin: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [saveState, saveAction] = useActionState(updatePlannedEvent, null);
  const [syncState, syncAction] = useActionState(syncPlannedEventToAgenda, null);
  const [deleteState, deleteAction] = useActionState(deletePlannedEvent, null);

  const eloName = elos.find((e) => e.id === plan.elo_id)?.name;

  return (
    <Card className="mb-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--muted)]">
            {formatDate(plan.event_date)}
            {plan.event_time ? ` · ${plan.event_time.slice(0, 5)}` : ""}
            {plan.location ? ` · ${plan.location}` : ""}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {plan.leaders_only ? "Liderança (só líderes)" : (eloName ?? "Todos os ELOS")}
          </p>
          {plan.description ? <p className="mt-2 text-sm">{plan.description}</p> : null}
        </div>

        {isAdmin ? (
          <div className="flex shrink-0 flex-wrap gap-2">
            <form action={syncAction}>
              <input type="hidden" name="id" value={plan.id} />
              <SubmitBtn
                className="btn btn-primary !py-1.5 !text-xs"
                pendingLabel="Enviando…"
              >
                {plan.linked_event_id ? "Atualizar na agenda" : "Inserir na agenda"}
              </SubmitBtn>
            </form>
            <button type="button" className="btn btn-ghost !py-1.5 !text-xs" onClick={() => setEditing(!editing)}>
              {editing ? "Fechar" : "Editar"}
            </button>
          </div>
        ) : null}
      </div>

      {plan.linked_event_id ? (
        <p className="mt-2 text-xs text-[var(--muted)]">
          Já está na{" "}
          <Link href="/app/agenda" className="font-semibold text-[var(--accent-strong)]">
            Agenda
          </Link>
          .
        </p>
      ) : null}
      <Feedback state={syncState} />

      {isAdmin && editing ? (
        <form action={saveAction} className="mt-4 grid gap-3 border-t border-[var(--line)] pt-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={plan.id} />
          <div className="sm:col-span-2">
            <label className="label">Nome</label>
            <input name="title" className="input" defaultValue={plan.title} required />
          </div>
          <div>
            <label className="label">Data</label>
            <input name="event_date" type="date" className="input" defaultValue={plan.event_date} required />
          </div>
          <div>
            <label className="label">Horário</label>
            <input
              name="event_time"
              type="time"
              className="input"
              defaultValue={plan.event_time?.slice(0, 5) ?? ""}
            />
          </div>
          <div>
            <label className="label">Local</label>
            <input name="location" className="input" defaultValue={plan.location ?? ""} />
          </div>
          <div>
            <label className="label">Elo relacionado</label>
            <select
              name="elo_id"
              className="input"
              defaultValue={plan.leaders_only ? "leaders" : (plan.elo_id ?? "")}
            >
              <option value="">Todos</option>
              {elos.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
              <option value="leaders">Liderança (só líderes)</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Descrição</label>
            <textarea name="description" rows={2} className="input" defaultValue={plan.description ?? ""} />
          </div>
          <div className="sm:col-span-2">
            <Feedback state={saveState} />
            <SubmitBtn className="btn btn-primary mt-2 !py-2 !text-sm">Salvar</SubmitBtn>
          </div>
        </form>
      ) : null}

      {isAdmin ? (
        <div className="mt-4 border-t border-[var(--line)] pt-3">
          {confirming ? (
            <form action={deleteAction} className="rounded-xl bg-red-50 p-3">
              <input type="hidden" name="id" value={plan.id} />
              <p className="mb-2 text-sm text-red-700">
                Excluir este planejamento apaga a liturgia, lembretes, convidados e repertório. O
                evento já publicado na Agenda (se houver) não é excluído junto.
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
              className="btn btn-ghost !py-1.5 !text-xs text-red-600"
              onClick={() => setConfirming(true)}
            >
              Excluir planejamento
            </button>
          )}
        </div>
      ) : null}
    </Card>
  );
}
