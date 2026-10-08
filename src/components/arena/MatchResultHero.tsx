"use client";

// Animação de fim de partida (vitória / derrota / empate) no estilo dos jogos de arena:
// faixa do adversário em cima (vermelha), faixa do jogador embaixo (azul), coroas que caem e
// o título no meio. Só CSS: nada de imagem nova além dos ícones da Arena.
import type { ReactNode } from "react";
import { Avatar } from "@/components/Avatar";

export type MatchOutcome = "win" | "loss" | "draw";

const CROWN = "/arena/icones/coroa.webp";

/** Coroas (até 3): as ganhas caem douradas, o resto fica como almofada vazia. */
function CrownRow({ won, delay, tone }: { won: number; delay: number; tone: "blue" | "red" }) {
  return (
    <div className="flex items-end justify-center gap-1.5">
      {[0, 1, 2].map((i) => {
        const has = i < won;
        const mid = i === 1;
        return has ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={CROWN}
            alt="coroa"
            draggable={false}
            className={`mr-crown-in ${mid ? "h-16 w-16" : "h-12 w-12"} object-contain drop-shadow-[0_3px_0_rgba(0,0,0,0.35)]`}
            style={{ animationDelay: `${delay + i * 0.18}s` }}
          />
        ) : (
          <span
            key={i}
            aria-hidden
            className={`mr-pillow ${mid ? "h-9 w-16" : "h-7 w-12"} rounded-full ${tone === "red" ? "bg-gradient-to-b from-rose-500/70 to-rose-800/80" : "bg-gradient-to-b from-sky-500/70 to-sky-900/80"}`}
            style={{ animationDelay: `${delay + i * 0.18}s` }}
          />
        );
      })}
    </div>
  );
}

function PlayerStrip({ name, avatar, tone, crowns, delay, winner, label }: { name: string; avatar?: string | null; tone: "blue" | "red"; crowns: number; delay: number; winner: boolean; label?: string }) {
  const bar = tone === "blue" ? "from-sky-500 to-blue-800 ring-sky-200/60" : "from-rose-500 to-rose-900 ring-rose-200/60";
  return (
    <div className="relative">
      <div className="mb-1">
        <CrownRow won={crowns} delay={delay} tone={tone} />
      </div>
      <div className={`mr-strip flex items-center gap-3 rounded-xl bg-gradient-to-b px-3 py-2 shadow-lg ring-2 ${bar} ${winner ? "mr-winner" : ""}`} style={{ animationDelay: `${delay - 0.5}s` }}>
        <Avatar name={name} url={avatar ?? null} size={40} />
        <div className="min-w-0 flex-1 text-left leading-tight">
          <p className="truncate text-base font-black text-white [text-shadow:0_2px_0_rgba(0,0,0,0.45)]">{name}</p>
          {label ? <p className="text-xs font-bold text-white/80">{label}</p> : null}
        </div>
        {winner ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/arena/icones/trofeu.webp" alt="" draggable={false} className="mr-wobble h-10 w-10 object-contain" />
        ) : null}
      </div>
    </div>
  );
}

const CONFETTI = ["#facc15", "#f43f5e", "#38bdf8", "#4ade80", "#fb923c", "#c084fc"];

