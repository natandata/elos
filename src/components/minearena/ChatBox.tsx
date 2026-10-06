"use client";

import { useState } from "react";

/** Caixa de conversa do co-op: Enter envia, Esc fecha. */
export function ChatBox({ onSend, onClose }: { onSend: (t: string) => void; onClose: () => void }) {
  const [text, setText] = useState("");
  return (
    <form
      className="ma-chat"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) onSend(text);
        onClose();
      }}
    >
      <input
        autoFocus
        value={text}
        maxLength={140}
        placeholder="Mensagem pra sala… (Enter envia, Esc fecha)"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
          e.stopPropagation();
        }}
      />
      <button type="submit">Enviar</button>
    </form>
  );
}
