import Link from "next/link";
import { isTribeKey, TRIBES, TRIBE_KEYS, type EventState, type TribeKey } from "@/lib/event/tribes";
import { createClient } from "@/lib/supabase/server";

type Row = { user_id: string; tribe: string; seen_at: string | null; views: number; profiles: { full_name: string | null; role: string } | null };

const when = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/** Bloco do Dashboard do admin: as tribos, os integrantes de cada uma e quem já viu a própria tribo (card pós-login). */
export async function EventDashboard() {
  const supabase = await createClient();
  const [stateRes, memRes] = await Promise.all([
    supabase.rpc("event_state"),
    supabase.from("event_members").select("user_id, tribe, seen_at, views, profiles:user_id(full_name, role)").limit(1000),
  ]);
  const state = (stateRes.data ?? { visible: false }) as EventState;
  const rows = ((memRes.data ?? []) as unknown as Row[]).filter((r) => isTribeKey(r.tribe));
  if (!state.visible || rows.length === 0) return null;

  const seen = rows.filter((r) => r.seen_at).length;
  const pct = Math.round((seen / rows.length) * 100);
  const byTribe = (k: TribeKey) =>
    rows
      .filter((r) => r.tribe === k)
      .sort((a, b) => Number(b.profiles?.role === "leader") - Number(a.profiles?.role === "leader") || (a.profiles?.full_name ?? "").localeCompare(b.profiles?.full_name ?? ""));
  const totals = new Map((state.tribes ?? []).map((t) => [t.key, t]));

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
      <div className="grid gap-3 lg:grid-cols-3">
        {TRIBE_KEYS.map((k) => {
          const t = TRIBES[k];
          const list = byTribe(k);
          const viu = list.filter((r) => r.seen_at).length;
          const info = totals.get(k);
          return (
            <div key={k} className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--card)]">
              <div className="flex items-center gap-3 px-4 py-3" style={{ background: t.base, color: t.dark }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.img} alt="" width={44} height={44} />
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-black leading-tight">{t.name}</p>
                  <p className="text-xs font-semibold">{info?.rank ?? 1}º lugar · {list.length} integrantes · {info?.points ?? 0} pts</p>
                </div>
              </div>
              <p className="border-b border-[var(--line)] px-4 py-2 text-xs font-semibold text-[var(--muted)]">{viu} de {list.length} já viram a tribo</p>
              <details>
                <summary className="cursor-pointer px-4 py-2 text-xs font-bold text-[var(--accent-strong)]">Ver integrantes</summary>
                <ul className="divide-y divide-[var(--line)] px-4 pb-2 text-sm">
                  {list.map((r) => (
                    <li key={r.user_id} className="flex items-center justify-between gap-2 py-1.5">
                      <span className="min-w-0 truncate">
                        {r.profiles?.full_name || "Sem nome"}
                        {r.profiles?.role === "leader" ? <span className="ml-1 rounded-full px-1.5 text-[10px] font-bold" style={{ background: t.soft, color: t.dark }}>Líder</span> : null}
                      </span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${r.seen_at ? "bg-emerald-500/15 text-emerald-700" : "bg-amber-500/15 text-amber-700"}`} title={r.seen_at ? `Viu pela 1ª vez em ${when(r.seen_at)} · ${r.views}x` : undefined}>
                        {r.seen_at ? `viu ${when(r.seen_at)}` : "ainda não viu"}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          );
        })}
      </div>
    </section>
  );
}
