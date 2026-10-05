"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { challengeRankDuel } from "@/lib/actions/arenaPvp";

/** Duelo de posição do Top 3: quem está embaixo desafia o vizinho de cima. */
export function RankDuelCard({ myPos, target }: { myPos: number; target: { id: string; name: string; pos: number; trophies: number } | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    if (!target || busy) return;
    setBusy(true);
    setError(null);
    const r = await challengeRankDuel(target.id).catch(() => ({ error: "Sem conexão. Tente de novo." }) as { error?: string; id?: string });
    setBusy(false);
    if (r.error || !r.id) return setError(r.error ?? "Não foi possível desafiar.");
    router.push(`/app/jogos/arena/pvp/${r.id}`);
  }

  return (
    <section className="mb-6 rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-100 p-4 text-amber-950">
      <h2 className="text-lg font-black">👑 Duelo de posição · Top 3</h2>
      <p className="mt-1 text-sm font-semibold">
        Você está em <b>{myPos}º</b> no ranking de troféus.
      </p>
      {target ? (
        <>
          <p className="mt-1 text-sm">
            Desafie o <b>{target.pos}º</b> ({target.name}, {target.trophies} 🏆). Se você <b>vencer</b>, vocês trocam de lugar e de troféus. Se <b>perder</b>, você troca de lugar e de troféus com quem está logo abaixo de você.
          </p>
          <button type="button" disabled={busy} onClick={go} className="btn btn-primary mt-3 w-full !py-3">
            {busy ? "..." : `⚔️ Desafiar o ${target.pos}º lugar`}
          </button>
          <p className="mt-2 text-xs opacity-80">Um duelo de posição por dia · partida em tempo real, cartas no nível 1 · só vale se durar pelo menos 75 segundos.</p>
        </>
      ) : (
        <p className="mt-1 text-sm">Você é o 1º lugar: o 2º colocado pode te desafiar pela sua posição. Defenda o trono! 🏰</p>
      )}
      {error ? <p className="mt-2 text-sm font-semibold text-rose-700">{error}</p> : null}
    </section>
  );
}
