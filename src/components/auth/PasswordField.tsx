"use client";

import { useState } from "react";

/** Campo de senha com botão de "mostrar/ocultar" — pra conferir se digitou certo. */
export function PasswordField({
  id,
  value,
  onChange,
  autoComplete,
  required = true,
  name,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  required?: boolean;
  name?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        required={required}
        className="input pr-16"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)]"
        tabIndex={-1}
      >
        {visible ? "Ocultar" : "Mostrar"}
      </button>
    </div>
  );
}
