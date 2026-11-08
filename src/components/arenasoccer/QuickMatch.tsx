"use client";

import { useEffect, useState } from "react";
import { loadCup, loadLeague, type Team } from "@/lib/arenasoccer/teams";
import type { MatchResult } from "./ArenaSoccerGame";
import { MatchFlow } from "./ArenaSoccerMatch";
import { KitChip } from "./match/KitChip";
import { CompTabs, PesTitle, TeamGrid, type CompKey } from "./match/TeamSelect";

type Slot = "mine" | "opp";
type Pick = { team: Team; comp: CompKey };

async function loadComp(k: CompKey): Promise<Team[]> {
  const teams = k === "cup" ? (await loadCup(2026)).teams : (await loadLeague(k)).teams;
  return [...teams].sort((a, b) => b.str - a.str);
}

/** Um dos dois lugares do confronto: mostra o time escolhido (ou convida a escolher). */
function SlotCard({ slot, pick, active, onClick }: { slot: Slot; pick: Pick | null; active: boolean; onClick: () => void }) {
  const t = pick?.team;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`pes-card pes-cut relative flex min-h-[112px] flex-col items-center justify-center gap-1 px-2 py-3 text-center ${active ? "ring-2 ring-emerald-300" : ""}`}
      style={{ background: t ? `linear-gradient(${slot === "mine" ? "120deg" : "240deg"}, ${t.p}${active ? "99" : "55"} 0%, rgba(8,16,36,0.95) 70%)` : "rgba(255,255,255,0.06)", boxShadow: active ? "0 0 22px rgba(52,211,153,0.45)" : undefined }}
    >
      <span className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">{slot === "mine" ? "Seu time" : "Adversário"}</span>
      {t ? (
        <>
          <KitChip t={t} size={52} />
          <b className="pes-title line-clamp-2 text-sm leading-tight">{t.name}</b>
          <small className="text-[10px] font-black uppercase tracking-widest text-white/65">força {t.str}</small>
        </>
      ) : (
        <>
          <span className="grid h-[52px] w-[52px] place-items-center rounded-full border-2 border-dashed border-white/30 text-2xl text-white/40">?</span>
          <b className="pes-title text-sm text-white/70">Escolher</b>
        </>
      )}
    </button>
  );
}

/** Amistoso: você escolhe o seu time e o adversário, de qualquer liga ou da Copa. */
export function QuickMatch({ onRecord, onBack }: { onRecord: (r: MatchResult) => void; onBack: () => void }) {
  const [slot, setSlot] = useState<Slot>("mine");
  const [comp, setComp] = useState<Record<Slot, CompKey>>({ mine: "br", opp: "br" });
  const [pick, setPick] = useState<Record<Slot, Pick | null>>({ mine: null, opp: null });
  const [lists, setLists] = useState<Partial<Record<CompKey, Team[]>>>({});
  const [playing, setPlaying] = useState(false);
  const [round, setRound] = useState(0);

  const active = comp[slot];
  const teams = lists[active] ?? null;

  useEffect(() => {
    if (lists[active]) return;
    let alive = true;
    void loadComp(active).then((t) => alive && setLists((l) => ({ ...l, [active]: t })));
    return () => {
      alive = false;
    };
  }, [active, lists]);

  const same = (a: Pick | null, b: Pick | null) => !!a && !!b && a.comp === b.comp && a.team.id === b.team.id;
  const mine = pick.mine;
  const opp = pick.opp;

  function choose(t: Team) {
    const next: Pick = { team: t, comp: active };
    if (slot === "opp" && same(next, mine)) return;
    if (slot === "mine" && same(next, opp)) return;
    setPick((p) => ({ ...p, [slot]: next }));
    if (slot === "mine" && !opp) {
      setSlot("opp");
      setComp((c) => ({ ...c, opp: active }));
    }
  }

  async function randomOpponent() {
    const k = comp.opp;
    const list = lists[k] ?? (await loadComp(k));
    setLists((l) => ({ ...l, [k]: list }));
    const pool = list.filter((t) => !same({ team: t, comp: k }, mine));
    if (pool.length) setPick((p) => ({ ...p, opp: { team: pool[Math.floor(Math.random() * pool.length)], comp: k } }));
  }

  if (playing && mine && opp) {
    return (
      <MatchFlow
        key={round}
        mine={mine.team}
        opp={opp.team}
        label="Amistoso"
        onBack={() => setPlaying(false)}
        onDone={(r) => {
          onRecord(r);
          setPlaying(false);
          setRound((n) => n + 1);
        }}
      />
    );
  }

  return (
    <div className="space-y-3">
      <section className="pes-panel">
        <PesTitle kicker="Amistoso" title="Monte o confronto" />
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <SlotCard slot="mine" pick={mine} active={slot === "mine"} onClick={() => setSlot("mine")} />
          <b className="pes-title grid h-10 w-10 place-items-center rounded-full border-2 border-white/70 bg-[#050a18] text-sm shadow-[0_0_16px_rgba(255,255,255,0.35)]">VS</b>
          <SlotCard slot="opp" pick={opp} active={slot === "opp"} onClick={() => setSlot("opp")} />
        </div>
        {mine && opp ? (
          <button type="button" className="pes-card pes-cut mt-3 w-full bg-gradient-to-r from-emerald-400 to-emerald-600 py-3.5 text-lg font-black uppercase italic tracking-wider text-[#04200f] shadow-[0_0_22px_rgba(52,211,153,0.5)]" onClick={() => setPlaying(true)}>
            ▶ Escalar e jogar
          </button>
        ) : (
          <p className="mt-3 text-center text-[11px] font-black uppercase tracking-widest text-white/50">{!mine ? "Escolha o seu time" : "Agora escolha o adversário"}</p>
        )}
      </section>

      <section className="pes-panel">
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-300">{slot === "mine" ? "Escolhendo: seu time" : "Escolhendo: adversário"}</p>
          {slot === "opp" ? (
            <button type="button" onClick={() => void randomOpponent()} className="pes-card rounded-md bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-wide">
              🎲 Sortear
            </button>
          ) : null}
        </div>
        <CompTabs value={active} onChange={(k) => setComp((c) => ({ ...c, [slot]: k }))} />
        <div className="mt-2">
          {!teams ? (
            <p className="p-3 text-sm font-bold text-white/60">Carregando…</p>
          ) : (
            <TeamGrid teams={teams} selectedId={pick[slot] && pick[slot]!.comp === active ? pick[slot]!.team.id : null} onSelect={choose} />
          )}
        </div>
      </section>

      <button type="button" onClick={onBack} className="btn btn-ghost w-full">
        ← Voltar
      </button>
    </div>
  );
}
