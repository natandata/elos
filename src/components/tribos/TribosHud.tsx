"use client";

import type { CSSProperties, ReactNode } from "react";
import { TRIBES, fmtNum, type Res, type TribeKey } from "@/lib/tribos/data";
import { ResIcon, TIcon, TribeEmblem, type IconName } from "./ui";

// Interface do Clash of Tribos no estilo do Clash of Clans: textos brancos com contorno preto, barras de recurso com o ícone
// grande na ponta, botões de pedra e botões coloridos com brilho, selo de nível em estrela.

export const OUTLINE: CSSProperties = {
  color: "#fff",
  textShadow: "-1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000, 0 2px 0 #000",
};

export function Outlined({ children, className = "", style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <span className={`font-black ${className}`} style={{ ...OUTLINE, ...style }}>
      {children}
    </span>
  );
}

const STAR = (() => {
  const pts: string[] = [];
  for (let i = 0; i < 24; i++) {
    const r = i % 2 === 0 ? 29 : 23.5;
    const a = (Math.PI * 2 * i) / 24 - Math.PI / 2;
    pts.push(`${(30 + r * Math.cos(a)).toFixed(1)},${(30 + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ");
})();

/** Selo de nível: estrela azul com o número no meio. */
export function LevelBadge({ level }: { level: number }) {
  return (
    <span className="relative grid h-[54px] w-[54px] shrink-0 place-items-center">
      <svg viewBox="0 0 60 60" className="absolute inset-0 h-full w-full drop-shadow-[0_2px_0_rgba(0,0,0,0.6)]" aria-hidden>
        <defs>
          <linearGradient id="lvl" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#6cc0ff" />
            <stop offset="1" stopColor="#1f5fd0" />
          </linearGradient>
        </defs>
        <polygon points={STAR} fill="url(#lvl)" stroke="#0b2a66" strokeWidth="2.4" strokeLinejoin="round" />
        <circle cx="30" cy="30" r="17" fill="none" stroke="#fff" strokeOpacity="0.28" strokeWidth="1.6" />
      </svg>
      <Outlined className="relative text-[20px] leading-none">{level}</Outlined>
    </span>
  );
}

/** Canto superior esquerdo: nível, nome, barra de XP, troféus e brasão da tribo. */
export function PlayerCard({ name, level, xpPct, trophies, tribe }: { name: string; level: number; xpPct: number; trophies: number; tribe: TribeKey }) {
  const t = TRIBES[tribe];
  return (
    <div className="pointer-events-auto flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <LevelBadge level={level} />
        <div className="min-w-0">
          <Outlined className="block max-w-[150px] truncate text-[17px] leading-tight">{name}</Outlined>
          <span className="mt-0.5 block h-[9px] w-28 overflow-hidden rounded-full border border-black/70 bg-black/55">
            <span className="block h-full rounded-full" style={{ width: `${Math.max(4, xpPct)}%`, background: "linear-gradient(180deg,#8fd0ff,#2f7be0)" }} />
          </span>
        </div>
      </div>
      <div className="relative ml-1 flex h-[34px] w-[150px] items-center rounded-lg border-2 border-black/70 bg-[#2a2118]/80 pl-9 pr-9">
        <TIcon name="trofeu" className="absolute -left-2 top-1/2 h-[42px] w-[42px] -translate-y-1/2 drop-shadow-[0_2px_0_rgba(0,0,0,0.6)]" />
        <Outlined className="w-full text-center text-[18px] leading-none tabular-nums">{fmtNum(trophies)}</Outlined>
        <span className="absolute -right-3 top-1/2 grid h-[44px] w-[40px] -translate-y-1/2 place-items-center">
          <TribeEmblem tribe={tribe} className="h-[44px] w-auto" />
        </span>
      </div>
      <span className="sr-only">{t.name}</span>
    </div>
  );
}

/** Barra de recurso: "Máx.", valor com contorno e o ícone grande na ponta. */
export function ResourceBar({ res, value, max, fill }: { res: Res; value: number; max?: number; fill: string }) {
  const pct = max && max > 0 ? Math.min(100, (value / max) * 100) : 100;
  return (
    <div className="pointer-events-auto flex w-[176px] flex-col items-end">
      {max ? <Outlined className="mr-11 text-[10px] leading-none">Máx.: {fmtNum(max)}</Outlined> : null}
      <div className="relative mt-0.5 w-full">
        <div className="relative h-[26px] w-[148px] overflow-hidden rounded-md border-2 border-black/80 bg-[#1d1812]/85">
          <span className="absolute inset-y-0 left-0 rounded-sm opacity-90" style={{ width: `${pct}%`, background: `linear-gradient(180deg, ${fill}, ${fill}aa)` }} />
          <Outlined className="absolute inset-y-0 right-2 flex items-center text-[16px] tabular-nums">{fmtNum(value)}</Outlined>
        </div>
        <span className="absolute -right-0.5 top-1/2 grid h-[42px] w-[42px] -translate-y-1/2 place-items-center">
          <ResIcon res={res} className="h-[42px] w-[42px] drop-shadow-[0_2px_0_rgba(0,0,0,0.65)]" />
        </span>
      </div>
    </div>
  );
}

/** Chip dos obreiros no topo, ao centro. */
export function BuilderChip({ free, total }: { free: number; total: number }) {
  return (
    <div className="pointer-events-auto flex items-center gap-1.5 rounded-lg border-2 border-black/70 bg-[#2a2118]/80 py-1 pl-1.5 pr-3">
      <TIcon name="martelo" className="h-6 w-6 drop-shadow-[0_2px_0_rgba(0,0,0,0.6)]" />
      <Outlined className="text-[14px] leading-none">Obreiros {free}/{total}</Outlined>
    </div>
  );
}

/** Botão quadrado de pedra (engrenagem, conquistas, tribo, exército…). */
export function StoneButton({ icon, label, onClick, disabled, size = 52 }: { icon: IconName; label: string; onClick?: () => void; disabled?: boolean; size?: number }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="pointer-events-auto grid place-items-center rounded-xl border-[3px] border-[#3b372d] shadow-[0_3px_0_#1c1a15] transition active:translate-y-[2px] active:shadow-none disabled:opacity-55"
      style={{ width: size, height: size, background: "linear-gradient(180deg, #e0dbc7 0%, #b7b19b 55%, #8f8a76 100%)", boxShadow: "inset 0 2px 0 rgba(255,255,255,0.55), 0 3px 0 #1c1a15" }}
    >
      <TIcon name={icon} className="h-[68%] w-[68%] drop-shadow-[0_1px_0_rgba(0,0,0,0.5)]" />
    </button>
  );
}

type Tone = "tribe" | "green" | "red" | "gold" | "violet" | "stone";
function toneBg(tone: Tone, tribe: TribeKey): string {
  const t = TRIBES[tribe];
  if (tone === "tribe") return `linear-gradient(180deg, ${t.color} 0%, ${t.dark} 100%)`;
  if (tone === "green") return "linear-gradient(180deg, #a6ea4c 0%, #4fa81f 100%)";
  if (tone === "red") return "linear-gradient(180deg, #ff8a5c 0%, #d63a1d 100%)";
  if (tone === "gold") return "linear-gradient(180deg, #ffe27a 0%, #e0951c 100%)";
  if (tone === "violet") return "linear-gradient(180deg, #c79bff 0%, #6d3fc9 100%)";
  return "linear-gradient(180deg, #e0dbc7 0%, #a39d87 100%)";
}

/** Botão grande e colorido (Loja, Atacar, ações da construção). */
export function BigButton({
  icon, label, sub, tone, tribe, disabled, onClick, width = 84, height = 84, badge,
}: {
  icon: IconName | ReactNode; label: string; sub?: ReactNode; tone: Tone; tribe: TribeKey; disabled?: boolean; onClick?: () => void; width?: number; height?: number; badge?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="pointer-events-auto relative flex flex-col items-center justify-between overflow-hidden rounded-2xl border-[3px] border-[#1b1409] px-1 pb-1 pt-1 transition active:translate-y-[2px] active:shadow-none"
      style={{ width, height, background: toneBg(tone, tribe), boxShadow: "inset 0 3px 0 rgba(255,255,255,0.5), inset 0 -3px 0 rgba(0,0,0,0.22), 0 4px 0 #1b1409", opacity: disabled ? 0.85 : 1 }}
    >
      {badge ? <span className="absolute -right-5 top-1.5 rotate-45 bg-[#1b1409] px-5 py-px text-[8px] font-black uppercase text-[#ffd66b]">{badge}</span> : null}
      <span className="grid flex-1 place-items-center">
        {typeof icon === "string" ? <TIcon name={icon as IconName} className="h-[42px] w-[42px] drop-shadow-[0_2px_0_rgba(0,0,0,0.55)]" /> : icon}
      </span>
      <Outlined className="text-[12px] uppercase leading-none tracking-tight">{label}</Outlined>
      {sub ? <span className="mt-0.5 flex min-h-[15px] items-center justify-center">{sub}</span> : null}
    </button>
  );
}

/** Pílula de preço (ícone + número, com contorno) para os botões de ação. */
export function CostPill({ res, n, bad }: { res: Res; n: number; bad?: boolean }) {
  return (
    <span className="inline-flex items-center gap-0.5 rounded-md bg-black/55 px-1 py-px">
      <ResIcon res={res} className="h-3.5 w-3.5" />
      <Outlined className="text-[11px] leading-none tabular-nums" style={bad ? { color: "#ff7a6b" } : undefined}>
        {fmtNum(n)}
      </Outlined>
    </span>
  );
}

/** Faixa com o nome (e nível) da construção selecionada, acima dos botões. */
export function NameBanner({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="pointer-events-none text-center leading-tight">
      <Outlined className="text-[18px]">{title}</Outlined>
      {sub ? <Outlined className="block text-[12px]">{sub}</Outlined> : null}
    </div>
  );
}

/** Botão redondo de confirmar (verde) ou cancelar (vermelho), como na colocação de construções do Clash of Clans. */
export function RoundButton({ kind, onClick, disabled, label }: { kind: "ok" | "cancel"; onClick: () => void; disabled?: boolean; label: string }) {
  const ok = kind === "ok";
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="pointer-events-auto grid h-14 w-14 place-items-center rounded-full border-[3px] border-[#1b1409] text-3xl font-black transition active:translate-y-[2px] disabled:opacity-45"
      style={{ background: ok ? "linear-gradient(180deg,#a6ea4c,#3f9a17)" : "linear-gradient(180deg,#ff8a5c,#c92f17)", boxShadow: "inset 0 3px 0 rgba(255,255,255,0.5), 0 4px 0 #1b1409" }}
    >
      <Outlined>{ok ? "✓" : "✕"}</Outlined>
    </button>
  );
}
