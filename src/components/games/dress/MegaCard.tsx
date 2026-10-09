"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MEGA_MULTIPLIER, PLACE_TICKETS } from "@/lib/games/dress/economy";
import { enterImmersive } from "@/lib/games/dress/immersive";
import { createClient } from "@/lib/supabase/client";

type Info = { event_at: string; enter_from: string; enter_until: string; open: boolean; players: number; joined: boolean; now: string };

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}
const two = (n: number) => String(n).padStart(2, "0");

/** Mega Desfile: toda sexta às 19h, com muito mais de 10 jogadoras. O salão de espera abre 30 minutos antes. */
export function MegaCard() {
  const router = useRouter();
  const sb = useMemo(() => createClient(), []);
  const [info, setInfo] = useState<Info | null>(null);
  const [skew, setSkew] = useState(0);
  const [now, setNow] = useState(0);
  const skewRef = useRef(0);
  useEffect(() => {
    skewRef.current = skew;
  }, [skew]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await sb.rpc("dress_mega_info");
    const i = data as Info | null;
    if (i && i.event_at) {
      setInfo(i);
      setSkew(new Date(i.now).getTime() - Date.now());
      setNow(new Date(i.now).getTime());
    }
  }, [sb]);

  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    const refresh = setInterval(() => void load(), 15000);
    const clock = setInterval(() => setNow(Date.now() + skewRef.current), 1000);
    return () => {
      clearTimeout(first);
      clearInterval(refresh);
      clearInterval(clock);
    };
  }, [load]);

  async function join() {
    if (busy) return;
    enterImmersive();
    setBusy(true);
    setError(null);
    const { data, error: e } = await sb.rpc("dress_mega_join");
    const r = (data ?? {}) as { error?: string; code?: string };
    if (e || r.error || !r.code) {
      setBusy(false);
      return setError(r.error ?? "Não foi possível entrar. Tente de novo.");
    }
    router.push(`/app/jogos/vestir/sala/${r.code}`);
  }

  async function watch() {
    if (busy) return;
    enterImmersive();
    setBusy(true);
    setError(null);
    const { data, error: e } = await sb.rpc("dress_mega_watch");
    const r = (data ?? {}) as { error?: string; code?: string };
    if (e || r.error || !r.code) {
      setBusy(false);
      return setError(r.error ?? "Não foi possível entrar na plateia. Tente de novo.");
    }
    router.push(`/app/jogos/vestir/sala/${r.code}?assistir=1`);
  }

  if (!info || now === 0) return null;
  const ev = new Date(info.event_at).getTime();
  const opens = new Date(info.enter_from).getTime();
  const until = new Date(info.enter_until).getTime();
  const isOpen = now >= opens && now <= until;
  const left = parts(ev - now);
  const when = new Date(ev).toLocaleString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

  return (
    <section className="vh-panel vh-mega mb-5">
      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-200">Toda sexta · 19h</p>
      <h2 className="vh-title text-3xl">🎆 Mega Desfile</h2>
      <p className="mt-1 text-sm text-purple-100">Todas as jogadoras no mesmo desfile, com muito mais de 10 modelos! Prêmios em dobro para o pódio:</p>
      <p className="mt-2 text-center text-sm font-black text-amber-100">
        🥇 {PLACE_TICKETS[0] * MEGA_MULTIPLIER} · 🥈 {PLACE_TICKETS[1] * MEGA_MULTIPLIER} · 🥉 {PLACE_TICKETS[2] * MEGA_MULTIPLIER} 🎫
      </p>
      {isOpen ? (
        <>
          <p className="mt-3 text-center text-sm font-bold text-emerald-300">
            {now < ev ? `O salão de espera está aberto! Começa em ${two(left.m)}:${two(left.s)}` : "O desfile já começou — entre para assistir e votar!"}
            {info.players > 0 ? ` · ${info.players} na sala` : ""}
          </p>
          <button type="button" className="vh-btn mt-3" disabled={busy} onClick={() => void join()}>
            🎆 Entrar no Mega Desfile
          </button>
          <button type="button" className="vh-btn vh-btn-dark mt-2" disabled={busy} onClick={() => void watch()}>
            👀 Só assistir
          </button>
        </>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-4 gap-2 text-center" aria-label="Contagem para o próximo Mega Desfile">
            {(
              [
                ["dias", left.d],
                ["horas", left.h],
                ["min", left.m],
                ["seg", left.s],
              ] as const
            ).map(([l, v]) => (
              <div key={l} className="rounded-xl border-2 border-amber-300/70 bg-black/25 py-1.5">
                <p className="vh-title text-2xl tabular-nums">{two(v)}</p>
                <p className="text-[9px] font-black uppercase tracking-wide text-amber-200">{l}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-center text-[11px] font-bold text-purple-200">Próximo: {when}. O salão de espera abre 30 minutos antes.</p>
        </>
      )}
      {error ? (
        <p className="mt-2 rounded-xl bg-rose-900/80 px-3 py-2 text-sm font-bold text-rose-100" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
