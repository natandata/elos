"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "elos-theme-mode";

/**
 * Claro/escuro — independente da cor de identidade de cada acesso
 * (data-theme, que fica intocado). Guarda a escolha no localStorage; sem
 * escolha salva, segue a preferência do sistema (definido no script
 * anti-flash do layout raiz).
 */
export function ThemeModeToggle({ className = "" }: { className?: string }) {
  const [mode, setMode] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    setMode((document.documentElement.dataset.mode as "light" | "dark") || "light");
  }, []);

  function toggle() {
    const next = mode === "dark" ? "light" : "dark";
    document.documentElement.dataset.mode = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage bloqueado (aba anônima etc.) — só não persiste, sem quebrar nada.
    }
    setMode(next);
  }

  // Evita mismatch de hidratação: só mostra o ícone depois de saber o modo real.
  if (mode === null) {
    return <span className={`inline-block h-9 w-9 ${className}`} aria-hidden />;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={mode === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
      title={mode === "dark" ? "Tema claro" : "Tema escuro"}
      className={`flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--line)] text-sm text-[var(--muted)] hover:text-[var(--ink)] ${className}`}
    >
      {mode === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
