"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMsg } from "@/lib/games/dress/hall";

type Line = ChatMsg & { k: number };

/** Estado do chat do salão: as últimas mensagens (somem sozinhas), as não lidas e se o campo de digitar está aberto. */
export function useHallChat(messages: ChatMsg[]) {
  const [open, setOpenState] = useState(false);
  const [unread, setUnread] = useState(0);
  const [recent, setRecent] = useState<Line[]>([]);
  const seen = useRef(0);
  const openRef = useRef(false);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    if (messages.length === seen.current) return;
    const fresh = messages.slice(seen.current);
    seen.current = messages.length;
    const tagged = fresh.map((m, i) => ({ ...m, k: seen.current * 100 + i }));
    const t1 = setTimeout(() => {
      setRecent((r) => [...r.slice(-2), ...tagged].slice(-3));
      if (!openRef.current) setUnread((u) => u + fresh.filter((m) => m.name !== "Você").length);
    }, 0);
    const t2 = setTimeout(() => setRecent((r) => r.filter((x) => !tagged.some((n) => n.k === x.k))), 9000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [messages]);

  const setOpen = (v: boolean) => {
    setOpenState(v);
    if (v) setUnread(0);
  };
  return { open, setOpen, unread, recent };
}

/** Mensagens recentes (vão na coluna da esquerda, junto dos outros avisos, para nunca ficarem atrás de nada). */
export function ChatFeed({ recent }: { recent: Line[] }) {
  if (recent.length === 0) return null;
  return (
    <div className="vh-chat-feed" aria-live="polite">
      {recent.map((m) => (
        <p key={m.k} className="vh-chat-line">
          <b>{m.name}:</b> {m.text}
        </p>
      ))}
    </div>
  );
}

/** Botão 💬 da barra de cima; o campo de digitar abre logo abaixo dele. */
export function ChatToggle({ open, setOpen, unread, onSend }: { open: boolean; setOpen: (v: boolean) => void; unread: number; onSend: (t: string) => void }) {
  const [text, setText] = useState("");
  const last = useRef(0);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = text.trim();
    if (!v) return;
    if (e.timeStamp - last.current < 1100) return;
    last.current = e.timeStamp;
    onSend(v);
    setText("");
  }

  return (
    <div className="vh-chat-box">
      <button type="button" className="vh-iconbtn" aria-label={open ? "Fechar o chat" : "Abrir o chat"} aria-expanded={open} onClick={() => setOpen(!open)}>
        💬
        {unread > 0 && !open ? <i className="vh-chat-badge">{unread > 9 ? "9+" : unread}</i> : null}
      </button>
      {open ? (
        <form onSubmit={submit} className="vh-chat-form">
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={120} placeholder="Diga algo…" aria-label="Mensagem" autoComplete="off" autoFocus />
          <button type="submit" aria-label="Enviar">
            ➤
          </button>
        </form>
      ) : null}
    </div>
  );
}
