"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const KEY = "elos_bible_card_v1";

/** Aviso no topo do Início: a Bíblia (NVI) chegou ao app. Some quando a pessoa dispensa (lembrado só neste aparelho). */
export function BibleAnnouncementCard({ role }: { role: string }) {
  // começa escondido pra não piscar no servidor; aparece depois de conferir o localStorage
  const [show, setShow] = useState(false);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(KEY) === "1";
    } catch {
      /* sem armazenamento: mostra sempre */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!dismissed) setShow(true);
  }, []);

  if (!show) return null;

  function dismiss() {
    setShow(false);
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignora */
    }
  }

  const cria = role === "cria";

  return (
    <div className="relative mb-5 overflow-hidden rounded-3xl p-[2px]" style={{ background: "linear-gradient(45deg, #f6d365, #fda085, #f5576c, #b24592, #4f5bd5)" }}>
      <div className="relative rounded-[22px] bg-[var(--card)] px-5 py-4">
        <button type="button" onClick={dismiss} aria-label="Fechar aviso" className="absolute right-3 top-3 rounded-full px-2 py-0.5 text-lg leading-none text-[var(--muted)]">
          ✕
        </button>

        <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Novidade</p>
        <p className="mt-1 text-3xl" aria-hidden>
          📖
        </p>
        <p className="mt-1 text-lg font-bold leading-snug">A Bíblia chegou ao ELOS!</p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Leia a Nova Versão Internacional completa, do Gênesis ao Apocalipse, direto no app.{" "}
          {cria ? "Leia 5 minutos por dia: você ganha +1 XP e libera a Sala de Jogos." : "Leia 5 minutos por dia e ganhe +1 XP."}
        </p>
        <Link href="/app/biblia" className="btn btn-primary mt-3 inline-block !py-2 !text-sm">
          Abrir a Bíblia
        </Link>
      </div>
    </div>
  );
}
