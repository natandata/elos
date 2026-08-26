import { Card, EmptyState, PageHeader } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatXp } from "@/lib/types";

export default async function RankingPage() {
  const { profile } = await requireProfile();
  const supabase = await createClient();

  const [eloRes, criasRes, rankingRes] = await Promise.all([
    profile.elo_id
      ? supabase.from("elos").select("name").eq("id", profile.elo_id).maybeSingle()
      : Promise.resolve({ data: null }),
    profile.elo_id
      ? supabase
          .from("profiles")
          .select("id, full_name, xp")
          .eq("elo_id", profile.elo_id)
          .eq("role", "cria")
          .order("xp", { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase.rpc("elo_rankings"),
  ]);

  const eloName = (eloRes.data as { name: string } | null)?.name ?? "Sem Elo";
  const crias = (criasRes.data ?? []) as { id: string; full_name: string; xp: number }[];
  const elos = (rankingRes.data ?? []) as {
    elo_id: string;
    elo_name: string;
    total_xp: number;
    crias: number;
    rank_position: number;
  }[];

  return (
    <>
      <PageHeader title="Ranking" subtitle="Cada Elo tem seu próprio ranking." />

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
          {eloName}
        </h2>
        {crias.length === 0 ? (
          <EmptyState>Nenhum cria pontuou neste Elo ainda.</EmptyState>
        ) : (
          <Card className="!p-2">
            <ol>
              {crias.map((c, i) => (
                <li
                  key={c.id}
                  className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 ${
                    c.id === profile.id
                      ? "bg-[var(--accent-soft)] font-bold text-[var(--accent-strong)]"
                      : ""
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="w-6 shrink-0 text-sm font-bold tabular-nums text-[var(--muted)]">
                      {i + 1}º
                    </span>
                    <span className="truncate">{c.full_name || "Sem nome"}</span>
                  </span>
                  <span className="shrink-0 tabular-nums">{formatXp(c.xp)} XP</span>
                </li>
              ))}
            </ol>
          </Card>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
          Entre os ELOS
        </h2>
        {elos.length === 0 ? (
          <EmptyState>Ranking entre ELOS indisponível.</EmptyState>
        ) : (
          <Card className="!p-2">
            <ol>
              {elos.map((e) => (
                <li
                  key={e.elo_id}
                  className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 ${
                    e.elo_id === profile.elo_id
                      ? "bg-[var(--accent-soft)] font-bold text-[var(--accent-strong)]"
                      : ""
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="w-6 shrink-0 text-sm font-bold tabular-nums text-[var(--muted)]">
                      {e.rank_position}º
                    </span>
                    <span className="truncate">{e.elo_name}</span>
                  </span>
                  <span className="shrink-0 text-sm tabular-nums">
                    {formatXp(Number(e.total_xp))} XP
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        )}
      </section>
    </>
  );
}
