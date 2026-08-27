"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/Avatar";
import { formatDateTime } from "@/lib/types";
import type { ChatMessage } from "@/lib/types";
import { markChatRead, sendChatMessage } from "@/lib/actions/chat";

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
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
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

  // Quem do Elo está online agora: mesma janela de 60s usada na tela de
  // Usuários do admin, consultando a cada 20s (ritmo do heartbeat).
  useEffect(() => {
    if (participants.length === 0) return;
    const supabase = createClient();
    let cancelled = false;

    async function checkOnline() {
      const { data } = await supabase
        .from("user_presence")
        .select("user_id, last_seen_at")
        .in(
          "user_id",
          participants.map((p) => p.id),
        );
      if (cancelled || !data) return;
      const cutoff = Date.now() - 60_000;
      setOnlineIds(
        new Set(
          data
            .filter((r) => new Date(r.last_seen_at).getTime() > cutoff)
            .map((r) => r.user_id),
        ),
      );
    }

    checkOnline();
    const id = setInterval(checkOnline, 20_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eloId]);

  // com o chat aberto (inclusive ao chegar mensagem nova via realtime), zera o badge do menu
  useEffect(() => {
    if (!readOnly) markChatRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly, messages.length]);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  const onlineNames = participants
    .filter((p) => p.id !== currentUserId && onlineIds.has(p.id))
    .map((p) => p.full_name || "Sem nome");

  return (
    <div className="card flex h-[70vh] flex-col overflow-hidden p-0">
      <div className="border-b border-[var(--line)] px-4 py-3">
        <p className="font-bold">{eloName}</p>
        <p className="text-xs text-[var(--muted)]">
          {readOnly ? "Monitoramento — somente leitura" : "Chat do Elo"}
        </p>
        {!readOnly && onlineNames.length > 0 ? (
          <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
            Online agora: {onlineNames.join(", ")}
          </p>
        ) : null}
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
