"use client";

import { useState } from "react";
import { LiveCounters } from "@/components/auth/LiveCounters";

/**
 * Tela de abertura antes do login: só a logo, o nome do app e um botão
 * "Entrar no aplicativo" — deixa o corredor de fotos do fundo aparecer
 * inteiro (sem o card do formulário por cima cortando a visão no mobile).
 * Ao clicar, some com um fade simples e revela o card de login/criar conta
 * exatamente como já existia.
 */
export function LoginGate({ children }: { children: React.ReactNode }) {
  const [entered, setEntered] = useState(false);

  return (
    <>
      <div
        aria-hidden={entered}
        className={`absolute inset-0 z-10 flex flex-col items-center justify-center px-4 text-center transition-opacity duration-500 ${
          entered ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent)] text-2xl font-black text-[var(--accent-ink)]">
          E
        </div>
        <h1 className="text-3xl font-black tracking-tight text-[var(--ink)]">ELOS</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Missões, acompanhamento e ranking do seu Elo.
        </p>
        <div className="mt-4">
          <LiveCounters />
        </div>

        <button
          type="button"
          onClick={() => setEntered(true)}
          className="mt-10 w-full max-w-sm rounded-full bg-[var(--accent)] py-3.5 text-base font-semibold text-[var(--accent-ink)] shadow-lg"
        >
          Entrar no aplicativo
        </button>
      </div>

      <div
        aria-hidden={!entered}
        className={`transition-opacity duration-500 ${
          entered ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {children}
      </div>
    </>
  );
}
