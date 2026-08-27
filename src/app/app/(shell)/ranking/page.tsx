import { Card, EmptyState, PageHeader } from "@/components/ui";
import { Avatar } from "@/components/Avatar";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatXp } from "@/lib/types";

export default async function MeuEloPage() {
  const { profile } = await requireProfile();
  const supabase = await createClient();

  const [eloRes, leadersRes, criasRes, rankingRes] = await Promise.all([
    profile.elo_id
      ? supabase.from("elos").select("name").eq("id", profile.elo_id).maybeSingle()
      : Promise.resolve({ data: null }),
    profile.elo_id
      ? supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .eq("elo_id", profile.elo_id)
          .eq("role", "leader")
          .eq("approved", true)
          .order("full_name")
      : Promise.resolve({ data: [] }),
    profile.elo_id
      ? supabase
          .from("profiles")
          .select("id, full_name, avatar_url, xp")
          .eq("elo_id", profile.elo_id)
          .eq("role", "cria")
          .order("xp", { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase.rpc("elo_rankings"),
  ]);

  const eloName = (eloRes.data as { name: string } | null)?.name ?? "Sem Elo";
  const leaders = (leadersRes.data ?? []) as {
    id: string;
    full_name: string;
    avatar_url: string | null;
  }[];
  const crias = (criasRes.data ?? []) as {
    id: string;
    full_name: string;
    avatar_url: string | null;
    xp: number;
  }[];
  const top1 = crias[0] ?? null;
  const elos = (rankingRes.data ?? []) as {
    elo_id: string;
    elo_name: string;
    total_xp: number;
    crias: number;
    rank_position: number;
  }[];

  return (
    <>
      <PageHeader title="Meu Elo" subtitle={eloName} />

      {/* destaque: liderança e Top 1 do Elo */}
      <Card className="mb-6 bg-gradient-to-br from-[var(--accent-soft)] to-[var(--card)]">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
              Liderança
            </p>
            {leaders.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--muted)]">Sem líder aprovado ainda.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {leaders.map((l) => (
                  <li key={l.id} className="flex items-center gap-2">
                    <Avatar url={l.avatar_url} name={l.full_name} size={28} />
                    <span className="font-semibold">{l.full_name || "Sem nome"}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
              Top 1 do Elo
            </p>
            {top1 ? (
              <div className="mt-2 flex items-center gap-3">
                <span className="text-2xl" aria-hidden>
                  🏆
                </span>
                <Avatar url={top1.avatar_url} name={top1.full_name} size={36} />
                <div className="min-w-0">
                  <p className="truncate font-bold">{top1.full_name || "Sem nome"}</p>
                  <p className="text-sm tabular-nums text-[var(--muted)]">
                    {formatXp(top1.xp)} XP
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-[var(--muted)]">Ninguém pontuou ainda.</p>
            )}
          </div>
        </div>
      </Card>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
          Ranking dos crias
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
                    <Avatar url={c.avatar_url} name={c.full_name} size={28} />
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
