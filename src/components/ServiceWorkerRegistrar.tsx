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

    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
