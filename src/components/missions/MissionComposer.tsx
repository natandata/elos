"use client";

import { useActionState, useMemo, useState } from "react";
import { createMission } from "@/lib/actions/missions";
import { Feedback, SubmitBtn } from "@/components/forms";
import type { Elo, MissionType } from "@/lib/types";

export type CriaOption = { id: string; full_name: string; elo_id: string | null };

export function MissionComposer({
  elos,
  crias,
  canTargetAll,
  defaultEloId,
}: {
  elos: Elo[];
  crias: CriaOption[];
  canTargetAll: boolean;
  defaultEloId?: string | null;
}) {
  const [state, action] = useActionState(createMission, null);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<MissionType>("individual");
  const [target, setTarget] = useState<"crias" | "elo" | "all">("crias");
  const [eloId, setEloId] = useState(defaultEloId ?? "");

  const visibleCrias = useMemo(
    () => (eloId ? crias.filter((c) => c.elo_id === eloId) : crias),
    [crias, eloId],
  );

  return (
    <div className="card mb-5 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-bold">Nova missão</p>
          <p className="text-xs text-[var(--muted)]">
            Individual para um cria ou coletiva (meta do Elo) para o Elo inteiro.
          </p>
        </div>
        <button type="button" className="btn btn-primary !py-2 !text-sm" onClick={() => setOpen(!open)}>
          {open ? "Cancelar" : "Criar missão"}
        </button>
      </div>

      {open ? (
        <form action={action} className="mt-4 space-y-4 border-t border-[var(--line)] pt-4">
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="target" value={target} />
          <input type="hidden" name="elo_id" value={eloId} />

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="title">
                Título
              </label>
              <input id="title" name="title" className="input" required />
            </div>

            <div className="sm:col-span-2">
              <label className="label" htmlFor="description">
                Descrição
              </label>
              <textarea id="description" name="description" rows={3} className="input" />
            </div>

            <div>
              <label className="label" htmlFor="xp">
                XP
              </label>
              <input
                id="xp"
                name="xp"
                type="number"
                min={0}
                step={5}
                defaultValue={50}
                className="input"
                required
              />
            </div>

            <div>
              <span className="label">Tipo</span>
              <div className="grid grid-cols-2 gap-2">
                {(["individual", "collective"] as MissionType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setType(t);
                      setTarget(t === "collective" ? "elo" : "crias");
                    }}
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                      type === t
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                        : "border-[var(--line)] text-[var(--muted)]"
                    }`}
                  >
                    {t === "individual" ? "Individual" : "Coletiva"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label" htmlFor="start_date">
                Início
              </label>
              <input id="start_date" name="start_date" type="date" className="input" />
            </div>

            <div>
              <label className="label" htmlFor="due_date">
                Prazo
              </label>
              <input id="due_date" name="due_date" type="date" className="input" />
            </div>
          </div>

          <div>
            <span className="label">Participantes</span>
            <div className="mb-3 flex flex-wrap gap-2">
              {(
                [
                  ["crias", "Escolher crias"],
                  ["elo", "Elo inteiro"],
                  ...(canTargetAll ? ([["all", "Todos os crias"]] as const) : []),
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTarget(value)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    target === value
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                      : "border-[var(--line)] text-[var(--muted)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {target !== "all" ? (
              <div className="mb-3">
                <label className="label" htmlFor="elo_select">
                  Elo
                </label>
                <select
                  id="elo_select"
                  className="input"
                  value={eloId}
                  onChange={(e) => setEloId(e.target.value)}
                >
                  <option value="">{target === "elo" ? "Selecione um Elo" : "Todos os ELOS"}</option>
                  {elos.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {target === "crias" ? (
              visibleCrias.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">Nenhum cria disponível.</p>
              ) : (
                <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-[var(--line)] p-2">
                  {visibleCrias.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm">
                      <input type="checkbox" name="cria_ids" value={c.id} className="h-4 w-4" />
                      {c.full_name || "Sem nome"}
                    </label>
                  ))}
                </div>
              )
            ) : null}
          </div>

          <Feedback state={state} />
          <SubmitBtn className="btn btn-primary w-full" pendingLabel="Criando…">
            Criar missão
          </SubmitBtn>
        </form>
      ) : null}
    </div>
  );
}
