"use client";

import { useActionState, useMemo, useState } from "react";
import { createMission } from "@/lib/actions/missions";
import { Feedback, SubmitBtn } from "@/components/forms";
import type { Elo, MissionType } from "@/lib/types";

export type CriaOption = { id: string; full_name: string; elo_id: string | null };
export type LeaderOption = { id: string; full_name: string };

export function MissionComposer({
  elos,
  crias,
  leaders,
  canTargetAll,
  defaultEloId,
}: {
  elos: Elo[];
  crias: CriaOption[];
  /** Só admin cria "Missões da Liderança" — passe undefined pra líder. */
  leaders?: LeaderOption[];
  canTargetAll: boolean;
  defaultEloId?: string | null;
}) {
  const [state, action] = useActionState(createMission, null);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<MissionType>("individual");
  const [target, setTarget] = useState<"crias" | "elo" | "all" | "leaders" | "general">("crias");
  const [eloId, setEloId] = useState(defaultEloId ?? "");
  const isLeadershipMission = target === "leaders";
  const isGeneralMission = target === "general";
  const hidesParticipantPickers = isLeadershipMission || isGeneralMission;

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
            {isLeadershipMission
              ? "Missão da Liderança — atribuída direto a líderes escolhidos."
              : isGeneralMission
                ? "Missão Geral — atribuída a todos os líderes e crias da plataforma."
                : "Individual para um cria ou coletiva (meta do Elo) para o Elo inteiro."}
          </p>
        </div>
        <button type="button" className="btn btn-primary !py-2 !text-sm" onClick={() => setOpen(!open)}>
          {open ? "Cancelar" : "Criar missão"}
        </button>
      </div>

      {open ? (
        <form action={action} className="mt-4 space-y-4 border-t border-[var(--line)] pt-4">
          <input type="hidden" name="type" value={hidesParticipantPickers ? "individual" : type} />
          <input type="hidden" name="target" value={target} />
          <input type="hidden" name="elo_id" value={hidesParticipantPickers ? "" : eloId} />

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
                max={25}
                step={5}
                defaultValue={25}
                className="input"
                required
              />
              <p className="mt-1 text-xs text-[var(--muted)]">Máximo 25 XP por missão.</p>
            </div>

            {hidesParticipantPickers ? null : (
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
            )}

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

            <div className="sm:col-span-2">
              <label className="label" htmlFor="publish_at">
                Agendar (opcional)
              </label>
              <input id="publish_at" name="publish_at" type="datetime-local" className="input" />
              <p className="mt-1 text-xs text-[var(--muted)]">
                Deixe em branco para os crias verem na hora. Preenchendo, só líderes/admin veem
                até essa data — os crias só enxergam a missão a partir daí.
              </p>
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
                  ...(leaders ? ([["leaders", "Líderes (Missão da Liderança)"]] as const) : []),
                  ...(leaders ? ([["general", "Todo mundo (Missão Geral)"]] as const) : []),
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setTarget(value);
                    if (value === "leaders" || value === "general") setType("individual");
                  }}
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

            {target !== "all" && target !== "leaders" && target !== "general" ? (
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

            {target === "leaders" ? (
              !leaders || leaders.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">Nenhum líder disponível.</p>
              ) : (
                <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-[var(--line)] p-2">
                  {leaders.map((l) => (
                    <label key={l.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm">
                      <input type="checkbox" name="leader_ids" value={l.id} className="h-4 w-4" />
                      {l.full_name || "Sem nome"}
                    </label>
                  ))}
                </div>
              )
            ) : null}

            {isGeneralMission ? (
              <p className="rounded-xl border border-[var(--line)] p-3 text-sm text-[var(--muted)]">
                Vai pra todo mundo: todos os líderes aprovados e todos os crias da plataforma.
              </p>
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