export function MatchResultHero({
  result,
  crownsMe,
  crownsThem,
  meName,
  themName,
  meAvatar,
  themAvatar,
  meLabel,
  themLabel,
  note,
  children,
}: {
  result: MatchOutcome;
  crownsMe: number;
  crownsThem: number;
  meName: string;
  themName: string;
  meAvatar?: string | null;
  themAvatar?: string | null;
  meLabel?: string;
  themLabel?: string;
  /** linha pequena abaixo do título (ex.: "por abandono") */
  note?: string;
  /** prêmios e avisos, mostrados dentro do painel depois da animação */
  children?: ReactNode;
}) {
  const win = result === "win";
  const draw = result === "draw";
  const title = win ? "Vitória!" : draw ? "Empate" : "Derrota";
  const bg = win ? "from-[#173a7a] via-[#1d4fa8] to-[#0f2a5c]" : draw ? "from-[#2c3a52] via-[#3a4a66] to-[#1c2538]" : "from-[#2a2438] via-[#3a2f4a] to-[#15121d]";
  const ribbon = win ? "from-yellow-200 via-amber-400 to-amber-600 text-amber-950" : draw ? "from-slate-100 via-slate-300 to-slate-500 text-slate-900" : "from-slate-300 via-slate-500 to-slate-700 text-white";
  return (
    <div className={`mr-root relative overflow-hidden rounded-3xl bg-gradient-to-b ${bg} px-3 pb-4 pt-5 text-center shadow-2xl ring-2 ring-white/20`} role="status" aria-label={`${title} ${crownsMe} a ${crownsThem}`}>
      {win ? <div aria-hidden className="mr-rays pointer-events-none absolute left-1/2 top-1/2 h-[170%] w-[170%] -translate-x-1/2 -translate-y-1/2" /> : null}
      {win ? (
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {Array.from({ length: 26 }, (_, i) => (
            <span
              key={i}
              className="mr-confetti absolute top-0 block h-2.5 w-1.5 rounded-[1px]"
              style={{
                left: `${(i * 37) % 100}%`,
                background: CONFETTI[i % CONFETTI.length],
                animationDelay: `${(i % 9) * 0.22}s`,
                animationDuration: `${2.6 + (i % 5) * 0.5}s`,
                transform: `rotate(${i * 40}deg)`,
              }}
            />
          ))}
        </div>
      ) : null}
      {!win && !draw ? (
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {Array.from({ length: 18 }, (_, i) => (
            <span key={i} className="mr-rain absolute top-0 block h-5 w-px bg-sky-200/35" style={{ left: `${(i * 53) % 100}%`, animationDelay: `${(i % 7) * 0.3}s`, animationDuration: `${1.4 + (i % 4) * 0.3}s` }} />
          ))}
        </div>
      ) : null}

      <div className="relative z-10 mx-auto max-w-sm">
        <PlayerStrip name={themName} avatar={themAvatar} tone="red" crowns={crownsThem} delay={0.6} winner={result === "loss"} label={themLabel} />

        <div className="relative my-3 flex flex-col items-center">
          {win || draw ? null : null}
          <div className="mr-ribbon relative">
            <div className={`bg-gradient-to-b ${ribbon} rounded-lg px-8 py-1.5 text-3xl font-black uppercase tracking-wide shadow-xl ring-2 ring-white/70 [text-shadow:0_2px_0_rgba(255,255,255,0.55)]`}>{title}</div>
          </div>
          <p className="mt-1 text-sm font-black text-white/85 tabular-nums">
            {crownsMe} <span className="opacity-60">x</span> {crownsThem}
          </p>
          {note ? <p className="text-xs font-semibold text-white/70">{note}</p> : null}
          {draw ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/arena/icones/aperto-de-mao.webp" alt="" draggable={false} className="mr-shake mt-1 h-12 w-12 object-contain" />
          ) : !win ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/arena/icones/derrota.webp" alt="" draggable={false} className="mr-droop mt-1 h-10 w-10 object-contain" />
          ) : null}
        </div>

        <PlayerStrip name={meName} avatar={meAvatar} tone="blue" crowns={crownsMe} delay={1.0} winner={win} label={meLabel} />
      </div>

      {children ? <div className="mr-fade relative z-10 mx-auto mt-4 max-w-sm text-white">{children}</div> : null}

      <style>{`
        .mr-strip{opacity:0;animation:mrSlide .5s cubic-bezier(.2,.9,.3,1.2) forwards}
        .mr-winner{box-shadow:0 0 0 2px rgba(255,230,120,.9),0 0 24px rgba(255,210,70,.65)}
        .mr-crown-in{opacity:0;animation:mrCrown .7s cubic-bezier(.2,1.4,.4,1) forwards}
        .mr-pillow{opacity:0;animation:mrFade .4s ease-out forwards}
        .mr-ribbon{opacity:0;animation:mrRibbon .7s cubic-bezier(.2,1.5,.4,1) .2s forwards}
        .mr-wobble{animation:mrWobble 1.6s ease-in-out infinite}
        .mr-shake{animation:mrShake 1.2s ease-in-out infinite}
        .mr-droop{animation:mrDroop 2.2s ease-in-out infinite}
        .mr-fade{opacity:0;animation:mrFade .6s ease-out 1.8s forwards}
        .mr-rays{background:repeating-conic-gradient(from 0deg,rgba(255,235,150,.17) 0 9deg,transparent 9deg 18deg);animation:mrSpin 22s linear infinite;mask-image:radial-gradient(circle,#000 8%,transparent 62%);-webkit-mask-image:radial-gradient(circle,#000 8%,transparent 62%)}
        .mr-confetti{opacity:0;animation-name:mrConfetti;animation-iteration-count:infinite;animation-timing-function:linear}
        .mr-rain{opacity:0;animation-name:mrRain;animation-iteration-count:infinite;animation-timing-function:linear}
        @keyframes mrSlide{0%{opacity:0;transform:translateY(24px) scale(.92)}100%{opacity:1;transform:none}}
        @keyframes mrCrown{0%{opacity:0;transform:translateY(-70px) scale(.3) rotate(-25deg)}60%{opacity:1;transform:translateY(6px) scale(1.2) rotate(6deg)}100%{opacity:1;transform:none}}
        @keyframes mrRibbon{0%{opacity:0;transform:scale(2.4) rotate(-6deg)}100%{opacity:1;transform:none}}
        @keyframes mrFade{0%{opacity:0}100%{opacity:1}}
        @keyframes mrWobble{0%,100%{transform:rotate(-8deg) scale(1)}50%{transform:rotate(8deg) scale(1.12)}}
        @keyframes mrShake{0%,100%{transform:translateX(0) rotate(0)}25%{transform:translateX(-5px) rotate(-6deg)}75%{transform:translateX(5px) rotate(6deg)}}
        @keyframes mrDroop{0%,100%{transform:translateY(0)}50%{transform:translateY(5px)}}
        @keyframes mrSpin{to{transform:translate(-50%,-50%) rotate(360deg)}}
        @keyframes mrConfetti{0%{opacity:0;transform:translateY(-10px) rotate(0)}10%{opacity:1}100%{opacity:.9;transform:translateY(420px) rotate(540deg)}}
        @keyframes mrRain{0%{opacity:0;transform:translateY(-20px)}15%{opacity:1}100%{opacity:0;transform:translateY(380px)}}
        @media (prefers-reduced-motion: reduce){.mr-strip,.mr-crown-in,.mr-pillow,.mr-ribbon,.mr-fade{animation-duration:.01s;animation-delay:0s}.mr-rays,.mr-confetti,.mr-rain,.mr-wobble,.mr-shake,.mr-droop{animation:none}}
      `}</style>
    </div>
  );
}
