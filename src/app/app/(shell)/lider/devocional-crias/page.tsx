import { Card, Chip, EmptyState, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, relativeDay, type PrayerRequest } from "@/lib/types";

type ProgressRow = {
  cria_id: string;
  full_name: string;
  devotional_streak: number;
  devotional_streak_date: string | null;
  diary_count: number;
  last_diary_date: string | null;
  favorites_count: number;
};

export default async function LeaderDevocionalCriasPage() {
  await requireRole("leader");
  const supabase = await createClient();

  const { data: progressData } = await supabase.rpc("leader_devotional_progress");
  const progress = (progressData ?? []) as ProgressRow[];

  const criaIds = progress.map((p) => p.cria_id);
  const { data: prayersData } = criaIds.length
    ? await supabase
        .from("prayer_requests")
        .select("*")
        .in("user_id", criaIds)
        .order("created_at", { ascending: false })
    : { data: [] };
  const prayers = (prayersData ?? []) as PrayerRequest[];

  const prayersByUser = new Map<string, PrayerRequest[]>();
  prayers.forEach((p) => {
    if (!prayersByUser.has(p.user_id)) prayersByUser.set(p.user_id, []);
    prayersByUser.get(p.user_id)!.push(p);
  });

  const lastActivity = (row: ProgressRow): string | null => {
    const dates = [row.last_diary_date, prayersByUser.get(row.cria_id)?.[0]?.created_at].filter(
      Boolean,
    ) as string[];
    if (!dates.length) return null;
    return dates.sort((a, b) => (a > b ? -1 : 1))[0];
  };

  // Quem tem atividade primeiro (mais recente primeiro); sem nenhuma, por nome.
  const sorted = [...progress].sort((a, b) => {
    const la = lastActivity(a);
    const lb = lastActivity(b);
    if (la && lb) return la > lb ? -1 : 1;
    if (la) return -1;
    if (lb) return 1;
    return a.full_name.localeCompare(b.full_name);
  });

  const activeCount = progress.filter((p) => lastActivity(p)).length;

  return (
    <>
      <PageHeader
        title="Devocional dos Crias"
        subtitle="Acompanhe a ofensiva e os pedidos de oração de quem está sob sua responsabilidade."
      />

      {progress.length === 0 ? (
        <EmptyState>Nenhum cria vinculado a você ainda. A administração faz esse vínculo em Usuários.</EmptyState>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Card className="text-center">
              <p className="text-2xl font-bold tabular-nums">{activeCount}</p>
              <p className="text-xs text-[var(--muted)]">de {progress.length} já usaram</p>
            </Card>
            <Card className="text-center">
              <p className="text-2xl font-bold tabular-nums">
                {progress.reduce((sum, p) => sum + p.diary_count, 0)}
              </p>
              <p className="text-xs text-[var(--muted)]">anotações no diário</p>
            </Card>
            <Card className="text-center">
              <p className="text-2xl font-bold tabular-nums">{prayers.length}</p>
              <p className="text-xs text-[var(--muted)]">pedidos de oração</p>
            </Card>
          </div>

          <div className="space-y-3">
            {sorted.map((row) => {
              const userPrayers = prayersByUser.get(row.cria_id) ?? [];
              const last = lastActivity(row);

              return (
                <Card key={row.cria_id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">{row.full_name || "Sem nome"}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {last ? `Última atividade ${relativeDay(last).toLowerCase()}` : "Nunca usou o devocional"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {row.devotional_streak > 0 ? (
                        <Chip className="border-amber-200 bg-amber-100 text-amber-800">
                          🔥 {row.devotional_streak} {row.devotional_streak === 1 ? "dia" : "dias"}
                        </Chip>
                      ) : null}
                      <Chip className="border-[var(--line)] text-[var(--muted)]">
                        {row.diary_count} anotações
                      </Chip>
                      <Chip className="border-[var(--line)] text-[var(--muted)]">
                        {userPrayers.length} orações
                      </Chip>
                      <Chip className="border-[var(--line)] text-[var(--muted)]">
                        {row.favorites_count} favoritos
                      </Chip>
                    </div>
                  </div>

                  {userPrayers.length > 0 ? (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs font-semibold text-[var(--muted)]">
                        Ver pedidos de oração ({userPrayers.length})
                      </summary>
                      <ul className="mt-3 space-y-2 border-t border-[var(--line)] pt-3">
                        {userPrayers.map((p) => (
                          <li key={p.id} className="rounded-xl border border-[var(--line)] bg-[var(--bg)] p-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-medium">{p.title}</p>
                              {p.is_answered ? (
                                <Chip className="border-emerald-200 bg-emerald-100 text-emerald-800">
                                  Respondido
                                </Chip>
                              ) : null}
                              {p.scope === "elo" ? (
                                <Chip className="border-[var(--line)] text-[var(--muted)]">
                                  Compartilhado com o Elo
                                </Chip>
                              ) : null}
                            </div>
                            <p className="mt-1 text-xs text-[var(--muted)]">{formatDateTime(p.created_at)}</p>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </Card>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
