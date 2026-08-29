import { Card, EmptyState, PageHeader } from "@/components/ui";
import { Avatar } from "@/components/Avatar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatXp } from "@/lib/types";

type Row = { id: string; full_name: string; avatar_url: string | null; elo_id: string | null; xp: number };

/** Ranking global de crias (todos os ELOS juntos) — tela do modo responsável (só leitura). */
export default async function RankingCriasPage() {
  await requireRole("guardian");
  const supabase = await createClient();

  const [rankingRes, elosRes] = await Promise.all([
    supabase.rpc("global_cria_ranking"),
    supabase.from("elos").select("id, name"),
  ]);

  const eloNameById = new Map(
    ((elosRes.data ?? []) as { id: string; name: string }[]).map((e) => [e.id, e.name]),
  );
  const ranking = (rankingRes.data ?? []) as Row[];

  return (
    <>
      <PageHeader title="Ranking Geral de Crias" subtitle="Todos os ELOS juntos, por XP." />

      {ranking.length === 0 ? (
        <EmptyState>Ninguém pontuou ainda.</EmptyState>
      ) : (
        <Card className="!p-2">
          <ol>
            {ranking.map((r, i) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="w-6 shrink-0 text-sm font-bold tabular-nums text-[var(--muted)]">
                    {i + 1}º
                  </span>
                  <Avatar url={r.avatar_url} name={r.full_name} size={28} />
                  <span className="min-w-0">
                    <span className="block truncate">{r.full_name || "Sem nome"}</span>
                    <span className="block truncate text-xs text-[var(--muted)]">
                      {(r.elo_id && eloNameById.get(r.elo_id)) || "Sem Elo"}
                    </span>
                  </span>
                </span>
                <span className="shrink-0 tabular-nums">{formatXp(r.xp)} XP</span>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </>
  );
}
