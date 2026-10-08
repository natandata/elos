"use client";

import { useEffect, useState } from "react";
import { CAMPAIGN_STAGES } from "@/lib/arena/campaign";
import { readMuted } from "./arenaSound";
import { AT } from "./ArenaText";

/** Duração total da cena. */
export const NERY_CUTSCENE_MS = 10_000;

type Pose = "walk" | "crouch" | "up" | "down";

/** Tamanho original (px) de cada imagem da cena, para manter a escala entre as poses. */
const DIM: Record<string, Record<Pose, [number, number]>> = {
  amandinha: { walk: [346, 537], crouch: [439, 279], up: [502, 277], down: [543, 242] },
  mbappe: { walk: [341, 535], crouch: [434, 299], up: [529, 287], down: [597, 191] },
  henrique: { walk: [343, 497], crouch: [387, 261], up: [528, 279], down: [540, 164] },
  tiaaline: { walk: [339, 546], crouch: [414, 360], up: [563, 309], down: [566, 189] },
  marcelinho: { walk: [327, 529], crouch: [445, 297], up: [547, 306], down: [574, 211] },
  natanrebeca: { walk: [474, 430], crouch: [587, 259], up: [577, 242], down: [591, 170] },
  zepa: { walk: [336, 554], crouch: [447, 288], up: [580, 312], down: [584, 162] },
};
const SQUAD = Object.keys(DIM);
const NAMES: Record<string, string> = { amandinha: "Amandinha", mbappe: "Mbappé", henrique: "Henrique", tiaaline: "Tia Aline", marcelinho: "Marcelinho", natanrebeca: "Natan e Rebeca", zepa: "Pastor Zepa" };
const NERY_DIM: [number, number] = [410, 544];
const POSES: Pose[] = ["walk", "crouch", "up", "down"];

const src = (k: string, pose: Pose) => `/arena/cutscene/${k}-${pose}.webp`;
const NERY_SRC = "/arena/cutscene/nery-walk.webp";

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
 * Cena final depois de toda batalha contra o Nery (10 s): os personagens da campanha entram andando na arena,
 * se abaixam, fazem flexão de braço (braço esticado, braço flexionado) e o Nery passa na frente de todos apitando.
 * Cada fase do movimento usa uma ilustração própria do personagem.
 */
export function NeryCutscene({ onDone }: { onDone: () => void }) {
  const [ms, setMs] = useState(0);
  const stage = CAMPAIGN_STAGES[2];
  // escala pela tela (alta ou baixa): as 4 fileiras da tropa precisam caber inteiras
  const [scale] = useState(() => {
    if (typeof window === "undefined") return 0.2;
    const rowH = (window.innerHeight * 0.69) / 4;
    const colW = (Math.min(460, window.innerWidth) - 24) / 2;
    return Math.max(0.1, Math.min(0.26, (rowH - 28) / 430, colW / 600));
  });

  useEffect(() => {
    // carrega todas as poses antes, para a troca de imagem não piscar
    for (const k of SQUAD) for (const p of POSES) new Image().src = src(k, p);
    new Image().src = NERY_SRC;
    const start = performance.now();
    const tick = window.setInterval(() => setMs(performance.now() - start), 70);
    const t = window.setTimeout(onDone, NERY_CUTSCENE_MS);
    const w1 = window.setTimeout(whistle, 3200);
    const w2 = window.setTimeout(whistle, 6200);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(t);
      window.clearTimeout(w1);
      window.clearTimeout(w2);
    };
  }, [onDone]);

  const poseOf = (i: number): Pose => {
    if (ms < 2100) return "walk";
    if (ms < 2700) return "crouch";
    return Math.floor((ms + i * 130) / 450) % 2 === 0 ? "up" : "down";
  };
  const reps = Math.max(1, Math.floor((ms - 2700) / 900) + 1);

  return (
    <div className="fixed inset-0 z-[90] overflow-hidden text-white" style={{ background: `linear-gradient(180deg, #1f2a12 0%, ${stage.theme.grass} 38%, ${stage.theme.grassAlt} 100%)` }} aria-label="Cena final: treino do sargento Nery">
      <style>{`
        @keyframes nyEnterL{from{transform:translateX(-120vw)}to{transform:translateX(0)}}
        @keyframes nyEnterR{from{transform:translateX(120vw)}to{transform:translateX(0)}}
        @keyframes nyWalk{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
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
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-300"><AT>🪖 Treino do sargento Nery</AT></p>
          <p className="mt-1 text-3xl font-black tabular-nums [text-shadow:0_3px_10px_#000]">{ms < 2700 ? "Em formação!" : `Flexão ${reps}!`}</p>
        </div>

        {/* a tropa: entra andando, se abaixa e faz flexão */}
        <div className="absolute inset-x-0 bottom-[14%] top-[17%] mx-auto grid w-full max-w-[460px] grid-cols-2 grid-rows-4 gap-x-2 px-3">
          {SQUAD.map((k, i) => {
            const fromLeft = i % 2 === 0;
            const enterDelay = 0.2 + i * 0.22;
            const pose = poseOf(i);
            const [w, h] = DIM[k][pose];
            return (
              <div key={k} className={`relative flex items-end justify-center pb-6 ${i === SQUAD.length - 1 ? "col-span-2" : ""}`} style={{ animation: `${fromLeft ? "nyEnterL" : "nyEnterR"} 1.6s cubic-bezier(.2,.8,.3,1) ${enterDelay}s both` }}>
                <div style={ms < 2100 ? { animation: `nyWalk .4s ease-in-out ${enterDelay}s infinite` } : undefined}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src(k, pose)} alt={NAMES[k]} width={Math.round(w * scale)} height={Math.round(h * scale)} style={{ width: w * scale, height: h * scale, maxWidth: "none" }} className="drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]" draggable={false} />
                </div>
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-black text-white/90">{NAMES[k]}</span>
              </div>
            );
          })}
        </div>

        {/* o Nery passa na frente de todos, apitando */}
        <div className="absolute bottom-[6%] left-0" style={{ animation: "nyNery 5.2s linear 3s both" }}>
          <div className="relative" style={{ animation: "nyWalk .45s ease-in-out 3s 12" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={NERY_SRC} alt="Nery" width={Math.round(NERY_DIM[0] * scale * 0.95)} height={Math.round(NERY_DIM[1] * scale * 0.95)} style={{ width: NERY_DIM[0] * scale * 0.95, height: NERY_DIM[1] * scale * 0.95, maxWidth: "none" }} className="drop-shadow-[0_6px_6px_rgba(0,0,0,0.6)]" draggable={false} />
            <span className="absolute -top-7 left-6 rounded-xl bg-white px-2.5 py-1 text-sm font-black text-black shadow-lg" style={{ animation: "nyBlink 1.4s ease-in-out 3.1s 4 both" }}><AT>
              PIIIIII! 📣
            </AT></span>
          </div>
        </div>
      </div>
      <div className="ny-black" />
    </div>
  );
}
