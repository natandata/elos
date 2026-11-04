import { TRIBES } from "@/lib/event/tribes";
import { getEventState } from "@/lib/event/server";
import { createClient } from "@/lib/supabase/server";

type Mission = { id: string; title: string; description: string | null; points: number };

/** Missões especiais do Acampadentro no topo da tela de início do cria: o que vale pontos para a tribo e se ela já pontuou. */
export async function EventMissionsCard() {
  const state = await getEventState();
  if (!state.visible || !state.me) return null;
  const supabase = await createClient();
  const [misRes, ptsRes] = await Promise.all([
    supabase.from("event_missions").select("id, title, description, points").eq("active", true).order("created_at", { ascending: false }).limit(20),
    supabase.from("event_points").select("mission_id").eq("tribe", state.me).not("mission_id", "is", null).gt("points", 0),
  ]);
  const missions = (misRes.data ?? []) as Mission[];
  if (missions.length === 0) return null;
  const scored = new Set(((ptsRes.data ?? []) as { mission_id: string }[]).map((p) => p.mission_id));
  const t = TRIBES[state.me];

  return (
    <section className="mb-5 overflow-hidden rounded-2xl border-2" style={{ borderColor: t.base, background: t.soft, color: t.dark }}>
      <div className="flex items-center gap-2.5 px-4 py-3" style={{ background: t.base }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={t.img} alt="" width={30} height={30} className="shrink-0" />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-base font-black">Missões do {state.name ?? "Acampadentro"}</p>
          <p className="truncate text-xs font-semibold">Cada missão vale pontos para a tribo {t.name}</p>
        </div>
      </div>
      <ul className="divide-y px-4" style={{ borderColor: t.base }}>
        {missions.map((m) => {
          const done = scored.has(m.id);
          return (
            <li key={m.id} className="flex items-start justify-between gap-3 py-3" style={{ borderColor: t.base }}>
              <div className="min-w-0">
                <p className="text-sm font-extrabold">{m.title}</p>
                {m.description ? <p className="mt-0.5 text-xs font-medium opacity-80">{m.description}</p> : null}
              </div>
              <span className="shrink-0 rounded-full px-2.5 py-1 text-xs font-black" style={{ background: done ? t.base : "transparent", boxShadow: `inset 0 0 0 1.5px ${t.base}` }}>
                {done ? `✓ +${m.points} pts` : `+${m.points} pts`}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
