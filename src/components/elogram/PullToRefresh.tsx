"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

const TRIGGER = 80; // quanto precisa puxar (px) pra recarregar
const MAX_PULL = 130;

/** Puxar a tela pra baixo, estando no topo, recarrega o Elogram (como no Instagram). Só em toque. */
export function PullToRefresh() {
  const router = useRouter();
  const pathname = usePathname();
  const [pull, setPull] = useState(0);
  const [refreshing, startRefresh] = useTransition();
  const startY = useRef<number | null>(null);
  const pullRef = useRef(0);

  // dentro de uma conversa a tela não rola como página: não se aplica
  const disabled = pathname.startsWith("/app/elogram/mensagens/");

  useEffect(() => {
    if (disabled) return;

    // o navegador não pode recarregar por conta própria (recarregaria o app inteiro)
    const prev = document.documentElement.style.overscrollBehaviorY;
    document.documentElement.style.overscrollBehaviorY = "contain";

    const blocked = () =>
      document.body.style.overflow === "hidden" || !!document.querySelector("[data-no-pull], .fixed.inset-0");

    function onStart(e: TouchEvent) {
      if (window.scrollY > 0 || blocked() || e.touches.length !== 1) {
        startY.current = null;
        return;
      }
      startY.current = e.touches[0].clientY;
    }

    function onMove(e: TouchEvent) {
      if (startY.current === null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0 || window.scrollY > 0) {
        pullRef.current = 0;
        setPull(0);
        return;
      }
      // resistência: quanto mais puxa, mais "pesado"
      const eased = Math.min(MAX_PULL, dy * 0.5);
      pullRef.current = eased;
      setPull(eased);
    }

    function onEnd() {
      const reached = pullRef.current >= TRIGGER * 0.5;
      startY.current = null;
      pullRef.current = 0;
      setPull(0);
      if (reached) startRefresh(() => router.refresh());
    }

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      document.documentElement.style.overscrollBehaviorY = prev;
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [disabled, router]);

  if (disabled || (pull === 0 && !refreshing)) return null;

  const progress = Math.min(1, pull / (TRIGGER * 0.5));
  const y = refreshing ? 56 : pull;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center"
      style={{ transform: `translateY(${y - 40}px)`, transition: pull === 0 ? "transform 0.2s ease" : "none" }}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--card)] shadow-lg">
        <svg
          viewBox="0 0 24 24"
          width="22"
          height="22"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          className={refreshing ? "animate-spin" : ""}
          style={refreshing ? undefined : { transform: `rotate(${progress * 270}deg)`, opacity: 0.4 + progress * 0.6 }}
        >
          <path d="M20 12a8 8 0 1 1-2.6-5.9" />
          <path d="M20 4v4h-4" />
        </svg>
      </div>
    </div>
  );
}
