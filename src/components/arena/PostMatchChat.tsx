"use client";

// Chat temporário de fim de partida: só existe enquanto a tela de resultado estiver aberta.
// Nada é guardado (nem no banco): as mensagens viajam por um canal de transmissão do Realtime
// e somem quando a pessoa sai. Texto livre curto + frases prontas.
import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type Msg = { key: string; mine: boolean; from: string; text: string };

const QUICK = ["Boa partida!", "Parabéns!", "Foi por pouco!", "Revanche?", "Obrigado!", "Deus abençoe!"];
const MAX_LEN = 80;
const SEND_GAP_MS = 900;
const KEEP = 40;

// filtro bem simples para uma plataforma de jovens: troca o palavrão por asteriscos
const BAD = ["porra", "caralho", "merda", "puta", "fdp", "foda", "buceta", "cu", "arrombado", "viado", "idiota", "burro", "otario", "otário", "lixo", "vsf", "pqp"];
function clean(text: string): string {
  let out = text.replace(/\s+/g, " ").trim().slice(0, MAX_LEN);
  for (const w of BAD) {
    const re = new RegExp(`(^|[^\\p{L}])${w}(?![\\p{L}])`, "giu");
    out = out.replace(re, (_m, p1: string) => `${p1}${"*".repeat(w.length)}`);
  }
  return out;
}

export function PostMatchChat({ room, myId, myName, fallbackName = "Colega", lead }: { room: string; myId: string; myName?: string; fallbackName?: string; lead?: string }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [unread, setUnread] = useState(0);
  const [text, setText] = useState("");
  const chRef = useRef<RealtimeChannel | null>(null);
  const lastSend = useRef(0);
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);
  const listRef = useRef<HTMLDivElement>(null);
  const seq = useRef(0);

  useEffect(() => {
    const supabase = createClient();
    const ch = supabase.channel(`arena-post:${room}`, { config: { broadcast: { self: false } } });
    ch.on("broadcast", { event: "msg" }, ({ payload }) => {
      const p = payload as { id?: string; n?: string; t?: string };
      if (!p || typeof p.t !== "string" || p.id === myId) return;
      const m: Msg = { key: `r${seq.current++}`, mine: false, from: String(p.n || fallbackName).slice(0, 24), text: clean(p.t) };
      if (!m.text) return;
      setMsgs((a) => [...a, m].slice(-KEEP));
      if (!openRef.current) setUnread((u) => u + 1);
    });
    ch.subscribe();
    chRef.current = ch;
    return () => {
      void supabase.removeChannel(ch);
      chRef.current = null;
    };
  }, [room, myId, fallbackName]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, open]);

  const send = useCallback(
    (raw: string) => {
      const t = clean(raw);
      const now = Date.now();
      if (!t || now - lastSend.current < SEND_GAP_MS) return;
      lastSend.current = now;
      void chRef.current?.send({ type: "broadcast", event: "msg", payload: { id: myId, n: myName ?? "", t } });
      setMsgs((a) => [...a, { key: `m${seq.current++}`, mine: true, from: "Você", text: t }].slice(-KEEP));
      setText("");
    },
    [myId, myName],
  );

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setUnread(0);
        }}
        aria-expanded={open}
        className="relative mx-auto flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-black text-white ring-1 ring-white/30 active:scale-95"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
          <path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
        </svg>
        {open ? "Fechar chat" : lead ?? "Chat da partida"}
        {unread > 0 && !open ? <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-black text-white">{unread}</span> : null}
      </button>

      {open ? (
        <div className="mx-auto mt-2 max-w-sm rounded-2xl bg-black/35 p-2.5 text-left ring-1 ring-white/20">
          <div ref={listRef} className="flex max-h-44 min-h-16 flex-col gap-1.5 overflow-y-auto pr-1" aria-live="polite">
            {msgs.length === 0 ? <p className="my-auto text-center text-xs font-semibold text-white/70">Diga alguma coisa! Este chat some quando você sair da tela.</p> : null}
            {msgs.map((m) => (
              <div key={m.key} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-1.5 text-sm font-semibold ${m.mine ? "rounded-br-sm bg-sky-500 text-white" : "rounded-bl-sm bg-white text-slate-900"}`}>
                  {!m.mine ? <span className="block text-[10px] font-black uppercase tracking-wide text-rose-600">{m.from}</span> : null}
                  {m.text}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {QUICK.map((q) => (
              <button key={q} type="button" onClick={() => send(q)} className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold text-white ring-1 ring-white/25 active:scale-95">
                {q}
              </button>
            ))}
          </div>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send(text);
            }}
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
              maxLength={MAX_LEN}
              placeholder="Escreva uma mensagem…"
              aria-label="Mensagem do chat"
              className="min-w-0 flex-1 rounded-full bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
            />
            <button type="submit" disabled={!text.trim()} className="rounded-full bg-amber-400 px-4 py-2 text-sm font-black text-amber-950 disabled:opacity-50">
              Enviar
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
