"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/Avatar";
import { formatDateTime } from "@/lib/types";
import type { HelpChatMessage } from "@/lib/types";
import { deleteHelpMessage, sendHelpMessage } from "@/lib/actions/helpChat";

type Participant = { id: string; full_name: string | null; avatar_url: string | null };

const initialState: { error?: string; ok?: boolean } = {};

function DeleteButton({ id, criaId }: { id: string; criaId: string }) {
  const [state, action] = useActionState(deleteHelpMessage, null);
  return (
    <form action={action} className="inline">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="cria_id" value={criaId} />
      <button
        type="submit"
        title="Excluir mensagem"
        className="text-xs text-red-500 opacity-60 hover:opacity-100"
      >
        🗑
      </button>
      {state?.error ? <p className="text-xs text-red-600">{state.error}</p> : null}
    </form>
  );
}

export function HelpChatPanel({
  criaId,
  headerTitle,
  headerSubtitle,
  currentUserId,
  participants,
  initialMessages,
  readOnly = false,
  canDelete = false,
}: {
  criaId: string;
  headerTitle: string;
  headerSubtitle: string;
  currentUserId: string | null;
  participants: Participant[];
  initialMessages: HelpChatMessage[];
  readOnly?: boolean;
  canDelete?: boolean;
}) {
  const [messages, setMessages] = useState<HelpChatMessage[]>(initialMessages);
  const [state, formAction, pending] = useActionState(sendHelpMessage, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const people = new Map(participants.map((p) => [p.id, p]));

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`help-chat-${criaId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "help_chat_messages", filter: `cria_id=eq.${criaId}` },
        (payload) => {
          const row = payload.new as HelpChatMessage;
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "help_chat_messages" },
        (payload) => {
          const row = payload.old as { id: string };
          setMessages((prev) => prev.filter((m) => m.id !== row.id));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [criaId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <div className="card flex h-[70vh] flex-col overflow-hidden p-0">
      <div className="border-b border-[var(--line)] px-4 py-3">
        <p className="font-bold">{headerTitle}</p>
        <p className="text-xs text-[var(--muted)]">{headerSubtitle}</p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--muted)]">
            Nenhuma mensagem ainda. {readOnly ? "" : "Escreva o que está acontecendo."}
          </p>
        ) : (
          messages.map((m) => {
            const sender = people.get(m.sender_id);
            const mine = m.sender_id === currentUserId;
            return (
              <div key={m.id} className={`flex gap-2 ${mine ? "flex-row-reverse text-right" : ""}`}>
                <Avatar url={sender?.avatar_url} name={sender?.full_name} size={28} />
                <div className={`max-w-[75%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                  <p className="flex items-center gap-2 text-xs text-[var(--muted)]">
                    {sender?.full_name ?? "Alguém"} · {formatDateTime(m.created_at)}
                    {canDelete ? <DeleteButton id={m.id} criaId={criaId} /> : null}
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
          <input type="hidden" name="cria_id" value={criaId} />
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
