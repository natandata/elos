import Link from "next/link";
import { Card, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { Avatar } from "@/components/Avatar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { XpBar } from "@/components/XpBar";
import { HojeNoElos } from "@/components/HojeNoElos";
import { StoriesTray } from "@/components/profile/StoriesTray";
import { getEloStoriesTray } from "@/lib/stories";
import {
  STATUS_LABEL,
  STATUS_TONE,
  formatDate,
  formatXp,
  hasBadStatus,
  relativeDay,
  type StatusLevel,
} from "@/lib/types";

// Mesmo formato de public.leader_rankings() já usado em /app/ranking.
type LeaderRankRow = {
  leader_id: string;
  leader_name: string;
  leader_avatar_url: string | null;
  elo_id: string | null;
  elo_name: string | null;
  missions_created: number;
  missions_xp: number;
  missions_completed: number;
};

export default async function LiderDashboard() {
  const { profile } = await requireRole("leader");
  const supabase = await createClient();

  const { data: links } = await supabase
    .from("leader_crias")
    .select("profiles:cria_id(id, full_name, xp, avatar_url)")
    .eq("leader_id", profile.id);

  const crias = ((links ?? []) as unknown as {
    profiles: { id: string; full_name: string; xp: number; avatar_url: string | null } | null;
  }[])
    .map((r) => r.profiles)
    .filter((p): p is { id: string; full_name: string; xp: number; avatar_url: string | null } => Boolean(p))
    .sort((a, b) => b.xp - a.xp);

  const criaIds = crias.map((c) => c.id);
  const idFilter = criaIds.length ? criaIds : ["00000000-0000-0000-0000-000000000000"];

  const [
    eloRes,
    rankRes,
    leaderRankRes,
    statusRes,
    followUpsRes,
    awaitingRes,
    approvedRes,
    activeRes,
    eventsRes,
    presenceRes,
    feedTodayRes,
    dueTodayRes,
  ] = await Promise.all([
      profile.elo_id
        ? supabase.from("elos").select("name").eq("id", profile.elo_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.rpc("elo_rankings"),
      supabase.rpc("leader_rankings"),
      supabase
        .from("v_latest_status")
        .select("id, user_id, emotional_status, spiritual_status, created_at")
        .in("user_id", idFilter),
      supabase.from("status_follow_ups").select("status_response_id"),
      supabase
        .from("mission_assignments")
        .select("id", { count: "exact", head: true })
        .eq("status", "awaiting_approval")
        .in("cria_id", idFilter),
      supabase
        .from("mission_assignments")
        .select("id", { count: "exact", head: true })
        .eq("status", "approved")
        .in("cria_id", idFilter),
      supabase
        .from("mission_assignments")
        .select("id", { count: "exact", head: true })
        .in("status", ["pending", "rejected"])
        .in("cria_id", idFilter),
      supabase
        .from("events")
        .select("id, title, event_date, event_time, location")
        .gte("event_date", new Date().toISOString().slice(0, 10))
        .order("event_date")
        .limit(3),
      supabase.from("user_presence").select("last_seen_at").eq("user_id", profile.id).maybeSingle(),
      supabase
        .from("feed_posts")
        .select("id", { count: "exact", head: true })
        .gte("created_at", new Date(Date.now() - 24 * 3_600_000).toISOString()),
      supabase
        .from("mission_assignments")
        .select("id, missions:mission_id(due_date)")
        .in("status", ["pending", "rejected"])
        .in("cria_id", idFilter),
    ]);

  const eloName = (eloRes.data as { name: string } | null)?.name ?? "Sem Elo";
  const ranking = (rankRes.data ?? []) as {
    elo_id: string;
    elo_name: string;
    total_xp: number;
    rank_position: number;
  }[];
  const myRank = ranking.find((r) => r.elo_id === profile.elo_id);

  // mesmo desempate em cascata usado em /app/ranking: criadas > nível (XP) > concluídas
  const leaderRanking = ((leaderRankRes.data ?? []) as LeaderRankRow[])
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
  const myLeaderPos = leaderRanking.findIndex((l) => l.leader_id === profile.id) + 1;
  const myLeaderStats = leaderRanking.find((l) => l.leader_id === profile.id);

  const statuses = (statusRes.data ?? []) as {
    id: string;
    user_id: string;
    emotional_status: StatusLevel;
    spiritual_status: StatusLevel;
    created_at: string;
  }[];
  const byUser = new Map(statuses.map((s) => [s.user_id, s]));

  const resolvedIds = new Set(
    ((followUpsRes.data ?? []) as { status_response_id: string }[]).map((f) => f.status_response_id),
  );

  const avgXp = crias.length
    ? Math.round(crias.reduce((sum, c) => sum + c.xp, 0) / crias.length)
    : 0;

  const awaiting = awaitingRes.count ?? 0;

  // só entra no alerta quem está "Mal" e ainda não teve um "o que foi feito" registrado
  const badCrias = crias.filter((c) => {
    const s = byUser.get(c.id);
    return hasBadStatus(s) && !resolvedIds.has(s!.id);
  });

  const storiesTray = await getEloStoriesTray(supabase, profile.elo_id);
  const lastSeenAt = (presenceRes.data as { last_seen_at: string } | null)?.last_seen_at ?? null;
  const daysSinceLastVisit = lastSeenAt
    ? Math.floor((Date.now() - new Date(lastSeenAt).getTime()) / 86_400_000)
    : null;
  const todayStr = new Date().toISOString().slice(0, 10);
  const missionsDueToday = (
    (dueTodayRes.data ?? []) as unknown as { missions: { due_date: string | null } | null }[]
  ).filter((r) => r.missions?.due_date === todayStr).length;

  return (
    <>
      <PageHeader
        title={`Olá, ${(profile.full_name || "Líder").split(" ")[0]}!`}
        subtitle={`${eloName} · ${crias.length} cria(s) sob sua responsabilidade.`}
      />

      <StoriesTray entries={storiesTray} myUserId={profile.id} />

      <HojeNoElos
        daysSinceLastVisit={daysSinceLastVisit}
        feedPostsToday={feedTodayRes.count ?? 0}
        missionsDueToday={missionsDueToday}
      />

      {badCrias.length > 0 ? (
        <Link
          href="/app/lider/status-crias"
          className="mb-4 flex items-center gap-3 rounded-2xl border-2 border-red-700 bg-red-600 px-4 py-3 text-white shadow-lg shadow-red-600/20"
        >
          <span className="text-2xl" aria-hidden>
            🚨
          </span>
          <span className="flex-1">
            <span className="block font-black">
              {badCrias.length === 1
                ? `${badCrias[0].full_name || "Um cria"} respondeu "Mal" no status`
                : `${badCrias.length} crias responderam "Mal" no status`}
            </span>
            <span className="block text-sm opacity-90">Toque para ver e agir agora.</span>
          </span>
          <span aria-hidden className="text-xl">
            →
          </span>
        </Link>
      ) : null}

      {awaiting > 0 ? (
        <Link
          href="/app/lider/missoes"
          className="mb-4 flex items-center justify-between rounded-2xl bg-[var(--accent)] px-4 py-3 text-[var(--accent-ink)]"
        >
          <span className="font-bold">
            {awaiting} missão(ões) aguardando aprovação
          </span>
          <span aria-hidden>→</span>
        </Link>
      ) : null}

      <section data-tour="xp-card" className="mb-4 rounded-2xl bg-[var(--accent)] p-5 text-[var(--accent-ink)]">
        <p className="text-xs font-bold uppercase tracking-wide opacity-80">Seu XP de liderança</p>
        <p className="mt-1 text-4xl font-black tabular-nums">{formatXp(profile.xp)}</p>
        <div className="mt-3 max-w-sm">
          <XpBar xp={profile.xp} tone="onAccent" />
        </div>
      </section>

      <section className="mb-6 grid gap-3 md:grid-cols-2">
        {/* card sólido e escuro — a métrica competitiva do líder, feita pra saltar aos olhos */}
        <Card className="border-0 bg-[var(--ink)] text-[var(--bg)]">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--bg)]/60">
            Sua posição entre os líderes
          </p>
          <p className="mt-2 text-6xl font-black leading-none tabular-nums text-[var(--accent)]">
            {myLeaderPos ? `${myLeaderPos}º` : "—"}
            {leaderRanking.length > 0 ? (
              <span className="ml-1 text-base font-semibold text-[var(--bg)]/60">de {leaderRanking.length}</span>
            ) : null}
          </p>
          <div className="mt-5 grid grid-cols-3 gap-2 border-t border-[var(--bg)]/15 pt-3 text-center">
            <div>
              <p className="text-base font-bold tabular-nums">{myLeaderStats?.missions_created ?? 0}</p>
              <p className="text-[10px] uppercase tracking-wide text-[var(--bg)]/60">criadas</p>
            </div>
            <div>
              <p className="text-base font-bold tabular-nums">{formatXp(myLeaderStats?.missions_xp ?? 0)}</p>
              <p className="text-[10px] uppercase tracking-wide text-[var(--bg)]/60">XP em missões</p>
            </div>
            <div>
              <p className="text-base font-bold tabular-nums">{myLeaderStats?.missions_completed ?? 0}</p>
              <p className="text-[10px] uppercase tracking-wide text-[var(--bg)]/60">concluídas</p>
            </div>
          </div>
          <Link href="/app/ranking" className="mt-4 block text-center text-xs font-semibold text-[var(--accent)]">
            ver ranking completo →
          </Link>
        </Card>

        {/* card claro com pódio colorido — leitura rápida de quem lidera o Elo */}
        <Card>
          <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--muted)]">
            Ranking do seu Elo
          </p>
          {crias.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--muted)]">
              Nenhum cria vinculado ainda. Fale com a administração.
            </p>
          ) : (
            <ol className="mt-3 space-y-1">
              {crias.slice(0, 5).map((c, i) => {
                const medal = ["bg-amber-400 text-amber-950", "bg-slate-300 text-slate-800", "bg-orange-400 text-orange-950"][i];
                return (
                  <li
                    key={c.id}
                    className={`flex items-center justify-between gap-3 rounded-xl px-2 py-2 ${
                      i === 0 ? "bg-[var(--accent-soft)]" : ""
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black tabular-nums ${
                          medal ?? "bg-[var(--bg)] text-[var(--muted)]"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <Avatar url={c.avatar_url} name={c.full_name} size={30} />
                      <span className={`truncate ${i === 0 ? "text-base font-bold" : "text-sm font-medium"}`}>
                        {c.full_name || "Sem nome"}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 tabular-nums ${
                        i === 0 ? "text-sm font-bold text-[var(--accent-strong)]" : "text-xs text-[var(--muted)]"
                      }`}
                    >
                      {formatXp(c.xp)} XP
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
          {crias.length > 5 ? (
            <Link href="/app/ranking" className="mt-3 block text-center text-xs font-semibold text-[var(--accent-strong)]">
              ver todos →
            </Link>
          ) : null}
        </Card>
      </section>

      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Crias" value={crias.length} />
        <StatCard label="XP médio" value={formatXp(avgXp)} />
        <StatCard
          label="Ranking do Elo"
          value={myRank ? `${myRank.rank_position}º` : "—"}
          hint={myRank ? `${formatXp(Number(myRank.total_xp))} XP no total` : undefined}
        />
        <StatCard label="Missões aprovadas" value={approvedRes.count ?? 0} />
      </section>

      <section className="mb-6 grid gap-3 md:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold">Status dos crias</h2>
            <Link href="/app/lider/status-crias" className="text-xs font-semibold text-[var(--accent-strong)]">
              ver tudo
            </Link>
          </div>
          {crias.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              Nenhum cria vinculado ainda. Fale com a administração.
            </p>
          ) : (
            <ul className="space-y-2">
              {[...crias]
                .sort((a, b) => Number(hasBadStatus(byUser.get(b.id))) - Number(hasBadStatus(byUser.get(a.id))))
                .slice(0, 5)
                .map((c) => {
                const s = byUser.get(c.id);
                const bad = hasBadStatus(s);
                return (
                  <li
                    key={c.id}
                    className={`flex items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-sm ${
                      bad ? "bg-red-50 ring-1 ring-red-300" : ""
                    }`}
                  >
                    <span className="truncate font-medium">
                      {bad ? <span aria-hidden>🚨 </span> : null}
                      {c.full_name || "Sem nome"}
                    </span>
                    {s ? (
                      <span className="flex shrink-0 gap-1">
                        <span className={`chip ${STATUS_TONE[s.emotional_status]}`}>
                          {STATUS_LABEL[s.emotional_status]}
                        </span>
                        <span className={`chip ${STATUS_TONE[s.spiritual_status]}`}>
                          {STATUS_LABEL[s.spiritual_status]}
                        </span>
                      </span>
                    ) : (
                      <span className="chip border-[var(--line)] text-[var(--muted)]">
                        sem resposta
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-bold">Missões</h2>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between">
              <span className="text-[var(--muted)]">Ativas</span>
              <strong className="tabular-nums">{activeRes.count ?? 0}</strong>
            </li>
            <li className="flex justify-between">
              <span className="text-[var(--muted)]">Aguardando aprovação</span>
              <strong className="tabular-nums">{awaiting}</strong>
            </li>
            <li className="flex justify-between">
              <span className="text-[var(--muted)]">Concluídas</span>
              <strong className="tabular-nums">{approvedRes.count ?? 0}</strong>
            </li>
          </ul>
          <Link href="/app/lider/missoes" className="btn btn-ghost mt-4 w-full !py-2 !text-sm">
            Gerenciar missões
          </Link>
        </Card>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
          Próximos eventos
        </h2>
        {(eventsRes.data ?? []).length === 0 ? (
          <EmptyState>Nenhum evento agendado.</EmptyState>
        ) : (
          <div className="space-y-2">
            {((eventsRes.data ?? []) as {
              id: string;
              title: string;
              event_date: string;
              event_time: string | null;
              location: string | null;
            }[]).map((e) => (
              <Card key={e.id}>
                <p className="font-semibold">{e.title}</p>
                <p className="text-xs text-[var(--muted)]">
                  {formatDate(e.event_date)}
                  {e.event_time ? ` · ${e.event_time.slice(0, 5)}` : ""}
                  {e.location ? ` · ${e.location}` : ""}
                </p>
              </Card>
            ))}
          </div>
        )}
      </section>

      <p className="mt-6 text-xs text-[var(--muted)]">
        Última resposta de status dos crias atualizada {relativeDay(statuses[0]?.created_at ?? null).toLowerCase()}.
      </p>
    </>
  );
}
