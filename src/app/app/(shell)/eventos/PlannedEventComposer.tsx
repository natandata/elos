"use client";

import { useActionState, useState } from "react";
import { createPlannedEvent } from "@/lib/actions/plannedEvents";
import { Feedback, SubmitBtn } from "@/components/forms";
import type { Elo } from "@/lib/types";

export function PlannedEventComposer({ elos }: { elos: Elo[] }) {
  const [state, action] = useActionState(createPlannedEvent, null);
  const [open, setOpen] = useState(false);

  return (
    <div className="card mb-5 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-bold">Novo planejamento</p>
          <p className="text-xs text-[var(--muted)]">Visível só para admin e líderes.</p>
        </div>
        <button type="button" className="btn btn-primary !py-2 !text-sm" onClick={() => setOpen(!open)}>
          {open ? "Cancelar" : "Criar planejamento"}
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
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Descrição</label>
            <textarea name="description" rows={2} className="input" />
          </div>
          <div className="sm:col-span-2">
            <Feedback state={state} />
            <SubmitBtn className="btn btn-primary mt-2 w-full">Criar planejamento</SubmitBtn>
          </div>
        </form>
      ) : null}
    </div>
  );
}
