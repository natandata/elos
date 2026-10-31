"use client";

import { useState, useTransition } from "react";
import { moveTribeMember } from "@/lib/actions/event";
import { TRIBES, TRIBE_KEYS, type TribeKey } from "@/lib/event/tribes";

export type BoardPerson = { id: string; name: string; leader: boolean; tribe: TribeKey | null; seenAt: string | null; views: number };
export type BoardTribe = { key: TribeKey; rank: number; points: number };

const when = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
type Zone = TribeKey | "none";

/** Tribos do Dashboard: arraste o nome para outra tribo, ou para "Sem tribo" (neutro). No celular, use o seletor ao lado do nome. */
export function TribeBoard({ initial, tribes }: { initial: BoardPerson[]; tribes: BoardTribe[] }) {
  const [people, setPeople] = useState(initial);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<Zone | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [, start] = useTransition();

  const move = (id: string, to: Zone) => {
    const target: TribeKey | null = to === "none" ? null : to;
    const before = people.find((p) => p.id === id);
    if (!before || before.tribe === target) return;
    setPeople((list) => list.map((p) => (p.id === id ? { ...p, tribe: target } : p)));
    setMsg(null);
    start(async () => {
      const r = await moveTribeMember(id, to);
      if (r.error) {
        setPeople((list) => list.map((p) => (p.id === id ? { ...p, tribe: before.tribe } : p)));
        setMsg(r.error);
      }
    });
  };

  const inZone = (z: Zone) =>
    people
      .filter((p) => (z === "none" ? !p.tribe : p.tribe === z))
      .sort((a, b) => Number(b.leader) - Number(a.leader) || a.name.localeCompare(b.name));
  const info = new Map(tribes.map((t) => [t.key, t]));

  const zoneProps = (z: Zone) => ({
    onDragOver: (e: React.DragEvent) => {
      if (!dragId) return;
      e.preventDefault();
      setOver(z);
    },
    onDragLeave: () => setOver((o) => (o === z ? null : o)),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      const id = dragId ?? e.dataTransfer.getData("text/plain");
      setDragId(null);
      setOver(null);
      if (id) move(id, z);
    },
  });

  const row = (p: BoardPerson, soft?: string, dark?: string) => (
    <li
      key={p.id}
      draggable
      onDragStart={(e) => {
        setDragId(p.id);
        e.dataTransfer.setData("text/plain", p.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragEnd={() => {
        setDragId(null);
        setOver(null);
      }}
      className={`flex cursor-grab items-center justify-between gap-2 py-1.5 active:cursor-grabbing ${dragId === p.id ? "opacity-40" : ""}`}
    >
      <span className="min-w-0 truncate">
        <span className="mr-1 text-[var(--muted)]" aria-hidden>⠿</span>
        {p.name}
        {p.leader ? <span className="ml-1 rounded-full px-1.5 text-[10px] font-bold" style={{ background: soft ?? "var(--line)", color: dark ?? "inherit" }}>Líder</span> : null}
      </span>
      <span className="flex shrink-0 items-center gap-1.5">
        {p.tribe ? (
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${p.seenAt ? "bg-emerald-500/15 text-emerald-700" : "bg-amber-500/15 text-amber-700"}`} title={p.seenAt ? `Viu pela 1ª vez em ${when(p.seenAt)} · ${p.views}x` : undefined}>
            {p.seenAt ? `viu ${when(p.seenAt)}` : "ainda não viu"}
          </span>
        ) : null}
        <select aria-label={`Mover ${p.name}`} value={p.tribe ?? "none"} onChange={(e) => move(p.id, e.target.value as Zone)} className="w-7 cursor-pointer appearance-none rounded-md border border-[var(--line)] bg-transparent py-0.5 text-center text-xs text-[var(--muted)] sm:hidden">
          {TRIBE_KEYS.map((k) => <option key={k} value={k}>{TRIBES[k].name}</option>)}
          <option value="none">Sem tribo</option>
        </select>
      </span>
    </li>
  );

  const ring = (z: Zone, color: string) => (over === z ? { outline: `3px dashed ${color}`, outlineOffset: "-3px" } : undefined);
  const neutral = inZone("none");

  return (
    <div>
      {msg ? <p className="mb-2 text-sm font-bold text-rose-600">{msg}</p> : null}
      <p className="mb-2 hidden text-xs text-[var(--muted)] sm:block">Arraste um nome para outra tribo, ou para “Sem tribo” para deixar a pessoa neutra.</p>
      <div className="grid gap-3 lg:grid-cols-3">
        {TRIBE_KEYS.map((k) => {
          const t = TRIBES[k];
          const list = inZone(k);
          const viu = list.filter((p) => p.seenAt).length;
          const i = info.get(k);
          return (
            <div key={k} {...zoneProps(k)} className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--card)]" style={ring(k, t.base)}>
              <div className="flex items-center gap-3 px-4 py-3" style={{ background: t.base, color: t.dark }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.img} alt="" width={44} height={44} />
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-black leading-tight">{t.name}</p>
                  <p className="text-xs font-semibold">{i?.rank ?? 1}º lugar · {list.length} integrantes · {i?.points ?? 0} pts</p>
                </div>
              </div>
              <p className="border-b border-[var(--line)] px-4 py-2 text-xs font-semibold text-[var(--muted)]">{viu} de {list.length} já viram a tribo</p>
              <ul className="divide-y divide-[var(--line)] px-4 pb-2 text-sm">
                {list.map((p) => row(p, t.soft, t.dark))}
                {list.length === 0 ? <li className="py-3 text-xs text-[var(--muted)]">Solte alguém aqui.</li> : null}
              </ul>
            </div>
          );
        })}
      </div>
      <div {...zoneProps("none")} className="mt-3 overflow-hidden rounded-2xl border border-dashed border-[var(--line)] bg-[var(--card)]" style={ring("none", "var(--muted)")}>
        <p className="border-b border-[var(--line)] px-4 py-2 text-sm font-extrabold">Sem tribo (neutro) <span className="font-semibold text-[var(--muted)]">· {neutral.length}</span></p>
        <p className="px-4 pt-2 text-xs text-[var(--muted)]">Quem está aqui não vê tema, etiqueta nem card do evento e não entra no sorteio.</p>
        <ul className="grid gap-x-6 px-4 pb-2 text-sm sm:grid-cols-2">
          {neutral.map((p) => row(p))}
          {neutral.length === 0 ? <li className="py-3 text-xs text-[var(--muted)]">Ninguém neutro. Solte aqui para tirar alguém da tribo.</li> : null}
        </ul>
      </div>
    </div>
  );
}
