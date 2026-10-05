import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { dayStartISO, todayBR } from "@/lib/arena/missionsServer";
import { createAdminClient } from "@/lib/supabase/admin";

/** Mesmo limite de startArena (partidas contra o computador por dia). */
const DAILY_LIMIT = 54;

type Row = { id: string; name: string; elo: string; cpu: number; training: number; pvp: number; duo: number };

export default async function AdminArenaPage() {
  await requireRole("admin");
  const admin = createAdminClient();
  if (!admin) return <p className="card p-4 text-sm font-bold">Falta a chave de serviço do banco no servidor.</p>;

  const day = todayBR();
  const since = dayStartISO(day);
  const [cpuRes, pvpRes, duoRes] = await Promise.all([
    admin.from("arena_matches").select("user_id, training").eq("play_date", day),
    admin.from("arena_pvp").select("challenger_id, opponent_id").eq("status", "finished").is("tournament_match_id", null).gte("finished_at", since),
    admin.from("arena_duo").select("players").eq("status", "finished").is("tournament_match_id", null).gte("finished_at", since),
  ]);

  const stat = new Map<string, Omit<Row, "id" | "name" | "elo">>();
  const get = (id: string) => {
    let s = stat.get(id);
    if (!s) stat.set(id, (s = { cpu: 0, training: 0, pvp: 0, duo: 0 }));
    return s;
  };
  for (const m of (cpuRes.data ?? []) as { user_id: string; training: boolean }[]) {
    const s = get(m.user_id);
    s.cpu++;
    if (m.training) s.training++;
  }
  for (const m of (pvpRes.data ?? []) as { challenger_id: string; opponent_id: string }[]) {
    get(m.challenger_id).pvp++;
    get(m.opponent_id).pvp++;
  }
  for (const m of (duoRes.data ?? []) as { players: string[] }[]) for (const p of m.players) get(p).duo++;

  const ids = [...stat.keys()];
  const { data: people } = ids.length > 0 ? await admin.from("profiles").select("id, full_name, elo_id").in("id", ids) : { data: [] };
  const { data: elos } = await admin.from("elos").select("id, name");
  const eloName = new Map(((elos ?? []) as { id: string; name: string }[]).map((e) => [e.id, e.name]));
  const rows: Row[] = ((people ?? []) as { id: string; full_name: string; elo_id: string | null }[])
    .map((p) => ({ id: p.id, name: p.full_name || "Sem nome", elo: p.elo_id ? (eloName.get(p.elo_id) ?? "—") : "—", ...stat.get(p.id)! }))
    .sort((a, b) => b.cpu - a.cpu || b.pvp + b.duo - (a.pvp + a.duo) || a.name.localeCompare(b.name));

  const total = rows.reduce((n, r) => n + r.cpu, 0);
  const atLimit = rows.filter((r) => r.cpu >= DAILY_LIMIT).length;

  return (
    <>
      <PageHeader title="🏰 Arena dos Heróis · hoje" subtitle={`Partidas jogadas por cada jogador hoje. O limite contra o computador é de ${DAILY_LIMIT} por dia (treino conta).`} />
      <div className="mb-4 grid grid-cols-3 gap-2 text-center">
        <div className="card p-3">
          <p className="text-2xl font-black tabular-nums">{rows.length}</p>
          <p className="text-xs font-bold text-[var(--muted)]">jogaram hoje</p>
        </div>
        <div className="card p-3">
          <p className="text-2xl font-black tabular-nums">{total}</p>
          <p className="text-xs font-bold text-[var(--muted)]">partidas vs computador</p>
        </div>
        <div className="card p-3">
          <p className="text-2xl font-black tabular-nums">{atLimit}</p>
          <p className="text-xs font-bold text-[var(--muted)]">no limite de {DAILY_LIMIT}</p>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="card p-4 text-center text-sm font-bold text-[var(--muted)]">Ninguém jogou na Arena hoje ainda.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="card p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 leading-tight">
                  <span className="block truncate text-sm font-black">{r.name}</span>
                  <span className="block truncate text-xs text-[var(--muted)]">{r.elo}</span>
                </span>
                <span className={`shrink-0 text-lg font-black tabular-nums ${r.cpu >= DAILY_LIMIT ? "text-rose-600" : ""}`}>
                  {r.cpu}/{DAILY_LIMIT}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--line)]">
                <div className={`h-full rounded-full ${r.cpu >= DAILY_LIMIT ? "bg-rose-500" : "bg-[var(--accent)]"}`} style={{ width: `${Math.min(100, (r.cpu / DAILY_LIMIT) * 100)}%` }} />
              </div>
              <p className="mt-1.5 text-xs font-semibold text-[var(--muted)]">
                vs computador {r.cpu}
                {r.training > 0 ? ` (${r.training} de treino)` : ""} · 1x1 {r.pvp} · duplas {r.duo}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
