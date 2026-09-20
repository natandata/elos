"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  createSuggestion,
  deleteSuggestion,
  setSuggestionStatus,
  toggleHype,
} from "@/lib/actions/suggestions";
import { Feedback, SubmitBtn } from "@/components/forms";
import {
  SUGGESTION_STATUS_LABEL,
  SUGGESTION_STATUS_TONE,
  formatDateTime,
  type Suggestion,
  type SuggestionStatus,
} from "@/lib/types";

function HypeButton({ suggestionId, hyped, count }: { suggestionId: string; hyped: boolean; count: number }) {
  const [state, action] = useActionState(toggleHype, null);
  return (
    <form action={action}>
      <input type="hidden" name="suggestion_id" value={suggestionId} />
      <button
        type="submit"
        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-bold transition ${
          hyped
            ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
            : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--accent)]"
        }`}
      >
        <span aria-hidden>{hyped ? "🔥" : "🤍"}</span>
        <span className="tabular-nums">{count}</span>
      </button>
      <Feedback state={state?.error ? state : null} />
    </form>
  );
}

function StatusButton({
  suggestionId,
  status,
  active,
}: {
  suggestionId: string;
  status: SuggestionStatus;
  active: boolean;
}) {
  const [state, action] = useActionState(setSuggestionStatus, null);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={suggestionId} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        className={`chip border ${
          active
            ? SUGGESTION_STATUS_TONE[status]
            : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--accent)]"
        }`}
      >
        {SUGGESTION_STATUS_LABEL[status]}
      </button>
      {state?.error ? <p className="text-xs text-red-600">{state.error}</p> : null}
    </form>
  );
}

function AdminControls({ suggestion }: { suggestion: Suggestion }) {
  const [deleteState, deleteAction] = useActionState(deleteSuggestion, null);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-[var(--line)] pt-2">
      {(Object.keys(SUGGESTION_STATUS_LABEL) as SuggestionStatus[]).map((s) => (
        <StatusButton
          key={s}
          suggestionId={suggestion.id}
          status={s}
          active={suggestion.status === s}
        />
      ))}

      {confirming ? (
        <form action={deleteAction} className="flex items-center gap-1">
          <input type="hidden" name="id" value={suggestion.id} />
          <SubmitBtn className="btn btn-ghost !py-1 !text-xs text-red-600" pendingLabel="Excluindo…">
            Confirmar exclusão
          </SubmitBtn>
          <button
            type="button"
            className="text-xs text-[var(--muted)] underline"
            onClick={() => setConfirming(false)}
          >
            cancelar
          </button>
        </form>
      ) : (
        <button
          type="button"
          className="text-xs text-red-600 underline underline-offset-2"
          onClick={() => setConfirming(true)}
        >
          Excluir
        </button>
      )}
      <Feedback state={deleteState?.error ? deleteState : null} />
    </div>
  );
}

export function SuggestionBoard({
  suggestions,
  myHypedIds,
  canSubmit,
  isAdmin,
}: {
  suggestions: Suggestion[];
  myHypedIds: Set<string>;
  canSubmit: boolean;
  isAdmin: boolean;
}) {
  const [state, action] = useActionState(createSuggestion, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  const sorted = [...suggestions].sort(
    (a, b) => b.hype_count - a.hype_count || a.created_at.localeCompare(b.created_at),
  );

  return (
    <div className="space-y-4">
      {canSubmit ? (
        <form ref={formRef} action={action} className="card p-4">
          <label className="label" htmlFor="content">
            O que você gostaria de ver ou poder fazer no ELOS?
          </label>
          <textarea
            id="content"
            name="content"
            rows={2}
            maxLength={300}
            className="input"
            placeholder="Ex.: quero poder trocar de música no perfil…"
            required
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <Feedback state={state} />
            <SubmitBtn className="btn btn-primary !py-2 !text-sm">Enviar sugestão</SubmitBtn>
          </div>
        </form>
      ) : null}

      {sorted.length === 0 ? (
        <div className="card p-6 text-center text-sm text-[var(--muted)]">
          Nenhuma sugestão ainda — seja o primeiro a escrever no mural!
        </div>
      ) : (
        <ul className="space-y-3">
          {sorted.map((s) => (
            <li key={s.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{s.content}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {s.author_name || "Alguém"} · {formatDateTime(s.created_at)}
                  </p>
                </div>
                <span className={`chip shrink-0 ${SUGGESTION_STATUS_TONE[s.status]}`}>
                  {SUGGESTION_STATUS_LABEL[s.status]}
                </span>
              </div>
              <div className="mt-3">
                <HypeButton suggestionId={s.id} hyped={myHypedIds.has(s.id)} count={s.hype_count} />
              </div>
              {isAdmin ? <AdminControls suggestion={s} /> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
