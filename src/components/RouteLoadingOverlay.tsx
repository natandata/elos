"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** Tempo máximo que a tela de loading fica visível — trava de segurança pra
 *  ela nunca ficar presa se, por algum motivo, a navegação não completar
 *  (erro de rede, rota que não existe, etc.). */
const SAFETY_TIMEOUT_MS = 6000;

/**
 * Cobre o intervalo "morto" entre o clique num link e a nova tela aparecer —
 * hoje esse intervalo fica com a tela anterior parada e depois troca de
 * repente. Detecta o clique em qualquer link interno (captura na raiz do
 * documento, então funciona em qualquer tela sem precisar tocar em cada
 * página) e mostra uma animação simples até o pathname realmente mudar.
 */
export function RouteLoadingOverlay() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPathname = useRef(pathname);

  // a rota mudou de verdade: a nova tela já está pronta, esconde o overlay
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      setLoading(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }
  }, [pathname]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      // mesma página (só âncora ou querystring): não é uma troca de tela
      if (url.pathname === window.location.pathname) return;

      setLoading(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setLoading(false), SAFETY_TIMEOUT_MS);
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  if (!loading) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Carregando"
      className="route-loading-overlay fixed inset-0 z-[200] flex items-center justify-center bg-[var(--bg)]/80 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent)] text-2xl font-black text-[var(--accent-ink)]">
          E
        </span>
        <span className="relative block h-1.5 w-28 overflow-hidden rounded-full bg-[var(--line)]">
          <span className="route-loading-bar absolute inset-y-0 left-0 w-1/3 rounded-full bg-[var(--accent)]" />
        </span>
      </div>
    </div>
  );
}
