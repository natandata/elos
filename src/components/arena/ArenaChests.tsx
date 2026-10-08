"use client";

import { useState } from "react";
import { openArenaChest } from "@/lib/actions/arena";
import { ARENA_CARD_BY_KEY } from "@/lib/arena/cards";
import { CHESTS, type ChestDef, type CopyGrant } from "@/lib/arena/economy";
import { CardArt } from "./CardArt";
import { ChestIcon } from "./ArenaIcons";
import { AT } from "./ArenaText";

const VARIANT = { daily: "wood", cedro: "wood", templo: "gold", arca: "ark" } as const;

/** Baú da Arena (grátis, 1x por dia) e baús comprados com troféus. */
export function ArenaChests({
  trophies,
  dailyReady,
  onOpened,
}: {
  trophies: number;
  dailyReady: boolean;
  onOpened: (kind: ChestDef["kind"], grants: CopyGrant[], trophies: number) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opened, setOpened] = useState<{ chest: ChestDef; grants: CopyGrant[] } | null>(null);

  async function open(chest: ChestDef) {
    if (busy) return;
    setBusy(chest.kind);
    setError(null);
    try {
      const r = await openArenaChest(chest.kind);
      if (r.error || !r.grants || typeof r.trophies !== "number") {
        setError(r.error ?? "Não foi possível abrir o baú.");
        return;
      }
      setOpened({ chest, grants: r.grants });
      onOpened(chest.kind, r.grants, r.trophies);
    } catch {
      setError("Sem conexão. Tente de novo.");
    } finally {
      setBusy(null);
    }
  }

  if (opened) {
    return (
      <div className="text-center">
        <div className="flex justify-center">
          <ChestIcon variant={VARIANT[opened.chest.kind]} open className="h-20 w-auto" />
        </div>
        <p className="mt-1 text-lg font-black">{opened.chest.name} aberto!</p>
        <ul className="mt-3 grid grid-cols-2 gap-2">
          {opened.grants.map((g) => {
            const c = ARENA_CARD_BY_KEY.get(g.card);
            if (!c) return null;
            return (
              <li key={g.card} className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-2 text-amber-900">
                <div className="flex h-14 items-end justify-center">
                  <CardArt card={c} className="h-14" />
                </div>
                <p className="mt-1 text-xs font-bold">{c.name}</p>
                <p className="text-base font-black">+{g.n}</p>
              </li>
            );
          })}
        </ul>
        <button type="button" onClick={() => setOpened(null)} className="btn btn-primary mt-4 w-full !py-3">
          Continuar
        </button>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-[var(--muted)]">
        Cada carta junta cópias pra evoluir (até o nível 15). Baús comprados com troféus trazem mais cartas que o Baú da Arena e que uma vitória. Todo baú tem 25% de chance de trazer um herói de baú (Adão, Eva, Jacó, Isaque, Isaías, Jeremias ou Nabucodonosor) e 1% de trazer o Jesus, quando você chegar à Nova Jerusalém.
      </p>
      <ul className="space-y-2">
        {CHESTS.map((c) => {
          const free = c.cost === 0;
          const can = free ? dailyReady : trophies >= c.cost;
          return (
            <li key={c.kind} className="card flex items-center gap-3 p-3">
              <ChestIcon variant={VARIANT[c.kind]} className="h-12 w-auto shrink-0" />
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block text-sm font-black">{c.name}</span>
                <span className="block text-xs font-bold text-[var(--muted)]">
                  {c.copies} cartas · {c.stacks} heróis
                </span>
              </span>
              <button
                type="button"
                disabled={!can || busy !== null}
                onClick={() => open(c)}
                className="btn btn-primary shrink-0 !px-3 !py-2 !text-sm disabled:opacity-50"
              >
                {busy === c.kind ? "Abrindo…" : free ? (dailyReady ? "Abrir grátis" : "Volte amanhã") : <AT>{`${c.cost} 🏆`}</AT>}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-center text-xs font-bold text-[var(--muted)]">
        Você tem {trophies}<AT> 🏆. Os troféus gastos saem do seu total (o recorde e as cartas liberadas não mudam).
      </AT></p>
      {error ? <p className="mt-2 text-center text-sm font-semibold text-rose-600">{error}</p> : null}
    </div>
  );
}
