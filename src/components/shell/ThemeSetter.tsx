"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useEvent } from "@/components/event/EventProvider";
import { TRIBES } from "@/lib/event/tribes";

/**
 * Aplica o tema por papel/gênero (líder homem = vermelho, resto = cor do
 * gênero) no `<html data-theme>` assim que a área logada monta. Antes essa
 * decisão vinha do servidor no layout raiz — o que bloqueava a tela de login
 * (fora da área logada) esperando uma consulta que nem dizia respeito a ela.
 * Aqui já roda com o profile em mãos, sem chamada extra nenhuma.
 *
 * Durante o evento das tribos, quem tem tribo usa o tema da tribo, menos nas telas de jogos (que ficam como estão).
 */
export function ThemeSetter({ theme }: { theme: string }) {
  const { state } = useEvent();
  const pathname = usePathname();
  const tribe = state.visible && state.me && !pathname.startsWith("/app/jogos") ? TRIBES[state.me].theme : null;
  const effective = tribe ?? theme;

  useEffect(() => {
    document.documentElement.dataset.theme = effective;
  }, [effective]);

  return null;
}
