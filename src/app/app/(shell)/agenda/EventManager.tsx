"use client";

import { useActionState, useEffect, useState } from "react";
import { deleteEvent, saveEvent } from "@/lib/actions/admin";
import { Feedback, SubmitBtn } from "@/components/forms";
import type { Elo, EloEvent } from "@/lib/types";

export function EventComposer({ elos }: { elos: Elo[] }) {
  const [state, action] = useActionState(saveEvent, null);
  const [open, setOpen] = useState(false);
  const [recurrence, setRecurrence] = useState("none");

  return (
    <div className="card mb-5 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-bold">Novo evento</p>
          <p className="text-xs text-[var(--muted)]">Visível para líderes e crias.</p>
        </div>
        <button type="button" className="btn btn-primary !py-2 !text-sm" onClick={() => setOpen(!open)}>
          {open ? "Cancelar" : "Criar evento"}
        </button>
      </div>

      {open ? (
        <form action={action} className="mt-4 grid gap-3 border-t border-[var(--line)] pt-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Nome</label>
            <input name="title" className="input" required />
          </div>
          <div>
            <label className="label">Data</label>
            <input name="event_date" type="date" className="input" required />
          </div>
          <div>
            <label className="label">Horário</label>
            <input name="event_time" type="time" className="input" />
          </div>
          <div>
            <label className="label">Local</label>
            <input name="location" className="input" />
          </div>
          <div>
            <label className="label">Elo relacionado</label>
            <select name="elo_id" className="input" defaultValue="">
              <option value="">Todos</option>
              {elos.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
              <option value="leaders">Liderança (só líderes)</option>
              <option value="admin">Só admin</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Descrição</label>
            <textarea name="description" rows={2} className="input" />
          </div>

          <div>
            <label className="label">Repetir</label>
            <select
              name="recurrence"
              className="input"
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value)}
            >
              <option value="none">Não repete</option>
              <option value="weekly">Semanalmente</option>
              <option value="biweekly">Quinzenalmente</option>
              <option value="monthly">Mensalmente</option>
            </select>
          </div>
          {recurrence !== "none" ? (
            <div>
              <label className="label">Repetir até</label>
              <input name="recurrence_until" type="date" className="input" required />
              <p className="mt-1 text-xs text-[var(--muted)]">
                Cria uma ocorrência por {recurrence === "weekly" ? "semana" : recurrence === "biweekly" ? "quinzena" : "mês"}, até essa data (máx. 52).
              </p>
            </div>
          ) : null}

          <div className="sm:col-span-2">
            <Feedback state={state} />
            <SubmitBtn className="btn btn-primary mt-2 w-full">Salvar evento</SubmitBtn>
          </div>
        </form>
      ) : null}
    </div>
  );
}

export function EventAdminControls({ event, elos }: { event: EloEvent; elos: Elo[] }) {
  const [editing, setEditing] = useState(false);
  const [saveState, saveAction] = useActionState(saveEvent, null);
  const [deleteState, deleteAction] = useActionState(deleteEvent, null);

  // depois de salvar com sucesso, recolhe o formulário — sem isso ele ficava
  // aberto mostrando "Salvo com sucesso" indefinidamente.
  useEffect(() => {
    if (saveState?.ok) setEditing(false);
  }, [saveState]);

  return (
    <div className="mt-3 border-t border-[var(--line)] pt-3">
      <div className="flex gap-2">
        <button
          type="button"
          className="btn btn-ghost !py-1.5 !text-xs"
          onClick={() => setEditing(!editing)}
        >
          {editing ? "Fechar" : "Editar"}
        </button>
        <form action={deleteAction}>
          <input type="hidden" name="id" value={event.id} />
          <SubmitBtn className="btn btn-ghost !py-1.5 !text-xs text-red-600" pendingLabel="Excluindo…">
            Excluir
          </SubmitBtn>
        </form>
      </div>
      <Feedback state={deleteState?.error ? deleteState : null} />

      {editing ? (
        <form action={saveAction} className="mt-3 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="id" value={event.id} />
          <div className="sm:col-span-2">
            <label className="label">Nome</label>
            <input name="title" className="input" defaultValue={event.title} required />
          </div>
          <div>
            <label className="label">Data</label>
            <input
              name="event_date"
              type="date"
              className="input"
              defaultValue={event.event_date}
              required
            />
          </div>
          <div>
            <label className="label">Horário</label>
            <input
              name="event_time"
              type="time"
              className="input"
              defaultValue={event.event_time?.slice(0, 5) ?? ""}
            />
          </div>
          <div>
            <label className="label">Local</label>
            <input name="location" className="input" defaultValue={event.location ?? ""} />
          </div>
          <div>
            <label className="label">Elo relacionado</label>
            <select
              name="elo_id"
              className="input"
              defaultValue={
                event.admin_only ? "admin" : event.leaders_only ? "leaders" : (event.elo_id ?? "")
              }
            >
              <option value="">Todos</option>
              {elos.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
              <option value="leaders">Liderança (só líderes)</option>
              <option value="admin">Só admin</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Descrição</label>
            <textarea
              name="description"
              rows={2}
              className="input"
              defaultValue={event.description ?? ""}
            />
          </div>
          <div className="sm:col-span-2">
            <Feedback state={saveState} />
            <SubmitBtn className="btn btn-primary mt-2 !py-2 !text-sm">Salvar</SubmitBtn>
          </div>
        </form>
      ) : null}
    </div>
  );
}
