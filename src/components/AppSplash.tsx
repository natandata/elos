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
  // Leitura pura (sem gravar nada) num inicializador preguiçoso: em
  // desenvolvimento o React chama isso 2x de propósito (Strict Mode) pra
  // pegar efeitos que não são seguros de repetir — como é só leitura, as
  // duas chamadas sempre concordam, sem esse tipo de problema.
  const [wasAlreadyShown] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      return sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      return true;
    }
  });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (wasAlreadyShown) return;

    setVisible(true);
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // sessionStorage indisponível (modo privado estrito etc.) — só não
      // repete a splash; não vale travar a abertura do app por causa disso.
    }

    // Enquanto a splash cobre a tela, o formulário de login por baixo já
    // está no DOM (só visualmente escondido) — o Safari/iOS detecta os
    // campos de e-mail/senha e oferece o Face ID de preenchimento automático
    // sozinho, antes da pessoa tocar em nada. `inert` tira esses campos da
    // árvore de foco/acessibilidade enquanto a splash dura.
    const content = document.getElementById("app-root-content");
    content?.setAttribute("inert", "");

    // A limpeza só cancela o temporizador pendente — não desfaz o `inert`
    // aqui. Em desenvolvimento este efeito roda 2x (Strict Mode); como
    // `wasAlreadyShown` é a mesma leitura pura nas duas vezes, a 2ª chamada
    // reaplica tudo de novo (idempotente) e agenda um temporizador novo, que
    // é quem de fato tira o `inert` no fim — sem isso a limpeza da 1ª
    // chamada tiraria o `inert` e nada o devolveria.
    const timer = setTimeout(() => {
      setVisible(false);
      content?.removeAttribute("inert");
    }, TOTAL_DURATION_MS);

    return () => clearTimeout(timer);
  }, [wasAlreadyShown]);

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
