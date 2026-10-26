"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { claimComeback, seenComeback } from "@/lib/actions/comeback";

export type ComebackOffer = { id: string; title: string; body: string; cta_label: string | null; cta_href: string | null; reward_xp: number };

/** Cartão de boas-vindas de quem ficou um tempo sem abrir o app: presente de XP + atalho para o que a pessoa mais gosta. */
export function ComebackModal({ offer }: { offer: ComebackOffer }) {
  const router = useRouter();
  const [hidden, setHidden] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    void seenComeback(offer.id).catch(() => null);
  }, [offer.id]);

  if (hidden) return null;

  const take = (go: boolean) =>
    start(async () => {
      await claimComeback(offer.id).catch(() => null);
      setHidden(true);
      if (go && offer.cta_href) router.push(offer.cta_href);
      else router.refresh();
    });

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="comeback-title">
      <div className="card max-h-[90vh] w-full max-w-sm space-y-3 overflow-y-auto p-5 text-center">
        <p className="text-5xl" aria-hidden>
          🎁
        </p>
        <p id="comeback-title" className="text-xl font-extrabold">
          {offer.title}
        </p>
        <p className="whitespace-pre-line text-sm">{offer.body}</p>
        {offer.reward_xp > 0 ? <p className="mx-auto w-fit rounded-full bg-[var(--accent-soft)] px-4 py-1.5 text-base font-black text-[var(--accent-strong)]">+{offer.reward_xp} XP de presente</p> : null}
        {offer.cta_href ? (
          <button type="button" className="btn btn-primary w-full !py-2.5" onClick={() => take(true)} disabled={pending}>
            {offer.reward_xp > 0 ? `Resgatar e ${offer.cta_label ? offer.cta_label.charAt(0).toLowerCase() + offer.cta_label.slice(1) : "continuar"}` : (offer.cta_label ?? "Continuar")}
          </button>
        ) : null}
        <button type="button" className="btn btn-ghost w-full !py-2" onClick={() => take(false)} disabled={pending}>
          {offer.reward_xp > 0 ? "Só resgatar" : "Fechar"}
        </button>
      </div>
    </div>
  );
}
