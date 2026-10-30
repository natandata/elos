"use client";

import { TribeTag } from "@/components/event/TribeTag";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { deleteDmMessage, sendDm } from "@/lib/actions/dm";
import { Avatar } from "@/components/Avatar";
import { ChevronLeftIcon, PaperPlaneIcon } from "@/components/feed/icons";

export type DmMessage = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};
export type DmPerson = {
  id: string;
  name: string;
  username: string | null;
  avatar: string | null;
};

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const y = new Date(today.getTime() - 86_400_000);
  const time = d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (same(d, today)) return `Hoje ${time}`;
  if (same(d, y)) return `Ontem ${time}`;
  return `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} ${time}`;
}

/** Conversa direta no estilo do Instagram. `readOnly` = liderança lendo uma conversa de outras pessoas. */
export function DmThread({
  threadId,
  me,
  other,
  people,
  initialMessages,
  readOnly,
  canDelete,
  backHref,
}: {
  threadId: string | null;
  me: DmPerson;
  /** Com quem eu converso (quando sou participante). */
  other: DmPerson | null;
  /** Todos os participantes — usado pra rotular quem falou quando a liderança lê. */
  people: DmPerson[];
  initialMessages: DmMessage[];
  readOnly: boolean;
  canDelete: boolean;
  backHref: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [messages, setMessages] = useState<DmMessage[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  // área realmente visível: no iPhone o teclado encolhe só a "janela visual", não a página —
  // sem isso a página sobe e deixa um vazio em cima da conversa
  const [vv, setVv] = useState<{
    h: number;
    top: number;
    keyboard: boolean;
  } | null>(null);
  const nameById = new Map(people.map((p) => [p.id, p.username || p.name]));

  const markRead = useCallback(() => {
    if (threadId && !readOnly)
      supabase.rpc("dm_mark_read", { p_thread: threadId }).then(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, readOnly]);

  const refresh = useCallback(async () => {
    if (!threadId) return;
    const { data } = await supabase
      .from("dm_messages")
      .select("id, sender_id, body, created_at")
      .eq("thread_id", threadId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(300);
    if (data) setMessages(data as DmMessage[]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  useEffect(() => {
    markRead();
  }, [markRead]);

  // mensagens novas chegam na hora (Realtime); uma releitura a cada 12 s cobre qualquer falha de conexão
  useEffect(() => {
    if (!threadId) return;
    const channel = supabase
      .channel(`dm:${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dm_messages",
          filter: `thread_id=eq.${threadId}`,
        },
        () => {
          refresh();
          markRead();
        },
      )
      .subscribe();
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 12_000);
    return () => {
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  useEffect(() => {
    const v = window.visualViewport;
    if (!v) return;
    const update = () => {
      setVv({
        h: v.height,
        top: v.offsetTop,
        keyboard: window.innerHeight - v.height > 120,
      });
      if (window.scrollY !== 0) window.scrollTo(0, 0);
    };
    update();
    v.addEventListener("resize", update);
    v.addEventListener("scroll", update);
    // a página por trás não rola enquanto a conversa está aberta
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      v.removeEventListener("resize", update);
      v.removeEventListener("scroll", update);
      document.documentElement.style.overflow = prevOverflow;
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, vv?.h]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending || !other) return;
    setSending(true);
    setError(null);
    const r = await sendDm(other.id, body).catch(
      () =>
        ({ error: "Sem conexão. Tente de novo." }) as {
          error?: string;
          threadId?: string;
        },
    );
    setSending(false);
    if (r.error) return setError(r.error);
    setText("");
    if (!threadId && r.threadId) {
      router.replace(`/app/elogram/mensagens/${r.threadId}`);
      return;
    }
    await refresh();
  }

  async function remove(id: string) {
    const r = await deleteDmMessage(id);
    if (r.error) return setError(r.error);
    setMessages((cur) => cur.filter((m) => m.id !== id));
  }

  const headerPerson = other ?? people.find((p) => p.id !== me.id) ?? me;

  return (
    <div
      className="fixed inset-x-0 z-40 flex flex-col bg-[var(--bg)]"
      style={{ top: vv?.top ?? 0, height: vv ? vv.h : "100dvh" }}
    >
      <div className="mx-auto flex h-full w-full max-w-[470px] flex-col">
        <header className="flex items-center gap-3 border-b border-[var(--line)] px-3 py-2.5">
          <Link
            href={backHref}
            aria-label="Voltar"
            className="-ml-1 rounded-lg p-1 text-[var(--muted)]"
          >
            <ChevronLeftIcon />
          </Link>
          {readOnly && people.length === 2 ? (
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold">
                {people[0].username || people[0].name} ↔{" "}
                {people[1].username || people[1].name}
              </p>
              <p className="text-xs text-[var(--muted)]">
                Leitura da liderança
              </p>
            </div>
          ) : (
            <Link
              href={`/app/elogram/perfil/${headerPerson.id}`}
              className="flex min-w-0 items-center gap-3"
            >
              <Avatar
                url={headerPerson.avatar}
                name={headerPerson.name}
                size={36}
              />
              <div className="min-w-0 leading-tight">
                <p className="truncate text-[15px] font-semibold">
                  {headerPerson.username || headerPerson.name} <TribeTag userId={headerPerson.id} size="xs" />
                </p>
                {headerPerson.username ? (
                  <p className="truncate text-xs text-[var(--muted)]">
                    {headerPerson.name}
                  </p>
                ) : null}
              </div>
            </Link>
          )}
        </header>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          <p className="mx-auto mb-3 max-w-[300px] text-center text-[11px] leading-snug text-[var(--muted)]">
            A liderança do ELOS pode ver as conversas do Elogram.
          </p>

          {messages.length === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--muted)]">
              Comece a conversa com uma mensagem.
            </p>
          ) : null}

          {messages.map((m, i) => {
            const mine = !readOnly && m.sender_id === me.id;
            const prev = messages[i - 1];
            const showTime =
              !prev ||
              new Date(m.created_at).getTime() -
                new Date(prev.created_at).getTime() >
                3 * 3_600_000;
            return (
              <div key={m.id}>
                {showTime ? (
                  <p
                    className="my-3 text-center text-[11px] text-[var(--muted)]"
                    suppressHydrationWarning
                  >
                    {dayLabel(m.created_at)}
                  </p>
                ) : null}
                <div
                  className={`group mb-1 flex items-end gap-1.5 ${mine ? "justify-end" : "justify-start"}`}
                >
                  {canDelete ? (
                    <button
                      type="button"
                      onClick={() => remove(m.id)}
                      className={`text-[11px] text-[var(--muted)] opacity-60 transition hover:text-red-500 ${mine ? "order-first" : "order-last"}`}
                    >
                      apagar
                    </button>
                  ) : null}
                  <div className="max-w-[78%]">
                    {readOnly ? (
                      <p className="mb-0.5 px-1 text-[11px] text-[var(--muted)]">
                        {nameById.get(m.sender_id) ?? "Alguém"}
                      </p>
                    ) : null}
                    <p
                      className={`whitespace-pre-wrap break-words rounded-3xl px-3.5 py-2 text-[15px] leading-snug ${
                        mine
                          ? "bg-[#4f5bd5] text-white"
                          : "bg-[var(--card)] ring-1 ring-[var(--line)]"
                      }`}
                    >
                      {m.body}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        {readOnly ? (
          <p className="border-t border-[var(--line)] px-4 py-3 text-center text-xs text-[var(--muted)]">
            Você está só lendo esta conversa.
          </p>
        ) : (
          <form
            onSubmit={submit}
            className="flex items-center gap-2 border-t border-[var(--line)] px-3 py-2.5"
            style={{
              paddingBottom: vv?.keyboard
                ? "10px"
                : "calc(10px + env(safe-area-inset-bottom))",
            }}
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={1000}
              placeholder="Mensagem..."
              autoComplete="off"
              className="min-w-0 flex-1 rounded-full bg-[var(--card)] px-4 py-2.5 text-[15px] outline-none ring-1 ring-[var(--line)] placeholder:text-[var(--muted)] focus:ring-[var(--accent)]"
            />
            <button
              type="submit"
              disabled={!text.trim() || sending}
              aria-label="Enviar"
              className="rounded-full p-2 text-[#4f5bd5] disabled:opacity-40"
            >
              <PaperPlaneIcon size={26} />
            </button>
          </form>
        )}
        {error ? (
          <p className="px-4 pb-2 text-center text-xs font-semibold text-rose-500">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
