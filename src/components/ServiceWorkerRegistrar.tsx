"use client";

import { useEffect } from "react";

/**
 * Registra o Service Worker depois que a página carrega, para não competir com
 * o primeiro render. Sem ele o navegador não oferece a instalação do app.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // Falhar aqui não quebra nada: o site segue funcionando sem offline.
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    // Quando um novo deploy assume o controle (skipWaiting + clients.claim no
    // sw.js), a aba/PWA que já estava aberta continua rodando o JS antigo em
    // memória até recarregar. Isso deixava sessões já abertas presas em bugs
    // já corrigidos (ex.: tema roxo grudado) até a pessoa fechar e abrir de
    // novo o app. Recarregando aqui, a atualização chega sozinha.
    let refreshed = false;
    const onControllerChange = () => {
      if (refreshed) return;
      refreshed = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    return () => {
      window.removeEventListener("load", register);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  return null;
}
