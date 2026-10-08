"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RunwayWalk } from "./RunwayWalk";
import { StarPicker } from "./Stars";
import { rateRunwayLook } from "@/lib/actions/runway";
import { baseFromBeauty, cleanBeauty } from "@/lib/games/dress/beauty";
import type { Look } from "@/lib/games/dress/items";

export type ShowLook = { id: string; name: string; elo: string | null; theme: string; day: string; items: Look; beauty: unknown };

/** O desfile: um look por vez andando na passarela e a nota de 1 a 5 estrelas, como as colegas do Dress to Impress avaliam. */
export function RunwayShow({ looks: initial }: { looks: ShowLook[] }) {
  const router = useRouter();
  // a fila fica fixa durante o desfile (a página só atualiza no fim, pra não pular looks)
  const [looks] = useState(initial);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rated, setRated] = useState(0);

  if (looks.length === 0) return <p className="vh-panel text-center text-sm text-purple-100">Nenhum look novo para avaliar agora. Volte mais tarde!</p>;
  if (idx >= looks.length)
    return (
      <div className="vh-panel vh-pop text-center">
        <p className="text-4xl" aria-hidden>
          🎉
        </p>
        <p className="vh-title mt-1 text-2xl">Desfile encerrado!</p>
        <p className="mt-1 text-sm text-purple-100">Você avaliou {rated} look{rated === 1 ? "" : "s"} e ganha 1 🎫 por nota (até 5) quando o dia fechar.</p>
      </div>
    );

  const l = looks[idx];

  async function rate(n: number) {
    if (busy) return;
    setPicked(n);
    setBusy(true);
    setError(null);
    const r = await rateRunwayLook(l.id, n).catch(() => ({ error: "Sem conexão. Tente de novo." }) as { error?: string });
    if (r.error && !r.error.startsWith("Você já avaliou")) {
      setBusy(false);
      setPicked(0);
      return setError(r.error);
    }
    setRated((c) => c + 1);
    setTimeout(() => {
      setIdx((i) => i + 1);
      setPicked(0);
      setBusy(false);
      if (idx + 1 >= looks.length) router.refresh();
    }, 750);
  }

  return (
    <div>
      <p className="mb-2 text-center text-xs font-black uppercase tracking-wide text-amber-200">
        Look {idx + 1} de {looks.length} · tema {l.theme} ({l.day})
      </p>
      <RunwayWalk key={l.id} base={baseFromBeauty(cleanBeauty(l.beauty))} look={l.items} name={l.name}>
        <div className="absolute inset-x-0 bottom-0 z-[4] bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-8 text-center">
          <p className="truncate text-base font-black text-amber-100 [text-shadow:0_2px_4px_#000]">{l.name}</p>
          {l.elo ? <p className="truncate text-[11px] font-bold text-purple-200">{l.elo}</p> : null}
        </div>
      </RunwayWalk>
      <div className="vh-panel mx-auto mt-3 max-w-[400px] text-center">
        <p className="vh-h2 mb-1">Dê a sua nota</p>
        <StarPicker value={picked} onPick={rate} disabled={busy} />
        <p className="mt-1 text-[11px] text-purple-200">{picked ? "Nota enviada! ✨" : "Toque numa estrela. Não dá pra trocar depois."}</p>
        {error ? <p className="mt-2 rounded-xl bg-rose-900/70 px-3 py-2 text-sm font-bold text-rose-100">{error}</p> : null}
      </div>
    </div>
  );
}
