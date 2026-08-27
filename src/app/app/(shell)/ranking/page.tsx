import { Card, EmptyState, PageHeader } from "@/components/ui";
import { Avatar } from "@/components/Avatar";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatXp } from "@/lib/types";

type LeaderRow = {
  leader_id: string;
  leader_name: string;
  leader_avatar_url: string | null;
  elo_id: string | null;
  elo_name: string | null;
  missions_created: number;
  missions_xp: number;
  missions_completed: number;
};

/**
 * O líder não disputa o ranking de XP dos crias: ele é responsável pelo Elo.
 * Por isso a página muda de acordo com o papel — o líder vê primeiro o ranking
 * entre líderes (missões criadas > nível das missões > missões concluídas
 * pelos crias), e o cria vê primeiro o próprio ranking de XP.
 */
export default async function MeuEloPage() {
  const { profile } = await requireProfile();
  const supabase = await createClient();
  const isLeader = profile.role === "leader";

  const [eloRes, leadersRes, criasRes, rankingRes, leaderRankRes] = await Promise.all([
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
    isLeader ? supabase.rpc("leader_rankings") : Promise.resolve({ data: [] }),
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

  // desempate em cascata: criadas > nível (XP) > concluídas pelos crias
  const leaderRanking = ((leaderRankRes.data ?? []) as LeaderRow[])
    .map((r) => ({
      ...r,
      missions_created: Number(r.missions_created),
      missions_xp: Number(r.missions_xp),
      missions_completed: Number(r.missions_completed),
    }))
    .sort(
      (a, b) =>
        b.missions_created - a.missions_created ||
        b.missions_xp - a.missions_xp ||
        b.missions_completed - a.missions_completed ||
        a.leader_name.localeCompare(b.leader_name),
    );

  const criasRanking = (
    <section>
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
        {isLeader ? "Ranking dos crias do Elo" : "Ranking dos crias"}
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
  );

  const leadersRanking = (
    <section>
      <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
        Ranking entre líderes
      </h2>
      <p className="mb-2 text-xs text-[var(--muted)]">
        Missões criadas, depois o nível delas (XP) e por fim quantas os crias concluíram.
      </p>
      {leaderRanking.length === 0 ? (
        <EmptyState>Ranking entre líderes indisponível.</EmptyState>
      ) : (
        <Card className="!p-2">
          <ol>
            {leaderRanking.map((l, i) => (
              <li
                key={l.leader_id}
                className={`rounded-xl px-3 py-2.5 ${
                  l.leader_id === profile.id
                    ? "bg-[var(--accent-soft)] font-bold text-[var(--accent-strong)]"
                    : ""
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="w-6 shrink-0 text-sm font-bold tabular-nums text-[var(--muted)]">
                      {i + 1}º
                    </span>
                    <Avatar url={l.leader_avatar_url} name={l.leader_name} size={28} />
                    <span className="min-w-0">
                      <span className="block truncate">{l.leader_name || "Sem nome"}</span>
                      <span className="block truncate text-xs font-normal text-[var(--muted)]">
                        {l.elo_name ?? "Sem Elo"}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-xs tabular-nums text-[var(--muted)]">
                    <span className="block">{l.missions_created} missões</span>
                    <span className="block">{formatXp(l.missions_xp)} XP · {l.missions_completed} concluídas</span>
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </section>
  );

  const elosRanking = (
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
  );

  const myLeaderStats = leaderRanking.find((l) => l.leader_id === profile.id);
  const myLeaderPos = leaderRanking.findIndex((l) => l.leader_id === profile.id) + 1;

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
                    <span className="font-semibold">
                      {l.full_name || "Sem nome"}
                      {l.id === profile.id ? (
                        <span className="ml-1 text-xs font-normal text-[var(--muted)]">(você)</span>
                      ) : null}
                    </span>
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

      {isLeader ? (
        <>
          {/* o líder não pontua com XP: ele é medido pelo trabalho de liderança */}
          <Card className="mb-6">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
              Sua liderança
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <p className="text-2xl font-bold tabular-nums">{myLeaderPos || "—"}º</p>
                <p className="text-xs text-[var(--muted)]">entre líderes</p>
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">
                  {myLeaderStats?.missions_created ?? 0}
                </p>
                <p className="text-xs text-[var(--muted)]">missões criadas</p>
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">
                  {formatXp(myLeaderStats?.missions_xp ?? 0)}
                </p>
                <p className="text-xs text-[var(--muted)]">XP em missões</p>
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">
                  {myLeaderStats?.missions_completed ?? 0}
                </p>
                <p className="text-xs text-[var(--muted)]">concluídas pelos crias</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-[var(--muted)]">
              Líderes não entram no ranking de XP — quem pontua são os crias, com as missões que
              você cria.
            </p>
          </Card>

          <div className="mb-6">{leadersRanking}</div>
          <div className="mb-6">{criasRanking}</div>
          {elosRanking}
        </>
      ) : (
        <>
          <div className="mb-6">{criasRanking}</div>
          {elosRanking}
        </>
      )}
    </>
  );
}
