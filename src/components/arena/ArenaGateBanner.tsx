import Link from "next/link";
import { GATE_GAMES, GATE_GAME_INFO, GATE_GAME_KEYS, gateMessage, type GateInfo } from "@/lib/arena/gate";
import { AT } from "./ArenaText";

/** Aviso da trava da Arena: progresso das batalhas e, quando travou, os jogos pra destravar. */
export function ArenaGateBanner({ gate, compact = false }: { gate: GateInfo; compact?: boolean }) {
  if (!gate.locked) {
    const left = gate.limit - gate.battles;
    return (
      <p className={`cr-text text-center text-[11px] opacity-90 ${compact ? "" : "mt-2"}`}>
        <AT>{gate.limit <= 5 ? Array.from({ length: gate.limit }).map((_, i) => (i < gate.battles ? "🟡" : "⚪")).join(" ") : `${gate.battles}/${gate.limit}`}</AT> · {left === 1 ? "mais 1 batalha" : `mais ${left} batalhas`} contra o computador até a pausa pra vencer outros jogos
      </p>
    );
  }
  return (
    <div className="mt-3 rounded-2xl border-[3px] border-amber-300 bg-[#3a1d0a]/90 p-3 text-white shadow-lg">
      <p className="text-base font-black"><AT>🔒 Arena em pausa</AT></p>
      <p className="mt-1 text-sm font-semibold text-white/90">{gateMessage(gate)}</p>
      <p className="mt-2 text-xs font-black uppercase tracking-wide text-amber-300">
        Jogos vencidos depois da pausa: {gate.games}/{GATE_GAMES}
      </p>
      <div className="mt-1 flex gap-1.5">
        {Array.from({ length: GATE_GAMES }).map((_, i) => (
          <span key={i} className={`h-2.5 flex-1 rounded-full ${i < gate.games ? "bg-emerald-400" : "bg-white/25"}`} />
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-2">
        {GATE_GAME_KEYS.map((k) => {
          const info = GATE_GAME_INFO[k];
          const done = gate.doneToday.includes(k);
          const inner = (
            <>
              <span className="text-xl" aria-hidden>
                <AT>{info.icon}</AT>
              </span>
              <span className="min-w-0 flex-1 text-left text-[11px] font-black leading-tight">{info.name}</span>
              <span className="text-[10px] font-black">{done ? "sem XP" : "Jogar"}</span>
            </>
          );
          return (
            <li key={k}>
              <Link href={info.href} className={`flex items-center gap-1.5 rounded-xl px-2 py-2 active:scale-95 ${done ? "bg-white/20 text-white" : "bg-amber-400 text-slate-900"}`}>
                {inner}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
