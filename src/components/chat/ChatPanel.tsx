"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/Avatar";
import { formatDateTime } from "@/lib/types";
import type { ChatMessage } from "@/lib/types";
import { sendChatMessage } from "@/lib/actions/chat";

type Participant = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
};

const initialState: { error?: string; ok?: boolean } = {};

export function ChatPanel({
  eloId,
  eloName,
  currentUserId,
  participants,
  initialMessages,
  readOnly = false,
}: {
  eloId: string;
  eloName: string;
  currentUserId: string | null;
  participants: Participant[];
  initialMessages: ChatMessage[];
  readOnly?: boolean;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [state, formAction, pending] = useActionState(sendChatMessage, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const people = useMemo(() => {
    const map = new Map<string, Participant>();
    participants.forEach((p) => map.set(p.id, p));
    return map;
  }, [participants]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`chat-${eloId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `elo_id=eq.${eloId}` },
        (payload) => {
          const row = payload.new as ChatMessage;
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eloId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <div className="card flex h-[70vh] flex-col overflow-hidden p-0">
      <div className="border-b border-[var(--line)] px-4 py-3">
        <p className="font-bold">{eloName}</p>
        <p className="text-xs text-[var(--muted)]">
          {readOnly ? "Monitoramento — somente leitura" : "Chat do Elo"}
        </p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--muted)]">
            Nenhuma mensagem ainda. Comece a conversa!
          </p>
        ) : (
          messages.map((m) => {
            const sender = people.get(m.sender_id);
            const mine = m.sender_id === currentUserId;
            return (
              <div key={m.id} className={`flex gap-2 ${mine ? "flex-row-reverse text-right" : ""}`}>
                <Avatar url={sender?.avatar_url} name={sender?.full_name} size={28} />
                <div className={`max-w-[75%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                  <p className="text-xs text-[var(--muted)]">
                    {sender?.full_name ?? "Alguém"} · {formatDateTime(m.created_at)}
                  </p>
                  <p
                    className={`mt-1 rounded-2xl px-3 py-2 text-sm ${
                      mine
                        ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                        : "bg-[var(--line)] text-[var(--ink)]"
                    }`}
                  >
                    {m.body}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {!readOnly ? (
        <form ref={formRef} action={formAction} className="border-t border-[var(--line)] p-3">
          {state.error ? <p className="mb-2 text-xs text-red-600">{state.error}</p> : null}
          <div className="flex gap-2">
            <input
              name="body"
              maxLength={2000}
              placeholder="Escreva uma mensagem…"
              autoComplete="off"
              required
              className="flex-1 rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
            <button type="submit" disabled={pending} className="btn">
              Enviar
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
