"use client";

import { useEffect } from "react";

/**
 * Aplica o tema por papel/gênero (líder homem = vermelho, resto = cor do
 * gênero) no `<html data-theme>` assim que a área logada monta. Antes essa
 * decisão vinha do servidor no layout raiz — o que bloqueava a tela de login
 * (fora da área logada) esperando uma consulta que nem dizia respeito a ela.
 * Aqui já roda com o profile em mãos, sem chamada extra nenhuma.
 */
export function ThemeSetter({ theme }: { theme: string }) {
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return null;
}
