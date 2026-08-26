"use client";

import { useFormStatus } from "react-dom";

export function SubmitBtn({
  children,
  className = "btn btn-primary",
  pendingLabel = "Salvando…",
  disabled,
}: {
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending || disabled}>
      {pending ? pendingLabel : children}
    </button>
  );
}

export function Feedback({ state }: { state: { error?: string; ok?: boolean } | null }) {
  if (!state) return null;
  if (state.error)
    return <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>;
  if (state.ok)
    return (
      <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Salvo com sucesso.</p>
    );
  return null;
}
