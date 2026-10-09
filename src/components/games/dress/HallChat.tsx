"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMsg } from "@/lib/games/dress/hall";

/** Chat ao vivo do salão: as últimas mensagens aparecem discretas na lateral e somem; o botão abre o campo de digitar. */
export function HallChat({ messages, onSend }: { messages: ChatMsg[]; onSend: (t: string) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [unread, setUnread] = useState(0);
  const [recent, setRecent] = useState<(ChatMsg & { k: number })[]>([]);
  const seen = useRef(0);
  const last = useRef(0);

  useEffect(() => {
    if (messages.length === seen.current) return;
    const fresh = messages.slice(seen.current);
    seen.current = messages.length;
    const tagged = fresh.map((m, i) => ({ ...m, k: seen.current * 100 + i }));
    const t1 = setTimeout(() => {
      setRecent((r) => [...r.slice(-3), ...tagged].slice(-4));
      if (!open) setUnread((u) => u + fresh.filter((m) => m.name !== "Você").length);
    }, 0);
    const t2 = setTimeout(() => setRecent((r) => r.filter((x) => !tagged.some((n) => n.k === x.k))), 9000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [messages, open]);

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
    <>
      <div className="vh-chat-feed" aria-live="polite">
        {recent.map((m) => (
          <p key={m.k} className="vh-chat-line">
            <b>{m.name}:</b> {m.text}
          </p>
        ))}
      </div>
      <div className="vh-chat-box">
        <button
          type="button"
          className="vh-iconbtn !h-9 !w-9 !text-base"
          aria-label={open ? "Fechar o chat" : "Abrir o chat"}
          onClick={() => {
            setOpen((o) => !o);
            setUnread(0);
          }}
        >
          💬
          {unread > 0 && !open ? <i className="vh-chat-badge">{unread > 9 ? "9+" : unread}</i> : null}
        </button>
        {open ? (
          <form onSubmit={submit} className="vh-chat-form">
            <input value={text} onChange={(e) => setText(e.target.value)} maxLength={120} placeholder="Diga algo…" aria-label="Mensagem" autoComplete="off" />
            <button type="submit" aria-label="Enviar">
              ➤
            </button>
          </form>
        ) : null}
      </div>
    </>
  );
}
