"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BIBLE_BOOKS } from "@/lib/bible/books";
import { pingBibleReading, type ReadingPing } from "@/lib/actions/bibleReading";

// Timer no topo da Bíblia: 5 min de leitura no dia dão +1 XP e, para o cria, liberam a Sala de Jogos.
// Só conta com a aba visível e com algum toque/rolagem nos últimos 90 s; o tempo que vale é o do servidor.

const IDLE_MS = 90_000;
const PING_MS = 15_000;

/** "/app/biblia/JHN/3" -> "João 3" (para o admin ver o que a pessoa está lendo). */
function refFromPath(path: string): string | undefined {
  const m = path.match(/^\/app\/biblia\/([A-Za-z0-9]{3})(?:\/(\d+))?/);
  if (!m) return undefined;
  const b = BIBLE_BOOKS.find((x) => x.id === m[1].toUpperCase());
  return b ? (m[2] ? `${b.name} ${m[2]}` : b.name) : undefined;
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function ReadingTimer({ initialSeconds, required, role }: { initialSeconds: number; required: number; role: "cria" | "leader" }) {
  const [secs, setSecs] = useState(initialSeconds);
  const [done, setDone] = useState(initialSeconds >= required);
  const [justEarned, setJustEarned] = useState(false);
  const [active, setActive] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const last = useRef(0);
  const busy = useRef(false);
  const doneRef = useRef(done);
  const confirmingRef = useRef(false);
  const pathname = usePathname();
  const refRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    refRef.current = refFromPath(pathname);
  }, [pathname]);

  useEffect(() => {
    doneRef.current = done;
  }, [done]);
  useEffect(() => {
    confirmingRef.current = confirming;
  }, [confirming]);

  useEffect(() => {
    if (initialSeconds >= required) return;
    last.current = Date.now();
    const touch = () => {
      last.current = Date.now();
    };
    const evs = ["pointerdown", "keydown", "scroll", "touchstart", "wheel", "mousemove"] as const;
    for (const e of evs) addEventListener(e, touch, { passive: true });
    const recentlyActive = () => Date.now() - last.current < IDLE_MS;
    const isActive = () => document.visibilityState === "visible" && recentlyActive();

    const apply = (r: ReadingPing) => {
      if (!r) return;
      setSecs(Math.min(required, r.seconds));
      if (r.unlocked) {
        setDone(true);
        setConfirming(false);
        if (r.xp > 0) setJustEarned(true);
      }
    };
    // resume: acabou de entrar/voltar (sem crédito pelo tempo fora); force: último aviso antes de sair
    const ping = async (resume = false, force = false) => {
      if ((busy.current && !force) || doneRef.current) return;
      busy.current = true;
      try {
        apply(await pingBibleReading(resume, refRef.current));
      } catch {
        // sem rede: tenta no próximo ciclo
      } finally {
        busy.current = false;
      }
    };

    void ping(true); // abre a contagem assim que a pessoa entra na Bíblia
    const tick = setInterval(() => {
      const a = isActive();
      setActive(a);
      if (a && !doneRef.current) {
        setSecs((s) => {
          const n = Math.min(required, s + 1);
          if (n >= required) setConfirming(true);
          return n;
        });
      }
    }, 1000);
    // a cada 15 s confirma com o servidor; no relógio cheio, insiste a cada 4 s até ele confirmar
    const net = setInterval(() => {
      if (isActive() || confirmingRef.current) void ping();
    }, PING_MS);
    const fast = setInterval(() => {
      if (confirmingRef.current) void ping();
    }, 4000);
    // saiu da aba: credita os últimos segundos lidos e pausa; voltou: retoma de onde parou
    const flush = () => {
      if (recentlyActive() && !doneRef.current) void ping(false, true);
    };
    const vis = () => {
      if (document.visibilityState === "visible") {
        last.current = Date.now();
        void ping(true);
      } else flush();
    };
    document.addEventListener("visibilitychange", vis);
    addEventListener("pagehide", flush);
    return () => {
      flush(); // saiu da tela da Bíblia (a barra some e a contagem para; ao voltar continua do que o servidor guardou)
      removeEventListener("pagehide", flush);
      for (const e of evs) removeEventListener(e, touch);
      clearInterval(tick);
      clearInterval(net);
      clearInterval(fast);
      document.removeEventListener("visibilitychange", vis);
    };
  }, [initialSeconds, required]);

  const left = Math.max(0, required - secs);
  const pct = Math.min(100, Math.round((secs / required) * 100));

  if (done) {
    return (
      <div className="sticky top-2 z-30 mb-4 flex items-center justify-between gap-3 rounded-2xl border border-emerald-400 bg-emerald-50 px-4 py-3 text-emerald-900 shadow-md">
        <p className="text-sm font-black">
          {justEarned ? "✅ Leitura do dia completa: +1 XP!" : "✅ Leitura do dia completa"}
          {role === "cria" ? " 🎮 Sala de Jogos liberada." : ""}
        </p>
        {role === "cria" ? (
          <Link href="/app/jogos" className="btn btn-primary !px-3 !py-1.5 text-sm">
            Ir jogar
          </Link>
        ) : null}
      </div>
    );
  }

  const goal = role === "cria" ? "para liberar os jogos e ganhar +1 XP" : "para ganhar +1 XP hoje";

  return (
    <div className="sticky top-2 z-30 mb-4 rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-3 text-[var(--ink)] shadow-md" role="status" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 text-sm font-black">📖 {confirming ? "Confirmando sua leitura…" : active ? `Leia a Bíblia ${goal}` : "Contagem pausada: role a tela ou toque para continuar"}</p>
        <p className="shrink-0 text-lg font-black tabular-nums">{mmss(left)}</p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--accent-soft)]">
        <div className="h-full rounded-full bg-[var(--accent)] transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
