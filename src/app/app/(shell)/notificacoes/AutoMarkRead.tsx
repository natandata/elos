"use client";

import { useEffect } from "react";
import { markAllRead } from "@/lib/actions/notifications";

/**
 * Marca tudo como lido assim que a tela de Notificações é aberta — mesmo
 * padrão do chat (markChatRead ao abrir a conversa). O sino some sozinho,
 * sem precisar clicar em "Marcar todas como lidas".
 */
export function AutoMarkRead() {
  useEffect(() => {
    markAllRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
