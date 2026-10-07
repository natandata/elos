"use client";

import { useEffect, useState } from "react";
import { CAMPAIGN_STAGES } from "@/lib/arena/campaign";
import { readMuted } from "./arenaSound";

/** Duração total da cena. */
export const NERY_CUTSCENE_MS = 10_000;

const SQUAD = ["amandinha", "mbappe", "henrique", "tiaaline", "marcelinho", "natanrebeca", "zepa"];
const NAMES: Record<string, string> = { amandinha: "Amandinha", mbappe: "Mbappé", henrique: "Henrique", tiaaline: "Tia Aline", marcelinho: "Marcelinho", natanrebeca: "Natan e Rebeca", zepa: "Pastor Zepa" };

/** Apito de sargento (WebAudio): dois sopros agudos. */
function whistle() {
  try {
    if (readMuted()) return;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const t0 = ctx.currentTime;
    for (const [at, len] of [[0, 0.28], [0.36, 0.5]] as const) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lg = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(2700, t0 + at);
      o.frequency.linearRampToValueAtTime(3100, t0 + at + len);
      lfo.frequency.value = 38;
      lg.gain.value = 120;
      lfo.connect(lg);
      lg.connect(o.frequency);
      g.gain.setValueAtTime(0, t0 + at);
      g.gain.linearRampToValueAtTime(0.18, t0 + at + 0.03);
      g.gain.linearRampToValueAtTime(0, t0 + at + len);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(t0 + at);
      lfo.start(t0 + at);
      o.stop(t0 + at + len + 0.05);
      lfo.stop(t0 + at + len + 0.05);
    }
    window.setTimeout(() => void ctx.close(), 1500);
  } catch {
    /* sem áudio, segue só com a imagem */
  }
}

/**
 * Cena final depois de toda batalha contra o Nery (10 s): os personagens da campanha entram na arena,
 * fazem flexão de braço no chão e o Nery passa na frente de todos apitando.
 */
export function NeryCutscene({ onDone }: { onDone: () => void }) {
  const [count, setCount] = useState(0);
  const stage = CAMPAIGN_STAGES[2];

  useEffect(() => {
    const t = window.setTimeout(onDone, NERY_CUTSCENE_MS);
    const w1 = window.setTimeout(whistle, 3200);
    const w2 = window.setTimeout(whistle, 6200);
    const c = window.setInterval(() => setCount((n) => n + 1), 900);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(w1);
      window.clearTimeout(w2);
      window.clearInterval(c);
    };
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-[90] overflow-hidden text-white" style={{ background: `linear-gradient(180deg, #1f2a12 0%, ${stage.theme.grass} 38%, ${stage.theme.grassAlt} 100%)` }} aria-label="Cena final: treino do sargento Nery">
      <style>{`
        @keyframes nyEnterL{from{transform:translateX(-120vw)}to{transform:translateX(0)}}
        @keyframes nyEnterR{from{transform:translateX(120vw)}to{transform:translateX(0)}}
        @keyframes nyWalk{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        @keyframes nyDown{from{transform:rotate(0deg)}to{transform:rotate(84deg)}}
        @keyframes nyPush{0%,100%{transform:rotate(84deg)}50%{transform:rotate(66deg)}}
        @keyframes nyNery{from{transform:translateX(-45vw)}to{transform:translateX(145vw)}}
        @keyframes nyBlack{0%,88%{opacity:0}100%{opacity:1}}
        @keyframes nyBlink{0%,100%{opacity:0;transform:scale(.6)}30%,70%{opacity:1;transform:scale(1.1)}}
        .ny-black{position:absolute;inset:0;background:#000;pointer-events:none;animation:nyBlack 10s linear forwards;opacity:0}
      `}</style>
      <div className="absolute inset-0">
        {/* cenário da arena do Nery desfocado ao fundo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={stage.art} alt="" className="absolute left-1/2 top-4 w-[110%] max-w-[560px] -translate-x-1/2 opacity-25 blur-[2px]" draggable={false} />
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/70 to-transparent" />

        <div className="absolute inset-x-0 top-4 text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-300">🪖 Treino do sargento Nery</p>
          <p className="mt-1 text-3xl font-black tabular-nums [text-shadow:0_3px_10px_#000]">{count < 2 ? "Em formação!" : `Flexão ${Math.max(1, count - 1)}!`}</p>
        </div>

        {/* a tropa fazendo flexão (entra pelos lados e cai no chão) */}
        <div className="absolute inset-x-0 top-[22%] mx-auto grid w-full max-w-[420px] grid-cols-2 gap-x-2 gap-y-5 px-4">
          {SQUAD.map((k, i) => {
            const fromLeft = i % 2 === 0;
            const enterDelay = 0.2 + i * 0.22;
            const downAt = 2.2 + i * 0.05;
            return (
              <div key={k} className="relative flex h-[84px] items-end justify-start pl-4" style={{ animation: `${fromLeft ? "nyEnterL" : "nyEnterR"} 1.6s cubic-bezier(.2,.8,.3,1) ${enterDelay}s both` }}>
                <div style={{ animation: `nyWalk .4s ease-in-out ${enterDelay}s 4` }} className="flex h-full items-end">
                  {/* a flexão: o corpo deita pelos pés e sobe e desce */}
                  <div style={{ transformOrigin: "50% 100%", animation: `nyDown .5s ease-out ${downAt}s both, nyPush .9s ease-in-out ${downAt + 0.5}s infinite` }} className="h-[118px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/arena/${k}.webp`} alt={NAMES[k]} className="h-full w-auto max-w-none drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]" draggable={false} />
                  </div>
                </div>
                <span className="absolute -bottom-4 left-4 whitespace-nowrap rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-black text-white/90">{NAMES[k]}</span>
              </div>
            );
          })}
        </div>

        {/* o Nery passa na frente de todos, apitando */}
        <div className="absolute bottom-[7%] left-0" style={{ animation: "nyNery 5.2s linear 3s both" }}>
          <div className="relative" style={{ animation: "nyWalk .45s ease-in-out 3s 12" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/arena/nery.webp" alt="Nery" className="h-44 w-auto max-w-none drop-shadow-[0_6px_6px_rgba(0,0,0,0.6)]" draggable={false} />
            <span className="absolute -top-7 left-6 rounded-xl bg-white px-2.5 py-1 text-sm font-black text-black shadow-lg" style={{ animation: "nyBlink 1.4s ease-in-out 3.1s 4 both" }}>
              PIIIIII! 📣
            </span>
          </div>
        </div>
      </div>
      <div className="ny-black" />
    </div>
  );
}
