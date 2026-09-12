"use client";

import { useEffect, useState } from "react";

/** Marca de sessão (não localStorage): sobrevive a navegações internas do
 *  SPA, mas zera quando a aba/processo do PWA fecha de verdade — é isso que
 *  faz a introdução aparecer de novo a cada "abertura do app", sem repetir
 *  a cada clique no menu. */
const SESSION_KEY = "elos-splash-shown";

// Marcos da animação (ver globals.css): ícone pulsa (0–0.9s), a foto "abre"
// por trás dele (0.85–1.55s), fica 2s inteiros visível (1.55–3.55s — pedido
// explícito do usuário) e só então some (3.55–3.85s).
const TOTAL_DURATION_MS = 3850;

export function AppSplash() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let alreadyShown = true;
    try {
      alreadyShown = sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      // sessionStorage indisponível (modo privado estrito etc.) — só não
      // repete a splash; não vale travar a abertura do app por causa disso.
      alreadyShown = true;
    }

    if (alreadyShown) return;

    setVisible(true);
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // idem — segue sem persistir, a splash pode repetir, tudo bem.
    }

    const timer = setTimeout(() => setVisible(false), TOTAL_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-label="Carregando ELOS"
      className="splash-root fixed inset-0 z-[300] flex items-center justify-center overflow-hidden bg-[var(--bg)]"
    >
      {/* foto de fundo — revelada de dentro do ícone, como uma cortina abrindo */}
      <div
        className="splash-photo absolute inset-0 bg-center"
        style={{ backgroundImage: "url(/splash-cria.jpg)" }}
        aria-hidden
      />

      {/* ícone do ELOS — some por cima assim que a foto termina de abrir */}
      <span className="splash-icon-box relative flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--accent)] text-4xl font-black text-[var(--accent-ink)] shadow-lg">
        E
      </span>
    </div>
  );
}
