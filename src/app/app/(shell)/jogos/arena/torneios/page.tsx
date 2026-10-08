import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { ARENAS } from "@/lib/arena/arenas";
import { normalizePrizes, prizeText } from "@/lib/arena/tournament";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/types";
import { AT } from "@/components/arena/ArenaText";

type Row = { id: string; name: string; format: "solo" | "duo"; arena: number; status: string; max_entries: number | null; prizes: unknown; starts_at: string | null };

const STATUS: Record<string, { label: string; tone: string }> = {
  open: { label: "Inscrições abertas", tone: "bg-emerald-500/15 text-emerald-600" },
  running: { label: "Em andamento", tone: "bg-amber-400/20 text-amber-600" },
  finished: { label: "Terminado", tone: "bg-[var(--line)] text-[var(--muted)]" },
  cancelled: { label: "Cancelado", tone: "bg-rose-500/15 text-rose-600" },
};

export default async function TorneiosPage() {
  await requireRole("cria", "leader", "admin");
  const supabase = await createClient();
  const { data } = await supabase
    .from("arena_tournaments")
    .select("id, name, format, arena, status, max_entries, prizes, starts_at")
    .order("created_at", { ascending: false })
    .limit(40);
  const rows = (data ?? []) as Row[];
  const ids = rows.map((r) => r.id);
  const { data: es } = ids.length > 0 ? await supabase.from("arena_tournament_entries").select("tournament_id, confirmed").in("tournament_id", ids) : { data: [] };
  const counts = new Map<string, number>();
  for (const e of (es ?? []) as { tournament_id: string; confirmed: boolean }[]) if (e.confirmed) counts.set(e.tournament_id, (counts.get(e.tournament_id) ?? 0) + 1);

  const active = rows.filter((r) => r.status === "open" || r.status === "running");
  const past = rows.filter((r) => r.status === "finished" || r.status === "cancelled");

  const card = (r: Row) => {
    const arena = ARENAS[r.arena] ?? ARENAS[0];
    const prizes = normalizePrizes(r.prizes);
    const st = STATUS[r.status] ?? STATUS.open;
    return (
      <li key={r.id}>
        <Link href={`/app/jogos/arena/torneios/${r.id}`} className="card flex items-center gap-3 p-3 active:scale-[0.99]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={arena.art} alt="" className="h-14 w-auto shrink-0" draggable={false} />
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-base font-black">{r.name}</span>
            <span className="block text-xs font-bold text-[var(--muted)]">
              {r.format === "duo" ? <AT>{"👥 Duplas"}</AT> : <AT>{"⚔️ 1x1"}</AT>} · {arena.name}
            </span>
            <span className="block text-xs font-bold text-amber-600"><AT>🥇 </AT><AT>{prizeText(prizes.p1)}</AT></span>
            {r.starts_at ? <span className="block text-[11px] text-[var(--muted)]">Início: {formatDateTime(r.starts_at)}</span> : null}
          </span>
          <span className="flex shrink-0 flex-col items-end gap-1">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${st.tone}`}>{st.label}</span>
            <span className="text-xs font-bold tabular-nums text-[var(--muted)]">
              {counts.get(r.id) ?? 0}
              {r.max_entries ? `/${r.max_entries}` : ""} {r.format === "duo" ? "duplas" : "inscritos"}
            </span>
          </span>
        </Link>
      </li>
    );
  };

  return (
    <>
      <PageHeader title={<AT>🏆 Torneios</AT>} subtitle="Campeonatos da Arena dos Heróis, com prêmios. Inscreva-se e jogue contra outros Elos." />
      {active.length === 0 ? <p className="card p-4 text-center text-sm font-bold text-[var(--muted)]">Nenhum torneio aberto agora. Fique de olho nos avisos!</p> : <ul className="space-y-2">{active.map(card)}</ul>}
      {past.length > 0 ? (
        <>
          <h2 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Anteriores</h2>
          <ul className="space-y-2">{past.map(card)}</ul>
        </>
      ) : null}
      <Link href="/app/jogos/arena" className="btn btn-ghost mt-5 w-full"><AT>
        ← Voltar à Arena
      </AT></Link>
    </>
  );
}
