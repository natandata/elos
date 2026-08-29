"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { usePathname, useRouter } from "next/navigation";
import { completeOnboarding } from "@/lib/actions/onboarding";
import { CRIA_TOUR, LEADER_TOUR, type TourStep } from "@/lib/onboardingSteps";

type Rect = { top: number; left: number; width: number; height: number };

/** Evento global disparado pelo botão "Rever tutorial" no Perfil. */
export const REPLAY_TOUR_EVENT = "elos:replay-tour";

export function OnboardingTour({
  role,
  startOpen,
}: {
  role: "leader" | "cria";
  startOpen: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const steps: TourStep[] = role === "leader" ? LEADER_TOUR : CRIA_TOUR;

  const [open, setOpen] = useState(startOpen);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [notFound, setNotFound] = useState(false);

  // "Rever tutorial" (tela de Perfil) reabre do zero, sem mexer no banco.
  useEffect(() => {
    function onReplay() {
      setStepIndex(0);
      setNotFound(false);
      setOpen(true);
    }
    window.addEventListener(REPLAY_TOUR_EVENT, onReplay);
    return () => window.removeEventListener(REPLAY_TOUR_EVENT, onReplay);
  }, []);

  // Trava a rolagem da página enquanto o tour está aberto — sem isso, o
  // usuário rola por baixo do overlay e o recorte desalinha do elemento real.
  useEffect(() => {
    if (!open) return;
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, [open]);

  const step = steps[stepIndex];

  // Navega pra rota do passo (se precisar) e localiza o elemento a destacar.
  useEffect(() => {
    if (!open || !step) return;
    if (step.path && pathname !== step.path) {
      router.push(step.path);
      return;
    }

    let cancelled = false;
    let attempts = 0;
    setNotFound(false);

    function tryFind() {
      if (cancelled) return;
      const el = document.querySelector(step.selector) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ block: "center" });
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      } else if (attempts < 40) {
        attempts += 1;
        requestAnimationFrame(tryFind);
      } else {
        setRect(null);
        setNotFound(true);
      }
    }
    tryFind();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, stepIndex, pathname]);

  // Reposiciona se a janela mudar de tamanho enquanto o passo está aberto.
  useEffect(() => {
    if (!open || notFound) return;
    function onResize() {
      const el = document.querySelector(step.selector) as HTMLElement | null;
      if (el) {
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      }
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, stepIndex, notFound]);

  if (!open || !step) return null;

  const isLast = stepIndex === steps.length - 1;

  function finish() {
    setOpen(false);
    completeOnboarding().catch(() => {});
  }

  function next() {
    if (isLast) return finish();
    setStepIndex((i) => i + 1);
  }

  function back() {
    setStepIndex((i) => Math.max(0, i - 1));
  }

  const pad = 8;
  const highlight = rect
    ? {
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      }
    : null;

  // Card acima ou abaixo do elemento, o que tiver mais espaço na tela.
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const vw = typeof window !== "undefined" ? window.innerWidth : 400;
  const cardWidth = Math.min(340, vw - 24);
  let cardStyle: CSSProperties;
  if (highlight) {
    const spaceBelow = vh - (highlight.top + highlight.height);
    const placeBelow = spaceBelow > 180 || highlight.top < 180;
    cardStyle = placeBelow
      ? { top: highlight.top + highlight.height + 12, left: Math.min(Math.max(12, highlight.left), vw - cardWidth - 12) }
      : { bottom: vh - highlight.top + 12, left: Math.min(Math.max(12, highlight.left), vw - cardWidth - 12) };
  } else {
    cardStyle = { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  }

  const card = (
    <div
      className="card fixed z-[70] p-4 shadow-2xl"
      style={{ width: cardWidth, ...cardStyle }}
    >
      <p className="mb-1 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
        Passo {stepIndex + 1} de {steps.length}
      </p>
      <p className="mb-1.5 text-base font-bold">{step.title}</p>
      <p className="mb-4 text-sm text-[var(--muted)]">{step.body}</p>
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={finish} className="text-xs font-semibold text-[var(--muted)]">
          Pular tour
        </button>
        <div className="flex gap-2">
          {stepIndex > 0 ? (
            <button type="button" onClick={back} className="btn btn-ghost !px-3 !py-1.5 !text-xs">
              Voltar
            </button>
          ) : null}
          <button type="button" onClick={next} className="btn btn-primary !px-3 !py-1.5 !text-xs">
            {isLast ? "Concluir" : "Próximo"}
          </button>
        </div>
      </div>
    </div>
  );

  if (!highlight) {
    return (
      <div className="fixed inset-0 z-[60] bg-black/60">
        {card}
      </div>
    );
  }

  return (
    <>
      {/* quatro retângulos escuros ao redor do recorte — o "spotlight" */}
      <div className="fixed inset-x-0 top-0 z-[60] bg-black/60" style={{ height: Math.max(0, highlight.top) }} />
      <div
        className="fixed inset-x-0 bottom-0 z-[60] bg-black/60"
        style={{ top: highlight.top + highlight.height }}
      />
      <div
        className="fixed left-0 z-[60] bg-black/60"
        style={{ top: highlight.top, height: highlight.height, width: Math.max(0, highlight.left) }}
      />
      <div
        className="fixed right-0 z-[60] bg-black/60"
        style={{ top: highlight.top, height: highlight.height, left: highlight.left + highlight.width }}
      />
      {/* transparente, só pra impedir rolagem por dentro do recorte (o "buraco" no overlay) */}
      <div
        className="fixed z-[61] touch-none"
        style={{ top: highlight.top, left: highlight.left, width: highlight.width, height: highlight.height }}
        onWheel={(e) => e.preventDefault()}
        onTouchMove={(e) => e.preventDefault()}
      />
      <div
        className="pointer-events-none fixed z-[65] rounded-2xl border-2 border-[var(--accent)]"
        style={{ top: highlight.top, left: highlight.left, width: highlight.width, height: highlight.height }}
      />
      {card}
    </>
  );
}
