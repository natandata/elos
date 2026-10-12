"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ElogramWordmark } from "./ElogramWordmark";

const KEY = "elos_elogram_card_v1";

/** Aviso no topo do Início: o Explorar virou Elogram. Some quando a pessoa dispensa (lembrado só neste aparelho). */
export function ElogramAnnouncementCard() {
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

  return (
    <div
      className="relative mb-5 overflow-hidden rounded-3xl p-[2px]"
      style={{ background: "linear-gradient(45deg, #feda75, #fa7e1e, #d62976, #962fbf, #4f5bd5)" }}
    >
      <div className="relative rounded-[22px] bg-[var(--card)] px-5 py-4">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Fechar aviso"
          className="absolute right-3 top-3 rounded-full px-2 py-0.5 text-lg leading-none text-[var(--muted)]"
        >
          ✕
        </button>

        <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Novidade</p>
        <div className="mt-1">
          <ElogramWordmark className="!text-[34px]" />
        </div>
        <p className="mt-1 text-lg font-bold leading-snug">Explorar agora é Elogram!</p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Stories com foto e vídeo, mensagens diretas e um feed igual ao que você já conhece.
        </p>
        <Link href="/app/elogram" className="btn btn-primary mt-3 inline-block !py-2 !text-sm">
          Conhecer o Elogram
        </Link>
      </div>
    </div>
  );
}
