"use client";

import { useRouter } from "next/navigation";
import { ChevronLeftIcon } from "@/components/feed/icons";

/** Voltar de verdade (pra tela de onde a pessoa veio); sem histórico, vai pro `fallback`. */
export function ElogramBackButton({ fallback }: { fallback: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label="Voltar"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push(fallback);
      }}
      className="-ml-1 rounded-lg p-1 text-[var(--muted)]"
    >
      <ChevronLeftIcon />
    </button>
  );
}
