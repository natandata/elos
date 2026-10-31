"use client";

import { useState, useTransition } from "react";
import { awardTribePoints, moveTribeMember, runTribeDraw, saveEventMission, setEventActive, setEventMissionActive, undoTribePoints } from "@/lib/actions/event";
import { TRIBES, TRIBE_KEYS, type TribeKey } from "@/lib/event/tribes";

export type AdminTribe = { key: TribeKey; points: number; members: number; rank: number };
export type AdminMember = { id: string; name: string; role: string; elo: string; tribe: TribeKey | null; seenAt?: string | null };
export type AdminMission = { id: string; title: string; description: string | null; points: number; active: boolean };
export type AdminPoint = { id: string; tribe: TribeKey; points: number; reason: string; at: string };

/** Painel do admin do evento das tribos: interruptor, placar, sorteio, missões especiais, lançamento de pontos e pessoas por tribo. */
export function EventAdmin({ active, drawn, tribes, members, missions, points, daysLeft }: { active: boolean; drawn: boolean; tribes: AdminTribe[]; members: AdminMember[]; missions: AdminMission[]; points: AdminPoint[]; daysLeft: number }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const run = (fn: () => Promise<{ ok?: boolean; error?: string; message?: string }>) =>
    start(async () => {
      const r = await fn();
      setMsg(r.error ? { ok: false, text: r.error } : { ok: true, text: r.message ?? "Feito." });
    });

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [pts, setPts] = useState("50");
  const [tribe, setTribe] = useState<TribeKey>("feras");
  const [manualPts, setManualPts] = useState("");
  const [reason, setReason] = useState("");
  const [filter, setFilter] = useState<TribeKey | "none" | "all">("all");

  const shown = members.filter((m) => (filter === "all" ? true : filter === "none" ? !m.tribe : m.tribe === filter));

  return (
    <div className="space-y-6">
      <section className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-extrabold">Evento {active ? "ligado" : "desligado"}</p>
            <p className="text-xs text-[var(--muted)]">
              {active ? `Os usuários veem a tribo, o tema e o card. Faltam ${daysLeft} dia(s). Termina em 13/11 às 23h59.` : "Ninguém além de você e das contas de teste vê o evento."}
            </p>
          </div>
          <button type="button" disabled={pending || (!active && !drawn)} onClick={() => run(() => setEventActive(!active))} className={`btn ${active ? "btn-ghost" : "btn-primary"} !px-4 !py-2 text-sm disabled:opacity-50`}>
            {active ? "Desligar evento" : "Ligar evento"}
          </button>
        </div>
        {!drawn ? <p className="mt-2 text-xs font-semibold text-amber-600">Faça o sorteio antes de ligar.</p> : null}
        {msg ? <p className={`mt-2 text-sm font-bold ${msg.ok ? "text-emerald-600" : "text-rose-600"}`}>{msg.text}</p> : null}
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {tribes.map((t) => {
          const d = TRIBES[t.key];
          return (
            <div key={t.key} className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--card)]">
              <div className="flex items-center gap-3 px-4 py-3" style={{ background: d.base, color: d.dark }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={d.img} alt="" width={44} height={44} />
                <div>
                  <p className="text-lg font-black leading-tight">{d.name}</p>
                  <p className="text-xs font-semibold">{t.rank}º lugar · {t.members} integrantes</p>
                </div>
              </div>
              <p className="px-4 py-3 text-3xl font-black tabular-nums">{t.points} <span className="text-sm font-semibold text-[var(--muted)]">pontos</span></p>
            </div>
          );
        })}
      </section>

      <section className="card space-y-3 p-4">
        <h2 className="text-sm font-extrabold">Sorteio</h2>
        <p className="text-xs text-[var(--muted)]">Equilibrado por Elo, só cria e líder aprovados (sem admin e sem contas de teste). Quem já tem tribo não muda; quem entrar depois cai na tribo com menos gente do Elo.</p>
        <button type="button" disabled={pending} onClick={() => confirm("Sortear quem ainda não tem tribo?") && run(() => runTribeDraw())} className="btn btn-primary !px-4 !py-2 text-sm disabled:opacity-50">
          {drawn ? "Sortear quem ainda está sem tribo" : "Fazer o sorteio"}
        </button>
      </section>

      <section className="card space-y-3 p-4">
        <h2 className="text-sm font-extrabold">Lançar pontos para uma tribo</h2>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs font-semibold">Tribo
            <select value={tribe} onChange={(e) => setTribe(e.target.value as TribeKey)} className="input mt-1 block">
              {TRIBE_KEYS.map((k) => <option key={k} value={k}>{TRIBES[k].name}</option>)}
            </select>
          </label>
          <label className="w-24 text-xs font-semibold">Pontos
            <input value={manualPts} onChange={(e) => setManualPts(e.target.value)} inputMode="numeric" placeholder="50" className="input mt-1 block w-full" />
          </label>
          <label className="min-w-[180px] flex-1 text-xs font-semibold">Motivo
            <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={160} placeholder="Ex.: Louvor da tribo" className="input mt-1 block w-full" />
          </label>
          <button type="button" disabled={pending} onClick={() => run(async () => { const r = await awardTribePoints(tribe, Number(manualPts), reason); if (r.ok) { setManualPts(""); setReason(""); } return r; })} className="btn btn-primary !px-4 !py-2 text-sm disabled:opacity-50">Lançar</button>
        </div>
        <p className="text-xs text-[var(--muted)]">Use valor negativo para descontar.</p>
      </section>

      <section className="card space-y-3 p-4">
        <h2 className="text-sm font-extrabold">Missões especiais do acampadentro</h2>
        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-[160px] flex-1 text-xs font-semibold">Título
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className="input mt-1 block w-full" />
          </label>
          <label className="min-w-[160px] flex-1 text-xs font-semibold">Descrição (opcional)
            <input value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={400} className="input mt-1 block w-full" />
          </label>
          <label className="w-24 text-xs font-semibold">Pontos
            <input value={pts} onChange={(e) => setPts(e.target.value)} inputMode="numeric" className="input mt-1 block w-full" />
          </label>
          <button type="button" disabled={pending} onClick={() => run(async () => { const r = await saveEventMission(title, desc, Number(pts)); if (r.ok) { setTitle(""); setDesc(""); } return r; })} className="btn btn-primary !px-4 !py-2 text-sm disabled:opacity-50">Criar missão</button>
        </div>
        {missions.length === 0 ? <p className="text-sm text-[var(--muted)]">Nenhuma missão ainda.</p> : null}
        <ul className="space-y-2">
          {missions.map((m) => (
            <li key={m.id} className={`rounded-xl border border-[var(--line)] p-3 ${m.active ? "" : "opacity-50"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold">{m.title} <span className="font-semibold text-[var(--muted)]">· {m.points} pts</span></p>
                  {m.description ? <p className="text-xs text-[var(--muted)]">{m.description}</p> : null}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {m.active ? TRIBE_KEYS.map((k) => (
                    <button key={k} type="button" disabled={pending} onClick={() => run(() => awardTribePoints(k, m.points, m.title, m.id))} className="rounded-full px-2.5 py-1 text-xs font-bold disabled:opacity-50" style={{ background: TRIBES[k].soft, color: TRIBES[k].dark, boxShadow: `inset 0 0 0 1px ${TRIBES[k].base}` }}>
                      +{m.points} {TRIBES[k].name}
                    </button>
                  )) : null}
                  <button type="button" disabled={pending} onClick={() => run(() => setEventMissionActive(m.id, !m.active))} className="text-xs font-bold underline">{m.active ? "Arquivar" : "Reativar"}</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="card space-y-2 p-4">
        <h2 className="text-sm font-extrabold">Últimos lançamentos</h2>
        {points.length === 0 ? <p className="text-sm text-[var(--muted)]">Nada lançado ainda.</p> : null}
        <ul className="divide-y divide-[var(--line)] text-sm">
          {points.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 py-2">
              <span className="min-w-0 truncate"><b style={{ color: TRIBES[p.tribe].dark }}>{TRIBES[p.tribe].name}</b> · {p.reason}</span>
              <span className="flex shrink-0 items-center gap-3"><b className="tabular-nums">{p.points > 0 ? "+" : ""}{p.points}</b>
                <button type="button" disabled={pending} onClick={() => run(() => undoTribePoints(p.id))} className="text-xs underline">desfazer</button></span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-extrabold">Pessoas por tribo ({members.length})</h2>
          <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="input !w-auto text-sm">
            <option value="all">Todas</option>
            {TRIBE_KEYS.map((k) => <option key={k} value={k}>{TRIBES[k].name}</option>)}
            <option value="none">Sem tribo</option>
          </select>
        </div>
        <ul className="divide-y divide-[var(--line)] text-sm">
          {shown.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span className="min-w-0 truncate font-semibold">{m.name} <span className="font-normal text-[var(--muted)]">· {m.role === "leader" ? "Líder" : "Cria"} · {m.elo}</span> <span className={`ml-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${m.seenAt ? "bg-emerald-500/15 text-emerald-700" : "bg-amber-500/15 text-amber-700"}`}>{m.seenAt ? "já viu" : "ainda não viu"}</span></span>
              <select value={m.tribe ?? ""} disabled={pending} onChange={(e) => e.target.value && run(() => moveTribeMember(m.id, e.target.value))} className="input !w-auto !py-1 text-sm">
                {!m.tribe ? <option value="">Sem tribo</option> : null}
                {TRIBE_KEYS.map((k) => <option key={k} value={k}>{TRIBES[k].name}</option>)}
                {m.tribe ? <option value="none">Sem tribo (neutro)</option> : null}
              </select>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
