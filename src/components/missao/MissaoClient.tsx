"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MissaoGame, ROUND_SECS, type MissaoResult } from "./MissaoGame";

// Menu e resultado da Missão Madureira (jogo oculto, só admin por enquanto).

const AVATARS = [
  { id: 0, label: "Ele", emoji: "🧑🏽" },
  { id: 1, label: "Ela", emoji: "👩🏽" },
  { id: 2, label: "Ele (2)", emoji: "🧔🏾" },
  { id: 3, label: "Ela (2)", emoji: "👩🏾‍🦱" },
];
const BEST_KEY = "missao-best";

export function MissaoClient({ name }: { name: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<"menu" | "play" | "result">("menu");
  const [avatar, setAvatar] = useState(0);
  const [result, setResult] = useState<MissaoResult | null>(null);
  const [best, setBest] = useState(0);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBest(Number(localStorage.getItem(BEST_KEY) || 0));
    } catch {
      // sem armazenamento
    }
  }, []);

  if (phase === "play")
    return (
      <MissaoGame
        avatar={avatar}
        onExit={() => setPhase("menu")}
        onEnd={(r) => {
          setResult(r);
          if (r.saved > best) {
            setBest(r.saved);
            try {
              localStorage.setItem(BEST_KEY, String(r.saved));
            } catch {
              // ok
            }
          }
          setPhase("result");
        }}
      />
    );

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#0f2747] via-[#1d4ed8] to-[#f59e0b] p-6 text-white shadow-xl">
        <p className="text-xs font-black uppercase tracking-widest text-white/80">Em construção · só admin</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">Missão Madureira</h1>
        <p className="mt-2 text-sm font-semibold text-white/90">
          Você sai da Primeira Igreja Batista de Madureira e tem {ROUND_SECS / 60} minutos para falar de Jesus com o máximo de pessoas pelas ruas do bairro: estação, viaduto, Mercadão e Parque Madureira.
        </p>
      </div>

      {phase === "result" && result ? (
        <div className="card mt-4 p-4 text-center">
          <p className="text-sm font-bold text-[var(--muted)]">Fim da missão, {name}!</p>
          <p className="mt-1 text-5xl font-black">✝️ {result.saved}</p>
          <p className="text-sm font-bold">pessoa{result.saved === 1 ? "" : "s"} evangelizada{result.saved === 1 ? "" : "s"}</p>
          <p className="mt-2 text-xs text-[var(--muted)]">
            {result.tries} conversa{result.tries === 1 ? "" : "s"} · nota média {result.avg}% · seu recorde: {best}
          </p>
          {result.refs.length ? <p className="mt-2 text-xs text-[var(--muted)]">Passagens: {[...new Set(result.refs)].join(", ")}</p> : null}
        </div>
      ) : null}

      <div className="card mt-4 p-4">
        <p className="text-sm font-black">Como funciona</p>
        <ul className="mt-2 space-y-1 text-sm">
          <li>🚶 Ande pelas ruas e chegue perto das pessoas (aparece 💬).</li>
          <li>📖 Escreva a <b>referência</b> (ex.: João 3:16) e a <b>ideia</b> com as suas palavras.</li>
          <li>✅ Com nota de 70% ou mais, a pessoa é evangelizada: +1 ponto.</li>
          <li>💡 Fale do amor de Deus, do pecado, de Jesus, da cruz, da fé e da salvação.</li>
        </ul>
      </div>

      <div className="card mt-4 p-4">
        <p className="text-sm font-black">Seu personagem</p>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {AVATARS.map((a) => (
            <button key={a.id} type="button" onClick={() => setAvatar(a.id)} className={`rounded-2xl border-2 py-3 text-center ${avatar === a.id ? "border-blue-500 bg-blue-500/10" : "border-[var(--line)]"}`}>
              <span className="block text-3xl">{a.emoji}</span>
              <span className="text-xs font-bold">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      <button type="button" onClick={() => setPhase("play")} className="btn btn-primary mt-4 w-full !py-3 text-base">
        {phase === "result" ? "Jogar de novo" : "Começar missão"}
      </button>
      <button type="button" onClick={() => router.push("/app/jogos")} className="btn btn-ghost mt-2 w-full">
        Voltar para a Sala de Jogos
      </button>
      <p className="mt-4 text-center text-[11px] text-[var(--muted)]">Mapa: © colaboradores do OpenStreetMap · Edificações: Data.Rio / Instituto Pereira Passos · Personagens: Quaternius (CC0)</p>
    </div>
  );
}
