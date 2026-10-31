import Link from "next/link";
import { isTribeKey, type EventState, type TribeKey } from "@/lib/event/tribes";
import { createClient } from "@/lib/supabase/server";
import { TribeBoard, type BoardPerson } from "./TribeBoard";

type Row = { user_id: string; tribe: string; seen_at: string | null; views: number };

/** Bloco do Dashboard do admin: as tribos, os integrantes (arrastar para mover ou tirar) e quem já viu a própria tribo (card pós-login). */
export async function EventDashboard() {
  const supabase = await createClient();
  const [stateRes, memRes, profRes] = await Promise.all([
    supabase.rpc("event_state"),
    supabase.from("event_members").select("user_id, tribe, seen_at, views").limit(1000),
    supabase.from("profiles").select("id, full_name, role").in("role", ["cria", "leader"]).eq("approved", true).neq("is_test_account", true).limit(1000),
  ]);
  const state = (stateRes.data ?? { visible: false }) as EventState;
  const rows = ((memRes.data ?? []) as unknown as Row[]).filter((r) => isTribeKey(r.tribe));
  if (!state.visible || rows.length === 0) return null;

  const byId = new Map(rows.map((r) => [r.user_id, r]));
  const board: BoardPerson[] = ((profRes.data ?? []) as { id: string; full_name: string | null; role: string }[]).map((p) => {
    const m = byId.get(p.id);
    return { id: p.id, name: p.full_name || "Sem nome", leader: p.role === "leader", tribe: m ? (m.tribe as TribeKey) : null, seenAt: m?.seen_at ?? null, views: m?.views ?? 0 };
  });

  const seen = rows.filter((r) => r.seen_at).length;
  const pct = Math.round((seen / rows.length) * 100);

  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Acampadentro · tribos</h2>
        <Link href="/app/admin/acampadentro" className="text-xs font-semibold text-[var(--accent-strong)]">gerenciar →</Link>
      </div>
      <div className="card mb-3 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-bold">Quem já viu a própria tribo</p>
          <p className="text-sm font-black tabular-nums">{seen} de {rows.length} <span className="text-xs font-semibold text-[var(--muted)]">({pct}%)</span></p>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[var(--line)]"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} /></div>
        <p className="mt-1.5 text-xs text-[var(--muted)]">Conta quando a pessoa abre o card “Você é da tribo” depois do login. Faltam {state.days_left ?? 0} dia(s) para o evento.</p>
      </div>
      <TribeBoard initial={board} tribes={(state.tribes ?? []).map((t) => ({ key: t.key, rank: t.rank, points: t.points }))} />
    </section>
  );
}
